# 🎭 Specification: Orchestrated Architecture v2.0

## Overview

The **Orchestrated Architecture v2.0** is the intelligent core of ChessInsightAI. It is inspired by the **Plan-Execute-Evaluate** pattern used in multi-agent systems. It coordinates Stockfish, ML, RAG, and LLMs to provide complete analysis and pedagogical explanations.

---

# Main Components

## 1. `Planner Service` (`planner_service.py`)

**Responsibility**: Analyze the position and decide which analyses to execute.

### Input

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

### Planning Logic

```python
def plan_analysis(fen, player_elo, phase):
    plan = AnalysisPlan()
    
    # Determine analysis sources according to game phase
    if phase == "opening":
        plan.priority_sources = ["rag_books", "engine", "ml"]  # Theory first
    elif phase == "middlegame":
        plan.priority_sources = ["engine", "ml", "rag"]  # Tactics first
    else:  # endgame
        plan.priority_sources = ["engine", "ml", "tablebases"]  # Precision first
    
    # Adjust depth according to player rating
    if player_elo >= 2600:
        plan.engine_depth = 25
    elif player_elo >= 2200:
        plan.engine_depth = 20
    else:
        plan.engine_depth = 15
    
    return plan
```

### Output

```python
AnalysisPlan = {
    "game_id": "sha256_hash",
    "ply": 1,
    "fen": "...",
    "priority_sources": ["engine", "ml", "rag"],
    "engine_depth": 20,
    "rag_k": 5,  # Top 5 similar positions
    "phase": "opening"
}
```

---

## 2. `Executor Service` (`executor_service.py`)

**Responsibility**: Execute analyses in parallel (Engine, ML, RAG).

### Input

```python
AnalysisPlan  # From Planner
```

### Parallel Execution

```python
async def execute_analysis(plan: AnalysisPlan) -> ExecutionResult:
    """Executes analyses in parallel from multiple sources."""
    
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

### Engine Analysis

```python
{
    "best_move": "e4",
    "best_move_uci": "e2e4",
    "evaluation": 0.5,  # centipawns
    "depth": 20,
    "pv": ["e2e4", "c7c5", "g1f3", ...],  # Principal Variation
}
```

### ML Prediction

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

### RAG Retrieval

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

### Output (`ExecutionResult`)

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

## 3. `Critic Service` (`critic_service.py`)

**Responsibility**: Validate results and detect inconsistencies.

### Validations

```python
def validate_execution(result: ExecutionResult) -> ValidationResult:
    """Validates result consistency."""
    
    issues = []
    
    # ✓ Validate Engine and ML classification consistency
    engine_error = classify_by_score(result.engine.score_diff)
    ml_error = result.ml_prediction.predicted_error
    
    if engine_error != ml_error:
        issues.append(f"Inconsistency: Engine → {engine_error}, ML → {ml_error}")
    
    # ✓ Validate prediction confidence
    if result.ml_prediction.confidence < 0.7:
        issues.append(f"Low confidence: {result.ml_prediction.confidence:.2f}")
    
    # ✓ Validate feature ranges
    for feat, val in result.features.items():
        if not in_valid_range(feat, val):
            issues.append(f"Feature out of range: {feat} = {val}")
    
    return ValidationResult(
        is_valid=len(issues) == 0,
        issues=issues,
        confidence_score=calculate_confidence(result)
    )
```

### Output

```python
ValidationResult = {
    "is_valid": True,
    "issues": [],
    "confidence_score": 0.92,
    "warnings": []
}
```

---

## 4. `Memory Service` (`memory_service.py`)

**Responsibility**: Persist analyses and learn player patterns.

### Storage

```python
async def store_analysis(result: ExecutionResult, validation: ValidationResult):
    """Stores result in database and updates player memory."""
    
    # 1. Store individual analysis
    await db.moves.insert_one({
        "game_id": result.game_id,
        "ply": result.ply,
        "fen": result.fen,
        "move_played": result.move_played,
        "features": result.features,
        "ml_prediction": result.ml_prediction,
        "timestamp": datetime.now()
    })
    
    # 2. Update player statistics
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

### Player Statistics

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
        "improvement_trend": 0.95,  # Improving
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

# Complete Orchestrated Pipeline Flow

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. INPUT: PGN + Player Context                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 2. PLANNER: Analyzes position, selects strategy             │
│    ├─ Opening? → Prioritize RAG                             │
│    ├─ Middlegame? → Prioritize Engine                       │
│    └─ Endgame? → Prioritize Tablebases                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 3. EXECUTOR: Executes analyses IN PARALLEL                  │
│    ├─ Engine: Stockfish eval + PV                           │
│    ├─ ML: Error prediction + confidence                     │
│    └─ RAG: Similar positions + books                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 4. CRITIC: Validates consistency and confidence             │
│    ├─ Engine ≈ ML?                                          │
│    ├─ Confidence > threshold?                               │
│    └─ Valid features?                                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 5. MEMORY: Stores in DB, updates profile                    │
│    ├─ INSERT into moves table                               │
│    ├─ UPDATE player statistics                              │
│    └─ Detect error patterns                                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 6. OUTPUT: AnalysisResult                                   │
│    {                                                        │
│        "game_id": "...",                                    │
│        "move": "e4",                                        │
│        "classification": "good",                            │
│        "confidence": 0.94,                                  │
│        "engine_eval": 0.5,                                  │
│        "similar_positions": [...],                          │
│        "explanation": "Good opening move..."                │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
```

---

# Game Phases and Analysis Strategies

## Opening (moves 1-15)

- **Goal**: Understand opening theory
- **Strategy**: Prioritize RAG + books → Engine for surprises
- **Engine depth**: 18-20
- **RAG k**: 5-10 similar positions

## Middlegame (moves 15-40)

- **Goal**: Identify tactical mistakes
- **Strategy**: Prioritize Engine → ML → RAG for context
- **Engine depth**: 20-25
- **RAG k**: 3-5 similar positions

## Endgame (moves 40+)

- **Goal**: Master endgame technique
- **Strategy**: Prioritize Engine + Tablebases → ML for patterns
- **Engine depth**: 25-30
- **RAG k**: 1-3 similar positions (tablebases)

---

# Integration with LLM for Explanations

Once orchestration is complete, the results are sent to the LLM (Llama 3.1) to generate pedagogical explanations:

```python
async def explain_move(result: ExecutionResult, player_level: str):
    """Generates a natural language explanation."""
    
    prompt = f"""
    Position: {result.fen}
    Move played: {result.move_played}
    Best move according to Stockfish: {result.engine.best_move}
    
    Error classification: {result.ml_prediction.predicted_error}
    Confidence: {result.ml_prediction.confidence * 100:.1f}%
    
    Similar book context: {result.rag_context.book_references}
    
    Generate a pedagogical explanation for a {player_level} player.
    Be concise, clear, and teach the player WHY the move was a mistake.
    """
    
    explanation = await llm.generate(prompt, max_tokens=200)
    
    return explanation
```

### Example Output

> "In this position, you controlled the center well, but your move allowed Black to counterattack on the queenside. Stockfish suggested f3, which reinforces control and prevents invasion on d4. At your level, it is important to recognize when your opponent has tactical resources."

---

# Metrics and Observability

## MLflow Tracking

```python
# Log each analysis
mlflow.start_run()

mlflow.log_param("phase", plan.phase)
mlflow.log_param("engine_depth", plan.engine_depth)

mlflow.log_metric("ml_confidence", result.ml_prediction.confidence)
mlflow.log_metric("validation_passed", validation.is_valid)

mlflow.end_run()
```

## Prometheus Metrics (optional)

- `chess_analyses_total`: Total analyses performed
- `chess_error_rate`: Percentage of detected mistakes
- `engine_analysis_duration_ms`: Average engine analysis time
- `ml_prediction_confidence`: Average ML confidence

---

# Future Improvements

1. **Full async support**: All operations should be asynchronous
2. **Position caching**: Avoid re-evaluating identical positions
3. **User feedback**: Allow users to correct classifications
4. **Active Learning**: Train models using real-time feedback
5. **Endgame tablebases**: Integrate Syzygy tablebases
6. **Enhanced explainability**: SHAP values + visualization