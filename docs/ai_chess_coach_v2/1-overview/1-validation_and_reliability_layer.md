# AI Chess Coach — V2 Validation & Reliability Layer
## Spec para Copilot (Extensión sobre V1)

---

## 0. Contexto

V1 ya implementa:

- Pipeline base:

PGN → Stockfish → Features → Pattern Engine → RAG → LLM → Schema Validation → Engine Consistency → Output

- Output estructurado (JSON)
- Validación contra engine (Stockfish)
- Temperatura baja (0.1–0.3)

---

## 1. Objetivo V2

Agregar una **capa de validación probabilística y consenso** sin modificar el core.

Principio:


El LLM no decide. El sistema decide.

---

## 2. Arquitectura V2 (Extensión)


LLM_output (V1)
↓
self_consistency_validator
↓
cross_model_validator (opcional)
↓
confidence_scorer
↓
decision_engine
↓
final_output | reject | human_review


---

## 3. Nuevos Módulos

### 3.1 self_consistency_validator.py

#### Objetivo
Ejecutar la misma query N veces y medir consistencia semántica.

#### Config

```python
N_RUNS = 3
CONSENSUS_THRESHOLD = 0.7
Interfaz
class SelfConsistencyValidator:

    def evaluate(self, prompt: str, llm_client) -> dict:
        """
        Returns:
        {
            "responses": List[dict],
            "consensus_score": float,
            "consistent": bool
        }
        """
Lógica
Ejecutar LLM N veces (misma entrada)
Normalizar outputs (JSON canonical)
Comparar:
claims
evaluaciones clave
Score:

SUPOSICION - INFERENCIA NO VERIFICADA
Se puede usar:

Jaccard similarity sobre claims
o embedding similarity
3.2 cross_model_validator.py
Objetivo

Validar consistencia entre modelos distintos.

Config
PRIMARY_MODEL = "llama3.2"
SECONDARY_MODEL = "mistral"
AGREEMENT_THRESHOLD = 0.65
Interfaz
class CrossModelValidator:

    def evaluate(self, prompt: str) -> dict:
        """
        Returns:
        {
            "model_a_output": dict,
            "model_b_output": dict,
            "agreement_score": float,
            "agreement": bool
        }
        """
Lógica
Ejecutar ambos modelos
Comparar:
claims
conclusión general
Si no hay acuerdo → flag
3.3 confidence_scorer.py
Objetivo

Calcular confianza global del resultado.

Interfaz
class ConfidenceScorer:

    def compute(self, signals: dict) -> float:
        """
        signals = {
            "engine_consistency": bool,
            "schema_valid": bool,
            "self_consistency_score": float,
            "cross_model_agreement": float,
            "grounding_score": float
        }
        """
Fórmula base

SUPOSICION - INFERENCIA NO VERIFICADA

score = (
    0.3 * engine_consistency +
    0.2 * schema_valid +
    0.2 * self_consistency +
    0.2 * cross_model +
    0.1 * grounding
)
3.4 decision_engine.py
Objetivo

Determinar el estado final del output.

Estados
ACCEPTED
REJECTED
NEEDS_HUMAN_REVIEW
Interfaz
class DecisionEngine:

    def decide(self, confidence: float, flags: dict) -> str:
        """
        flags = {
            "engine_conflict": bool,
            "low_consensus": bool,
            "model_disagreement": bool
        }
        """
Reglas
IF engine_conflict → REJECTED

ELSE IF confidence >= 0.75 → ACCEPTED

ELSE IF confidence >= 0.5 → NEEDS_HUMAN_REVIEW

ELSE → REJECTED
3.5 eval_harness.py
Objetivo

Medir tasa de alucinación offline.

Dataset
100–500 posiciones con:
mejor jugada conocida
evaluación correcta
Interfaz

class EvalHarness:

    def run(self, dataset_path: str) -> dict:
        """
        Returns:
        {
            "hallucination_rate": float,
            "accuracy": float,
            "rejection_rate": float
        }
        """
4. Extensión del Output JSON
{
  "status": "accepted | rejected | needs_human_review",
  "confidence": 0.0,
  "signals": {
    "engine_supported": true,
    "schema_valid": true,
    "self_consistency_score": 0.0,
    "cross_model_agreement": 0.0
  },
  "claims": [
    {
      "text": "...",
      "source": "engine | feature | rag | pattern",
      "validated": true
    }
  ]
}
5. Integración con V1
Wrapper
class V2Pipeline:

    def run(self, input_data):
        v1_output = self.v1_pipeline.run(input_data)

        sc = self.self_consistency.evaluate(...)
        cm = self.cross_model.evaluate(...)
        confidence = self.scorer.compute(...)

        decision = self.decision_engine.decide(confidence, ...)

        return build_final_output(...)
6. Configuración
v2:
  enabled: true
  self_consistency:
    runs: 3
    threshold: 0.7
  cross_model:
    enabled: false
  confidence_thresholds:
    accept: 0.75
    review: 0.5
7. Logging obligatorio

Registrar:

input PGN
outputs LLM (todas las corridas)
scores intermedios
decisión final
8. Principios
Sin evidencia → no se acepta
Sin consenso → baja confianza
Conflicto con engine → rechazo inmediato
El LLM nunca es fuente de verdad