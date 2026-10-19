# Mini-plan · Maia WASM en Análisis avanzado

**Estado:** ⬜ Planned (solo roadmap; sin implementación)  
**Phase:** **1** (cliente Coach) — complemento de CA-4, no bloquea SV-2 ni CA-8.  
**Spec / referencia:** [CSSLab/maia-chess](https://github.com/CSSLab/maia-chess) · dual-engine en [07_analysis_coherence_with_06_specs.md](../../../ai_chess_coach_course/07_analysis_coherence_with_06_specs.md) §9.1  
**Mini-plan padre:** [coach-move-classification-pedagogy-mini-plan.md](../deep_analysis/coach-move-classification-pedagogy-mini-plan.md) (**CA-9**)

**Rama sugerida:** `feature/11_121_maia_wasm_advanced` (un ítem por branch).

---

## 1. Objetivo

En la pestaña **Análisis avanzado** (ply seleccionado en línea principal), ofrecer una vista **Maia** opcional: distribución de jugadas “humanas” para un **Elo objetivo elegido por el usuario**, sin sustituir Stockfish en clasificación, PGN ni tab **Motor live**.

---

## 2. Alcance acordado

| Incluido | Excluido |
|----------|----------|
| UI solo en **Análisis avanzado** (`AdvancedMoveAnalysisPanel` / tab asociado) | Tab **Motor live**, prefetch PGN, **CA-2** background |
| Selector Elo Maia: **1100, 1300, 1500, 1700, 1900** (paso **200**; tope **1900**) | Elo **2100+** (no hay red Maia oficial estándar) |
| Top-N jugadas + probabilidad / rank Maia para `fen_before` del ply | Cambiar `engine_label`, `cp_loss` ni persistencia SV-2 con Maia |
| Inferencia **cliente** (ONNX + `onnxruntime-web` o stack equivalente); lazy-load del modelo por Elo | Cola module07 / worker Python Maia (Phase 2 opcional, no requisito) |
| Copy claro: “jugada típica ~X Elo” vs “mejor jugada motor (Stockfish)” | Re-clasificar partida entera con Maia |

**Nota producto:** Maia oficial publica redes cada **100** Elo (1100–1900). El selector expone **200** en 200; implementación futura puede cargar la red **más cercana** (ej. 1300 → `maia-1300`) y mostrar el Elo seleccionado en UI.

---

## 3. Entregas (orden sugerido)

| Id | Entrega | Qué hacer | Piezas previstas | Estado |
|----|---------|-----------|------------------|--------|
| **MA-1** | Contrato UI + Elo | Selector 1100–1900 (step 200); default sensato (ej. Elo jugador desde PGN o 1500); persistir preferencia en sesión | `AdvancedMoveAnalysisPanel.jsx` | ⬜ |
| **MA-2** | Assets ONNX | Script sync modelos (opset compatible ORT Web); CDN/`public/`; GPL-3 atribución | `scripts/sync-maia-assets.mjs`, README legal | ⬜ |
| **MA-3** | Encoder + inferencia | FEN → tensor 112 planos; policy map → UCI/SAN; top 3–5 moves | `utils/coachMaiaEncoding.js`, `engine/clientMaiaEngine.js` | ⬜ |
| **MA-4** | Bloque UI Análisis avanzado | Sección “Perspectiva Maia ~{Elo}”: jugada hecha vs prob. Maia; barras o lista rank | CA-4 existente | ⬜ |
| **MA-5** | Tests + HITL ligero | Vitest encoder/fixture FEN; 2–3 posiciones revisadas a mano vs referencia lc0 `go nodes 1` | tests frontend | ⬜ |

**Dependencias:** CA-4 ✅; no requiere CA-8 cerrado, pero conviene no mezclar copy pedagógico Maia con gates de cp_loss hasta revisar textos.

---

## 4. Criterios de aceptación

- [ ] Con Stockfish desactivado en UI de Maia, la clasificación PGN sigue igual (solo Stockfish WASM actual).
- [ ] Usuario cambia Elo 1100↔1900 y ve actualización de top moves Maia en **Análisis avanzado** para el ply seleccionado.
- [ ] No se descargan los 5 ONNX hasta que el usuario abre Análisis avanzado o elige Maia (lazy).
- [ ] Licencia y créditos Maia visibles (about / pie de panel).

---

## 5. Fuera de alcance (CA-9)

- Maia en variantes editadas (solo ply de **línea principal** en v1).
- Persistir predicciones Maia en `module07_ply_annotations` (SV-2 = contrato Stockfish/clasificación v1).
- Sustituir recomendaciones CA-6 por texto generado desde Maia.

---

## 6. Referencias

| Documento | Uso |
|-----------|-----|
| [coach-move-classification-pedagogy-mini-plan.md](./coach-move-classification-pedagogy-mini-plan.md) | CA-1…CA-8, SV-* |
| [coach-game-analysis-layout-pgn.md](./coach-game-analysis-layout-pgn.md) | Tabs Motor / Análisis avanzado |
| [02-phase-01-coach-web-slice.md](../02-phase-01-coach-web-slice.md) | Phase 1 UI |
