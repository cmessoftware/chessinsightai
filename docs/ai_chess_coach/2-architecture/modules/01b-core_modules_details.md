# 🎭 Especificación: Arquitectura Orquestada v2.0

## Visión General

La **Arquitectura Orquestada v2.0** es el corazón inteligente de ChessInsightAI. Se inspira en el patrón **Plan-Execute-Evaluate** de sistemas multi-agente. Coordina Stockfish, ML, RAG y LLM para proporcionar análisis completos y explicaciones pedagogógicas.

---

## Componentes Principales

### 1. **Planner Service** (`planner_service.py`)

**Responsabilidad**: Analizar la posición y decidir qué análisis ejecutar.

#### Entrada
```python
AnalysisPlan = {
    "game_id": "sha256_hash",
    "ply": 1,
    "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    "player_elo": 2830,
    "player_color": "white",
    "game_phase": "opening"  # opening | middlegame | endgame
}
```

#### Lógica de Planificación
```python
def plan_analysis(fen, player_elo, phase):
    plan = AnalysisPlan()
    
    # Determinar fuentes de análisis según fase
    if phase == "opening":
        plan.priority_sources = ["rag_books", "engine", "ml"]  # Teoría primero
    elif phase == "middlegame":
        plan.priority_sources = ["engine", "ml", "rag"]  # Táctica primero
    else:  # endgame
        plan.priority_sources = ["engine", "ml", "tablebases"]  # Precisión primero
    
    # Ajustar profundidad según rating
    if player_elo >= 2600:
        plan.engine_depth = 25
    elif player_elo >= 2200:
        plan.engine_depth = 20
    else:
        plan.engine_depth = 15
    
    return plan
```

#### Salida
```python
AnalysisPlan = {
    "game_id": "sha256_hash",
    "ply": 1,
    "fen": "...",
    "priority_sources": ["engine", "ml", "rag"],
    "engine_depth": 20,
    "rag_k": 5,  # Top 5 posiciones similares
    "phase": "opening"
}
```

---

### 2. **Executor Service** (`executor_service.py`)

**Responsabilidad**: Ejecutar análisis en paralelo (Engine, ML, RAG).

#### Entrada
```python
AnalysisPlan  # Del Planner
```

#### Ejecución Paralela
```python
async def execute_analysis(plan: AnalysisPlan) -> ExecutionResult:
    """Ejecuta análisis en paralelo desde múltiples fuentes."""
    
    tasks = [
        asyncio.create_task(engine_analysis(plan)),
        asyncio.create_task(ml_prediction(plan)),
        asyncio.create_task(rag_retrieval(plan)),
    ]
    
    results = await asyncio.gather(*tasks)
    return ExecutionResult(
        engine_result=results[0],
        ml_result=results[1],
        rag_result=results[2]
    )
```

#### Engine Analysis
```python
{
    "best_move": "e4",
    "best_move_uci": "e2e4",
    "evaluation": 0.5,  # centipawns
    "depth": 20,
    "pv": ["e2e4", "c7c5", "g1f3", ...],  # Principal Variation
}
```

#### ML Prediction
```python
{
    "predicted_error": "good",
    "confidence": 0.94,
    "probabilities": {
        "good": 0.94,
        "inaccuracy": 0.04,
        "mistake": 0.01,
        "blunder": 0.01
    },
    "contributing_features": ["score_diff", "material_balance"]
}
```

#### RAG Retrieval
```python
{
    "similar_positions": [
        {
            "fen": "...",
            "opening": "Sicilian Defense: Najdorf",
            "distance": 0.05,
            "next_moves": ["a6", "Nf6", "e5"]
        }
    ],
    "book_references": [
        {
            "book": "My System - Aron Nimzowitsch",
            "principle": "Control the center",
            "relevance": 0.87
        }
    ]
}
```

#### Salida (ExecutionResult)
```python
ExecutionResult = {
    "game_id": "sha256_hash",
    "ply": 1,
    "fen": "...",
    "move_played": "e4",
    "engine": {
        "best_move": "e4",
        "evaluation": 0.5,
        "depth": 20
    },
    "ml_prediction": {
        "predicted_error": "good",
        "confidence": 0.94
    },
    "rag_context": {
        "similar_positions": [...],
        "book_references": [...]
    }
}
```

---

### 3. **Critic Service** (`critic_service.py`)

**Responsabilidad**: Validar resultados y detectar inconsistencias.

#### Validaciones
```python
def validate_execution(result: ExecutionResult) -> ValidationResult:
    """Valida consistencia de resultados."""
    
    issues = []
    
    # ✓ Validar que Engine y ML coinciden en clasificación
    engine_error = classify_by_score(result.engine.score_diff)
    ml_error = result.ml_prediction.predicted_error
    
    if engine_error != ml_error:
        issues.append(f"Inconsistencia: Engine → {engine_error}, ML → {ml_error}")
    
    # ✓ Validar confianza de predicción
    if result.ml_prediction.confidence < 0.7:
        issues.append(f"Baja confianza: {result.ml_prediction.confidence:.2f}")
    
    # ✓ Validar features están dentro de rango
    for feat, val in result.features.items():
        if not in_valid_range(feat, val):
            issues.append(f"Feature fuera de rango: {feat} = {val}")
    
    return ValidationResult(
        is_valid=len(issues) == 0,
        issues=issues,
        confidence_score=calculate_confidence(result)
    )
```

#### Salida
```python
ValidationResult = {
    "is_valid": True,
    "issues": [],
    "confidence_score": 0.92,
    "warnings": []
}
```

---

### 4. **Memory Service** (`memory_service.py`)

**Responsabilidad**: Persiste análisis y aprende patrones del jugador.

#### Almacenamiento
```python
async def store_analysis(result: ExecutionResult, validation: ValidationResult):
    """Almacena resultado en base de datos y actualiza memoria del jugador."""
    
    # 1. Guardar análisis individual
    await db.moves.insert_one({
        "game_id": result.game_id,
        "ply": result.ply,
        "fen": result.fen,
        "move_played": result.move_played,
        "features": result.features,
        "ml_prediction": result.ml_prediction,
        "timestamp": datetime.now()
    })
    
    # 2. Actualizar estadísticas del jugador
    player_profile = await db.players.find_one({"id": result.player_id})
    
    player_profile["stats"].update({
        "games_analyzed": player_profile.get("games_analyzed", 0) + 1,
        "error_distribution": update_distribution(
            player_profile["error_distribution"],
            result.ml_prediction.predicted_error
        ),
        "common_mistakes": update_mistakes(
            player_profile["common_mistakes"],
            result
        )
    })
    
    await db.players.update_one({"id": result.player_id}, {"$set": player_profile})
```

#### Estadísticas del Jugador
```python
player_profile = {
    "player_id": "user_123",
    "stats": {
        "games_analyzed": 45,
        "total_moves_analyzed": 1800,
        "average_error_rate": 0.12,
        "error_distribution": {
            "good": 0.70,
            "inaccuracy": 0.18,
            "mistake": 0.10,
            "blunder": 0.02
        },
        "improvement_trend": 0.95,  # Mejorando
        "common_mistakes": [
            {
                "position_pattern": "weak_king_safety",
                "frequency": 15,
                "severity": "blunder"
            }
        ]
    }
}
```

---

## Flujo Completo del Pipeline Orquestado

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ENTRADA: PGN + Contexto del Jugador                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 2. PLANNER: Analiza posición, elige estrategia            │
│    ├─ ¿Apertura? → Priorizar RAG                         │
│    ├─ ¿Mediojuego? → Priorizar Engine                    │
│    └─ ¿Final? → Priorizar Tablebases                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 3. EXECUTOR: Ejecuta análisis EN PARALELO                 │
│    ├─ Engine: Stockfish eval + PV                        │
│    ├─ ML: Predicción error + confianza                   │
│    └─ RAG: Posiciones similares + libros                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 4. CRITIC: Valida consistencia y confianza               │
│    ├─ ¿Engine ≈ ML?                                      │
│    ├─ ¿Confianza > umbral?                               │
│    └─ ¿Features válidas?                                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 5. MEMORY: Almacena en DB, actualiza perfil              │
│    ├─ INSERT en tabla moves                              │
│    ├─ UPDATE stats del jugador                           │
│    └─ Detecta patrones de error                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 6. SALIDA: AnalysisResult                                │
│    {                                                       │
│        "game_id": "...",                                 │
│        "move": "e4",                                     │
│        "classification": "good",                         │
│        "confidence": 0.94,                               │
│        "engine_eval": 0.5,                               │
│        "similar_positions": [...],                       │
│        "explanation": "Buena jugada abridor..."          │
│    }                                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Fases del Juego y Estrategias de Análisis

### Apertura (moves 1-15)
- **Objetivo**: Comprender la teoría de aperturas
- **Estrategia**: Priorizar RAG + libros → Engine para "sorpresas"
- **Engine depth**: 18-20
- **RAG k**: 5-10 posiciones similares

### Mediojuego (moves 15-40)
- **Objetivo**: Identificar errores tácticos
- **Estrategia**: Priorizar Engine → ML → RAG para contexto
- **Engine depth**: 20-25
- **RAG k**: 3-5 posiciones similares

### Final (moves 40+)
- **Objetivo**: Dominar técnica de finales
- **Estrategia**: Priorizar Engine + Tablebases → ML para patrones
- **Engine depth**: 25-30
- **RAG k**: 1-3 posiciones similares (tablebases)

---

## Integración con LLM para Explicaciones

Una vez completada la orquestación, los resultados se envían al LLM (Llama 3.1) para generar explicaciones pedagogógicas:

```python
async def explain_move(result: ExecutionResult, player_level: str):
    """Genera explicación en lenguaje natural."""
    
    prompt = f"""
    Posición: {result.fen}
    Movimiento jugado: {result.move_played}
    Mejor movimiento según Stockfish: {result.engine.best_move}
    
    Clasificación del error: {result.ml_prediction.predicted_error}
    Confianza: {result.ml_prediction.confidence * 100:.1f}%
    
    Contexto similar de libros: {result.rag_context.book_references}
    
    Genera una explicación pedagógica para un jugador de nivel {player_level}.
    Sé conciso, claro y educa al jugador sobre POR QUÉ fue un error.
    """
    
    explanation = await llm.generate(prompt, max_tokens=200)
    return explanation
```

**Salida de ejemplo**:
> "En esta posición, dominaste el centro, pero tu movimiento permitió que las negras contraatacaran el flanco de reina. Stockfish sugería f3, que refuerza el control y evita la invasión en d4. A tu nivel, es importante reconocer cuándo tu oponente tiene recursos tácticos."

---

## Métricas y Observabilidad

### MLflow Tracking
```python
# Log de cada análisis
mlflow.start_run()
mlflow.log_param("phase", plan.phase)
mlflow.log_param("engine_depth", plan.engine_depth)
mlflow.log_metric("ml_confidence", result.ml_prediction.confidence)
mlflow.log_metric("validation_passed", validation.is_valid)
mlflow.end_run()
```

### Prometheus Metrics (si aplica)
- `chess_analyses_total`: Total de análisis realizados
- `chess_error_rate`: % de errores detectados
- `engine_analysis_duration_ms`: Tiempo promedio del engine
- `ml_prediction_confidence`: Confianza promedio de ML

---

## Próximas Mejoras

1. **Async completo**: Todas las operaciones deben ser async
2. **Caché de posiciones**: No re-evaluar posiciones idénticas
3. **Feedback del usuario**: Permitir que usuario corrija clasificaciones
4. **Active Learning**: Entrenar modelo con feedback en tiempo real
5. **Tabla de finales**: Integrar Syzygy tablebases
6. **Explicabilidad mejorada**: SHAP values + visualización
