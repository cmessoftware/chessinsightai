"""
LLM Analysis Service - Fase 1 MVP
Genera feedback pedagógico adaptado al ELO del jugador usando OpenAI GPT-4
"""

import os
import json
from typing import Dict, Optional
from openai import AsyncOpenAI
from sqlalchemy.orm import Session

from src.api.services.analysis_service import AnalysisService


class LLMAnalysisService:
    """
    Servicio para generar análisis pedagógico usando LLM
    
    Fase 1: Prompt hardcodeado con adaptación básica por ELO
    """
    
    def __init__(self):
        """Inicializa el cliente de OpenAI"""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY no encontrada en variables de entorno. "
                "Por favor configura tu API key en el archivo .env"
            )
        
        self.client = AsyncOpenAI(api_key=api_key)
        self.analysis_service = AnalysisService()
    
    def _get_elo_context(self, elo: int) -> Dict[str, str]:
        """
        Obtiene contexto pedagógico según el ELO del jugador
        
        Args:
            elo: Rating ELO del jugador
            
        Returns:
            Dict con focus_areas y language_level
        """
        if elo < 1200:
            return {
                "focus_areas": "material, tácticas básicas, seguridad de piezas",
                "language_level": "simple y didáctico, usando analogías básicas",
                "severity": "solo errores graves (blunders y mistakes claros)"
            }
        elif elo < 1700:
            return {
                "focus_areas": "desarrollo, iniciativa, coordinación de piezas, tácticas intermedias",
                "language_level": "conceptos posicionales claros, terminología estándar",
                "severity": "errores significativos (blunders, mistakes, inaccuracies importantes)"
            }
        elif elo < 2100:
            return {
                "focus_areas": "estructura de peones, planes a medio plazo, profilaxis, juego posicional",
                "language_level": "terminología técnica precisa, análisis profundo",
                "severity": "todos los errores detectados, incluyendo imprecisiones sutiles"
            }
        else:
            return {
                "focus_areas": "optimización fina, precisión dinámica, cálculo profundo",
                "language_level": "notación algebraica completa, análisis experto",
                "severity": "perfeccionismo: incluso las imprecisiones más pequeñas son relevantes"
            }
    
    def _build_prompt(
        self,
        player_elo: int,
        shap_summary: Dict,
        game_context: Optional[Dict] = None
    ) -> str:
        """
        Construye el prompt estructurado para el LLM
        
        Args:
            player_elo: Rating ELO del jugador
            shap_summary: Resumen de análisis SHAP con features dominantes
            game_context: Contexto adicional de la partida (opcional)
            
        Returns:
            Prompt estructurado para GPT-4
        """
        elo_context = self._get_elo_context(player_elo)
        
        # Extraer datos del resumen SHAP
        total_moves = shap_summary.get('total_moves', 0)
        blunder_count = shap_summary.get('blunder_count', 0)
        mistake_count = shap_summary.get('mistake_count', 0)
        inaccuracy_count = shap_summary.get('inaccuracy_count', 0)
        good_count = total_moves - (blunder_count + mistake_count + inaccuracy_count)
        
        # Features SHAP dominantes (top 5)
        dominant_features = shap_summary.get('dominant_features', {})
        features_text = "\n".join([
            f"   - {feature}: {abs(value):.3f} (impacto {'positivo' if value > 0 else 'negativo'})"
            for feature, value in list(dominant_features.items())[:5]
        ])
        
        # Error ratio
        error_ratio = (blunder_count + mistake_count + inaccuracy_count) / total_moves if total_moves > 0 else 0
        
        prompt = f"""Eres un entrenador de ajedrez experto y pedagógico.

**Contexto del Jugador:**
- Rating ELO: {player_elo}
- Nivel de enfoque: {elo_context['focus_areas']}
- Estilo de comunicación: {elo_context['language_level']}
- Severidad del análisis: {elo_context['severity']}

**Análisis de la Partida:**

Movimientos totales: {total_moves}
Distribución de errores:
- ✅ Buenas jugadas: {good_count} ({good_count/total_moves*100:.1f}%)
- ⚠️ Imprecisiones: {inaccuracy_count} ({inaccuracy_count/total_moves*100:.1f}%)
- ❌ Errores: {mistake_count} ({mistake_count/total_moves*100:.1f}%)
- 💥 Blunders: {blunder_count} ({blunder_count/total_moves*100:.1f}%)

Ratio de error general: {error_ratio:.1%}

**Características (Features) más Influyentes según SHAP:**
{features_text}

**Contexto Adicional:**
{json.dumps(game_context, indent=2) if game_context else 'No disponible'}

---

**Tu Tarea:**

Genera un informe de entrenamiento personalizado con la siguiente estructura:

## 1. 📊 Diagnóstico Principal
(2-3 líneas resumiendo el problema principal detectado, adaptado al nivel del jugador)

## 2. 🔍 Patrones de Error Detectados
(Lista de 3-5 patrones específicos basados en las features SHAP, explicados de forma pedagógica)

## 3. 💡 Recomendaciones Concretas
(3-5 recomendaciones accionables, priorizadas por impacto)

## 4. 📚 Áreas de Mejora
(2-3 áreas de estudio sugeridas para el nivel del jugador)

## 5. ✨ Aspectos Positivos
(Mencionar al menos 1-2 fortalezas o movimientos bien ejecutados)

---

**IMPORTANTE:**
- Adapta el lenguaje y profundidad al nivel ELO {player_elo}
- Si ELO < 1400: Usa ejemplos simples, evita jerga técnica
- Si ELO 1400-1800: Balance entre conceptos y táctica
- Si ELO 1800-2200: Enfoque posicional y estratégico
- Si ELO 2200+: Análisis profundo con variantes concretas

- Interpreta las features SHAP en términos de ajedrez:
  * opponent_mobility alto → Cede iniciativa
  * material_balance negativo → Pérdida material
  * is_center_controlled bajo → Falta control central
  * move_number_global alto con errores → Problemas en finales
  * branching_factor bajo → Juego predecible

Genera el informe en formato Markdown, con tono motivador pero honesto."""
        
        return prompt
    
    async def generate_pedagogical_report(
        self,
        db: Session,
        game_id: str,
        player_elo: int,
        analysis_id: Optional[int] = None
    ) -> Dict[str, any]:
        """
        Genera un informe pedagógico completo usando LLM
        
        Args:
            db: Sesión de base de datos
            game_id: ID del juego a analizar
            player_elo: Rating ELO del jugador
            analysis_id: ID de análisis existente (opcional, si no se ejecuta nuevo)
            
        Returns:
            Dict con el informe generado y metadata
        """
        try:
            # Si no hay analysis_id, ejecutar análisis ML primero
            if not analysis_id:
                print(f"🔬 Ejecutando análisis ML para game {game_id}...")
                analysis_result = self.analysis_service.analyze_game(
                    db=db,
                    game_id=game_id
                )
                analysis_id = analysis_result['analysis_id']
                print(f"✅ Análisis completado: ID {analysis_id}")
            
            # Obtener resumen SHAP del análisis
            shap_summary = self.analysis_service.get_analysis_summary(
                db=db,
                analysis_id=analysis_id
            )
            
            # Construir prompt
            prompt = self._build_prompt(
                player_elo=player_elo,
                shap_summary=shap_summary
            )
            
            print(f"🤖 Generando informe pedagógico con GPT-4...")
            print(f"   ELO del jugador: {player_elo}")
            print(f"   Tokens estimados: ~{len(prompt.split())*1.3:.0f}")
            
            # Llamar a GPT-4
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "Eres un entrenador de ajedrez experto que genera análisis pedagógicos personalizados."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,  # Balance entre creatividad y consistencia
                max_tokens=1500,  # Suficiente para un informe completo
                top_p=0.9
            )
            
            # Extraer respuesta
            report_content = response.choices[0].message.content
            
            # Metadata del informe
            result = {
                "analysis_id": analysis_id,
                "game_id": game_id,
                "player_elo": player_elo,
                "report": report_content,
                "tokens_used": {
                    "prompt": response.usage.prompt_tokens,
                    "completion": response.usage.completion_tokens,
                    "total": response.usage.total_tokens
                },
                "model": response.model,
                "cost_estimate_usd": response.usage.total_tokens * 0.00003,  # GPT-4: $0.03/1K tokens
                "shap_summary": shap_summary
            }
            
            print(f"✅ Informe generado exitosamente")
            print(f"   Tokens usados: {result['tokens_used']['total']}")
            print(f"   Costo estimado: ${result['cost_estimate_usd']:.4f}")
            
            return result
            
        except Exception as e:
            print(f"❌ Error generando informe LLM: {str(e)}")
            raise
    
    async def generate_batch_reports(
        self,
        db: Session,
        game_ids: list[str],
        player_elo: int
    ) -> list[Dict]:
        """
        Genera informes para múltiples partidas en batch
        
        Args:
            db: Sesión de base de datos
            game_ids: Lista de IDs de juegos
            player_elo: Rating ELO del jugador
            
        Returns:
            Lista de informes generados
        """
        reports = []
        
        for i, game_id in enumerate(game_ids, 1):
            print(f"\n{'='*60}")
            print(f"🎯 Procesando game {i}/{len(game_ids)}: {game_id[:12]}...")
            print(f"{'='*60}")
            
            try:
                report = await self.generate_pedagogical_report(
                    db=db,
                    game_id=game_id,
                    player_elo=player_elo
                )
                reports.append(report)
                
            except Exception as e:
                print(f"⚠️ Error en game {game_id}: {str(e)}")
                reports.append({
                    "game_id": game_id,
                    "error": str(e),
                    "status": "failed"
                })
        
        # Resumen final
        successful = sum(1 for r in reports if "error" not in r)
        total_cost = sum(r.get("cost_estimate_usd", 0) for r in reports if "cost_estimate_usd" in r)
        total_tokens = sum(r.get("tokens_used", {}).get("total", 0) for r in reports if "tokens_used" in r)
        
        print(f"\n{'='*60}")
        print(f"📊 RESUMEN BATCH")
        print(f"{'='*60}")
        print(f"✅ Exitosos: {successful}/{len(game_ids)}")
        print(f"💰 Costo total: ${total_cost:.4f}")
        print(f"🔢 Tokens totales: {total_tokens:,}")
        print(f"{'='*60}\n")
        
        return reports
