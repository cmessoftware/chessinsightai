# Module Taxonomy

## Domains and Submodules

| Domain | Submodules |
| --- | --- |
| 01-core-engine | pgn-parser, stockfish-analysis, feature-extraction, tactical-tagging, phase-detection, evaluation-normalization |
| 02-ml | ml-error-classification, ml-critical-blunder-sequence, ml-playstyle-clustering, ml-training-pipeline, ml-model-evaluation, ml-shap-explainability, ml-datasets |
| 03-orchestration | planner, executor, critic, memory, execution-policies, fallback-strategies, validation-rules |
| 04-rag-llm | chess-document-extraction, chess-embeddings, chromadb-indexing, rag-retrieval, llm-grounding, llm-prompt-engineering, llm-explanation-generation, hallucination-control |
| 05-api | rest-contracts, dto-schemas, orchestrated-analysis-api, auth-security, websocket-streaming, api-versioning |
| 06-ui | dashboard, pgn-upload, move-analysis-viewer, chessboard-ui, training-center, player-profile, explainability-ui |
| 07-observability | mlflow-tracking, prompt-logging, critic-metrics, execution-metrics, telemetry, audit-trails, inference-monitoring |
| 08-devops | docker, deployment, feature-flags, migrations, rollback-strategies, ci-cd, infrastructure |
| 09-testing | unit-tests, integration-tests, e2e-tests, llm-evaluation, regression-tests, prompt-tests, critic-validation-tests, synthetic-games |
| 10-research | notebooks, experiments, datasets-analysis, feature-ideas, sequence-analysis-research, model-benchmarks |

## Ownership Convention

- Each submodule must have one technical owner and one backup owner.
- Ownership metadata must be tracked in issue templates and roadmap items.
