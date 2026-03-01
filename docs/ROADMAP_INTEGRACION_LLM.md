# 🧠 ChessTrainer – Arquitectura SHAP + LLM + MCP
## Documento Técnico + Roadmap (MVP → Agentes IA con MCP)

---

# 1️⃣ Problema a Resolver

ChessTrainer ya dispone de:

- Modelo ML entrenado con +227.000 partidas
- Clasificación de jugadas (good, inaccuracy, mistake, blunder)
- Valores SHAP por jugada
- Ingeniería de features robusta

El desafío actual no es mejorar el modelo.

El desafío es:

> Traducir explicaciones técnicas (SHAP) en feedback pedagógico adaptado al ELO del jugador.

Además, se busca:

- Escalabilidad
- Personalización por nivel
- Chat interactivo contextual
- Arquitectura modular y mantenible

---

# 2️⃣ Separación de Responsabilidades

Es clave separar tres niveles:

## A. Motor ML
Responsable de:
- Predicción de calidad de jugada
- Generación de valores SHAP

No debe:
- Generar explicaciones humanas
- Tomar decisiones pedagógicas

---

## B. Motor de Patrones (Pattern Engine)

Convierte SHAP crudo en conceptos pedagógicos.

Ejemplo:

| SHAP Dominante                 | Traducción Conceptual    |
| ------------------------------ | ------------------------ |
| opponent_mobility ↑            | Cede iniciativa          |
| material_balance ↑             | Pérdida material         |
| is_center_controlled ↓         | Falta de control central |
| move_number + repetición pieza | Pérdida de tiempos       |
| num_pieces alto en apertura    | Falta desarrollo         |

Este módulo es determinístico y estructurado.

---

## C. LLM Traductor Pedagógico

Recibe:

```json
{
  "elo": 1420,
  "dominant_pattern": "cede_iniciativa",
  "opening_time_loss": true,
  "material_blunders": 1,
  "critical_phase": "middlegame_early"
}

Y genera:

Informe adaptado al nivel

Recomendaciones específicas

Diagnóstico comprensible

El LLM no interpreta SHAP raw.
Interpreta conceptos.

3️⃣ Arquitectura Propuesta
🏗️ Arquitectura Base
Frontend (Web)
    ↓
LLM Orquestador (con tool calling / MCP)
    ↓
ChessTrainer Backend API
    ↓
Pattern Engine
    ↓
ML Model + SHAP

4️⃣ Backend – Endpoints Necesarios
Análisis estructurado
GET /analysis/{game_id}/summary
GET /analysis/{game_id}/patterns
GET /analysis/{game_id}/critical-moves
GET /analysis/{game_id}/phase-breakdown
GET /player/{user_id}/profile

Respuesta ejemplo
{
  "elo": 1420,
  "error_ratio": 0.21,
  "dominant_features": {
    "opponent_mobility": 0.22,
    "material_balance": 0.17
  },
  "patterns": [
    "cede_iniciativa",
    "perdida_tiempos_apertura"
  ],
  "opening_repeated_piece_moves": 3,
  "undeveloped_pieces_move10": 2
}

5️⃣ Evolución Arquitectónica
🔹 Fase 1 – MVP (Prompt Hardcodeado)

Características:

Prompt estructurado fijo

SHAP agregado enviado en contexto

Informe automático estático

Ventajas:

Simple

Rápido de implementar

Bajo riesgo

Limitaciones:

Poca personalización

Prompt grande

Difícil escalar

🔹 Fase 2 – Prompt Dinámico (Sin MCP)

Características:

Backend preprocesa patrones

Prompt se genera dinámicamente según ELO

LLM solo traduce

Mejora:

Adaptación por nivel

Mayor claridad pedagógica

Menor ruido técnico

🔹 Fase 3 – MCP / Tool Calling

LLM puede consultar backend en tiempo real.

Flujo:

Usuario solicita análisis.

LLM llama get_analysis_summary.

Backend responde JSON estructurado.

LLM decide si necesita:

SHAP detallado

Movidas críticas

Perfil histórico

Ventajas:

Modular

Contexto incremental

Chat interactivo

Menor consumo de tokens

Escalable

Complejidad:

Requiere diseño claro de tools

Manejo de errores

Control de latencia

🔹 Fase 4 – Agente IA Orquestador

El sistema se divide en agentes:

🧩 Agent 1 – Data Retriever

Consulta backend vía MCP.

🧩 Agent 2 – Pattern Synthesizer

Transforma métricas en patrones conceptuales.

🧩 Agent 3 – Pedagogical Explainer

Genera informe adaptado a ELO.

Esto permite:

Ajuste automático de severidad

Evolución futura hacia planes de entrenamiento personalizados

Comparación histórica de progreso

6️⃣ Adaptación por ELO (Reglas Pedagógicas)
if elo < 1200:
    foco = material + tácticas básicas

elif elo < 1700:
    foco = desarrollo + iniciativa + coordinación

elif elo < 2100:
    foco = estructura + planes + profilaxis

else:
    foco = optimización fina + precisión dinámica

Esto no depende del modelo.
Depende del diseño formativo.

7️⃣ Feature Temporal (Mejora Recomendada)

Agregar métricas:

Repetición de pieza en primeros 10 movimientos

Gap de desarrollo

Enroque tardío

Número de piezas menores desarrolladas al move 10

Iniciativa promedio por fase

Esto mejora la calidad pedagógica.

8️⃣ Principio Fundamental

SHAP explica el modelo.

El sistema debe explicar ajedrez.

No confundir:

Explicabilidad técnica

Entrenamiento humano

9️⃣ Roadmap Resumido
🎯 MVP (0–1 mes)

Prompt estructurado fijo

SHAP agregado

Informe automático por ELO

🚀 Iteración 2 (1–3 meses)

Pattern Engine

Prompt dinámico

Detección de pérdida de tiempos

🤖 Iteración 3 (3–6 meses)

MCP / Tool calling

Chat interactivo contextual

Modularización backend

🧠 Iteración 4 (6+ meses)

Agentes IA especializados

Seguimiento de progreso

Planes de entrenamiento personalizados

Adaptación automática de profundidad

🔟 Conclusión Estratégica

Para convertir ChessTrainer en producto serio:

Separar ML de pedagogía.

No enviar SHAP crudo al LLM.

Sintetizar primero, traducir después.

Evolucionar hacia MCP + agentes modulares.

La clave no es mejorar el modelo.

La clave es orquestarlo inteligentemente.

📌 Uso en Copilot (VSCode)

Este documento sirve como contexto para:

Generar endpoints backend

Diseñar Pattern Engine

Implementar MCP tools

Estructurar agentes IA

Refactorizar arquitectura actual

Utilizar como documento base de diseño técnico.