# Phase 0 · Coach MVP vertical slice (Module 07 + UI)

**Epic / phase:** `0` · **Domain:** `ext-ui`, `ext-api-fastapi`, `core-analysis` (bridge)  
**OpenSpec:** crear change `coach-mvp-module07-baseline` cuando un requisito nuevo salga de este phase (plantilla en [../openspec/changes/](../openspec/changes/)).

**Objetivo:** probar en UI lo ya implementado (import PGN → cola → análisis Stockfish → MultiPV) antes de seguir profundizando el core F07 en laboratorio.

**Referencias congeladas (curso):** [07_module_implementation_plan.md](../../ai_chess_coach_course/07_module_implementation_plan.md), [08_mvp_product_roadmap.md](../../ai_chess_coach_course/08_mvp_product_roadmap.md), [11_ui_improvements_roadmap.md](../../ai_chess_coach_course/11_ui_improvements_roadmap.md).

---

## Validación local (UI MVP)

| Paso | URL / acción |
|------|----------------|
| Stack | Postgres `5434`, API `:8000`, Vite `:5173` — ver README repo § Coach MVP |
| Login | `admin` / `admin123` |
| Import | `/import` — PGN archivo o pegado; corpus admin |
| Cola | `/coach/jobs` — POV **White/Black** al encolar |
| Análisis | `/coach/games/:id/analysis` — MultiPV |
| Migración | `alembic upgrade head` (mín. `20260924_000002`) |
| Motor | `STOCKFISH_PATH` en `.env` |

Script: `src/scripts/start_coach_dev.ps1` (desde repo; DB: `start_db.ps1` en raíz).

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

## Module 07 producto (`src/modules/module07`, API)

| id | status | branch / notas | descripción |
| --- | --- | --- | --- |
| M07-INGEST | 🧪 | UI-107 | Import sin jugador; POV al `POST /jobs` |
| M07-WORKER | 🧪 | | Stockfish worker; `move_uci`; errores en job |
| M07-API | 🧪 | | Router ingest, jobs, games; Alembic module07 |
| M07-QUEUE | 🧪 | | Cola masiva UI; reintento `failed` |
| M07-META | ⬜ | P1-4 | Metadatos motor en DB |

---

## UI Coach (React)

| id | status | ruta | descripción |
| --- | --- | --- | --- |
| UI-107 | 🧪 | `/import`, `/coach/import` | Unified import + enlace a cola |
| UI-101 | 🧪 | `/import` | PGN paste; POV al análisis (7.6) |
| UI-102 | 🧪 | | File picker (chip, no volcar al textarea) |
| UI-103 | 🧪 | | Dropzone |
| UI-104 | 🧪 | | Corpus admin; filtro Games ⬜ |
| UI-JOBS | 🧪 | `/coach/jobs` | Cola + selector White/Black |
| UI-ANALYSIS | 🧪 | `/coach/games/:id/analysis` | Tablero + MultiPV |
| UI-REVIEW | 🧪 | `/coach/games/:id/review` | Review pack (parcial) |
| UI-105 | ⬜ | | Chess.com sync job |
| UI-106 | ⬜ | | Lichess sync job |
| UI-108 | ⬜ | | OAuth Google |

Legacy import: `/import/legacy`.

---

## F07 lab → producto (no bloqueante UI MVP)

| id | status | descripción |
| --- | --- | --- |
| F07-001…023 | 🧪 Code | Notebooks / `analysis/` — ver plan 07 (curso) |
| GATE-F07-PERSIST | ⬜ | Persistencia review pack en producto |
| GATE-MVP-PRAGMATIC | ⬜ | Ver 08 §2 (curso) |

**Orden recomendado:** cerrar Phase 0 UI + P0 → luego ítems F07 producto en ramas `feature/07_*`.

---

## LS01 (satélite, multi-fuente)

| id | status | descripción |
| --- | --- | --- |
| LS01-023 | ✅ | Stockfish-first; export con Fuente eval / profundidad |
| UI-404+ | ⬜ | Postgres + dashboard React (Phase 0 extensión futura) |

CLI portable: `scripts/pack_chess_statistics.py` → `dist/chess_statistics_portable/`.

---

## Definition of Done (Phase 0)

- [ ] P0-1…P0-5 en estado 🔧 o ✅ según corresponda.  
- [ ] Flujo UI MVP validado manualmente (import → jobs → analysis) sin errores 5xx.  
- [ ] HITL ×5 (P1-3) documentado en issue antes de marcar UI-107 ✅.  
- [ ] OpenSpec change creado para cualquier cambio de contrato API/UI publicado.  
- [ ] Tests: `pytest tests/mvp tests/docs_courses tests/chess_statistics` (gate P0-1).

---

## Testing

- **Unit / integration:** `tests/mvp`, F07 en `tests/docs_courses`.  
- **E2E:** P0-5 (pendiente).  
- **Manual:** tabla § Validación local.

---

## Rollback

- Revert branch `feature/11_*` / `feature/07_*`; Alembic downgrade solo en dev documentado.  
- Jobs volátiles (BackgroundTasks): reintento desde UI; cola durable = P1-5.

---

## Labels (issues nuevos)

- domain: `ext-ui` | `ext-api-fastapi` | `core-analysis`  
- type: `feature` | `bug` | `chore`  
- priority: `P0` | `P1` | `P2`  
- phase: `0`  
- alias: (opcional hasta registrar en [modules/03-technical-aliases.md](../modules/03-technical-aliases.md))
