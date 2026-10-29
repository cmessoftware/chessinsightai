# Feature list — Phases 1–2 (producto web)

**Roadmap:** [01-phase-roadmap.md](./01-phase-roadmap.md) · **Hub:** [00-roadmap-index.md](./00-roadmap-index.md)  
**Actualizado:** 2026-10-26  

Este doc resume **qué entrega Phase 1 y Phase 2** y enlaza el **catálogo vivo** de ítems UI (`FEAT-*`, `BUG-*`). No duplica fila a fila el tracker; para estado exacto y comentarios usar el canónico en `designs/` (espejo en `deep_analysis/`).

| Phase | Doc operativo | Alcance |
| --- | --- | --- |
| **1** | [02-phase-01-coach-web-slice.md](./02-phase-01-coach-web-slice.md) | Import → cola → análisis MultiPV; `module07` mínimo; UI Coach slice |
| **2** | [03-phase-02-analysis-in-product.md](./03-phase-02-analysis-in-product.md) | Infra P0, HITL, análisis **servidor** (AS-A/B), gates F07 en producto |

**Plataforma (core-engine, ML, orquestación):** phases **7–16** — ver [01-phase-roadmap.md § plataforma](./01-phase-roadmap.md#fases-plataforma-7-16-horizonte) (`08-platform-core-engine-minimal-api.md`, etc.). El contenido histórico «core-engine + minimal api» / «ml-error-classification» **no** pertenece a este archivo.

---

## Phase 1 — Feature list (vertical slice)

### Infra y gates (P0)

| Id | Entregable | Estado (2026-10-26) |
| --- | --- | --- |
| P0-1 | CI Coach MVP (`requirements-ci.txt`, job MVP) | ✅ Accepted |
| P0-2 | Un driver DB en path MVP | ⬜ Planned |
| P0-3 | `npm run build` + gate CI | ⬜ Planned |
| P0-4 | Alembic upgrade/downgrade en CI | 🧪 In Testing |
| P0-5 | E2E PGN → decisiones | ⬜ Planned |

### Backend (`module07`, API)

- Ingest multi-PGN, POV al encolar, cola de jobs, worker Stockfish, router games/jobs/import.
- Catálogo unificado `coach_games` + join `games` (GC-2 / FEAT-042).
- Listado Partidas con filtros avanzados y metadatos de catálogo (FEAT-050–065, ver abajo).

### UI Coach (slice)

- Import unificado, cola `/coach/jobs`, análisis `/coach/games/:id/analysis`, sidebar Coach (FEAT-030).
- Partidas: columnas configurables, sort, paginación, categorías, acciones bulk (FEAT-046–059).
- Estudio: PGN, variantes, motor WASM (off por defecto), gráfico eval (FEAT-047), FEN bar (FEAT-022–024).
- **Tracker completo:** [issues-coach-move-classification-pedagogy-mini-plan.md](./designs/issues-coach-move-classification-pedagogy-mini-plan.md) (§ Features y bugs de UI).

### Catálogo Partidas / GC (Phase 1, cerrado reciente)

| Id | Descripción corta | Estado |
| --- | --- | --- |
| FEAT-061 | Comentarios y NAG por ply (`CoachPlyAnnotationPanel`) | ✅ Done (#197) |
| FEAT-062 | Selector gráfico de coronación (`CoachPromotionPicker`) | ✅ Done (#198) |
| FEAT-063 | Filtros avanzados Partidas + API query params (UI-G2) | ✅ Done HITL |
| FEAT-064 | Fuente = `coach_games.corpus_type`; `GET …/games/corpus-types` | ✅ Done HITL |
| FEAT-065 | Catálogo ECO Lichess CC0; combo Aperturas; filtro `eco` OR `opening` | ✅ Done HITL |

Rama de entrega conjunta 063–065 (y restore 061–062 en base antigua de `main`): `feature/11_065_partidas_opening_combo`. Mini-plan catálogo: [coach-games-catalog-unify-mini-plan.md](./designs/coach-games-catalog-unify-mini-plan.md).

### Ritmo (FEAT-032 / FEAT-036 / FEAT-056)

- Columna **Ritmo** y descripción API usan clase + reloj (`formatCoachRhythmDisplay`, `format_coach_game_description`).
- **Regla Lichess (display + import desde PGN, tiempo base):** UltraBullet &lt;30 s; Bullet &lt;3 min; Blitz [3 min, 8 min); Rapid [8 min, 25 min); Classical ≥25 min. Si el evento PGN dice «Rapid» pero el reloj es 5+0, la UI muestra **Blitz 5+0** (`coachSpeedClassLichess.js`, `infer_speed_class_from_time_control` en `metadata.py`).
- Pendiente de commit/PR en la rama activa si aún no está en `main`.

---

## Phase 2 — Feature list (análisis en producto)

| Track | Ids | Entregable |
| --- | --- | --- |
| Infra | P0-2…P0-5 | CI DB, build frontend, Alembic, E2E |
| Posición | POS-1…POS-3 | FEN texto (MVP); imagen / editor → backlog UI |
| Servidor MVP | AS-1…AS-6, SV-1…SV-3 | Worker línea completa, ply en Postgres, cliente lee DB |
| Servidor robusto | AS-7…AS-11 | Redis, ARQ, multi-motor |
| HITL / gates | CA-8, P1-2, P1-3, GATE-* | Clasificación pedagógica, `expert_gold`, DoD M07 |
| Lc0 kibitzer | LZ-1…LZ-8 | Backlog post AS-A |

Detalle y estado por ítem: [03-phase-02-analysis-in-product.md](./03-phase-02-analysis-in-product.md) · [deep_analysis/index.md](./deep_analysis/index.md).

---

## Resumen backlog UI (tracker)

Sincronizado con [issues tracker § Resumen](./designs/issues-coach-move-classification-pedagogy-mini-plan.md#resumen-backlog):

| Estado | Alcance |
| --- | --- |
| ✅ Done | FEAT-01…06, FEAT-08…11, FEAT-014…033, FEAT-032/035/036, FEAT-040…042, FEAT-043/045–048, FEAT-050…062, FEAT-063/064/065/066/068, FEAT-070/071 (#208), BUG-02/04/07/10/013/015/016/037/044/049/060/067, DB-FEAT-01 |
| 🔄 WIP | BUG-12 (pedagogía cp), FEAT-07 (Mental 1600) |
| ⬜ Todo | FEAT-038, FEAT-039, FEAT-053, LOG-FEAT-01…03, DB-FEAT-02…04 |
| 🔁 Duplicado | FEAT-034 |

**Siguiente sugerido (UI):** FEAT-038 / FEAT-039 (FEN desde imagen / piezas) → FEAT-053 (comentarios por movida en cuadro dedicado; solapa parcial con FEAT-061).

---

## Proposed tasks (Phase 1 cierre)

- Cerrar **P0-2 → P0-5** (ver [00-roadmap-index § P0](./00-roadmap-index.md#p0--cerrar-en-phase-1)).
- HITL ×5 en slice import → jobs → analysis (**P1-3**).
- Merge PR Partidas 063–065 + ritmo Lichess; validar filtros con corpus real.
- Avanzar **UI-110** layout análisis ([coach-game-analysis-layout-pgn.md](./designs/coach-game-analysis-layout-pgn.md)).

## Proposed tasks (Phase 2 arranque)

- **AS-A:** SV-2 persistido + worker full line + cliente SV-3.
- **CA-8** checklist HITL clasificación; borrador **expert_gold** hacia 30 (**P1-2**).
- **POS-1:** FEN → `/coach/position` con motor live.
- No abrir UI M08 hasta **GATE-MVP-PRAGMATIC** ([03-phase-02](./03-phase-02-analysis-in-product.md)).

---

**Ramas:** un ítem de catálogo por branch — [roadmap-branches.mdc](../../../.cursor/rules/roadmap-branches.mdc).
