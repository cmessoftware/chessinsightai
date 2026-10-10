# Phase 2 · Análisis en producto (servidor + HITL)

**Roadmap phase:** `2` · **Domain:** `core-analysis`, `ext-api-fastapi`  
**Arquitectura:** [arquitectura_candidata_servicios_analisis.md](../arquitectura_candidata_servicios_analisis.md)  
**Mini-plan:** [designs/coach-async-analysis-server-mini-plan.md](./designs/coach-async-analysis-server-mini-plan.md)

**Objetivo:** cerrar **infra (P0) + HITL** y mover el **análisis profundo** de la línea principal al **servidor** (Stockfish en worker, persistencia ply). El cliente mantiene WASM solo para **Motor live** / exploración. Fase robusta añade **Redis + ARQ + motores** (Maia, Lc0, Alexander).

**Precondición:** Phase 1 slice (import → jobs → UI análisis).

**Fuera de alcance Phase 2:** notebooks/scripts del [curso suspendido](../../ai_chess_coach_course/SUSPENDED.md); no reactivar lab como pipeline de entrega.

---

## Tracks

| Track | ids | descripción |
| --- | --- | --- |
| **Posición suelta** | POS-1…POS-3 | **POS-1** FEN texto (MVP); imagen y editor tablero planificados — [mini-plan](./designs/coach-position-analysis-entry-mini-plan.md) |
| **Infra** | P0-2…P0-5 | CI DB, build frontend, Alembic, E2E |
| **HITL** | CA-8, P1-3, P1-2 | Checklist clasificación; expert_gold → 30 |
| **Servidor MVP (AS-A)** | AS-1…AS-6, SV-1, SV-2, SV-3 | Full-line worker, annotations, cliente lee DB |
| **Servidor robusto (AS-B)** | AS-7…AS-11 | Redis cache FEN, ARQ, multi-motor |
| **Gates** | GATE-F07-PERSIST, GATE-MVP-PRAGMATIC, M07-META, P1-4 | DoD producto M07 |

---

## Estado resumido

| id | status | descripción |
| --- | --- | --- |
| SV-2 / AS-1 | 🧪 | `module07_ply_annotations` + API (rama `11_120`) |
| SV-1 / AS-2 | ⬜ | Clasificación Python en worker; paridad CA |
| AS-3…AS-4 | ⬜ | Job full line + cliente sin CA-2 background |
| AS-7…AS-11 | ⬜ | ARQ, Redis, Maia/Lc0/Alexander |
| M07-META / P1-4 | ⬜ | Metadatos motor en DB |
| GATE-F07-PERSIST | ⬜ | Review pack + ply annotations persistidos |
| GATE-MVP-PRAGMATIC | ⬜ | Criterios producto MVP |
| P1-2 | ⬜ | `expert_gold` ≥30 |
| CA-8 | 🔄 | HITL clasificación pedagógica |

**Criterio M07 producto:** [00-roadmap-index.md](./00-roadmap-index.md) § Criterio de aceptación M07.

**DoD Phase 2:** AS-A completo + gates + HITL documentado; no marcar ✅ solo por merge a `main`.

**Ramas:** `feature/07_*` (worker/servidor), `feature/11_*` (cliente); ver mini-plan AS-*.
