# ChessInsight — índice de roadmaps y estado (punto de entrada)

**Empezá acá** para ver visión global, qué documento abrir según la tarea, y el **estado vivo** (P0/P1, In Testing vs Accepted).

**Regla de oro:** **Done / ✅ aceptado** solo con gates técnicos **y** validación ajedrecística (corpus experto + HITL). Código en dev o mergeado **no** es Done del producto Coach.

**Ramas:** un ítem de catálogo por branch — ver [`.cursor/rules/roadmap-branches.mdc`](../../.cursor/rules/roadmap-branches.mdc) (`feature/07_*`, `feature/08_*`, `feature/11_*`, …).

---

## Mapa de documentos

| Si necesitás… | Abrí | IDs / alcance |
|---------------|------|----------------|
| **Catálogo producto MVP** (M08, M09, M11, gates F08/F09/F11) | [08_mvp_product_roadmap.md](./08_mvp_product_roadmap.md) | F08-*, F09-*, F11-*, GATE-* |
| **Motor por posición** (Stockfish, MultiPV, review pack) | [07_module_implementation_plan.md](./07_module_implementation_plan.md) | F07-* → código en `analysis/` |
| **UI producto** (import, tablero, reportes, Coach shell) | [11_ui_improvements_roadmap.md](./11_ui_improvements_roadmap.md) | UI-10x → traza a F11 en doc 08 |
| **Curso / gates 6.6, diagnóstico 7.1, RAG M10** | [06x_07x_roadmap_modules_and_tasks.md](./06x_07x_roadmap_modules_and_tasks.md) | No sustituye catálogo 08 |
| **Visión larga del curso IA** | [00-ai_enginner_course_roadmap.md](./00-ai_enginner_course_roadmap.md) | Módulos 12–13 → M11 React |
| **Estadísticas Lichess (portable)** | [LS01 plan](../lichess_statistics/01_module_implementation_plan.md) | Side tool; UI-404/401 en doc 11 |
| **Este archivo** | Estado ejecutivo + P0/P1 + leyenda | Actualizar en cada revisión de sprint |

```text
                    ┌─────────────────────────────┐
                    │   00_roadmap_index (acá)    │
                    │   estado + P0/P1 + mapa     │
                    └──────────────┬──────────────┘
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
    07_module_plan            08_mvp_product           11_ui_improvements
    (F07 engine)              (F08/F09/F11)          (UI-10x)
           │                       │                       │
           └───────────────────────┴───────────────────────┘
                         F07 alimenta M11/M08 vía persistencia
```

### Flujo rápido

1. **¿Qué construir?** → **08** (o **11** si es solo UI; **07** si es lógica F07 pura).
2. **¿Qué gate cierra?** → **08** §2 Gates.
3. **¿Qué priorizar esta semana?** → § Issues P0/P1 abajo.
4. **¿Cómo nombrar la rama?** → id del catálogo (`F11-002`, `UI-107`, …).

---

## Leyenda de estados

| Estado | Significado | ¿Cuenta como “terminado”? |
|--------|-------------|---------------------------|
| **⬜ Planned** | No implementado o solo especificado | No |
| **🟡 Code** | Implementado en repo; tests parciales | No |
| **🧪 In Testing** | Probado en dev; bugs conocidos | No |
| **🔧 Tech accepted** | CI, build, migraciones, E2E técnico | No (falta ajedrez) |
| **♟ Chess review** | Golden / experto sobre muestra | Parcial |
| **✅ Accepted** | Gate cerrado (§ Criterio de aceptación) | Sí |

En **UI-10x**, usar **🧪** en flujos Coach hasta HITL.

---

## Resumen ejecutivo

| Dimensión | Estado |
|-----------|--------|
| **F07 (análisis por posición)** | **🟡 Code** en `analysis/`; **sin** ♟ ni HITL producto |
| **Vertical slice Coach (M11 / module07)** | **🧪 In Testing** local: import → cola → Stockfish → MultiPV |
| **Infra P0** | Dev OK; **CI**, **`npm run build`**, driver DB unificado **pendientes** |
| **M08 / puzzles / Lc0 / SHAP prod** | **⬜ / 🟡** — después de P0 + slice ♟ |

---

## Estado por componente

| Componente | Code | In Testing | Chess / HITL | Notas |
|------------|------|------------|--------------|-------|
| Clasificador ML | 🟡 | 🧪 | ⬜ | SHAP no endurecido |
| F07 lab (F07-001…023) | 🟡 | 🧪 | ⬜ | “Done” en 07 = código, no producto |
| Triggers preventivos | 🟡 | ⬜ | ⬜ | FP/FN sin medir |
| Stockfish MultiPV / review pack | 🟡 | 🧪 | ⬜ | Metadatos motor P1 |
| module07 API + worker | 🟡 | 🧪 | ⬜ | POV al job; BackgroundTasks |
| Coach React | 🟡 | 🧪 | ⬜ | `/import`, `/coach/jobs`, `/coach/games/:id/analysis` |
| Alembic module07 | 🟡 | 🧪 | — | CI downgrade/upgrade pendiente |
| FastAPI legacy + front | 🟡 | 🧪 | — | Build TS falla |
| M08 persistencia | 🟡 | ⬜ | ⬜ | 08A/08B P1 |
| `expert_gold` | ⬜ | — | — | P1 bloqueante ♟ |

---

## Coach M11 (🧪)

| Flujo | Estado | Pendiente |
|-------|--------|-----------|
| Import unificado | 🧪 | Multi-PGN, corpus admin |
| Sesión vs handle PGN (7.6) | 🧪 | — |
| Cola masiva | 🧪 | Reintento failed; jobs volátiles |
| Análisis 1 partida + MultiPV | 🧪 | HITL vs Lichess ≥5 plies |
| GATE-F07-PERSIST / GATE-MVP-PRAGMATIC | ⬜ | [08 §2](./08_mvp_product_roadmap.md) |

---

## P0 — cerrar primero

| Id | Issue | Estado | Acción |
|----|--------|--------|--------|
| **P0-1** | CI / `requirements.txt` root | 🧪 | **`requirements-ci.txt`** + job `coach-mvp` en `.github/workflows/test.yml`; validar en GitHub |
| **P0-2** | psycopg3 vs psycopg2 | ⬜ | Un driver en path MVP |
| **P0-3** | `npm run build` | ⬜ | TS/JSX; gate CI |
| **P0-4** | Alembic en Postgres | 🧪 | upgrade/downgrade en CI |
| **P0-5** | E2E PGN → decisiones | ⬜ | Test o script documentado |
| **P0-6** | “main aceptado” sin P0-1…5 | — | No declarar |

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

## Alcance 07 / 08

| Módulo | Responsabilidad |
|--------|-----------------|
| ML existente | Jugada **ya realizada** |
| **M07 / F07** | Antes de mover: criticidad, candidatas, review pack |
| **M08A** | Dificultad práctica del ply |
| **M08B** | Longitudinal: temas, debilidades, ejercicios |
| SHAP | Explicación ML, no verdad ajedrecística |

---

## Plan de cierre (orden)

| # | Entregable | Estado |
|---|------------|--------|
| 1 | P0-2 Driver DB | ⬜ |
| 2 | P0-1 CI verde | 🧪 |
| 3 | P0-3 React build | ⬜ |
| 4 | P0-4 Alembic CI | 🧪 |
| 5 | P0-5 E2E técnico | ⬜ |
| 6 | P1-2 expert_gold | ⬜ |
| 7 | P1-3 HITL ×5 | ⬜ |
| 8 | P1-4 metadatos motor | ⬜ |
| 9 | GATE-MVP-PRAGMATIC | ⬜ |
| 10 | P1-6 08A/08B | ⬜ |

---

## Criterio de aceptación M07 producto

1. CI verde (P0-1…3). 2. Alembic reproducible. 3. E2E técnico. 4. Metadatos motor. 5. expert_gold ≥30. 6. FP/FN baseline. 7. HITL ≥5. 8. Señales preventivas demostradas. 9. Sin LLM-as-fact en API Coach MVP.

---

## Prioridad inmediata (7–14 días)

1. P0-1 → P0-3. 2. P0-4 + P0-5. 3. Borrador expert_gold (10). 4. No ampliar M08 UI hasta GATE-MVP-PRAGMATIC. 5. PRs Coach: estado 🧪 + enlace a este doc.

---

**Última revisión:** 2026-09-25 · **Historial:** sustituye `status_2026_09_25.md` como hub único.
