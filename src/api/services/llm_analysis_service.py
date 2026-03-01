"""
LLM Analysis Service - Fase 1 MVP (Optimizado con Pattern Synthesis)
Genera feedback pedagógico adaptado al ELO usando patrones procesados
"""

import os
import json
from typing import Dict, Optional, List
from datetime import datetime
from openai import AsyncOpenAI
from sqlalchemy.orm import Session
from sqlalchemy import func

from src.api.services.analysis_service import AnalysisService
from db.models.analysis_results import AnalysisResult
from db.models.move_shap_values import MoveShapValue
from db.models.games import Games


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

    def _get_shap_summary(self, db: Session, analysis_id: int) -> Dict:
        """
        Obtiene resumen SHAP del análisis desde la base de datos

        Args:
            db: Sesión de base de datos
            analysis_id: ID del análisis

        Returns:
            Dict con resumen del análisis y top features SHAP
        """
        # Obtener análisis
        analysis = (
            db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
        )

        if not analysis:
            raise ValueError(f"Análisis con ID {analysis_id} no encontrado")

        # Obtener valores SHAP para este análisis
        shap_values = (
            db.query(MoveShapValue)
            .filter(MoveShapValue.analysis_id == analysis_id)
            .all()
        )

        # Calcular feature importance agregada (suma absoluta de SHAP values)
        feature_importance = {}
        for sv in shap_values:
            if sv.feature_name not in feature_importance:
                feature_importance[sv.feature_name] = 0.0
            feature_importance[sv.feature_name] += abs(sv.shap_value)

        # Top 5 features más importantes
        top_features = sorted(
            feature_importance.items(), key=lambda x: x[1], reverse=True
        )[:5]

        # Construir resumen
        summary = {
            "analysis_id": analysis_id,
            "game_id": analysis.game_id,
            "total_moves": analysis.total_moves or 0,
            "error_level": analysis.error_level,
            "blunder_count": analysis.blunder_count or 0,
            "mistake_count": analysis.mistake_count or 0,
            "inaccuracy_count": analysis.inaccuracy_count or 0,
            "good_move_count": analysis.good_move_count or 0,
            "average_centipawn_loss": analysis.average_centipawn_loss or 0.0,
            "top_features": [
                {"feature": name, "importance": importance}
                for name, importance in top_features
            ],
        }

        return summary

    def _get_top_error_moves(self, db: Session, analysis_id: int, top_n: int = 8) -> List[Dict]:
        """
        Obtiene los movimientos con errores más críticos, con sus SHAP values específicos
        
        Implementa Sección 5.2 del roadmap: evidence pack move-by-move
        
        Args:
            db: Sesión de base de datos
            analysis_id: ID del análisis
            top_n: Número máximo de movimientos a retornar
            
        Returns:
            Lista de movimientos con error, ordenados por severidad
            Cada movimiento incluye:
            - move_number: Número del movimiento
            - error_label: blunder/mistake/inaccuracy
            - top_shap_features: Top 3-5 features que explican esta jugada
            - shap_impact: Impacto total SHAP para este move
        """
        # Query movimientos con error (excluye 'good')
        shap_moves = (
            db.query(MoveShapValue)
            .filter(
                MoveShapValue.analysis_id == analysis_id,
                MoveShapValue.error_label.in_(["blunder", "mistake", "inaccuracy"])
            )
            .all()
        )
        
        if not shap_moves:
            return []
        
        # Agrupar por move_number para calcular SHAP total e identificar top features
        moves_dict = {}
        for sv in shap_moves:
            move_num = sv.move_number
            if move_num not in moves_dict:
                moves_dict[move_num] = {
                    "move_number": move_num,
                    "error_label": sv.error_label,
                    "features": []
                }
            
            # Agregar feature con su SHAP value
            moves_dict[move_num]["features"].append({
                "feature": sv.feature_name,
                "shap_value": abs(sv.shap_value)
            })
        
        # Procesar cada movimiento
        error_moves = []
        for move_data in moves_dict.values():
            # Ordenar features por impacto SHAP (absoluto)
            sorted_features = sorted(
                move_data["features"], 
                key=lambda x: x["shap_value"], 
                reverse=True
            )
            
            # Top 3 features más influyentes para este movimiento
            top_features = sorted_features[:3]
            
            # Calcular impacto total SHAP para este movimiento
            total_shap_impact = sum(f["shap_value"] for f in sorted_features)
            
            # Ponderación de severidad para ordenamiento
            severity_weight = {
                "blunder": 3.0,
                "mistake": 2.0,
                "inaccuracy": 1.0
            }
            
            error_moves.append({
                "move_number": move_data["move_number"],
                "error_label": move_data["error_label"],
                "top_shap_features": top_features,
                "shap_impact": round(total_shap_impact, 3),
                "severity_score": total_shap_impact * severity_weight.get(move_data["error_label"], 1.0)
            })
        
        # Ordenar por severity_score (severidad * impacto SHAP)
        error_moves_sorted = sorted(
            error_moves, 
            key=lambda x: x["severity_score"], 
            reverse=True
        )
        
        # Retornar top N movimientos más críticos
        return error_moves_sorted[:top_n]

    def _get_competitive_context(
        self, db: Session, game_id: str, player_color: str, analysis_id: int
    ) -> Dict:
        """
        Obtiene contexto competitivo: resultado, comparación vs oponente, momento crítico

        Args:
            db: Sesión de base de datos
            game_id: ID de la partida
            player_color: Color del jugador ("white" o "black")
            analysis_id: ID del análisis del jugador

        Returns:
            Dict con contexto competitivo diferencial
        """
        # Obtener datos de la partida
        game = db.query(Games).filter(Games.game_id == game_id).first()

        if not game:
            return {}

        # Determinar resultado desde perspectiva del jugador
        result = game.result  # "1-0", "0-1", "1/2-1/2"
        player_result = "draw"
        if result == "1-0":  # Ganan blancas
            player_result = "win" if player_color == "white" else "loss"
        elif result == "0-1":  # Ganan negras
            player_result = "loss" if player_color == "white" else "win"

        # Obtener análisis del jugador
        player_analysis = (
            db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
        )

        # Calcular error ratio del jugador
        player_total_moves = player_analysis.total_moves or 1
        player_errors = (
            (player_analysis.blunder_count or 0)
            + (player_analysis.mistake_count or 0)
            + (player_analysis.inaccuracy_count or 0)
        )
        player_error_ratio = player_errors / player_total_moves

        # Intentar obtener análisis del oponente (color opuesto)
        opponent_color_int = 0 if player_color == "white" else 1
        opponent_analysis = (
            db.query(AnalysisResult)
            .filter(AnalysisResult.game_id == game_id)
            .join(
                MoveShapValue,
                MoveShapValue.analysis_id == AnalysisResult.id,
            )
            .first()
        )

        # Si no hay análisis del oponente, usar estimación básica
        opponent_error_ratio = 0.2  # Default
        if opponent_analysis and opponent_analysis.id != analysis_id:
            opp_total = opponent_analysis.total_moves or 1
            opp_errors = (
                (opponent_analysis.blunder_count or 0)
                + (opponent_analysis.mistake_count or 0)
                + (opponent_analysis.inaccuracy_count or 0)
            )
            opponent_error_ratio = opp_errors / opp_total

        # Detectar momento crítico (jugada con mayor swing SHAP)
        shap_moves = (
            db.query(MoveShapValue)
            .filter(MoveShapValue.analysis_id == analysis_id)
            .all()
        )

        critical_move = None
        max_impact = 0
        for sv in shap_moves:
            if abs(sv.shap_value) > max_impact and sv.error_label in [
                "blunder",
                "mistake",
            ]:
                max_impact = abs(sv.shap_value)
                critical_move = sv.move_number

        # Construir contexto
        context = {
            "result": player_result,
            "player_error_ratio": round(player_error_ratio, 2),
            "opponent_error_ratio": round(opponent_error_ratio, 2),
            "error_ratio_delta": round(player_error_ratio - opponent_error_ratio, 2),
            "critical_move": critical_move,
            "phase": (
                "opening"
                if critical_move and critical_move <= 15
                else "middlegame" if critical_move and critical_move <= 40 else "endgame"
            ),
        }

        return context

    def _synthesize_patterns(
        self, db: Session, analysis_id: int, shap_summary: Dict
    ) -> List[Dict]:
        """
        Sintetiza patrones pedagógicos desde datos SHAP crudos

        Args:
            db: Sesión de base de datos
            analysis_id: ID del análisis
            shap_summary: Resumen SHAP con features

        Returns:
            Lista de patrones detectados con evidencia concreta
        """
        patterns = []

        # Obtener valores SHAP por movimiento para análisis detallado
        shap_moves = (
            db.query(MoveShapValue)
            .filter(MoveShapValue.analysis_id == analysis_id)
            .all()
        )

        # Organizar por movimiento
        moves_data = {}
        for sv in shap_moves:
            if sv.move_number not in moves_data:
                moves_data[sv.move_number] = {}
            moves_data[sv.move_number][sv.feature_name] = {
                "shap_value": sv.shap_value,
                "feature_value": sv.feature_value,
                "error_label": sv.error_label,
            }

        # **PATRÓN 1: Cede iniciativa (opponent_mobility alto)**
        opponent_mobility_values = [
            sv.shap_value
            for sv in shap_moves
            if sv.feature_name == "opponent_mobility" and abs(sv.shap_value) > 0.1
        ]
        if len(opponent_mobility_values) >= 3:
            avg_mobility = sum(abs(v) for v in opponent_mobility_values) / len(
                opponent_mobility_values
            )
            affected_moves = [
                sv.move_number
                for sv in shap_moves
                if sv.feature_name == "opponent_mobility" and abs(sv.shap_value) > 0.1
            ]
            patterns.append(
                {
                    "pattern": "cede_iniciativa",
                    "description": "Jugadas que permiten alta movilidad al oponente",
                    "severity": "high" if avg_mobility > 0.2 else "medium",
                    "evidence": {
                        "affected_moves": affected_moves[:5],
                        "frequency": len(opponent_mobility_values),
                        "avg_impact": round(avg_mobility, 3),
                    },
                    "recommendation": "Busca jugadas que restrinjan las opciones del rival. Pregúntate: ¿esta jugada le da libertad a mi oponente?",
                }
            )

        # **PATRÓN 2: Pérdida material (material_balance negativo)**
        material_losses = [
            (sv.move_number, sv.shap_value)
            for sv in shap_moves
            if sv.feature_name == "material_balance"
            and sv.shap_value < -0.15
            and sv.error_label in ["blunder", "mistake"]
        ]
        if material_losses:
            worst_move = min(material_losses, key=lambda x: x[1])
            patterns.append(
                {
                    "pattern": "error_material",
                    "description": "Jugadas que resultan en pérdida de material",
                    "severity": "critical",
                    "evidence": {
                        "critical_move": worst_move[0],
                        "impact": round(worst_move[1], 3),
                        "total_occurrences": len(material_losses),
                    },
                    "recommendation": f"Revisa la jugada #{worst_move[0]}. Antes de mover, verifica: ¿está mi pieza protegida? ¿puede ser capturada?",
                }
            )

        # **PATRÓN 3: Errores en apertura (move_number_global bajo + error)**
        opening_errors = [
            sv.move_number
            for sv in shap_moves
            if sv.feature_name == "move_number_global"
            and sv.feature_value < 15
            and sv.error_label in ["mistake", "inaccuracy"]
        ]
        if len(opening_errors) >= 2:
            patterns.append(
                {
                    "pattern": "perdida_tiempos_apertura",
                    "description": "Errores en la fase de apertura (primeros 15 movimientos)",
                    "severity": "medium",
                    "evidence": {
                        "affected_moves": opening_errors[:3],
                        "count": len(opening_errors),
                    },
                    "recommendation": "Enfócate en: 1) Desarrollar piezas rápidamente, 2) Controlar el centro, 3) Enrocar pronto.",
                }
            )

        # **PATRÓN 4: Juego pasivo (self_mobility bajo)**
        low_mobility = [
            sv.move_number
            for sv in shap_moves
            if sv.feature_name == "self_mobility"
            and sv.shap_value < -0.1
            and sv.error_label != "good"
        ]
        if len(low_mobility) >= 4:
            patterns.append(
                {
                    "pattern": "juego_pasivo",
                    "description": "Movimientos que reducen tus propias opciones",
                    "severity": "medium",
                    "evidence": {
                        "affected_moves": low_mobility[:5],
                        "frequency": len(low_mobility),
                    },
                    "recommendation": "Busca jugadas activas que aumenten tus opciones. Pregúntate: ¿esta jugada me da más o menos libertad?",
                }
            )

        # **PATRÓN 5: Problemas de control del centro**
        center_control_issues = [
            sv.move_number
            for sv in shap_moves
            if sv.feature_name == "is_center_controlled"
            and abs(sv.shap_value) > 0.1
            and sv.error_label in ["mistake", "inaccuracy"]
        ]
        if len(center_control_issues) >= 2:
            patterns.append(
                {
                    "pattern": "control_centro_debil",
                    "description": "Jugadas que no disputan o pierden control del centro",
                    "severity": "medium",
                    "evidence": {
                        "affected_moves": center_control_issues[:3],
                        "count": len(center_control_issues),
                    },
                    "recommendation": "El centro es clave. Intenta ocuparlo con peones (e4, d4) o controlarlo con piezas.",
                }
            )

        # Ordenar patrones por severidad
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        patterns.sort(key=lambda p: severity_order.get(p["severity"], 99))

        return patterns

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
                "severity": "solo errores graves (blunders y mistakes claros)",
            }
        elif elo < 1700:
            return {
                "focus_areas": "desarrollo, iniciativa, coordinación de piezas, tácticas intermedias",
                "language_level": "conceptos posicionales claros, terminología estándar",
                "severity": "errores significativos (blunders, mistakes, inaccuracies importantes)",
            }
        elif elo < 2100:
            return {
                "focus_areas": "estructura de peones, planes a medio plazo, profilaxis, juego posicional",
                "language_level": "terminología técnica precisa, análisis profundo",
                "severity": "todos los errores detectados, incluyendo imprecisiones sutiles",
            }
        else:
            return {
                "focus_areas": "optimización fina, precisión dinámica, cálculo profundo",
                "language_level": "notación algebraica completa, análisis experto",
                "severity": "perfeccionismo: incluso las imprecisiones más pequeñas son relevantes",
            }

    def _calibrate_severity_by_elo(self, error_label: str, player_elo: int, shap_impact: float) -> Dict[str, any]:
        """
        Calibra la severidad de un error según el ELO del jugador
        
        Implementa Sección 4.1 del roadmap: Calibration post-modelo
        
        Regla general:
        - Para jugadores bajos (< 1600): Solo blunders y mistakes graves importan pedagógicamente
        - Para jugadores intermedios (1600-2000): Mistakes e inaccuracies relevantes
        - Para jugadores altos (2000+): Todas las imprecisiones son importantes
        
        Args:
            error_label: Etiqueta del error (blunder/mistake/inaccuracy/good)
            player_elo: Rating ELO del jugador
            shap_impact: Impacto SHAP total del movimiento
            
        Returns:
            Dict con severidad calibrada y tono narrativo
        """
        # Matriz de calibración por ELO
        if player_elo < 1600:
            # Novice/Intermediate: Focus en errores graves
            calibration = {
                "blunder": {
                    "pedagogical_severity": "crítico",
                    "narrative_tone": "Este error te costó la partida",
                    "priority": "alta"
                },
                "mistake": {
                    "pedagogical_severity": "serio" if shap_impact > 0.3 else "moderado",
                    "narrative_tone": "Error importante que debes evitar" if shap_impact > 0.3 else "Jugada imprecisa",
                    "priority": "alta" if shap_impact > 0.3 else "media"
                },
                "inaccuracy": {
                    "pedagogical_severity": "bajo",
                    "narrative_tone": "Pequeña imprecisión, no prioritaria" if shap_impact < 0.2 else "Jugada mejorable",
                    "priority": "baja"
                }
            }
        elif player_elo < 2000:
            # Intermediate/Advanced: Buscar precisión
            calibration = {
                "blunder": {
                    "pedagogical_severity": "crítico",
                    "narrative_tone": "Error grave que un jugador de tu nivel debe evitar",
                    "priority": "alta"
                },
                "mistake": {
                    "pedagogical_severity": "serio",
                    "narrative_tone": "Error posicional significativo",
                    "priority": "alta"
                },
                "inaccuracy": {
                    "pedagogical_severity": "moderado",
                    "narrative_tone": "Imprecisión que afecta tu posición",
                    "priority": "media"
                }
            }
        else:
            # Advanced/Expert: Perfeccionismo
            calibration = {
                "blunder": {
                    "pedagogical_severity": "inaceptable",
                    "narrative_tone": "Error crítico en tu nivel",
                    "priority": "crítica"
                },
                "mistake": {
                    "pedagogical_severity": "grave",
                    "narrative_tone": "Error técnico que debe corregirse",
                    "priority": "alta"
                },
                "inaccuracy": {
                    "pedagogical_severity": "serio",
                    "narrative_tone": "Imprecisión relevante para tu nivel",
                    "priority": "alta"
                }
            }
        
        # Retornar calibración o default si el label no está
        return calibration.get(error_label, {
            "pedagogical_severity": "desconocido",
            "narrative_tone": "Requiere revisión",
            "priority": "media"
        })

    def _get_elo_output_policy(self, player_elo: int) -> Dict[str, any]:
        """
        Define la política de salida (formato, longitud, estructura) según ELO
        
        Implementa Sección 4.2 del roadmap: Output Policy por bucket
        
        Args:
            player_elo: Rating ELO del jugador
            
        Returns:
            Dict con reglas de formato y estructura del reporte
        """
        if player_elo < 1600:
            # Novice/Intermediate: Simple y accionable
            return {
                "max_bullet_points": 3,
                "max_key_moves": 2,
                "include_variations": False,
                "teaching_style": "analogías simples, reglas heurísticas claras",
                "max_words": 300,
                "format_rules": [
                    "Máximo 3 recomendaciones",
                    "Al menos 2 jugadas específicas citadas",
                    "1 hábito de entrenamiento sugerido"
                ]
            }
        elif player_elo < 2000:
            # Intermediate/Advanced: Balance entre teoría y práctica
            return {
                "max_bullet_points": 5,
                "max_key_moves": 4,
                "include_variations": True,
                "teaching_style": "conceptos posicionales + variantes cortas",
                "max_words": 450,
                "format_rules": [
                    "3-5 recomendaciones priorizadas",
                    "Al menos 4 jugadas específicas citadas"
                ]
            }
        else:
            # Advanced/Expert: Profundidad técnica
            return {
                "max_bullet_points": 6,
                "max_key_moves": 6,
                "include_variations": True,
                "teaching_style": "análisis técnico profundo, profilaxis",
                "max_words": 600,
                "format_rules": [
                    "Análisis exhaustivo de errores críticos",
                    "Mínimo 6 jugadas específicas referenciadas"
                ]
            }

    def _build_prompt(
        self, 
        player_elo: int, 
        patterns: List[Dict], 
        shap_summary: Dict, 
        competitive_context: Dict,
        top_error_moves: List[Dict]
    ) -> str:
        """
        Construye el prompt estructurado para el LLM usando patrones sintetizados y contexto competitivo
        
        Implementa Sección 5.2 del roadmap: Evidence pack move-by-move

        Args:
            player_elo: Rating ELO del jugador
            patterns: Lista de patrones detectados (ya sintetizados)
            shap_summary: Resumen básico del análisis
            competitive_context: Contexto competitivo (resultado, comparación vs oponente)
            top_error_moves: Top movimientos con error específicos (evidence pack)

        Returns:
            Prompt optimizado para GPT-4
        """
        elo_context = self._get_elo_context(player_elo)
        output_policy = self._get_elo_output_policy(player_elo)

        # Construir evidence pack move-by-move (Sección 5.2)
        evidence_moves_text = ""
        if top_error_moves:
            evidence_moves_text = "\n**Movimientos Críticos (Evidence Pack):**\n"
            for idx, move in enumerate(top_error_moves[:output_policy['max_key_moves']], 1):
                top_features_str = ", ".join([f"{f['feature']}" for f in move['top_shap_features']])
                evidence_moves_text += f"""
{idx}. **Jugada #{move['move_number']}** → {move['error_label'].upper()}
   - Features críticos: {top_features_str}
   - Impacto SHAP: {move['shap_impact']}
"""
        
        # Construir lista de patrones para el prompt
        patterns_text = ""
        for idx, p in enumerate(patterns[:3], 1):  # Solo top 3 patrones
            patterns_text += f"""
{idx}. **{p['description']}** (Severidad: {p['severity']})
   - Recomendación: {p['recommendation']}
"""

        # Calcular métricas básicas
        total_moves = shap_summary.get("total_moves", 0)
        blunder_count = shap_summary.get("blunder_count", 0)
        mistake_count = shap_summary.get("mistake_count", 0)

        # Extraer contexto competitivo
        result = competitive_context.get("result", "unknown")
        player_error_ratio = competitive_context.get("player_error_ratio", 0)
        opponent_error_ratio = competitive_context.get("opponent_error_ratio", 0)
        error_delta = competitive_context.get("error_ratio_delta", 0)
        critical_move = competitive_context.get("critical_move")

        # Determinar tono según resultado
        result_emoji = {"win": "🏆", "loss": "❌", "draw": "⚖️"}.get(result, "❓")
        
        # Construir contexto competitivo para el prompt
        comp_context_text = f"""
**Resultado:** {result_emoji} {result.upper()}
**Tu error rate:** {player_error_ratio:.1%} | **Oponente:** {opponent_error_ratio:.1%} | **Delta:** {error_delta:+.1%}
"""
        if critical_move:
            comp_context_text += f"**Momento crítico:** Jugada #{critical_move}\n"

        # Adaptar instrucciones según resultado
        if result == "win":
            outcome_instruction = "GANASTE. Identifica qué compensó tus errores. Refuerza patrones exitosos."
        elif result == "loss":
            outcome_instruction = "PERDISTE. Identifica el factor decisivo de la derrota. Prioriza la corrección más urgente."
        else:
            outcome_instruction = "EMPATE. Identifica oportunidades perdidas para ganar."

        prompt = f"""Eres un entrenador de ajedrez. Genera un informe específico y diferenciado por resultado.

**Jugador:** ELO {player_elo} | **Movimientos:** {total_moves} | **Errores graves:** {blunder_count + mistake_count}

**Contexto Competitivo:**
{comp_context_text}
{evidence_moves_text}
**Patrones Detectados:**
{patterns_text}

**Instrucciones:**
1. {outcome_instruction}
2. Usa lenguaje {elo_context['language_level']}
3. Enfócate en: {elo_context['focus_areas']}
4. Estilo: {output_policy['teaching_style']}
5. OBLIGATORIO: Cita al menos {output_policy['max_key_moves']} jugadas del Evidence Pack anterior
6. Máximo {output_policy['max_words']} palabras
7. NO uses frases genéricas sin aterrizarlas a jugadas concretas
8. ADAPTA el tono al resultado: {"refuerza logros" if result == "win" else "corrige errores críticos" if result == "loss" else "optimiza precisión"}

**Formato (Markdown):**

## 📊 Diagnóstico
(problema principal o fortaleza decisiva según resultado)

## 🎯 Acciones Concretas
({output_policy['max_bullet_points']} recomendaciones máximo, cada una citando jugadas del Evidence Pack)

## ✅ Fortaleza Detectada
(1 aspecto positivo concreto)

Sé directo y específico. Evita relleno."""

        return prompt

    async def generate_pedagogical_report(
        self,
        db: Session,
        game_id: str,
        player_elo: int,
        player_color: str,
        username: str,
        analysis_id: Optional[int] = None,
    ) -> Dict[str, any]:
        """
        Genera un informe pedagógico completo usando LLM

        Args:
            db: Sesión de base de datos
            game_id: ID del juego a analizar
            player_elo: Rating ELO del jugador
            player_color: Color del jugador ("white" o "black")
            username: Usuario que solicita el análisis
            analysis_id: ID de análisis existente (opcional, si no se ejecuta nuevo)

        Returns:
            Dict con el informe generado y metadata
        """
        try:
            # Si no hay analysis_id, ejecutar análisis ML primero
            if not analysis_id:
                print(
                    f"🔬 Ejecutando análisis ML para game {game_id} (jugador: {player_color})..."
                )
                analysis_id = self.analysis_service.analyze_game(
                    db=db, game_id=game_id, username=username, player_color=player_color
                )
                print(f"✅ Análisis completado: ID {analysis_id}")

            # Obtener resumen SHAP del análisis
            shap_summary = self._get_shap_summary(db=db, analysis_id=analysis_id)

            # Sintetizar patrones pedagógicos desde SHAP
            print(f"🔍 Sintetizando patrones pedagógicos...")
            patterns = self._synthesize_patterns(
                db=db, analysis_id=analysis_id, shap_summary=shap_summary
            )
            print(f"✅ Detectados {len(patterns)} patrones")

            # Obtener movimientos con errores específicos (evidence pack)
            print(f"📋 Obteniendo evidence pack (top error moves)...")
            top_error_moves = self._get_top_error_moves(db=db, analysis_id=analysis_id, top_n=8)
            print(f"✅ Identificados {len(top_error_moves)} movimientos críticos")

            # Obtener contexto competitivo (resultado, comparación vs oponente)
            print(f"⚔️ Obteniendo contexto competitivo...")
            competitive_context = self._get_competitive_context(
                db=db, game_id=game_id, player_color=player_color, analysis_id=analysis_id
            )
            print(f"   Resultado: {competitive_context.get('result', 'N/A')}")
            print(f"   Error ratio jugador: {competitive_context.get('player_error_ratio', 0):.2f}")
            print(f"   Error ratio oponente: {competitive_context.get('opponent_error_ratio', 0):.2f}")

            # Construir prompt optimizado con contexto competitivo y evidence pack
            prompt = self._build_prompt(
                player_elo=player_elo,
                patterns=patterns,
                shap_summary=shap_summary,
                competitive_context=competitive_context,
                top_error_moves=top_error_moves,
            )

            print(f"🤖 Generando informe pedagógico con GPT-4...")
            print(f"   ELO del jugador: {player_elo}")
            print(f"   Patrones detectados: {len(patterns)}")
            print(f"   Tokens estimados del prompt: ~{len(prompt.split())*1.3:.0f}")
            print(f"   ELO del jugador: {player_elo}")
            print(f"   Tokens estimados: ~{len(prompt.split())*1.3:.0f}")

            # Llamar a GPT-4
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "Eres un entrenador de ajedrez experto que genera análisis pedagógicos personalizados.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,  # Balance entre creatividad y consistencia
                max_tokens=600,  # Reducido para forzar concisión y optimizar costos
                top_p=0.9,
            )

            # Extraer respuesta
            report_content = response.choices[0].message.content

            # Metadata del informe
            result = {
                "analysis_id": analysis_id,
                "game_id": game_id,
                "player_elo": player_elo,
                "report": report_content,
                "patterns_detected": [
                    {
                        "pattern": p["pattern"],
                        "description": p["description"],
                        "severity": p["severity"],
                    }
                    for p in patterns
                ],
                "tokens_used": {
                    "prompt": response.usage.prompt_tokens,
                    "completion": response.usage.completion_tokens,
                    "total": response.usage.total_tokens,
                },
                "model": response.model,
                "cost_estimate_usd": response.usage.total_tokens
                * 0.00003,  # GPT-4: $0.03/1K tokens
                "generated_at": datetime.now().isoformat(),
            }

            print(f"✅ Informe generado exitosamente")
            print(f"   Tokens usados: {result['tokens_used']['total']}")
            print(f"   Costo estimado: ${result['cost_estimate_usd']:.4f}")
            print(
                f"   Reducción vs anterior: ~{((1415 - result['tokens_used']['total']) / 1415 * 100):.0f}%"
            )

            return result

        except Exception as e:
            print(f"❌ Error generando informe LLM: {str(e)}")
            raise

    async def generate_batch_reports(
        self, db: Session, game_ids: list[str], player_elo: int, username: str
    ) -> list[Dict]:
        """
        Genera informes para múltiples partidas en batch

        Args:
            db: Sesión de base de datos
            game_ids: Lista de IDs de juegos
            player_elo: Rating ELO del jugador
            username: Usuario que solicita el análisis

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
                    db=db, game_id=game_id, player_elo=player_elo, username=username
                )
                reports.append(report)

            except Exception as e:
                print(f"⚠️ Error en game {game_id}: {str(e)}")
                reports.append(
                    {"game_id": game_id, "error": str(e), "status": "failed"}
                )

        # Resumen final
        successful = sum(1 for r in reports if "error" not in r)
        total_cost = sum(
            r.get("cost_estimate_usd", 0) for r in reports if "cost_estimate_usd" in r
        )
        total_tokens = sum(
            r.get("tokens_used", {}).get("total", 0)
            for r in reports
            if "tokens_used" in r
        )

        print(f"\n{'='*60}")
        print(f"📊 RESUMEN BATCH")
        print(f"{'='*60}")
        print(f"✅ Exitosos: {successful}/{len(game_ids)}")
        print(f"💰 Costo total: ${total_cost:.4f}")
        print(f"🔢 Tokens totales: {total_tokens:,}")
        print(f"{'='*60}\n")

        return reports
