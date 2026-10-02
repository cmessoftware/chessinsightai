# Phase 1 · Coach web slice (import → cola → análisis)

**Roadmap phase:** `1` · **Domain:** `ext-ui`, `ext-api-fastapi`, `core-analysis` (bridge)  
**OpenSpec:** change `coach-mvp-module07-baseline` (nombre histórico) o nuevo change cuando cambie el contrato público.

**Objetivo:** vertical slice usable en React: PGN → cola → Stockfish → MultiPV. Cierra infra **P0** antes de Phase 2 (evidencia F07 en producto).

**Catálogo congelado (detalle IDs):** curso [07](../../ai_chess_coach_course/07_module_implementation_plan.md) · [08](../../ai_chess_coach_course/08_mvp_product_roadmap.md) · [11 UI](../../ai_chess_coach_course/11_ui_improvements_roadmap.md) — ver [mapeo curso → fases](./01-phase-roadmap.md#mapeo-curso-07--08--11--fases-web).

---

## Validación local

| Paso | URL / acción |
|------|----------------|
| Stack | Postgres `5434`, API `:8000`, Vite `:5173` — README repo § Coach MVP |
| Login | `admin` / `admin123` |
| Import | `/import` — PGN archivo o pegado; corpus admin |
| Cola | `/coach/jobs` — POV **White/Black** al encolar |
| Análisis | `/coach/games/:id/analysis` — MultiPV |
| Migración | `alembic upgrade head` (mín. `20260924_000002`) |
| Motor | `STOCKFISH_PATH` en `.env` |

Script: `src/scripts/start_coach_dev.ps1` (DB: `start_db.ps1` en raíz).

---

## Infra y gates (P0)

| id | status | branch / PR | descripción |
| --- | --- | --- | --- |
| P0-1 | ✅ Accepted | `feature/11_107_*` | CI `requirements-ci.txt`, job Coach MVP, LFS PGN |
| P0-2 | ⬜ Planned | — | Un driver DB (psycopg3 vs psycopg2) en path MVP |
| P0-3 | ⬜ Planned | — | `npm run build` + gate CI |
| P0-4 | 🧪 In Testing | — | Alembic upgrade/downgrade en CI |
| P0-5 | ⬜ Planned | — | E2E PGN → decisiones (script o test) |

---

## Backend mínimo (`module07`, API)

| id | status | branch / notas | descripción |
| --- | --- | --- | --- |
| M07-INGEST | 🧪 | UI-107 | Import sin jugador; POV al `POST /jobs` |
| M07-WORKER | 🧪 | | Stockfish worker; `move_uci`; errores en job |
| M07-API | 🧪 | | Router ingest, jobs, games; Alembic module07 |
| M07-QUEUE | 🧪 | | Cola masiva UI; reintento `failed` |

Metadatos motor y review pack completo → [Phase 2](./03-phase-02-analysis-in-product.md).

---

## UI Coach (slice Phase 1)

| id | status | ruta | descripción |
| --- | --- | --- | --- |
| UI-107 | 🧪 | `/import`, `/coach/import` | Unified import + enlace a cola |
| UI-101 | 🧪 | `/import` | PGN paste; POV al análisis |
| UI-102 | 🧪 | | File picker |
| UI-103 | 🧪 | | Dropzone |
| UI-104 | 🧪 | | Corpus admin (filtro Games parcial) |
| UI-JOBS | 🧪 | `/coach/jobs` | Cola + selector White/Black |
| UI-ANALYSIS | 🧪 | `/coach/games/:id/analysis` | Tablero + MultiPV |
| UI-REVIEW | 🧪 | `/coach/games/:id/review` | Review pack (parcial) |
| UI-110 | 📋 Planned | `/coach/games/:id/analysis` + tablero global | Layout responsive, PGN, candidatas verdes, **Chessground único** (sin react-chessboard) — [mini-plan](./designs/coach-game-analysis-layout-pgn.md) |

Sync sitios, OAuth y pulido → [Phase 5](./06-phase-05-coach-ui-complete.md). Legacy: `/import/legacy`.

---

## Definition of Done (Phase 1)

- [ ] P0-1…P0-5 en 🔧 o ✅ según corresponda.  
- [ ] Flujo manual import → jobs → analysis sin 5xx.  
- [ ] HITL ×5 (P1-3) antes de marcar UI-107 ✅.  
- [ ] OpenSpec para cambios de contrato API/UI.  
- [ ] Tests: `pytest tests/mvp tests/docs_courses tests/chess_statistics`.

---

## Testing · Rollback · Labels

- **Tests:** `tests/mvp`, E2E P0-5, manual § Validación local.  
- **Rollback:** revert `feature/11_*` / `feature/07_*`; cola durable = P1-5.  
- **Issues:** `phase: 1` · domain `ext-ui` | `ext-api-fastapi` · alias **COUI** / **MOD7** ([aliases](../modules/03-technical-aliases.md)).
