# Issues · Clasificación de jugadas e importancia pedagógica

**Estado:** Seguimiento activo (UI MVP liviano)  
**Actualizado:** 2026-10-15  
**Spec origen:** [Clasificación de jugadas e importancia pedagógica](../../Clasificación_de_%20jugadas_e_%20importancia%20pedagógica.md)  
**Mini-plan CA-*:** [coach-move-classification-pedagogy-mini-plan.md](./coach-move-classification-pedagogy-mini-plan.md)  
**Split monolito #158:** integrado en `main` (#159–#164); ver [pr_158_riesgos.md](../../pr_158_riesgos.md).

**Estrategia (vigente):** MVP **Stockfish WASM** + UI de análisis avanzada en cliente. **SV-2** persiste clasificación por ply en Postgres (#159) cuando hay `gameId` y el usuario activa análisis liviano. Análisis profundo servidor → Phase 2 ([arquitectura candidata](../../arquitectura_candidata_servicios_analisis.md)).

**Superficie UI actual:** `CoachStudyWorkspace.jsx`, `CoachGameAnalysisPage.jsx`, `CoachPgnMoveList.jsx`, `AdvancedMoveAnalysisPanel.jsx`, `LiveEnginePanel.jsx`, hooks `usePgnMoveClassification`, `useSyncPlyClassificationPersistence`.

---

## 3. Issues de UI para MVP de análisis liviano

Ramas: `feature/11_11x_*` — un ítem por rama ([roadmap-branches.mdc](../../../../.cursor/rules/roadmap-branches.mdc)).

| Tipo-Id | IdRel | Descripción | Estado | Comentarios |
| -------- | ------- | ----------- | ------ | ----------- |
| FEAT-01 | | Eliminar barra vertical | ✅ Done | |
| BUG-02 | | Error en parseo general del PGN | ✅ Done | |
| FEAT-02 | | Sacar ok (redundante) | ✅ Done | |
| FEAT-03 | | Símbolos con colores en la ayuda superior | ✅ Done | |
| BUG-04 | | Falta `error_label` para las negras | ✅ Done | |
| FEAT-05 | | Tooltip en símbolo: descripción + PV alternativa | ✅ Done | |
| FEAT-06 | | Badge de error solo junto a la jugada (no junto a eval numérica) | ✅ Done | |
| BUG-07 | | Panel PGN no debe caer bajo el tablero en desktop/tablet | ✅ Done | |
| FEAT-08 | | Subvariantes (2 niveles); borrar jugadas hacia adelante con confirmación | ✅ Done | |
| FEAT-09 | FEAT-08 | Borrar desde jugada vía clic derecho (sin icono tijera) | ✅ Done | Menú «Borrar jugadas desde aquí…» |
| BUG-10 | FEAT-09 | Una línea por par de plies | ✅ Done | Fila flex blanca/negra + variantes inline |
| FEAT-11 | FEAT-08 | Font tooltip = font movidas PGN | ✅ Done | `pgnMoveTextSx` |
| BUG-12 | | Blunders falsos según contexto (ganado/igual/perdido) | 🔄 WIP | `coachPedagogicalImpact.js`; etiqueta cp sin cambio |
| BUG-013 | | Tab Análisis avanzado desaparecía al cambiar PGN | ✅ Done | Tabs sticky; reset por `gameId` |
| FEAT-07 | | **Mental 1600** (WASM + chess.js) | 🔄 WIP | Tab en workspace; M-11 HITL: [checklist](./coach-mental-1600-hitl-checklist.md) |
| FEAT-014 | | Botón girar tablero | ✅ Done | #159 — `FlipCameraAndroid` |
| BUG-015 | | Numeración por movimiento PGN (no ply) | ✅ Done | #159 — `moveNumberFromPlyCount` |
| BUG-016 | | Tras importar y analizar hasta ply X, reabrir desde Partidas: tablero vs **Análisis avanzado** desincronizados ([captura](../../img/BUG-016.png)) | ✅ Done | [#165](https://github.com/cmessoftware/chessinsightai/pull/165) — `coachLastGameSession` cursor + sin auto-select 1ª decisión servidor |
| FEAT-017 | | Eliminar partidas desde Acciones (cola / biblioteca) | ✅ Done | [#167](https://github.com/cmessoftware/chessinsightai/pull/167) — DELETE + bulk-delete; badges de estado en Partidas |
| FEAT-018 | | Análisis liviano **off** por defecto; icono power en **Motor** (sin WASM al entrar) | ✅ Done | [#166](https://github.com/cmessoftware/chessinsightai/pull/166) merged |
| FEAT-019 | | Flechas ←/→ con foco en tablero (atrás/adelante en línea) | ✅ Done | [#168](https://github.com/cmessoftware/chessinsightai/pull/168) — `usePgnKeyboardNav` |
| FEAT-020 | | Menú contextual PGN: copiar variante principal | ✅ Done | [#169](https://github.com/cmessoftware/chessinsightai/pull/169) — `formatMainLinePgnMovetext` |
| FEAT-021 | FEAT-20 | Menú contextual PGN: copiar PGN con variantes | ✅ Done | [#169](https://github.com/cmessoftware/chessinsightai/pull/169) — `formatTreePgnMovetext` |
| FEAT-022 | | Mostrar FEN de la jugada actual bajo el tablero | 🔄 WIP | [#170](https://github.com/cmessoftware/chessinsightai/pull/170) — `CoachCurrentFenBar` |
| FEAT-023 | FEAT-22 | Botón copiar FEN al portapapeles | ⬜ Todo | |
| FEAT-024 | FEAT-22 | Link FEN → `/coach/position` con posición cargada | ⬜ Todo | |
| FEAT-025 | |Cambio de spec: En Impotar Partidas, cambiar a Importar Partidas, permitiendo importación masiva de partidas desde pgn en texto o dede archivo (limitar a 100 por importación configuable en un futuro modulo de admin - hacodeado por ahora) -> si es solo una continuar redirigiendo directamente al módulo de analisis, si es > 1 mostrar solapa partidas de Coach para que el usuario elija que partida comenzar a analizar.| ⬜ Todo | |
| FEAT-026 || Cambio de iconos [VER](./../../img/ver.png) / [ANALIZAR](./../../img/analizar.png)/ [ELIMINAR](./../../img/eliminar.png) 

### Resumen backlog

| Estado | IDs |
| ------ | --- |
| ✅ Done | FEAT-01…06, BUG-02/04/07/10/013/015/016, FEAT-08…11, FEAT-014/017…021 |
| 🔄 WIP | BUG-12, FEAT-07, FEAT-022 |
| ⬜ Todo | FEAT-023…024, FEAT-025…026 |

**Siguiente sugerido (orden):** FEAT-022 merge (#170) → FEAT-023/024 (copiar FEN + link posición).
