# Roadmap index — AI Chess Coach (punto de entrada)

**Documentación activa del producto:** `docs/ai_chess_coach/`.  
**Curso / laboratorio (`docs/ai_chess_coach_course/`):** suspendido en su estado actual; solo referencia congelada (ver [SUSPENDED.md](../../ai_chess_coach_course/SUSPENDED.md)).

**Regla de oro:** **Accepted / ✅** solo con gates técnicos **y** validación ajedrecística (corpus experto + HITL). Código mergeado **no** es Done del producto Coach.

**Ramas:** un ítem de catálogo por branch — [`.cursor/rules/roadmap-branches.mdc`](../../../.cursor/rules/roadmap-branches.mdc) (`feature/07_*`, `feature/08_*`, `feature/11_*`, `feature/ls01_*`, …).

**OpenSpec:** cambios de requisitos → change bajo `docs/ai_chess_coach/openspec/changes/` (proposal, design, specs, tasks). Ver [README](../README.md).

---

## Mapa de documentos (activos)

| Si necesitás… | Abrí | IDs |
|---------------|------|-----|
| **Seguimiento vivo MVP (Phase 0)** | [02-phase-00-coach-mvp-module07-ui.md](./02-phase-00-coach-mvp-module07-ui.md) | F07-*, F08-*, F11-*, UI-10x, P0/P1 |
| **Fases largo plazo (1–10)** | [01-phase-roadmap.md](./01-phase-roadmap.md) | 01-FEAT-* … |
| **Catálogo MVP (detalle, congelado en curso)** | [08_mvp_product_roadmap.md](../../ai_chess_coach_course/08_mvp_product_roadmap.md) | F08/F09/F11, GATE-* |
| **Motor F07 (detalle, congelado en curso)** | [07_module_implementation_plan.md](../../ai_chess_coach_course/07_module_implementation_plan.md) | F07-* → `analysis/`, `module07/` |
| **UI catálogo (congelado en curso)** | [11_ui_improvements_roadmap.md](../../ai_chess_coach_course/11_ui_improvements_roadmap.md) | UI-10x |
| **Estadísticas multi-fuente** | [LS01 plan](../../lichess_statistics/01_module_implementation_plan.md) | LS01-*; extensión UI → Phase 0 § LS01 |
| **Issues / épicas** | [templates/issue-template.md](./templates/issue-template.md), [epic-template.md](./templates/epic-template.md) | alias, domain, phase |

```text
                    ┌──────────────────────────────┐
                    │  00-roadmap-index (acá)      │
                    │  Phase 0 MVP + P0/P1         │
                    └──────────────┬───────────────┘
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
   phase-00-coach-mvp      phase-roadmap 1–10        openspec/changes
   (implementación now)    (orquestación, RAG…)     (nuevos requisitos)
           │
           ├── module07 API + worker + Alembic
           ├── Coach React (import → jobs → analysis)
           └── F07 lab → producto vía persistencia / review pack
```

### Flujo rápido

1. **¿Qué construir esta semana?** → [Phase 0](./02-phase-00-coach-mvp-module07-ui.md) § Prioridad inmediata.
2. **¿Cómo probar la UI MVP?** → Phase 0 § Validación local.
3. **¿Qué gate cierra el producto?** → catálogo 08 § Gates (referencia) + Phase 0 § Criterio M07.
4. **¿Nombre de rama?** → id del catálogo (`UI-107`, `F07-008`, `P0-3`, …).

---

## Leyenda de estados

| Estado | Significado | ¿Cuenta como “terminado”? |
|--------|-------------|---------------------------|
| **⬜ Planned** | No implementado o solo especificado | No |
| **🟡 Code** | En repo; tests parciales | No |
| **🧪 In Testing** | Probado en dev; bugs conocidos | No |
| **🔧 Tech accepted** | CI, build, migraciones, E2E técnico | No (falta ajedrez) |
| **♟ Chess review** | Golden / experto sobre muestra | Parcial |
| **✅ Accepted** | Gate cerrado | Sí |

---

## Resumen ejecutivo (Phase 0)

| Dimensión | Estado |
|-----------|--------|
| **Vertical slice Coach** | **🧪** import → cola → Stockfish → MultiPV (`/import`, `/coach/jobs`, `/coach/games/:id/analysis`) |
| **F07 en producto (`module07`)** | **🧪** ingest, jobs, worker; POV al encolar (7.6) |
| **F07 lab (`analysis/`, curso)** | **🟡 / 🧪** — no confundir con Done producto |
| **Infra P0** | P0-1 **✅**; P0-2…P0-5 **⬜ / 🧪** |
| **LS01 chess_statistics** | **✅** pipeline portable; **Stockfish-first** (LS01-023); UI producto **⬜** |

---

## P0 — cerrar primero

| Id | Issue | Estado | Notas |
|----|--------|--------|--------|
| **P0-1** | CI Coach MVP (`requirements-ci.txt`, job `coach-mvp`) | ✅ | LFS PGN, deps curso/LS01 |
| **P0-2** | psycopg3 vs psycopg2 (un driver MVP) | ⬜ | |
| **P0-3** | `npm run build` | ⬜ | Gate CI frontend |
| **P0-4** | Alembic Postgres en CI | 🧪 | |
| **P0-5** | E2E PGN → decisiones | ⬜ | |
| **P0-6** | Declarar “main aceptado” sin P0-1…5 | — | No |

---

## P1 — después de P0

| Id | Issue | Estado |
|----|--------|--------|
| **P1-1** | “Done” prematuro en docs | 🟡 |
| **P1-2** | `expert_gold` ≥30 | ⬜ |
| **P1-3** | HITL ×5 en UI | ⬜ |
| **P1-4** | Metadatos Stockfish en DB | ⬜ |
| **P1-5** | Cola durable (post-MVP) | 🧪 |
| **P1-6** | Sign-off M08A / M08B | ⬜ |
| **P1-7** | SHAP prod | ⬜ |
| **P1-8** | UI sync sitios + filtros Games | 🧪 / ⬜ |

**P2:** Lc0, puzzles, OAuth UI-108, taxonomía completa.

---

## Alcance módulos (producto)

| Módulo | Responsabilidad |
|--------|-----------------|
| ML existente | Jugada **ya realizada** (post-hoc) |
| **M07 / F07** | Antes de mover: criticidad, candidatas, review pack |
| **M08A** | Dificultad práctica del ply |
| **M08B** | Longitudinal: temas, debilidades, ejercicios |
| **M11 / Coach UI** | Import, cola, revisión, shell React |
| **LS01** | Estadísticas multi-fuente (CLI; Postgres/UI en roadmap UI-404+) |
| SHAP | Explicación ML, no verdad ajedrecística |

---

## Criterio de aceptación M07 producto

1. CI verde (P0-1…3). 2. Alembic reproducible. 3. E2E técnico. 4. Metadatos motor. 5. `expert_gold` ≥30. 6. FP/FN baseline. 7. HITL ≥5. 8. Señales preventivas demostradas. 9. Sin LLM-as-fact en API Coach MVP.

---

## Prioridad inmediata (7–14 días)

1. Cerrar **P0-2 → P0-5** (driver DB, build, Alembic CI, E2E).  
2. **Validación UI MVP** (Phase 0 § Validación local) antes de ampliar core F07.  
3. Borrador **expert_gold** (10 partidas).  
4. No ampliar M08 UI hasta **GATE-MVP-PRAGMATIC**.  
5. PRs Coach: estado **🧪** + enlace a este índice.

---

**Última revisión:** 2026-09-29 · **Reemplaza** el hub operativo en `ai_chess_coach_course/00_roadmap_index.md`.
