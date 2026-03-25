# Fase 0 - Schemas JSON de Interfaces

**Fecha:** Marzo 25, 2026  
**Versión:** 1.0  
**Estado:** En Desarrollo  
**Issue:** [#85](https://github.com/cmessoftware/chess_trainer/issues/85)

---

## Objetivo

Definir los schemas JSON que sirven de contrato entre los módulos de la Arquitectura Orquestada.

**Beneficios:**
- Validación automática con Pydantic
- Serialización/deserialización estándar
- Documentación auto-generada
- Contratos verificables en tests

---

## 1. Analysis Options (Input)

### Schema JSON

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AnalysisOptions",
  "type": "object",
  "properties": {
    "depth": {
      "type": "integer",
      "minimum": 10,
      "maximum": 40,
      "default": 20,
      "description": "Profundidad de análisis de Stockfish"
    },
    "enable_ml": {
      "type": "boolean",
      "default": true,
      "description": "Activar predicción ML"
    },
    "enable_rag": {
      "type": "boolean",
      "default": true,
      "description": "Activar recuperación RAG"
    },
    "enable_cv": {
      "type": "boolean",
      "default": false,
      "description": "Activar extracción CV (FEN desde imagen)"
    },
    "elo_threshold": {
      "type": ["integer", "null"],
      "minimum": 800,
      "maximum": 3000,
      "description": "ELO del jugador para adaptación pedagógica"
    },
    "focus_mode": {
      "type": "string",
      "enum": ["critical", "full", "tactical", "positional"],
      "default": "critical",
      "description": "Modo de enfoque del análisis"
    }
  },
  "required": ["depth"]
}
```

### Pydantic Model

```python
from pydantic import BaseModel, Field, validator
from typing import Optional, Literal

class AnalysisOptions(BaseModel):
    """Opciones de configuración del análisis."""
    
    depth: int = Field(
        default=20,
        ge=10,
        le=40,
        description="Profundidad de análisis de Stockfish"
    )
    
    enable_ml: bool = Field(
        default=True,
        description="Activar predicción ML"
    )
    
    enable_rag: bool = Field(
        default=True,
        description="Activar recuperación RAG"
    )
    
    enable_cv: bool = Field(
        default=False,
        description="Activar extracción CV"
    )
    
    elo_threshold: Optional[int] = Field(
        default=None,
        ge=800,
        le=3000,
        description="ELO del jugador para adaptación"
    )
    
    focus_mode: Literal["critical", "full", "tactical", "positional"] = Field(
        default="critical",
        description="Modo de enfoque"
    )
    
    @validator("depth")
    def depth_must_be_multiple_of_5(cls, v):
        """Depth debe ser múltiplo de 5 para eficiencia."""
        if v % 5 != 0:
            raise ValueError("depth must be multiple of 5")
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "depth": 20,
                "enable_ml": True,
                "enable_rag": True,
                "enable_cv": False,
                "elo_threshold": 1800,
                "focus_mode": "critical"
            }
        }
```

---

## 2. Analysis Plan (Planner Output)

### Schema JSON

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AnalysisPlan",
  "type": "object",
  "properties": {
    "game_id": {
      "type": "string",
      "format": "uuid",
      "description": "ID de la partida"
    },
    "target_moves": {
      "type": "array",
      "items": {
        "type": "integer",
        "minimum": 0
      },
      "description": "Índices de jugadas a analizar (0-based)"
    },
    "analysis_modes": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["engine", "features", "ml", "rag", "cv"]
      },
      "minItems": 1,
      "description": "Modos de análisis activos"
    },
    "priorities": {
      "type": "object",
      "additionalProperties": {
        "type": "string",
        "enum": ["high", "medium", "low"]
      },
      "description": "Prioridades por índice de jugada"
    },
    "metadata": {
      "type": "object",
      "description": "Metadata adicional del plan"
    },
    "options": {
      "$ref": "#/definitions/AnalysisOptions"
    }
  },
  "required": ["game_id", "target_moves", "analysis_modes"],
  "definitions": {
    "AnalysisOptions": {
      "type": "object"
    }
  }
}
```

### Pydantic Model

```python
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Literal
from uuid import UUID

class AnalysisPlan(BaseModel):
    """Plan de análisis generado por Planner."""
    
    game_id: UUID = Field(description="ID de la partida")
    
    target_moves: List[int] = Field(
        description="Índices de jugadas a analizar (0-based)"
    )
    
    analysis_modes: List[Literal["engine", "features", "ml", "rag", "cv"]] = Field(
        min_items=1,
        description="Modos de análisis activos"
    )
    
    priorities: Dict[int, Literal["high", "medium", "low"]] = Field(
        default_factory=dict,
        description="Prioridades por índice de jugada"
    )
    
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Metadata adicional"
    )
    
    options: AnalysisOptions = Field(
        description="Opciones originales"
    )
    
    class Config:
        schema_extra = {
            "example": {
                "game_id": "550e8400-e29b-41d4-a716-446655440000",
                "target_moves": [5, 12, 18, 23, 31],
                "analysis_modes": ["engine", "features", "ml", "rag"],
                "priorities": {
                    "5": "low",
                    "12": "high",
                    "18": "medium",
                    "23": "high",
                    "31": "medium"
                },
                "metadata": {
                    "total_moves": 45,
                    "player_color": "white",
                    "result": "1-0"
                }
            }
        }
```

---

## 3. Execution Result (Executor Output)

### Schema JSON

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ExecutionResult",
  "type": "object",
  "properties": {
    "game_id": {
      "type": "string",
      "format": "uuid"
    },
    "ply": {
      "type": "integer",
      "minimum": 0,
      "description": "Índice de jugada (0-based)"
    },
    "move_san": {
      "type": "string",
      "pattern": "^[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](=[NBRQ])?[+#]?$",
      "description": "Notación algebraica (e.g., Nf3, exd5)"
    },
    "fen_before": {
      "type": "string",
      "description": "FEN antes de la jugada"
    },
    "fen_after": {
      "type": "string",
      "description": "FEN después de la jugada"
    },
    "engine_eval_before": {
      "type": "number",
      "description": "Evaluación en centipawns antes"
    },
    "engine_eval_after": {
      "type": "number",
      "description": "Evaluación en centipawns después"
    },
    "score_diff": {
      "type": "number",
      "description": "Diferencia de evaluación (negativo = empeoró)"
    },
    "best_move": {
      "type": "string",
      "description": "Mejor jugada según engine"
    },
    "best_line": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Variante principal"
    },
    "features": {
      "type": "object",
      "description": "Features extraídos (ML)"
    },
    "tactical_tags": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Tags tácticos detectados"
    },
    "phase": {
      "type": "string",
      "enum": ["opening", "middlegame", "endgame"],
      "description": "Fase del juego"
    },
    "ml_prediction": {
      "$ref": "#/definitions/MLPrediction"
    },
    "rag_context": {
      "$ref": "#/definitions/RAGContext"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "execution_time": {
      "type": "number",
      "minimum": 0,
      "description": "Tiempo de ejecución en segundos"
    }
  },
  "required": [
    "game_id",
    "ply",
    "move_san",
    "fen_before",
    "fen_after",
    "engine_eval_before",
    "engine_eval_after",
    "score_diff"
  ],
  "definitions": {
    "MLPrediction": {
      "type": "object",
      "properties": {
        "predicted_error": {
          "type": "string",
          "enum": ["good", "inaccuracy", "mistake", "blunder"]
        },
        "confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "risk_score": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "contributing_features": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "feature_name": {"type": "string"},
              "impact": {"type": "number"}
            }
          }
        }
      },
      "required": ["predicted_error", "confidence"]
    },
    "RAGContext": {
      "type": "object",
      "properties": {
        "similar_positions": {
          "type": "array",
          "items": {"type": "object"}
        },
        "book_excerpts": {
          "type": "array",
          "items": {"type": "string"}
        },
        "player_patterns": {
          "type": "array",
          "items": {"type": "object"}
        },
        "total_retrieved": {
          "type": "integer",
          "minimum": 0
        },
        "relevance_scores": {
          "type": "array",
          "items": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          }
        }
      }
    }
  }
}
```

### Pydantic Model

```python
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional, Any, Literal
from datetime import datetime
from uuid import UUID

class MLPrediction(BaseModel):
    """Predicción del modelo ML."""
    
    predicted_error: Literal["good", "inaccuracy", "mistake", "blunder"]
    confidence: float = Field(ge=0.0, le=1.0)
    risk_score: float = Field(ge=0.0, le=1.0)
    contributing_features: List[Dict[str, Any]] = Field(default_factory=list)

class RAGContext(BaseModel):
    """Contexto recuperado del RAG."""
    
    similar_positions: List[Dict] = Field(default_factory=list)
    book_excerpts: List[str] = Field(default_factory=list)
    player_patterns: List[Dict] = Field(default_factory=list)
    total_retrieved: int = Field(ge=0)
    relevance_scores: List[float] = Field(default_factory=list)

class ExecutionResult(BaseModel):
    """Resultado de ejecución de análisis de una jugada."""
    
    # Identificación
    game_id: UUID
    ply: int = Field(ge=0)
    move_san: str
    fen_before: str
    fen_after: str
    
    # Evaluación Engine
    engine_eval_before: float
    engine_eval_after: float
    score_diff: float
    best_move: str
    best_line: List[str] = Field(default_factory=list)
    
    # Features
    features: Dict[str, float] = Field(default_factory=dict)
    tactical_tags: List[str] = Field(default_factory=list)
    phase: Literal["opening", "middlegame", "endgame"]
    
    # ML + RAG
    ml_prediction: Optional[MLPrediction] = None
    rag_context: Optional[RAGContext] = None
    
    # Metadata
    timestamp: datetime = Field(default_factory=datetime.now)
    execution_time: float = Field(ge=0.0)
    
    @validator("score_diff", always=True)
    def compute_score_diff(cls, v, values):
        """Auto-calcula score_diff si no está presente."""
        if v is None:
            return values["engine_eval_after"] - values["engine_eval_before"]
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "game_id": "550e8400-e29b-41d4-a716-446655440000",
                "ply": 12,
                "move_san": "Bxf7+",
                "fen_before": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -",
                "fen_after": "r1bqkb1r/pppp1Bpp/2n2n2/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq -",
                "engine_eval_before": 50,
                "engine_eval_after": -150,
                "score_diff": -200,
                "best_move": "Nc3",
                "best_line": ["Nc3", "d6", "d4", "exd4"],
                "features": {
                    "king_safety": 0.3,
                    "material_balance": 0.0,
                    "center_control": 0.6
                },
                "tactical_tags": ["sacrifice", "discovered_check"],
                "phase": "middlegame",
                "ml_prediction": {
                    "predicted_error": "blunder",
                    "confidence": 0.92,
                    "risk_score": 0.95,
                    "contributing_features": [
                        {"feature_name": "king_safety", "impact": -0.4},
                        {"feature_name": "material_balance", "impact": -0.3}
                    ]
                },
                "execution_time": 2.35
            }
        }
```

---

## 4. Critic Result (Critic Output)

### Schema JSON

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CriticResult",
  "type": "object",
  "properties": {
    "is_consistent": {
      "type": "boolean",
      "description": "¿Pasa todas las reglas de validación?"
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "Confianza en la coherencia (0-1)"
    },
    "issues": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/ValidationIssue"
      },
      "description": "Problemas detectados"
    },
    "passed_rules": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Nombres de reglas que pasaron"
    },
    "failed_rules": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Nombres de reglas que fallaron"
    }
  },
  "required": ["is_consistent", "confidence", "issues"],
  "definitions": {
    "ValidationIssue": {
      "type": "object",
      "properties": {
        "rule_name": {
          "type": "string",
          "description": "Nombre de la regla"
        },
        "severity": {
          "type": "string",
          "enum": ["error", "warning", "info"],
          "description": "Severidad del problema"
        },
        "message": {
          "type": "string",
          "description": "Mensaje descriptivo"
        },
        "context": {
          "type": "object",
          "description": "Contexto adicional para debugging"
        }
      },
      "required": ["rule_name", "severity", "message"]
    }
  }
}
```

### Pydantic Model

```python
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Literal

class ValidationIssue(BaseModel):
    """Problema detectado por el Critic."""
    
    rule_name: str = Field(description="Nombre de la regla")
    severity: Literal["error", "warning", "info"]
    message: str = Field(description="Mensaje descriptivo")
    context: Dict[str, Any] = Field(
        default_factory=dict,
        description="Contexto adicional"
    )
    
    class Config:
        schema_extra = {
            "example": {
                "rule_name": "BlunderScoreThreshold",
                "severity": "error",
                "message": "ML predice blunder pero score_diff es solo -50 cp (esperado >= -200)",
                "context": {
                    "score_diff": -50,
                    "ml_confidence": 0.95,
                    "expected_min": -200
                }
            }
        }

class CriticResult(BaseModel):
    """Resultado de validación del Critic."""
    
    is_consistent: bool = Field(description="¿Pasa validación?")
    confidence: float = Field(ge=0.0, le=1.0, description="Confianza 0-1")
    issues: List[ValidationIssue] = Field(default_factory=list)
    passed_rules: List[str] = Field(default_factory=list)
    failed_rules: List[str] = Field(default_factory=list)
    
    @validator("is_consistent", always=True)
    def consistent_if_no_errors(cls, v, values):
        """is_consistent debe ser False si hay issues con severity=error."""
        issues = values.get("issues", [])
        has_errors = any(issue.severity == "error" for issue in issues)
        
        if has_errors and v:
            raise ValueError("Cannot be consistent with error-level issues")
        
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "is_consistent": False,
                "confidence": 0.65,
                "issues": [
                    {
                        "rule_name": "BlunderScoreThreshold",
                        "severity": "error",
                        "message": "ML predice blunder pero score_diff muy bajo",
                        "context": {"score_diff": -50}
                    }
                ],
                "passed_rules": [
                    "PositionLegalityCheck",
                    "TacticalEvidenceRequired"
                ],
                "failed_rules": [
                    "BlunderScoreThreshold"
                ]
            }
        }
```

---

## 5. Enriched Result (Final Output)

### Schema JSON

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "EnrichedResult",
  "type": "object",
  "properties": {
    "execution_result": {
      "$ref": "#/definitions/ExecutionResult"
    },
    "explanation": {
      "type": "string",
      "description": "Explicación pedagógica generada por LLM"
    },
    "critic_result": {
      "$ref": "#/definitions/CriticResult"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "plan_priority": {
          "type": "string",
          "enum": ["high", "medium", "low"]
        },
        "version": {
          "type": "string",
          "pattern": "^v\\d+\\.\\d+",
          "description": "Versión de arquitectura (e.g., v2.0)"
        },
        "requires_review": {
          "type": "boolean",
          "description": "¿Requiere revisión manual?"
        }
      }
    }
  },
  "required": ["execution_result", "explanation", "critic_result"]
}
```

### Pydantic Model

```python
from pydantic import BaseModel, Field
from typing import Dict, Any, Literal, Optional

class EnrichedResult(BaseModel):
    """Resultado enriquecido con explicación y crítica."""
    
    execution_result: ExecutionResult
    explanation: str = Field(description="Explicación pedagógica")
    critic_result: CriticResult
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @property
    def is_high_quality(self) -> bool:
        """Helper: resultado de alta calidad."""
        return (
            self.critic_result.is_consistent and
            self.critic_result.confidence >= 0.85
        )
    
    @property
    def requires_review(self) -> bool:
        """Helper: requiere revisión manual."""
        return (
            not self.critic_result.is_consistent or
            self.critic_result.confidence < 0.70
        )
    
    class Config:
        schema_extra = {
            "example": {
                "execution_result": {
                    "game_id": "550e8400-e29b-41d4-a716-446655440000",
                    "ply": 12,
                    "move_san": "Nc3",
                    "score_diff": 30,
                    "best_move": "Nc3",
                    "phase": "opening"
                },
                "explanation": "Nc3 desarrolla el caballo hacia el centro con tempo. Esta jugada mejora la coordinación de piezas y prepara el enroque corto. La evaluación mejora +30 cp según Stockfish.",
                "critic_result": {
                    "is_consistent": True,
                    "confidence": 0.95,
                    "issues": [],
                    "passed_rules": ["BlunderScoreThreshold", "EngineSupportRequired"]
                },
                "metadata": {
                    "plan_priority": "medium",
                    "version": "v2.0-orchestrated",
                    "requires_review": False
                }
            }
        }
```

---

## 6. Analysis Report (Complete Output)

### Schema JSON

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AnalysisReport",
  "type": "object",
  "properties": {
    "game_id": {
      "type": "string",
      "format": "uuid"
    },
    "player_id": {
      "type": "integer"
    },
    "total_moves_analyzed": {
      "type": "integer",
      "minimum": 0
    },
    "enriched_results": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/EnrichedResult"
      }
    },
    "player_patterns": {
      "$ref": "#/definitions/PlayerPatterns"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "analysis_duration": {
          "type": "number",
          "description": "Duración total en segundos"
        },
        "total_consistent": {
          "type": "integer",
          "description": "Cantidad de resultados consistentes"
        },
        "avg_confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "error_distribution": {
          "type": "object",
          "description": "Distribución de tipos de error"
        }
      }
    }
  },
  "required": ["game_id", "player_id", "total_moves_analyzed", "enriched_results"]
}
```

### Pydantic Model

```python
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from uuid import UUID

class AnalysisReport(BaseModel):
    """Reporte completo de análisis de partida."""
    
    game_id: UUID
    player_id: int
    total_moves_analyzed: int = Field(ge=0)
    enriched_results: List[EnrichedResult]
    player_patterns: Optional["PlayerPatterns"] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @property
    def consistency_rate(self) -> float:
        """% de resultados consistentes."""
        if not self.enriched_results:
            return 0.0
        consistent = sum(1 for r in self.enriched_results if r.critic_result.is_consistent)
        return consistent / len(self.enriched_results)
    
    @property
    def avg_confidence(self) -> float:
        """Confianza promedio."""
        if not self.enriched_results:
            return 0.0
        confidences = [r.critic_result.confidence for r in self.enriched_results]
        return sum(confidences) / len(confidences)
    
    class Config:
        schema_extra = {
            "example": {
                "game_id": "550e8400-e29b-41d4-a716-446655440000",
                "player_id": 42,
                "total_moves_analyzed": 15,
                "enriched_results": [],
                "metadata": {
                    "analysis_duration": 45.2,
                    "total_consistent": 14,
                    "avg_confidence": 0.92,
                    "error_distribution": {
                        "good": 8,
                        "inaccuracy": 5,
                        "mistake": 2,
                        "blunder": 0
                    }
                }
            }
        }
```

---

## 7. Player Patterns (Memory Output)

### Schema JSON

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PlayerPatterns",
  "type": "object",
  "properties": {
    "player_id": {
      "type": "integer"
    },
    "total_games_analyzed": {
      "type": "integer",
      "minimum": 0
    },
    "total_moves_analyzed": {
      "type": "integer",
      "minimum": 0
    },
    "error_distribution": {
      "type": "object",
      "additionalProperties": {
        "type": "number",
        "minimum": 0,
        "maximum": 1
      },
      "description": "Distribución de tipos de error (frecuencia 0-1)"
    },
    "frequent_tactics": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "tactic": {"type": "string"},
          "count": {"type": "integer"}
        }
      },
      "description": "Tácticas más frecuentes"
    },
    "weak_phases": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["opening", "middlegame", "endgame"]
      }
    },
    "phase_error_rates": {
      "type": "object",
      "description": "Tasa de error por fase"
    },
    "improvement_trend": {
      "type": "number",
      "minimum": -1,
      "maximum": 1,
      "description": "Tendencia de mejora (-1: empeorando, +1: mejorando)"
    },
    "recent_avg_error_rate": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "error_clusters": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/ErrorCluster"
      }
    }
  },
  "required": ["player_id", "total_games_analyzed", "total_moves_analyzed"]
}
```

### Pydantic Model

```python
from pydantic import BaseModel, Field
from typing import List, Dict, Literal

class ErrorCluster(BaseModel):
    """Cluster de errores similares."""
    
    cluster_id: int
    description: str
    size: int = Field(ge=0)
    representative_positions: List[str] = Field(default_factory=list)
    recurrence_frequency: float = Field(ge=0.0, le=1.0)

class PlayerPatterns(BaseModel):
    """Patrones agregados de un jugador."""
    
    player_id: int
    total_games_analyzed: int = Field(ge=0)
    total_moves_analyzed: int = Field(ge=0)
    
    error_distribution: Dict[str, float] = Field(default_factory=dict)
    frequent_tactics: List[Dict[str, Any]] = Field(default_factory=list)
    weak_phases: List[Literal["opening", "middlegame", "endgame"]] = Field(default_factory=list)
    phase_error_rates: Dict[str, float] = Field(default_factory=dict)
    
    improvement_trend: float = Field(ge=-1.0, le=1.0)
    recent_avg_error_rate: float = Field(ge=0.0, le=1.0)
    
    error_clusters: List[ErrorCluster] = Field(default_factory=list)
    
    class Config:
        schema_extra = {
            "example": {
                "player_id": 42,
                "total_games_analyzed": 50,
                "total_moves_analyzed": 1250,
                "error_distribution": {
                    "good": 0.72,
                    "inaccuracy": 0.18,
                    "mistake": 0.08,
                    "blunder": 0.02
                },
                "frequent_tactics": [
                    {"tactic": "fork", "count": 23},
                    {"tactic": "pin", "count": 15}
                ],
                "weak_phases": ["endgame"],
                "phase_error_rates": {
                    "opening": 0.12,
                    "middlegame": 0.08,
                    "endgame": 0.25
                },
                "improvement_trend": 0.35,
                "recent_avg_error_rate": 0.09
            }
        }
```

---

## 8. Validation con Pydantic

### Auto-validación en Endpoints

```python
from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

router = APIRouter()

@router.post("/api/analysis/orchestrated/{game_id}", response_model=AnalysisReport)
async def analyze_game_orchestrated(
    game_id: UUID,
    options: AnalysisOptions  # Auto-valida según schema
) -> AnalysisReport:
    """
    Endpoint de análisis con validación automática.
    
    FastAPI + Pydantic validan:
    - Tipos correctos
    - Constraints (ge, le, min_items, etc.)
    - Enums
    - Formatos (UUID, datetime, etc.)
    """
    try:
        # Use case execution
        report = await analyze_game_use_case.execute(game_id, options)
        return report  # Auto-serializa según schema
        
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors())
```

---

## 9. Testing con Schemas

### Pytest Fixtures

```python
import pytest
from pydantic import ValidationError

def test_analysis_options_valid():
    """Schema válido."""
    options = AnalysisOptions(
        depth=20,
        enable_ml=True,
        focus_mode="critical"
    )
    assert options.depth == 20
    assert options.enable_ml is True

def test_analysis_options_invalid_depth():
    """Depth inválido."""
    with pytest.raises(ValidationError) as exc_info:
        AnalysisOptions(depth=5)  # Menor a mínimo (10)
    
    assert "greater than or equal to 10" in str(exc_info.value)

def test_analysis_options_invalid_focus_mode():
    """Focus mode inválido."""
    with pytest.raises(ValidationError):
        AnalysisOptions(focus_mode="invalid")  # No está en enum

def test_execution_result_auto_score_diff():
    """score_diff se auto-calcula."""
    result = ExecutionResult(
        game_id=UUID("550e8400-e29b-41d4-a716-446655440000"),
        ply=10,
        move_san="Nf3",
        fen_before="...",
        fen_after="...",
        engine_eval_before=50,
        engine_eval_after=30,
        phase="middlegame"
    )
    assert result.score_diff == -20  # 30 - 50
```

---

## 10. Documentación Auto-generada

### OpenAPI Schema

FastAPI genera automáticamente:

```json
{
  "openapi": "3.0.0",
  "paths": {
    "/api/analysis/orchestrated/{game_id}": {
      "post": {
        "summary": "Analyze Game Orchestrated",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AnalysisOptions"
              }
            }
          }
        },
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AnalysisReport"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "AnalysisOptions": { ... },
      "AnalysisReport": { ... }
    }
  }
}
```

**Accesible en:** `http://localhost:8000/docs` (Swagger UI)

---

## Próximos Pasos

1. ✅ **JSON Schemas definidos**
2. ⏭️ **Crear plan de migración DB** (siguiente documento)
3. ⏭️ **Implementar Pydantic models en código**
4. ⏭️ **Agregar tests de validación**

---

**Documento creado:** Marzo 25, 2026  
**Autor:** AI Assistant + sergiosal  
**Estado:** DRAFT v1.0
