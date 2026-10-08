# Phase 6 · Estadísticas en la web (LS01)

**Roadmap phase:** `6` · **Domain:** `ext-ui`, `data`  
**Origen:** [LS01 plan](../../lichess_statistics/01_module_implementation_plan.md).

**Objetivo:** dashboard React + Postgres para métricas multi-fuente (hoy CLI portable ✅, LS01-023 Stockfish-first).

| id | status | descripción |
| --- | --- | --- |
| LS01-023 | ✅ | Pipeline portable; export con metadatos eval |
| UI-404+ | ⬜ | Postgres + dashboard React |

CLI: `scripts/pack_chess_statistics.py` → `dist/chess_statistics_portable/`.

**Precondición:** Phase 1 (auth, shell Coach); idealmente Phase 5 (filtros `games`).
