# 01-core_modules

## 🔧 01-Technical Specification: Core Modules
## ETL Pipeline and Traceability

### Objective
Define the complete traceability structure from a PGN file to an ML error prediction.

### Input
- PGN file with multiple games
- Player metadata (name, ELO, time control)

### Process
1. **Parsing**: Extract metadata and moves
2. **Analysis**: Calculate evaluations with Stockfish
3. **Extraction**: Generate 16 features per position
4. **Classification**: Predict error label with ML

### Output (ExecutionResult)
```python
{
    "game_id": "sha256_hash(pgn_text)",
    "white_player": "Magnus Carlsen",
    "black_player": "Hikaru Nakamura",
    "white_elo": 2830,
    "black_elo": 2768,
    "result": "1-0",
    "moves": [
        {
            "ply": 1,
            "san": "e4",
            "uci": "e2e4",
            "player_color": "white",
            "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
            "score_diff": 0.0,
            "material_balance": 0,
            "num_pieces": 32,
            "branching_factor": 20,
            "self_mobility": 20,
            "opponent_mobility": 16,
            "is_center_controlled": true,
            "has_castling_rights": true,
            "threatens_mate": false,
            "is_pawn_endgame": false,
            "ml_prediction": {
                "predicted_error": "good",
                "confidence": 0.94,
                "risk_score": 0.06,
                "contributing_features": ["score_diff", "material_balance"]
            }
        }
    ]
}
```

### Traceability Invariants
- ✅ `game_id`: SHA256(PGN text) — unique identifier per game
- ⚠️ `trace_id`: NOT IMPLEMENTED — should track complete analysis
- ⚠️ `feature_set_id`: NOT IMPLEMENTED — should version feature set
- ⚠️ `engine_eval_id`: NOT IMPLEMENTED — should record Stockfish version
- ⚠️ `ml_prediction_id`: NOT IMPLEMENTED — should version ML model

---

## Spec 01: PGN Parsing

### PGN Format
The international PGN (Portable Game Notation) standard is used as defined in [PGN Specification](https://www.chessclub.com/chessclub/resources/pgn/).

### Expected Structure
```
[Event "Tournament Name"]
[Site "Location"]
[Date "2024.01.15"]
[Round "3"]
[White "Player Name"]
[Black "Player Name"]
[WhiteElo "2830"]
[BlackElo "2768"]
[Result "1-0"]
[ECO "B90"]
[TimeControl "40/7200"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 1-0
```

### Required Headers
- `Event`: Tournament name
- `White` / `Black`: Player names
- `Result`: Result (1-0, 0-1, 1/2-1/2)
- `Date`: Date in YYYY.MM.DD format

### Recommended Headers
- `WhiteElo` / `BlackElo`: FIDE/USCF rating
- `ECO`: Opening code
- `TimeControl`: Time controls (e.g., 40/7200)

### Validation
- ✅ Parse valid moves in algebraic notation
- ⚠️ Detect incomplete or truncated games
- ⚠️ Handle alternate notations (UCI vs SAN)

### Output
```python
{
    "game_id": "sha256_hash",
    "headers": {
        "white": "name",
        "black": "name",
        "white_elo": 2830,
        "black_elo": 2768,
        "result": "1-0",
        "eco": "B90",
        "date": "2024.01.15"
    },
    "moves": ["e4", "c5", "Nf3", ...],
    "fen_history": ["rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1", ...]
}
```

---

## Spec 02: Feature Extraction

### The 16 Defined Features

| # | Name | Type | Range | Description |
|:--|:-----|:-----|:------|:------------|
| 1 | `score_diff` | float | [0, ∞) | Evaluation difference (centipawns) |
| 2 | `material_balance` | int | [-39, +39] | White material - Black material |
| 3 | `material_total` | int | [0, 39] | Total material on board |
| 4 | `num_pieces` | int | [2, 32] | Pieces on board (excluding kings) |
| 5 | `branching_factor` | int | [0, 218] | Available legal moves |
| 6 | `self_mobility` | int | [0, 218] | Legal moves (active player) |
| 7 | `opponent_mobility` | int | [0, 218] | Legal moves (opponent) |
| 8 | `move_number` | int | [1, 300] | Move number in game |
| 9 | `player_color` | int | {0, 1} | 1 = white, 0 = black |
| 10 | `has_castling_rights` | bool | {true, false} | Castling rights available |
| 11 | `is_repetition` | bool | {true, false} | Position repetition |
| 12 | `is_low_mobility` | bool | {true, false} | Mobility < 10 moves |
| 13 | `is_center_controlled` | bool | {true, false} | Control of d4, d5, e4, e5 |
| 14 | `is_pawn_endgame` | bool | {true, false} | Only pawns + kings |
| 15 | `threatens_mate` | bool | {true, false} | Threatens mate in 1 |
| 16 | `is_forced_move` | bool | {true, false} | 1-2 legal moves |

### Material Calculation
```
Pawn = 1, Knight = 3, Bishop = 3, Rook = 5, Queen = 9
material_balance = white_sum - black_sum
```

### Validation
- ✅ All features must be present in output
- ✅ score_diff must be ≥ 0 (use absolute value)
- ✅ Data types must match definition

### Output
```python
features = {
    "score_diff": 0.0,
    "material_balance": 0,
    "material_total": 39,
    "num_pieces": 32,
    "branching_factor": 20,
    "self_mobility": 20,
    "opponent_mobility": 16,
    "move_number": 1,
    "player_color": 1,
    "has_castling_rights": 1,
    "is_repetition": 0,
    "is_low_mobility": 0,
    "is_center_controlled": 1,
    "is_pawn_endgame": 0,
    "threatens_mate": 0,
    "is_forced_move": 0
}
```

---

## Spec 03: Error Classification (ML)

### Required Model
- **Type**: Multiclass classifier (Random Forest or Gradient Boosting)
- **Input features**: The 16 defined in Spec 02
- **Classes**: {good, inaccuracy, mistake, blunder}

### Classification Thresholds by score_diff

| Category | score_diff (centipawns) | Description |
|:---------|:------------------------|:------------|
| **good** | [0, 30) | Correct move |
| **inaccuracy** | [30, 80) | Minor imprecision |
| **mistake** | [80, 200) | Significant error |
| **blunder** | [200, ∞) | Grave error |

### Output (MLPrediction)
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
    "risk_score": 0.06,
    "contributing_features": [
        "score_diff",
        "material_balance",
        "self_mobility"
    ]
}
```

### Requirements
- ✅ `predicted_error`: Predicted class (string)
- ✅ `confidence`: Maximum probability (float 0-1)
- ⚠️ `model_version`: NOT IMPLEMENTED (should be included)
- ✅ `contributing_features`: Top features by SHAP

### MLflow Tracking
- Register model with name and version
- Log hyperparameters and metrics
- Save SHAP explanation plots

---

## Spec 04: Orchestrated Architecture

### Main Components

| Component | Input | Output | Purpose |
|:----------|:------|:-------|:--------|
| **Planner** | FEN + context | AnalysisPlan | Decides which analysis to run |
| **Executor** | AnalysisPlan | ExecutionResult | Executes analysis in parallel |
| **Critic** | ExecutionResult | ValidationResult | Validates consistency |
| **Memory** | ValidationResult | AnalysisRecord | Persists and learns patterns |

### Game Phases
```
Opening (moves 1-15):    Focus on theory + openings
Middlegame (15-40):      Focus on tactics
Endgame (40+):           Focus on technique + draws
```

### Orchestrated Pipeline
```
1. Planner receives FEN + player
2. Planner generates AnalysisPlan per phase
3. Executor parallelizes:
   ├── Engine Analysis (Stockfish)
   ├── Feature Extraction
   ├── ML Prediction
   └── RAG Retrieval
4. Critic validates results
5. Memory stores + learns
```

---

## External Dependencies

- **python-chess** ≥ 1.9.4 — PGN and FEN parsing
- **Stockfish** ≥ 15 — Evaluation engine
- **scikit-learn** ≥ 1.0 — ML models
- **MLflow** ≥ 2.0 — Experiment tracking
- **pydantic** ≥ 2.0 — Data validation
- **PostgreSQL** ≥ 13 — Database

---

## Future Improvements

1. **Complete traceability**: Add trace_id, feature_set_id, engine_eval_id, ml_prediction_id
2. **Model versioning**: Include model_version in MLPrediction
3. **Edge cases**: Handle castling, promotion, en passant, mate
4. **Tests**: Full coverage for Specs 01-04
5. **AI Documentation**: Explainability with integrated SHAP
