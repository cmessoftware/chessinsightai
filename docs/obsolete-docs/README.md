# AI Chess Coach - Technical Documentation

## Documentation Structure

This folder contains the complete technical documentation for **ChessInsightAI** (AI Chess Coach project). It is organized into three main sections:

## OpenSpec Workflow

OpenSpec is managed from this directory (`docs/ai_chess_coach`).

Operational command convention:

```powershell
mamba run -n chess_trainer npx -y @fission-ai/openspec <command>
```

Examples:

```powershell
mamba run -n chess_trainer npx -y @fission-ai/openspec list
mamba run -n chess_trainer npx -y @fission-ai/openspec validate gestionar-specs-ai-chess-coach
mamba run -n chess_trainer npx -y @fission-ai/openspec show migrate-pgn-feature-specs --type change --no-interactive
```

Definition of Done for requirement changes:

- Every requirement change MUST be created as an OpenSpec change.
- Every change MUST include `proposal.md`, `design.md`, `specs/`, and `tasks.md`.
- `openspec validate <change-name>` MUST pass before implementation starts.
- No implementation should start without an active OpenSpec change.

### 📖 1. Overview
High-level introductory documentation.

**File**:
- [`00-architecture-overview.md`](2-architecture/modules/00-architecture-overview.md) — Architecture overview, 5-layer design, and key components

### 🏛️ 2. Architecture (`2-architecture/`)
Technical guides for specific components and pipelines.

**Files**:
- [`05-ml-pipeline-and-playstyle.md`](2-architecture/modules/05-ml-pipeline-and-playstyle.md) — PGN parsing, feature extraction, ML pipeline, and playstyle analysis

### 🔧 3. Specifications (`3-specs/`)
Formal technical system specifications.

**Files**:
- [`00_system_spec.md`](3-specs/00_system_spec.md) — Specs 00-04: ETL, PGN parsing, feature extraction, ML classification, orchestrated architecture
- [`04-orchestration-planner-executor-critic-memory.md`](2-architecture/modules/04-orchestration-planner-executor-critic-memory.md) — Detailed description of Planner, Executor, Critic, and Memory services

---

## Recommended Reading (By Level)

### Beginner
1. **What problem does ChessInsightAI solve?** → [`00-architecture-overview.md`](2-architecture/modules/00-architecture-overview.md) (first sections)
2. **How does the pipeline work?** → [`05-ml-pipeline-and-playstyle.md`](2-architecture/modules/05-ml-pipeline-and-playstyle.md) (PGN parsing and ETL pipeline sections)

### Intermediate
1. **I am implementing a new feature** → [`00_system_spec.md`](3-specs/00_system_spec.md) (Spec 02)
2. **Understand the 5-layer architecture** → [`00-architecture-overview.md`](2-architecture/modules/00-architecture-overview.md) (full document)
3. **I need to train the ML model** → [`00_system_spec.md`](3-specs/00_system_spec.md) (Spec 03)

### Advanced
1. **I am working on Planner/Executor** → [`04-orchestration-planner-executor-critic-memory.md`](2-architecture/modules/04-orchestration-planner-executor-critic-memory.md) (Components 1-4)
2. **I need to debug inconsistencies** → [`00_system_spec.md`](3-specs/00_system_spec.md) (Spec 00 - Traceability)
3. **I want to optimize the pipeline** → [`04-orchestration-planner-executor-critic-memory.md`](2-architecture/modules/04-orchestration-planner-executor-critic-memory.md) (Metrics and observability)

---

## Key Concepts

### System ETL Pipeline
```
PGN → Parser → FEN + Moves → Stockfish Analysis → Feature Extraction → ML Classification → LLM explanation
```

### The 16 Model Features
| # | Feature | Type |
|:--|:--------|:-----|
| 1-15 | Positional features (material, mobility, etc.) | int/bool |
| 16 | `score_diff` (engine evaluation) | float |

### Error Classification (Labels)
| Label | score_diff (cp) | Description |
|:---------|:--|:--|
| `good` | [0, 30) | Correct move |
| `inaccuracy` | [30, 80) | Inaccuracy |
| `mistake` | [80, 200) | Significant error |
| `blunder` | [200, ∞) | Severe error |

### The 5 Architecture Layers
1. **Presentation** (React) — Port 8501
2. **API** (FastAPI)
3. **Orchestration** (Planner → Executor → Critic → Memory)
4. **Processing** (ML, RAG, Engine)
5. **Data** (PostgreSQL, PGN files, Vectorstore)

---

## Related Code Modules

| Module | Location | Responsibility |
|:-------|:----------|:--|
| PGN Parsing | `src/modules/pgn_utils.py` | Parse PGN files |
| Feature Extraction | `src/modules/features_generator.py` | Extract 16 features |
| ML Pipeline | `src/ml/chess_error_predictor.py` | Train + predict |
| Orchestration | `src/ai_coach/orchestrated/` | Planner, Executor, Critic, Memory |
| API | `src/pages/` | FastAPI endpoints |

---

## Critical Dependencies

- **python-chess** — PGN and FEN parsing
- **Stockfish 15+** — Evaluation engine
- **scikit-learn** — ML models
- **MLflow** — Experiment tracking
- **PostgreSQL** — Database
- **pydantic** — Type validation

---

## Frequently Asked Questions

### How is score_diff calculated?
```
score_diff = |eval_stockfish(best_move) - eval_stockfish(played_move)|
```
In centipawns (1/100 of a pawn).

### Why RandomForest instead of neural networks?
- Interpretability with SHAP
- Fast training
- No normalization required
- Handles imbalanced data well

### How is the LLM integrated?
The LLM receives orchestrated analysis outputs (Engine + ML + RAG) and generates pedagogical explanations. **The LLM never makes technical decisions**.

### What does "ground truth" mean in the Stockfish context?
Stockfish evaluation is the objective truth baseline in chess. ML predictions are trained to **match that baseline**, not to predict human moves.

---

## Pending Items and TODOs

- [ ] Add full traceability (trace_id, feature_set_id, etc.)
- [ ] Include model_version in ML predictions
- [ ] Tests for edge cases (castling, promotion, en passant)
- [ ] SHAP explainability documentation
- [ ] Deployment guide (Docker + PostgreSQL + MLflow)

---

## Authors and Contributors

- **ChessInsightAI Team**
- Technical documentation: Modules 01-04 (AI Chess Coach)
- Last updated: April 2026

---

## License

MIT License - See LICENSE at repository root.

---

## Useful Links

- [Official PGN specification](https://www.chessclub.com/chessclub/resources/pgn/)
- [python-chess documentation](https://python-chess.readthedocs.io/)
- [MLflow Documentation](https://mlflow.org/docs/latest/index.html)
- [Stockfish Docs](https://github.com/official-stockfish/Stockfish)


