# Mini-plan · Clasificación de jugadas e importancia pedagógica

**Estado:** Borrador de implementación  
**Spec origen:** [Clasificación de jugadas e importancia pedagógica](../../Clasificación_de_%20jugadas_e_%20importancia%20pedagógica.md)

**Estrategia acordada:** primero **MVP en el navegador** (Stockfish WASM + UI de análisis avanzada). **No** persistir clasificación en PostgreSQL ni duplicar la cola module07 hasta cerrar **validación con humanos** (umbrales, copy, UX). Después se **congela el contrato** y se mueve a servicios F07 + modelos en DB (Phase 2).

**Código cliente ya existente (base):** `clientStockfishEngine.js`, `useLiveStockfishAnalysis.js`, `usePgnEvalCache.js`, `engineEval.js`, `CoachGameAnalysisPage.jsx`, `CoachPgnMoveList.jsx`, `LiveEnginePanel.jsx`.

---

## 1. Mapeo spec → flujo ya documentado / implementado

Leyenda: **Doc** = roadmap/curso 07; **Lab** = `docs/ai_chess_coach_course/analysis/`; **Cliente** = WASM + React; **Servidor** = module07 worker/DB; **⬜** = pendiente para esta spec.

| § Spec | Tema | Dónde está hoy | Gap (MVP cliente) |
|--------|------|----------------|-------------------|
| **§1** | Umbrales y `engine_label` | **Lab:** F07-005, F07-019. **Cliente:** eval por FEN (prefetch depth 10), sin `cp_loss` vs mejor jugada. | Calcular en JS: MultiPV + gap; badges en PGN. |
| **§2** | Umbrales iguales todos los Elo | Spec only | Constantes en `coachEngineLabels.js` (MVP). |
| **§3** | `pedagogical_impact` | **Lab:** position_assessment (referencia). | Reglas simples en cliente sobre eval antes/después. |
| **§4** | Críticas sin error | **Servidor:** top-5 job. **Cliente:** lista críticas si hay job. | Heurística cliente (eval swing, solo jugada) para badge cuando no hay job. |
| **§5** | `ml_label` | Plataforma 09 | Fuera del MVP cliente. |
| **§6–7** | Campos + UX avanzada | PGN tabla, variantes inline, tab Motor/Mental. | Panel “Análisis avanzado” por ply seleccionado. |
| **§8** | Validación humana | Tests lab F07 | Checklist en doc + partidas golden revisadas a mano **antes** de backend. |
| **§9–10** | Recomendaciones / Elo / PGN headers | Mental tab (job); headers en PGN importado. | JSON estático en frontend; Elo desde tags PGN en memoria. |

### Dos capas en el producto (no mezclar en el MVP)

```text
┌─────────────────────────────────────────────────────────────────┐
│  MVP AHORA · solo navegador (validación humana)                 │
│  PGN + replay → Stockfish WASM (MultiPV + depth)                │
│  → engine_label, cp_loss, impact, copy recomendación (JSON)     │
│  → caché sesión (memoria; opcional sessionStorage)              │
│  → UI: PGN anotado + panel “Análisis avanzado”                  │
└─────────────────────────────────────────────────────────────────┘
                              │ HITL OK (§8)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  DESPUÉS · Phase 2 servicios + DB                               │
│  Mismas reglas portadas a Python (paridad tests JS ↔ F07)       │
│  module07: tabla ply_annotation, jobs batch, review_pack        │
│  Cola server-side opcional; cliente puede mostrar cache server  │
└─────────────────────────────────────────────────────────────────┘

Paralelo (ya existe, no bloquea MVP cliente):
  /import → module07 job → top 5 críticas + review_pack (servidor)
  La pantalla de análisis puede seguir mostrando job + WASM a la vez.
```

---

## 2. Objetivo del MVP cliente (análisis avanzada)

Lo que el usuario ve **sin esperar cola ni worker**:

1. Al abrir una partida (importada o ya en DB), el **PGN de la línea principal** muestra eval y, cuando el motor termina ese ply, **etiqueta** (good / inaccuracy / mistake / blunder) y símbolos opcionales.
2. Al **clic en una jugada**, panel derecho **Análisis avanzado**: mejor jugada (MultiPV), jugada hecha, `cp_loss`, impacto pedagógico v1, texto de recomendación (plantilla por Elo si hay headers).
3. **Variantes** siguen siendo solo cliente (sesión); el WASM re-analiza la posición actual al navegar.
4. La **cola module07** (críticas, Mental 1600 server) queda como **capa opcional** hasta validar; no es requisito para probar clasificación pedagógica.

**No es objetivo del MVP:** issues de GitHub por ítem PC, tablas nuevas en Postgres, ni entrenar ML.

---

## 3. Entregas MVP cliente (orden sugerido)

Ramas sugeridas: `feature/11_11x_*` (solo frontend + utils JS). Un ítem por rama según [roadmap-branches.mdc](../../../../.cursor/rules/roadmap-branches.mdc).

| Id | Entrega | Qué hacer | Archivos / piezas | Estado |
|----|---------|-----------|-------------------|--------|
| **CA-1** | Contrato `engine_label` (JS) | `cp_loss` POV jugador = gap vs mejor de MultiPV en `fen_before`; umbrales 50/100/300; mate aparte (no forzar a cp). | `utils/coachEngineLabels.js`, tests Vitest | ✅ Done |
| **CA-2** | Motor por jugada (WASM) | Extender prefetch: por cada ply del jugador analizado, `fen_before` → MultiPV(3) + eval jugada; cola throttled para no congelar UI. | `usePgnMoveClassification.js`, `clientStockfishEngine.js` | ✅ Done |
| **CA-3** | PGN anotado | Columna/badge etiqueta + símbolos `?!` `?` `??`; tooltip descripción + PV. | `CoachPgnMoveList.jsx`, `coachPgnDisplay.js` | ✅ Done |
| **CA-4** | Panel Análisis avanzado | Vista dedicada (o pestaña junto a Motor): 4 bloques §7 (jugada, mejor, pérdida, lección corta). | `AdvancedMoveAnalysisPanel.jsx`, `CoachGameAnalysisPage.jsx` | ✅ Done |
| **CA-5** | `pedagogical_impact` v1 | Enum §3 desde buckets de eval (antes/después del ply); tabla Elo determinista v1; mostrar en CA-4 y tooltip. | `utils/coachPedagogicalImpact.js`, `coachPlayerElo.js` | ✅ Done |
| **CA-6** | Recomendaciones estáticas | `public/config/recommendation_templates.v1.json` + bandas Elo desde tags PGN; modo `basic` si falta Elo §10. | `utils/coachRecommendations.js`, panel CA-4 | ✅ Done |
| **CA-7** | Caché sesión | Map `gameId + pathKey` (línea principal); `sessionStorage`; re-analizar solo plies nuevos o firma main line distinta. | `coachClassificationSessionCache.js`, `usePgnMoveClassification.js` | ✅ Done |
| **CA-8** | Validación humana (manual) | 3–5 partidas anotadas a mano vs UI; ajustar umbrales/copy; registrar en checklist §8 del spec. | [coach-classification-hitl-checklist.md](./coach-classification-hitl-checklist.md) | 🔄 WIP (doc listo; revisión pendiente) |

**Dependencia mínima del servidor:** solo PGN + `analyzed_player` (White/Black) desde API o import; **no** hace falta nuevo endpoint para CA-1…CA-7.

---

## 4. Diseño técnico (cliente)

### 4.1 Cálculo por ply (CA-1, CA-2)

- Filtrar plies donde actúa el jugador analizado (POV del coach).
- Para ply `n`: FEN antes del movimiento → Stockfish `MultiPV 3`, depth configurable (ej. 12 en background, 16 al seleccionar ply).
- `eval_best_cp`, `eval_played_cp` normalizados POV jugador (reutilizar `engineEval.js`).
- `engine_label = classifyCpLoss(cp_loss)` con constantes del spec §1.
- Progreso: barra “Analizando jugadas… k/N” en panel; priorizar ply visible y vecinos.

### 4.2 UI análisis avanzada (CA-4)

Layout propuesto (misma página [UI-110](./coach-game-analysis-layout-pgn.md)):

```text
[ Tablero ]  |  PGN anotado
             |  [ Motor live | Análisis avanzado | Mental* ]
             |  contenido según tab
* Mental: job server si existe; si no, placeholder o CA-6 solo texto
```

Al seleccionar fila PGN: tablero + CA-4 sincronizados; MultiPV del ply en CA-4 (no solo posición actual del tablero si estás en variante).

### 4.3 Paridad futura con servidor (post-HITL)

- Misma firma de funciones en Python (`analysis/`) que en JS; tests golden compartidos (JSON fixtures).
- Umbrales y JSON de recomendaciones **versionados** (`v1`) para copiar de `public/config/` al repo backend.

---

## 5. Criterios de aceptación (MVP cliente)

- [ ] Partida completa del jugador POV: etiquetas visibles en PGN cuando termina el análisis en background (o al menos ply seleccionado + prefetch progresivo).
- [ ] Panel Análisis avanzado muestra mejor jugada, cp_loss y copy pedagógico coherente con §7 del spec.
- [ ] Sin job en cola: la pantalla sigue siendo usable solo con WASM.
- [ ] Con job en cola: críticas server + clasificación cliente pueden coexistir (etiquetar origen en UI si difieren: “motor local” vs “revisión cola”).
- [ ] Checklist HITL CA-8 firmado antes de implementar persistencia en DB.

---

## 6. Fase post-validación (servicios + DB) — no empezar hasta HITL

| Id | Entrega | Alcance |
|----|---------|---------|
| **SV-1** | Port CA-1…CA-5 a Python | Worker batch o paso post-ingest; paridad tests |
| **SV-2** | `module07_ply_annotation` | Persistir resultados; API `GET .../annotations` |
| **SV-3** | Cliente lee server cache | WASM solo para variantes / live; main line desde API |
| **SV-4** | Gates Phase 2 | [03-phase-02-analysis-in-product.md](../03-phase-02-analysis-in-product.md), expert_gold |
| **SV-5** | ML `ml_label` | [09-platform-ml-error-classification.md](../09-platform-ml-error-classification.md) |

---

## 7. Fuera de alcance

- Crear issues GitHub como plan de trabajo obligatorio (opcional para tracking).
- Persistir clasificación en DB en el MVP cliente.
- Reporte NL multi-partida (M08).
- Admin de umbrales en producción (JSON versionado basta hasta SV-*).

---

## 8. Referencias

| Documento | Uso |
|-----------|-----|
| [02-phase-01-coach-web-slice.md](../02-phase-01-coach-web-slice.md) | Slice import → análisis; WASM en Phase 1 |
| [coach-game-analysis-layout-pgn.md](./coach-game-analysis-layout-pgn.md) | Layout tablero + PGN |
| [03-phase-02-analysis-in-product.md](../03-phase-02-analysis-in-product.md) | Después de HITL |
| Spec pedagógica §8 | Gate humano antes de SV-* |

---

## 9. Próximo paso de implementación

**Persistencia (Phase 2, en curso):** rama **`feature/11_120_ply_classification_persist`** — SV-2 `module07_ply_annotation` + API; HITL CA-8/M-11 pueden seguir en paralelo en WIP.

**Clasificación / HITL (parked):** **`feature/11_117_mental_1600_wip`** (FEAT-07) + CA-8 cuando haya revisor.

1. **CA-8** — cerrar HITL con [checklist](./coach-classification-hitl-checklist.md) (no bloquea spike SV-2 si el contrato JSON es versionado).
