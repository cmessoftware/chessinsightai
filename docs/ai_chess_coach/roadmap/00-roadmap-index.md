# Roadmap index — AI Chess Coach (punto de entrada)

**Documentación activa:** `docs/ai_chess_coach/`.  
**Curso (`docs/ai_chess_coach_course/`):** congelado — [SUSPENDED.md](../../ai_chess_coach_course/SUSPENDED.md).

**Secuencia web:** phases **1 → 6** en [01-phase-roadmap.md](./01-phase-roadmap.md). **Trabajo activo:** Phase **1** ([02-phase-01-coach-web-slice.md](./02-phase-01-coach-web-slice.md)).

**Regla de oro:** **Accepted / ✅** solo con gates técnicos **y** validación ajedrecística. Merge a `main` ≠ Done producto.

**Ramas:** un ítem de catálogo por branch — [roadmap-branches.mdc](../../../.cursor/rules/roadmap-branches.mdc) (`feature/07_*`, `feature/08_*`, `feature/11_*`, …). El número de **phase** en issues (`1`…`6`) es orden web; los **IDs** (`F07-008`, `UI-107`) siguen en el curso.

**OpenSpec:** `docs/ai_chess_coach/openspec/changes/` · [README](../README.md).

---

## Mapa de documentos

| Si necesitás… | Abrí | IDs |
|---------------|------|-----|
| **Orden de entrega web (1–6)** | [01-phase-roadmap.md](./01-phase-roadmap.md) | phases 1–6 |
| **Seguimiento vivo (Phase 1)** | [02-phase-01-coach-web-slice.md](./02-phase-01-coach-web-slice.md) | P0, UI-10x slice, M07 mínimo |
| **Diseño análisis Coach (borrador)** | [designs/coach-game-analysis-layout-pgn.md](./designs/coach-game-analysis-layout-pgn.md) | UI-110 |
| **F07 en producto** | [03-phase-02-analysis-in-product.md](./03-phase-02-analysis-in-product.md) | F07-*, gates |
| **M08 entrenamiento** | [04-phase-03-training-diagnosis.md](./04-phase-03-training-diagnosis.md) | F08-* |
| **M09 corpus** | [05-phase-04-reference-corpus.md](./05-phase-04-reference-corpus.md) | F09-* |
| **UI restante** | [06-phase-05-coach-ui-complete.md](./06-phase-05-coach-ui-complete.md) | UI-105+ |
| **LS01 en web** | [07-phase-06-statistics-in-web.md](./07-phase-06-statistics-in-web.md) | LS01-*, UI-404+ |
| **Plataforma (7–16)** | [01-phase-roadmap.md](./01-phase-roadmap.md) § plataforma | 01-FEAT-* … |
| **Detalle catálogo (curso)** | [07](../../ai_chess_coach_course/07_module_implementation_plan.md) · [08](../../ai_chess_coach_course/08_mvp_product_roadmap.md) · [11 UI](../../ai_chess_coach_course/11_ui_improvements_roadmap.md) | F07/F08/F09/UI |
| **Issues / épicas** | [issue-template.md](./templates/issue-template.md) | alias, `phase: 1`…`6` |

```text
00-roadmap-index
       │
       ├── Phase 1  coach web slice     ← AHORA
       ├── Phase 2  F07 en producto
       ├── Phase 3  M08 diagnóstico
       ├── Phase 4  M09 corpus
       ├── Phase 5  UI completa (curso 11)
       ├── Phase 6  LS01 dashboard
       └── Phase 7–16  platform/*.md
```

### Flujo rápido

1. **¿Qué construir esta semana?** → Phase **1** + § Prioridad inmediata (abajo).  
2. **¿Cómo probar la UI?** → [Phase 1 § Validación local](./02-phase-01-coach-web-slice.md).  
3. **¿Dónde está el curso 07/08/11?** → [Mapeo en 01-phase-roadmap](./01-phase-roadmap.md#mapeo-curso-07--08--11--fases-web).  
4. **¿Nombre de rama?** → id catálogo (`UI-107`, `F07-008`, `P0-3`).

---

## Leyenda de estados

| Estado | Significado | ¿Terminado? |
|--------|-------------|-------------|
| **⬜ Planned** | No implementado | No |
| **🟡 Code** | En repo; tests parciales | No |
| **🧪 In Testing** | Dev; bugs conocidos | No |
| **🔧 Tech accepted** | CI, migraciones, E2E | No (falta ajedrez) |
| **♟ Chess review** | Golden / experto | Parcial |
| **✅ Accepted** | Gate cerrado | Sí |

---

## Resumen ejecutivo (Phase 1)

| Dimensión | Estado |
|-----------|--------|
| **Vertical slice Coach** | **🧪** import → cola → Stockfish → MultiPV |
| **Backend module07** | **🧪** ingest, jobs, worker |
| **F07 lab (`analysis/`)** | **🟡 / 🧪** → producto en **Phase 2** |
| **Infra P0** | P0-1 **✅**; P0-2…P0-5 **⬜ / 🧪** |
| **LS01 CLI** | **✅**; UI producto → **Phase 6** |

---

## P0 — cerrar en Phase 1

| Id | Issue | Estado | Notas |
|----|--------|--------|--------|
| **P0-1** | CI Coach MVP | ✅ | |
| **P0-2** | Un driver DB MVP | ⬜ | |
| **P0-3** | `npm run build` | ⬜ | |
| **P0-4** | Alembic en CI | 🧪 | |
| **P0-5** | E2E PGN → decisiones | ⬜ | |
| **P0-6** | “Main aceptado” sin P0-1…5 | — | No |

---

## P1 — cruzan Phase 1–3

| Id | Issue | Estado |
|----|--------|--------|
| **P1-1** | “Done” prematuro en docs | 🟡 |
| **P1-2** | `expert_gold` ≥30 | ⬜ |
| **P1-3** | HITL ×5 en UI | ⬜ |
| **P1-4** | Metadatos Stockfish en DB | ⬜ |
| **P1-5** | Cola durable | 🧪 |
| **P1-6** | Sign-off M08A / M08B | ⬜ |
| **P1-7** | SHAP prod | ⬜ |
| **P1-8** | UI sync + filtros Games | 🧪 / ⬜ |

---

## Alcance por capa (recordatorio)

| Capa | Fase web | Responsabilidad |
|------|----------|-----------------|
| Coach UI | 1, 5 | Import, cola, revisión, sync |
| module07 / F07 | 1, 2 | Evidencia por posición |
| M08 | 3 | Temas, debilidades, ejercicios |
| M09 | 4 | Corpus de referencia |
| LS01 | 6 | Estadísticas multi-fuente |

---

## Criterio de aceptación M07 producto (Phase 2)

1. CI verde (P0-1…3). 2. Alembic reproducible. 3. E2E técnico. 4. Metadatos motor. 5. `expert_gold` ≥30. 6. FP/FN baseline. 7. HITL ≥5. 8. Señales preventivas. 9. Sin LLM-as-fact en API Coach MVP.

---

## Prioridad inmediata (7–14 días)

1. Cerrar **P0-2 → P0-5**.  
2. **Validación UI** Phase 1 antes de ampliar F07 en producto (Phase 2).  
3. Borrador **expert_gold** (10 partidas).  
4. No abrir UI M08 hasta **GATE-MVP-PRAGMATIC** (Phase 2/3).  
5. PRs: estado **🧪** + enlace a este índice.

---

**Última revisión:** 2026-09-29 · Reemplaza hub en `ai_chess_coach_course/00_roadmap_index.md`.
