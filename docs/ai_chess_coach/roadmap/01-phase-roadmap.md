# Phase Roadmap

## Active work

| Phase | Scope | Key deliverable | Tasks |
| --- | --- | --- | --- |
| **0** | **Coach MVP vertical slice** | Module 07 + React: import → queue → analysis | **[00-roadmap-index.md](./00-roadmap-index.md)** · **[02-phase-00-coach-mvp-module07-ui.md](./02-phase-00-coach-mvp-module07-ui.md)** |

Phase 0 es el plan operativo actual (ex `ai_chess_coach_course` hub). Fases 1–10 siguen siendo el horizonte core/orquestación.

## Planned Phases (long horizon)

| Phase | Scope | Key Deliverable | Tasks |
| --- | --- | --- | --- |
| 1 | core-engine + minimal api | stable PGN analysis pipeline with API endpoint | [02-phase-01-core-engine-minimal-api.md](02-phase-01-core-engine-minimal-api.md) |
| 2 | ml-error-classification | production-ready error classifier | [03-phase-02-ml-error-classification.md](03-phase-02-ml-error-classification.md) |
| 3 | orchestration | planner/executor/critic/memory integrated | [04-phase-03-orchestration.md](04-phase-03-orchestration.md) |
| 4 | rag | retrieval-backed knowledge injection | [05-phase-04-rag.md](05-phase-04-rag.md) |
| 5 | llm-grounding | grounded explanation service | [06-phase-05-llm-grounding.md](06-phase-05-llm-grounding.md) |
| 6 | advanced critic | stronger rule system and contradiction detection | [07-phase-06-advanced-critic.md](07-phase-06-advanced-critic.md) |
| 7 | memory + personalization | player profile and adaptive coaching | [08-phase-07-memory-personalization.md](08-phase-07-memory-personalization.md) |
| 8 | advanced ml | explainability and clustering extensions | [09-phase-08-advanced-ml.md](09-phase-08-advanced-ml.md) |
| 9 | critical-blunder-sequence | sequence detector in production | [10-phase-09-critical-blunder-sequence.md](10-phase-09-critical-blunder-sequence.md) |
| 10 | playstyles | playstyle profiling and recommendations | [11-phase-10-playstyles.md](11-phase-10-playstyles.md) |

## Exit Criteria Per Phase

- Functional acceptance criteria met.
- Automated tests green for impacted domains.
- Observability metrics emitted and validated.
- Rollback path documented and tested.

Phase 0 añade: validación UI MVP manual + gates P0/P1 del [roadmap index](./00-roadmap-index.md).
