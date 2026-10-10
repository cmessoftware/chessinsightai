# Phase 5 · Coach UI completa

**Roadmap phase:** `5` · **Domain:** `ext-ui`, `ext-api-fastapi`  
**Origen curso:** [11_ui_improvements_roadmap.md](../../ai_chess_coach_course/11_ui_improvements_roadmap.md).

**Objetivo:** completar importación, filtros y cuenta — todo lo que quedó fuera del slice Phase 1.

| id | status | descripción |
| --- | --- | --- |
| **GC-1…GC-5, UI-G1…UI-G3** | ⬜ | Catálogo maestro, fuente `ANALYSIS`, rename Coach, borrado y filtros — [mini-plan](./designs/coach-games-catalog-unify-mini-plan.md) |
| UI-104 | 🧪 / ⬜ | Filtros Games (speed class en `games`) — superseded en parte por **UI-G2** |
| UI-105 | ⬜ | Chess.com sync job |
| UI-106 | ⬜ | Lichess sync job |
| UI-108 | ⬜ | OAuth Google (P2) |
| P1-8 | 🧪 / ⬜ | Sync sitios + filtros Games |

**Ramas:** `feature/11_<id>_<slug>`.

**Precondición:** Phase 1 estable; sync masivo puede paralelizar con Phase 2 si no rompe contratos ingest.
