# Copilot Instructions for AI Agents

Welcome to the `chess_trainer` project! This guide provides actionable, project-specific instructions to help AI coding agents (like GitHub Copilot) be productive and follow our conventions.

## Project Overview
- **Purpose:** Chess data import, feature engineering, and ML pipeline for chess training and analysis.
- **Core Technologies:** Python, Docker Compose, PostgreSQL, MLflow, Jupyter Notebooks.
- **Key Directories:**
  - `src/scripts/`: Data import, feature engineering, and utility scripts.
  - `src/ml_pipeline/`: ML pipeline classes and logic.
  - `notebooks/`: EDA, ML workflow, and pipeline execution notebooks (clean, minimal, no duplicate/old notebooks).
  - `data/`: Datasets (by source) and intermediate files.
  - `docs/`: Guides for MLflow, preprocessing, workflow, and PR instructions.

## Data & Database
- **Primary Data Source:** PostgreSQL (in Docker, service: `postgres`).
- **Datasets:** Located in `/app/src/data/games` (subfolders: `elite`, `personal`, `novice`, `stockfish`, `fide`).
- **No SQLite:** All scripts and notebooks must use PostgreSQL, not SQLite.
- **DB Schema:** Managed with Alembic migrations (`alembic/`).

## ML Pipeline
- **Entry Point:** `src/scripts/execute_issue_86_pipeline.py` (planned) will run the ML pipeline.
- **Pipeline Logic:** Implement in `src/ml_pipeline/complete_ml_pipeline.py` (planned).
- **Feature Engineering:** Use scripts in `src/scripts/` (e.g., `generate_features_with_tactics.py`).
- **Experiment Tracking:** Use MLflow (see `docs/MLFLOW_COMPLETE_GUIDE.md`).

## Orchestration & Local Dev
- **Docker Compose:** Orchestrates `chess_trainer` (app), `notebooks` (Jupyter/MLflow), and `postgres`.
- **Miniforce/PowerShell:** Use `ds_tools.ps1` for local orchestration.
- **.env:** Store DB connection strings and secrets here.

## Conventions & Best Practices
- **Scripts:** Centralize in `src/scripts/`. Avoid duplicate logic in notebooks.
- **Notebooks:** For EDA and pipeline execution only. Keep clean and minimal.
- **Documentation:** Reference and update guides in `docs/` as workflows evolve.
- **Testing:** Use scripts and notebooks for validation. Add tests as needed.
- **Pull Requests:** Follow instructions in `docs/ML_PREPROCESSING_GUIDE.md` and `docs/MLFLOW_COMPLETE_GUIDE.md`.
- **MLflow:** Always log experiments and results.

## Quickstart for AI Agents
1. **Import Data:** Use `src/scripts/import_pgns_parallel.py` to load PGN files into PostgreSQL.
2. **Feature Engineering:** Run `src/scripts/generate_features_with_tactics.py` to extract features.
3. **Run ML Pipeline:** (Planned) Use `src/scripts/execute_issue_86_pipeline.py` to train/evaluate models.
4. **Track Experiments:** Use MLflow UI (`http://localhost:5000`) to review runs.
5. **Orchestrate Locally:** Use `ds_tools.ps1` or Docker Compose tasks for service management.

## Key References
- **MLflow Guide:** `docs/MLFLOW_COMPLETE_GUIDE.md`
- **Preprocessing Guide:** `docs/ML_PREPROCESSING_GUIDE.md`
- **Project Structure:** `README.md`, `docs/DOCKER_DEVELOPMENT_STRATEGY.md`
- **DB Schema:** `alembic/`, `alembic.ini`

## AI Agent Reminders
- **Always prefer scripts over notebooks for core logic.**
- **Never use SQLite; always use PostgreSQL.**
- **Keep notebooks clean and focused.**
- **Update documentation if workflows change.**
- **Reference this file for project-specific conventions.**

---
_Last updated: 2024-06-27_
