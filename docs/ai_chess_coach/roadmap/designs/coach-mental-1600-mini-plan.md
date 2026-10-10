# Mini-plan · FEAT-07 Modelo mental 1600 (Coach)

**Estado:** 🔄 **WIP** — implementación cliente M-1…M-10 en rama **`feature/11_117_mental_1600_wip`**; gate **M-11 HITL** pendiente (no merge a `main` hasta checklist §7).  
**Epic producto:** **FEAT-07** — pestaña **Mental 1600** en análisis de partida (Coach), alineado con la capa **7.0-human** del curso.

**Spec canónica (humana):** diagramas HTML en [`07_cc_detection_algoritms/`](../../../ai_chess_coach_course/07_cc_detection_algoritms/) · informe [`07_cc_human_mental_model_analysis.md`](../../../ai_chess_coach_course/07_cc_human_mental_model_analysis.md)

**Layout:** [coach-game-analysis-layout-pgn.md](./coach-game-analysis-layout-pgn.md)

**Relación con clasificación (CA-*):** [coach-move-classification-pedagogy-mini-plan.md](./coach-move-classification-pedagogy-mini-plan.md) — mismo **MVP navegador + WASM**, sin persistir en PostgreSQL. Mental 1600 **reutiliza** FEN del cursor, última jugada, eval antes/después (prefetch/classification) y MultiPV cuando ya exista.

**Estrategia acordada (2026-10):** integrar Mental 1600 en el **MVP cliente** (Stockfish WASM + chess.js). **No** depender del job module07 ni de `mental_model` en DB para probar el flujo. El Python en `analysis/mental_model/` es **referencia y paridad**; la implementación activa es **JS** en `src/frontend/src/utils/`. Tras HITL, portar reglas a worker (Phase 2) con tests golden compartidos.

**Código existente (base):**

| Capa | Piezas | Rol en MVP FEAT-07 |
|------|--------|---------------------|
| Referencia lab | `analysis/mental_model/*`, `test_mental_model_1600.py` | Spec ejecutable; golden para Vitest |
| Cliente WASM | `usePgnMoveClassification.js`, `coachEngineLabels.js`, `CoachGameAnalysisPage.jsx` | FEN, eval, MultiPV por ply |
| Cliente UI | Pestaña Mental + `MentalPanel` mínimo | Consumirá assessment **cliente** |
| Servidor (opcional) | `worker.py` → `mental_model` JSON | ⏸ No requerido para MVP; puede coexistir sin ser fuente de verdad |

**Ramas sugeridas:** `feature/11_117_*` … `feature/11_119_*` (solo frontend + utils JS). Un ítem por rama según [roadmap-branches.mdc](../../../../.cursor/rules/roadmap-branches.mdc).

**Leyenda estados:** ✅ Done · 🔄 WIP · ⬜ Todo · ⏸ Paused

---

## 1. Dos capas (igual que CA-*)

```text
┌─────────────────────────────────────────────────────────────────┐
│  MVP AHORA · solo navegador (FEAT-07 + CA-*)                    │
│  PGN + replay → FEN ply → chess.js triggers + eval WASM         │
│  → mode fast/critical, pausa, E1–E11, plan G/H/S, D1–D5 (PV)    │
│  → UI pestaña Mental 1600 (sin job, sin DB)                     │
└─────────────────────────────────────────────────────────────────┘
                              │ HITL OK (M-8)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  DESPUÉS · Phase 2 (module07 / F11-006 servidor)                │
│  Mismas reglas en Python worker; cliente puede leer cache server │
│  Top-5 críticas F07 + review pack (paralelo, no bloqueante)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Mapeo spec → MVP cliente

| § / fuente | Tema | Referencia Python | Entrega MVP (JS) |
|------------|------|-------------------|------------------|
| HTML fase 1 | E1–E11, pausa F, C/C1 vs crítico | `critical_triggers.py`, `notable_critical.py`, `flow.py` | `coachMental1600.js` — triggers + mode |
| HTML fase 2 | Plan G1–G4, F, D, E, G, I, J, S | `THINKING_PLAN_*` en `flow.py` | Constantes + lista en assessment |
| HTML fase 3 | D1–D5 sobre MultiPV | `candidate_taxonomy.py` | Clasificar UCI del classification hook |
| HTML fase 4 | S1–S4 sobre jugada hecha | `anti_blunder.py` | Opcional M-6: jugada SAN/UCI del ply |
| Δeval | Modo crítico por salto eval | `FAST_PATH_EVAL_DELTA`, triggers E11 | cp antes/después del hook clasificación |
| §10 Elo / ritmo | Pausa sugerida | `suggest_pause_seconds` | Tags PGN + `coachPlayerElo.js` |
| F11-006 servidor | Job + JSON persistido | worker | ⏸ Phase 2; UI puede ignorar `detail.mental_model` en MVP |

---

## 3. Objetivo FEAT-07 (MVP sin DB)

Al **navegar el PGN** (línea principal o variante; ply donde actúa el jugador analizado):

1. Pestaña **Mental 1600** muestra assessment **calculado en vivo** para `fen_before` del ply (o posición tras última jugada rival, según contrato M-2).
2. Contenido mínimo: **modo** (`fast` / `critical`), **pausa sugerida**, **disparadores E*** con evidencia, **plan de pensamiento** (pasos en español), y si hay MultiPV del WASM: **candidatas ordenadas D1–D5**.
3. Partida usable **sin cola module07**; si existe job, no sobrescribir MVP cliente salvo flag explícito futuro.

**No es objetivo del MVP cliente:** LLM, árbol HTML interactivo completo, persistencia `mental_model` en Postgres, endpoint `POST /assess`.

---

## 4. Catálogo de tareas FEAT-07

### 4.1 Referencia lab (Python) — hecho, no bloquea MVP

| Id | Ref curso | Entrega | Estado |
|----|-----------|---------|--------|
| **FEAT-07-L01** | 7.0-H01 | Contrato `DecisionAssessment` | ✅ Done |
| **FEAT-07-L02** | 7.0-H02 | Disparadores E1–E11 | ✅ Done |
| **FEAT-07-L03** | 7.0-H03 | Anti-blunder S1–S4 | ✅ Done |
| **FEAT-07-L04** | 7.0-H04 | Taxonomía D1–D5 | ✅ Done |
| **FEAT-07-L05** | 7.0-H05 | `assess_decision_point()` | ✅ Done |
| **FEAT-07-L06** | 7.0-H06 | Mapeo → 07-base | ✅ Done |
| **FEAT-07-L07** | 7.0-H07 | Tests pytest | ✅ Done |
| **FEAT-07-L08** | 7.0-H08 | Notebook lab | ✅ Done |
| **FEAT-07-L09** | 7.0-H09 | MultiPV → `meta.ordered_candidates` | ✅ Done (lab/worker) |
| **FEAT-07-L10** | 7.0-H10 | HITL 10 posiciones (lab) | ⬜ Todo |

### 4.2 MVP cliente — entregas **M-*** (orden de implementación)

| Id | Entrega | Qué hacer | Archivos / piezas | Estado |
|----|---------|-----------|-------------------|--------|
| **M-1** | Contrato JS | Shape `MentalAssessment` alineado a Python JSON (`mode`, `pause_seconds`, `triggers[]`, `thinking_plan[]`, `mapped_07_reasons`, `meta`); labels E1–E11 ES | `coachMental1600.js` | ✅ Done |
| **M-2** | Triggers tablero | Port MVP de E1–E8, E10 (chess.js): piezas colgantes, jaque/captura última jugada, peón con tempo, etc. | `coachMental1600.js` (+ helpers tipo `attackedUndefended`) | ✅ Done |
| **M-3** | Modo fast/critical | Reglas `notable` simplificadas + Δeval desde clasificación (≥40 cp como lab) + triggers no vacíos | `coachMental1600.js` | ✅ Done |
| **M-4** | Pausa + planes | `suggestPauseSeconds(timeControl, elo)`; planes `THINKING_PLAN_FAST` / `CRITICAL` (copiar textos de `flow.py`) | `coachMental1600.js` | ✅ Done |
| **M-5** | Candidatas D1–D5 | Clasificar y ordenar MultiPV (`multipvMovesUci` en clasificación) | `coachMental1600.js`, `coachPlyClassification.js` | ✅ Done |
| **M-6** | Anti-blunder jugada | S1–S4 sobre la jugada **real** del ply | `coachMental1600.js`, `Mental1600Panel.jsx` | ✅ Done |
| **M-7** | Hook React | `useMental1600Assessment` memoizado por cursor + clasificación | `useMental1600Assessment.js` | ✅ Done |
| **M-8** | UI panel | `Mental1600Panel`: triggers, plan, D1–D5, copy modo fast; tipografía PGN | `Mental1600Panel.jsx` | ✅ Done |
| **M-9** | Integración página | Tab Mental lee assessment **cliente** en ply del cursor (POV jugador); fallback JSON server en modo crítico job | `CoachGameAnalysisPage.jsx` | ✅ Done |
| **M-10** | Vitest + golden | 3–5 FEN fijos; paridad tolerante vs casos de `test_mental_model_1600.py` | `coachMental1600.test.js` | ✅ Done |
| **M-11** | HITL MVP | Checklist operativo + revisión humana antes de congelar reglas JS | [coach-mental-1600-hitl-checklist.md](./coach-mental-1600-hitl-checklist.md) | 🔄 WIP (doc listo; revisión pendiente) |

**Dependencias:** M-1 → M-2 → M-3 → M-4; M-5 en paralelo tras M-1; M-7 agrega M-2…M-5; M-8/M-9 tras M-7.

### 4.3 UI shell (ya tocado en CA-* / UI-110)

| Id | Entrega | Estado | Notas MVP cliente |
|----|---------|--------|-------------------|
| **FEAT-07-U01** | Pestaña Mental 1600 | ✅ Done | Mantener |
| **FEAT-07-U02** | Panel completo cliente | ✅ Done | Modo, triggers, notable, anti-blunder, D1–D5, plan |
| **FEAT-07-U08** | Layout tabs Motor \| Análisis avanzado \| Mental | 🔄 WIP | Sin cambio de orden |
| **FEAT-07-U09** | Tipografía alineada PGN | ✅ Done | `pgnMoveTextSx` en panel |
| **FEAT-07-U10** | Árbol HTML interactivo | ⏸ Post-MVP | |

### 4.4 Servidor module07 — Phase 2 (pausado para FEAT-07 MVP)

| Id | Entrega | Estado | Notas |
|----|---------|--------|-------|
| **FEAT-07-S01** | Worker → `assess_decision_point` | ✅ Done | No usar como prereq MVP |
| **FEAT-07-S02** | Persistencia JSON | ✅ Done | ⏸ |
| **FEAT-07-S03** | API GET `mental_model` | ✅ Done | Fallback opcional post-HITL |
| **FEAT-07-S04** | Contexto PGN en worker | ⬜ Todo | Phase 2 |
| **FEAT-07-S05** | Anti-blunder en worker | ⬜ Todo | Phase 2 |
| **FEAT-07-S06** | POST assess | ⬜ Todo | Solo si no se portó a JS |

Tareas **U03–U07** del plan anterior (solo render JSON server) quedan **absorbidas por M-8/M-9** o ⏸ si dependían solo del job.

### 4.5 Fuera de alcance MVP cliente

| Id | Nota | Estado |
|----|------|--------|
| **FEAT-07-X03** | LLM sobre `thinking_plan` | ⬜ Phase 2 |
| **FEAT-07-X04** | Reemplazo total prototipo Python | ⏸ Tras M-11 |

---

## 5. Diseño técnico (cliente)

### 5.1 Entrada por ply

- **FEN:** posición **antes** de la jugada del jugador analizado (misma que clasificación `fen_before`).
- **Última jugada rival:** UCI de la jugada previa (si ply > 0).
- **Eval:** `eval_before` / `eval_after` del hook de clasificación (cp POV jugador); mate → no forzar E11 por cp.
- **MultiPV:** hasta 3 UCI ya calculados para ese ply (M-5).
- **Elo / ritmo:** `coachPlayerElo.js` + tag `TimeControl` del PGN (default `rapid`, pausa 10 s).

### 5.2 UI

```text
[ Tablero ]  |  PGN anotado
             |  [ Motor live | Análisis avanzado | Mental 1600 ]
             |  Mental1600Panel(assessment del ply seleccionado)
```

Si el cursor está en ply del **rival**, mostrar copy: “Seleccioná una jugada tuya para ver el plan mental” (no assessment vacío).

### 5.3 Paridad futura Python ↔ JS

- Fixtures JSON exportados desde lab (`artifacts/module07/mental_model_assessment.json` + casos pytest).
- Misma versión de reglas: constante `MENTAL_MODEL_RULES_VERSION = 'v1'` en JS y worker.

---

## 6. Orden de implementación

```text
1. M-1, M-2, M-3, M-4   núcleo assessDecisionPoint
2. M-5, M-7             hook + candidatas
3. M-8, M-9, U-09       UI integrada al cursor PGN
4. M-10                 tests
5. M-6, M-11            anti-blunder + HITL
```

Rama sugerida: **`feature/11_117_mental_1600_client`**.

---

## 7. Criterios de aceptación (MVP sin DB)

- [ ] Partida importada / abierta en Coach **sin job**: al clic en jugada del POV, Mental 1600 muestra modo + pausa + plan.
- [ ] En posición táctica conocida (test golden): al menos un trigger E* con evidencia o modo `critical` coherente con lab.
- [ ] Con clasificación WASM en background: Δeval alimenta modo crítico cuando corresponde.
- [ ] MultiPV visible en Mental como lista D1–D5 cuando el ply ya fue clasificado.
- [ ] No panel vacío: mensajes claros para ply rival o FEN inicial.
- [ ] `npm test` incluye M-10; pytest lab sigue verde (sin regresión).

---

## 8. Referencias

| Documento | Uso |
|-----------|-----|
| [07_cc_human_mental_model_analysis.md](../../../ai_chess_coach_course/07_cc_human_mental_model_analysis.md) | Flujo pedagógico primario |
| [coach-move-classification-pedagogy-mini-plan.md](./coach-move-classification-pedagogy-mini-plan.md) | Misma estrategia sin DB |
| [coach-mental-1600-hitl-checklist.md](./coach-mental-1600-hitl-checklist.md) | Gate M-11 (HITL mental 1600) |
| [coach-classification-hitl-checklist.md](./coach-classification-hitl-checklist.md) | Gate CA-8 (badges / impacto) |
| [issues-coach-move-classification-pedagogy-mini-plan.md](./issues-coach-move-classification-pedagogy-mini-plan.md) | FEAT-07 enlazado aquí |

---

## 9. Próximo paso

**Rama activa FEAT-07:** `feature/11_117_mental_1600_wip` (WIP, sin merge hasta M-11).

1. Ejecutar HITL con [coach-mental-1600-hitl-checklist.md](./coach-mental-1600-hitl-checklist.md) (≥ 3 partidas rapid, §4 casos obligatorios).
2. Ajustar `coachMental1600.js` / tests según causas A–F; bump `MENTAL_MODEL_RULES_VERSION` si cambia comportamiento.
3. Tras gate M-11: PR desde `11_117` → `main`.

**Trabajo en paralelo (otra rama):** persistencia end-to-end → `feature/11_120_ply_classification_persist` (SV-2 / GATE-F07-PERSIST); ver [coach-move-classification-pedagogy-mini-plan.md](./coach-move-classification-pedagogy-mini-plan.md) §6.
