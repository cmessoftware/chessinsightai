# Phase Roadmap — producto web ChessInsight Coach

Secuencia **única** para implementar la app (React + FastAPI + Postgres). Los números **07 / 08 / 11** del curso son **catálogos de IDs** (`F07-*`, `F08-*`, `UI-10x`); las **phases 1–6** son el orden de entrega web. Las **phases 7–16** son capacidades de plataforma (orquestación, RAG, LLM) después del MVP web.

**Hub operativo:** [00-roadmap-index.md](./00-roadmap-index.md).

---

## Fases web (implementar en orden)

| Phase | Nombre | Entregable clave | Tareas |
| --- | --- | --- | --- |
| **1** | Coach web slice | Import → cola → análisis MultiPV en UI | [02-phase-01-coach-web-slice.md](./02-phase-01-coach-web-slice.md) |
| **2** | Análisis en producto | F07 persistido, review pack, gates M07 | [03-phase-02-analysis-in-product.md](./03-phase-02-analysis-in-product.md) |
| **3** | Entrenamiento y diagnóstico | Debilidades, puzzles, M08A/M08B | [04-phase-03-training-diagnosis.md](./04-phase-03-training-diagnosis.md) |
| **4** | Corpus de referencia | M09, partidas modelo indexadas | [05-phase-04-reference-corpus.md](./05-phase-04-reference-corpus.md) |
| **5** | Coach UI completa | Sync Chess.com/Lichess, filtros, OAuth | [06-phase-05-coach-ui-complete.md](./06-phase-05-coach-ui-complete.md) |
| **6** | Estadísticas en web | Dashboard LS01 en producto | [07-phase-06-statistics-in-web.md](./07-phase-06-statistics-in-web.md) |

**Trabajo activo hoy:** Phase **1** (cerrar P0-2…P0-5 y validación UI).

```text
Phase 1  slice UI + module07 mínimo
   ↓
Phase 2  evidencia F07 + validación ajedrez
   ↓
Phase 3  M08 entrenamiento / diagnóstico
   ↓
Phase 4  M09 corpus
   ↓
Phase 5  UI-105/106/108… (catálogo 11)
   ↓
Phase 6  LS01 dashboard
```

---

## Mapeo curso 07 · 08 · 11 → fases web

| Doc curso (congelado) | Qué contiene | Fase(s) web |
| --- | --- | --- |
| **07** — implementation plan | Motor F07, lab `analysis/`, producto `module07` | **1** (API/worker mínimo) + **2** (persistencia, gates, F07-*) |
| **08** — MVP product roadmap | M08, M09, gates producto, F08/F09 | **2** (gates) + **3** (M08) + **4** (M09) |
| **11** — UI improvements | UI-101…108, import, tablero | **1** (slice) + **5** (resto UI) |

Los IDs de issue/branch **no cambian** (`feature/07_*`, `feature/08_*`, `feature/11_*`); solo la **phase** en metadata de issues pasa a `1`…`6` según la tabla.

---

## Fases plataforma (7–16, horizonte)

Capas transversales cuando el MVP web (1–6) esté aceptado o un OpenSpec lo priorice.

| Phase | Scope | Tasks |
| --- | --- | --- |
| 7 | core-engine + minimal api | [08-platform-core-engine-minimal-api.md](./08-platform-core-engine-minimal-api.md) |
| 8 | ml-error-classification | [09-platform-ml-error-classification.md](./09-platform-ml-error-classification.md) |
| 9 | orchestration | [10-platform-orchestration.md](./10-platform-orchestration.md) |
| 10 | rag | [11-platform-rag.md](./11-platform-rag.md) |
| 11 | llm-grounding | [12-platform-llm-grounding.md](./12-platform-llm-grounding.md) |
| 12 | advanced critic | [13-platform-advanced-critic.md](./13-platform-advanced-critic.md) |
| 13 | memory + personalization | [14-platform-memory-personalization.md](./14-platform-memory-personalization.md) |
| 14 | advanced ml | [15-platform-advanced-ml.md](./15-platform-advanced-ml.md) |
| 15 | critical-blunder-sequence | [16-platform-critical-blunder-sequence.md](./16-platform-critical-blunder-sequence.md) |
| 16 | playstyles | [17-platform-playstyles.md](./17-platform-playstyles.md) |

OpenSpec existente `phase-01-core-engine-minimal-api-baseline` sigue ligado al doc **platform Phase 7** (nombre histórico).

---

## Exit criteria

- **Phases 1–6:** DoD en cada doc de phase + P0/P1 en [00-roadmap-index.md](./00-roadmap-index.md).
- **Phases 7–16:** criterios funcionales, tests verdes, observabilidad, rollback documentado.
