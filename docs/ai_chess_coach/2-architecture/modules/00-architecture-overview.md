# 🏗️ 00-General Architecture of ChessInsightAI

## General Objective
Understand the complete architecture of **ChessInsightAI**: what problem it solves, how its components are organized, and how data flows from a PGN file to a personalized pedagogical explanation.

## What problem does it solve?

Chess engines (Stockfish) are excellent at evaluating positions, but they **do not explain why a move is bad**. ChessInsightAI combines:

| Component | Role |
|------------|-----|
| **Stockfish** | Objective evaluation (*ground truth*) |
| **ML (RandomForest/GradientBoosting)** | Error classification: blunder, mistake, inaccuracy |
| **RAG** | Context from similar positions and chess books |
| **LLM (Llama 3.1)** | Natural language explanations adapted to the player's level |

> **Fundamental principle**: The LLM only **EXPLAINS**, it never **DECIDES**. Decisions are made by Stockfish + ML.

## 📊 Layered Architecture Diagram

The ChessInsightAI architecture is organized into **5 main layers**, each with clearly defined responsibilities:

```text
┌─────────────────────────────────────────────────────────┐
│                 PRESENTATION LAYER                      │
│         React (upload, stats, training)                 │
│              Port: 8501                                 │
├─────────────────────────────────────────────────────────┤
│                    API LAYER                            │
│         FastAPI endpoints + Services                    │
│           (analysis, predictions)                       │
├─────────────────────────────────────────────────────────┤
│               ORCHESTRATION LAYER                       │
│      Planner → Executor → Critic → Memory               │
│         (Orchestrated Architecture v2.0)                │
├──────────────┬──────────────┬───────────────────────────┤
│   ML LAYER   │  RAG LAYER   │      ENGINE LAYER         │
│ RF/GB/SHAP   │  Embeddings  │      Stockfish            │
│  MLflow      │  Books       │      Features             │
├──────────────┴──────────────┴───────────────────────────┤
│                    DATA LAYER                           │
│    PostgreSQL + Parquet datasets + PGN files            │
│              Port: 5432                                 │
└─────────────────────────────────────────────────────────┘
```

**Key principle**: Each layer only communicates with adjacent layers. The orchestration layer coordinates all evidence sources.

# 🗂️ Project Structure

The repository follows a clear modular organization:

| Directory | Content | Examples |
|:-----------|:----------|:---------|
| `src/modules/` | Core chess logic | `extractor.py`, `features_generator.py`, `pgn_utils.py` |
| `src/ml/` | Complete ML pipeline | `chess_error_predictor.py`, `shap_explainer.py` |
| `src/ai_coach/orchestrated/` | Orchestrated architecture | `planner_service.py`, `executor_service.py`, `critic_service.py`, `memory_service.py` |
| `src/pages/` | Streamlit pages | `upload_pgn.py`, `elite_stats.py`, `tactics_viewer.py` |
| `notebooks/` | Analysis and training | `ml_workflow_integrated.ipynb`, `course/` |
| `datasets/` | Training data | `tactics/`, `studies/`, `models/` |
| `data/` | Application data | `games/`, `chess_books/`, `vectorstore/` |
| `tests/` | Unit + integration tests | `tests/ai_coach/`, `tests/ml/`, `tests/modules/` |
| `docs/` | Technical documentation | `ROADMAP.md`, configuration guides |

# Docker Services

```yaml
services:
  chess_trainer:  # React+Vite app         → port 8501
  notebooks:      # Jupyter Lab           → port 8889
  postgres:       # Database              → port 5432
  mlflow:         # Experiment tracking   → port 5000
```

# ♟️ Game Processing Pipeline (ETL)

The data flow follows a classic ETL pipeline adapted to the chess domain:

```text
PGN File → Parser → Moves + FEN → Stockfish Analysis → Feature Extraction → ML Classification
```

## Step 1: PGN Parsing

The `python-chess` library is used to parse PGN (Portable Game Notation) files. Each game is decomposed into:

- **Metadata**: players, ELO, opening, result, date
- **Moves**: sequence of moves in algebraic notation
- **FEN positions**: board state after each move

## Step 2: Stockfish Analysis

For each position, Stockfish computes:

- **Evaluation (centipawns)**: material + positional advantage difference
- **Best move**: the engine’s optimal move
- **Depth**: search tree depth levels

## Step 3: Feature Extraction

The `features_generator.py` module extracts 16 features from each position:

| Feature | Type | Description |
|:--------|:-----|:------------|
| `score_diff` | float | Change in engine evaluation |
| `material_balance` | int | Material difference (white - black) |
| `num_pieces` | int | Total number of pieces on the board |
| `branching_factor` | int | Available legal moves |
| `self_mobility` | int | Mobility of the active player |
| `opponent_mobility` | int | Mobility of the opponent |
| `is_center_controlled` | bool | Control of central squares |
| `has_castling_rights` | bool | Castling rights available |
| `threatens_mate` | bool | Whether there is a mating threat |
| `is_pawn_endgame` | bool | Only pawns and kings remain |

# 🤖 Machine Learning Pipeline

## Error Classification

The ML model classifies each move into one of 4 categories based on engine evaluation loss:

| Classification | score_diff (cp) | Description |
|:--------------|:----------------|:------------|
| **Good** | 0 – 30 | Correct or nearly optimal move |
| **Inaccuracy** | 30 – 80 | Minor inaccuracy, loses advantage |
| **Mistake** | 80 – 200 | Significant error, changes evaluation |
| **Blunder** | > 200 | Severe error, loses material or the game |

## Models Used

- `RandomForestClassifier`: Main classification model
- `GradientBoostingClassifier`: Alternative model with better performance on imbalanced datasets
- `SHAP`: Explainability — identifies which features most influence each prediction

## MLflow Tracking

All experiments are logged in MLflow (port 5000):

- Model hyperparameters
- Metrics (`accuracy`, `precision`, `recall`, `F1`)
- Artifacts (serialized model, SHAP plots)