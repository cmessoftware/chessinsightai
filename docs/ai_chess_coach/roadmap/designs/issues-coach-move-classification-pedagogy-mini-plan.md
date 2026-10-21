# Issues · Clasificación de jugadas e importancia pedagógica

**Estado:** Seguimiento activo (UI MVP liviano)  
**Actualizado:** 2026-10-19  

> **Sync (obligatorio):** Copia **canónica**. Mantener **idéntico** a `[../deep_analysis/issues-coach-move-classification-pedagogy-mini-plan.md](../deep_analysis/issues-coach-move-classification-pedagogy-mini-plan.md)`. Cambios del tracker en **ambos** archivos en el mismo commit; rama `docs/coach_issues_tracker` → merge a la feature activa.

**Spec origen:** [Clasificación de jugadas e importancia pedagógica](../../Clasificación_de_%20jugadas_e_%20importancia%20pedagógica.md)  
**Mini-plan CA-*:** [coach-move-classification-pedagogy-mini-plan.md](./coach-move-classification-pedagogy-mini-plan.md)  
**Split monolito #158:** integrado en `main` (#159–#164); ver [pr_158_riesgos.md](../../pr_158_riesgos.md).

**Estrategia (vigente):** MVP **Stockfish WASM** + UI de análisis avanzada en cliente. **SV-2** persiste clasificación por ply en Postgres (#159) cuando hay `gameId` y el usuario activa análisis liviano. Análisis profundo servidor → Phase 2 ([deep_analysis index](../deep_analysis/index.md)).

**Superficie UI actual:** `CoachStudyWorkspace.jsx`, `CoachGameAnalysisPage.jsx`, `CoachPgnMoveList.jsx`, `AdvancedMoveAnalysisPanel.jsx`, `LiveEnginePanel.jsx`, hooks `usePgnMoveClassification`, `useSyncPlyClassificationPersistence`.

---



## 3. Issues de UI para MVP de análisis liviano

Ramas: `feature/11_11x_*` — un ítem por rama ([roadmap-branches.mdc](../../../../.cursor/rules/roadmap-branches.mdc)).



## Features y bugs de UI


| Tipo-Id  | IdRel               | Descripción                                                                                                                                                                                     | Estado | Comentarios                                                                                                                                     |
| -------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| FEAT-01  |                     | Eliminar barra vertical                                                                                                                                                                         | ✅ Done |                                                                                                                                                 |
| BUG-02   |                     | Error en parseo general del PGN                                                                                                                                                                 | ✅ Done |                                                                                                                                                 |
| FEAT-02  |                     | Sacar ok (redundante)                                                                                                                                                                           | ✅ Done |                                                                                                                                                 |
| FEAT-03  |                     | Símbolos con colores en la ayuda superior                                                                                                                                                       | ✅ Done |                                                                                                                                                 |
| BUG-04   |                     | Falta `error_label` para las negras                                                                                                                                                             | ✅ Done |                                                                                                                                                 |
| FEAT-05  |                     | Tooltip en símbolo: descripción + PV alternativa                                                                                                                                                | ✅ Done |                                                                                                                                                 |
| FEAT-06  |                     | Badge de error solo junto a la jugada (no junto a eval numérica)                                                                                                                                | ✅ Done |                                                                                                                                                 |
| BUG-07   |                     | Panel PGN no debe caer bajo el tablero en desktop/tablet                                                                                                                                        | ✅ Done |                                                                                                                                                 |
| FEAT-08  |                     | Subvariantes (2 niveles); borrar jugadas hacia adelante con confirmación                                                                                                                        | ✅ Done |                                                                                                                                                 |
| FEAT-09  | FEAT-08             | Borrar desde jugada vía clic derecho (sin icono tijera)                                                                                                                                         | ✅ Done | Menú «Borrar jugadas desde aquí…»                                                                                                               |
| BUG-10   | FEAT-09             | Una línea por par de plies                                                                                                                                                                      | ✅ Done | Fila flex blanca/negra + variantes inline                                                                                                       |
| FEAT-11  | FEAT-08             | Font tooltip = font movidas PGN                                                                                                                                                                 | ✅ Done | `pgnMoveTextSx`                                                                                                                                 |
| BUG-12   |                     | Blunders falsos según contexto (ganado/igual/perdido)                                                                                                                                           | 🔄 WIP  | `coachPedagogicalImpact.js`; etiqueta cp sin cambio                                                                                             |
| BUG-013  |                     | Tab Análisis avanzado desaparecía al cambiar PGN                                                                                                                                                | ✅ Done | Tabs sticky; reset por `gameId`                                                                                                                 |
| FEAT-07  |                     | **Mental 1600** (WASM + chess.js)                                                                                                                                                               | 🔄 WIP  | Tab en workspace; M-11 HITL: [checklist](./coach-mental-1600-hitl-checklist.md)                                                                 |
| FEAT-014 |                     | Botón girar tablero                                                                                                                                                                             | ✅ Done | #159 — `FlipCameraAndroid`                                                                                                                      |
| BUG-015  |                     | Numeración por movimiento PGN (no ply)                                                                                                                                                          | ✅ Done | #159 — `moveNumberFromPlyCount`                                                                                                                 |
| BUG-016  |                     | Tras importar y analizar hasta ply X, reabrir desde Partidas: tablero vs **Análisis avanzado** desincronizados ([captura](../../img/BUG-016.png))                                               | ✅ Done | [#165](https://github.com/cmessoftware/chessinsightai/pull/165) — `coachLastGameSession` cursor + sin auto-select 1ª decisión servidor          |
| FEAT-017 |                     | Eliminar partidas desde Acciones (cola / biblioteca)                                                                                                                                            | ✅ Done | [#167](https://github.com/cmessoftware/chessinsightai/pull/167) — DELETE + bulk-delete; badges de estado en Partidas                            |
| FEAT-018 |                     | Análisis liviano **off** por defecto; icono power en **Motor** (sin WASM al entrar)                                                                                                             | ✅ Done | [#166](https://github.com/cmessoftware/chessinsightai/pull/166) merged                                                                          |
| FEAT-019 |                     | Flechas ←/→ con foco en tablero (atrás/adelante en línea)                                                                                                                                       | ✅ Done | [#168](https://github.com/cmessoftware/chessinsightai/pull/168) — `usePgnKeyboardNav`                                                           |
| FEAT-020 |                     | Menú contextual PGN: copiar variante principal                                                                                                                                                  | ✅ Done | [#169](https://github.com/cmessoftware/chessinsightai/pull/169) — `formatMainLinePgnMovetext`                                                   |
| FEAT-021 | FEAT-20             | Menú contextual PGN: copiar PGN con variantes                                                                                                                                                   | ✅ Done | [#169](https://github.com/cmessoftware/chessinsightai/pull/169) — `formatTreePgnMovetext`                                                       |
| FEAT-022 |                     | Mostrar FEN de la jugada actual bajo el tablero                                                                                                                                                 | ✅ Done | [#170](https://github.com/cmessoftware/chessinsightai/pull/170) — `CoachCurrentFenBar`                                                          |
| FEAT-023 | FEAT-22             | Botón copiar FEN al portapapeles                                                                                                                                                                | ✅ Done | [#171](https://github.com/cmessoftware/chessinsightai/pull/171) — HITL                                                                          |
| FEAT-024 | FEAT-22             | Link FEN → `/coach/position` con posición cargada                                                                                                                                               | ✅ Done | [#172](https://github.com/cmessoftware/chessinsightai/pull/172)                                                                                 |
| FEAT-025 |                     | Importar Partidas: importación masiva PGN (texto/archivo, máx. 100); 1 partida → análisis; >1 → Partidas                                                                                        | ✅ Done | [#173](https://github.com/cmessoftware/chessinsightai/pull/173) — HITL                                                                          |
| FEAT-026 |                     | Iconos Acciones: [VER](../../img/ver.png) / [ANALIZAR](../../img/analizar.png) / [ELIMINAR](../../img/eliminar.png)                                                                             | ✅ Done | [#174](https://github.com/cmessoftware/chessinsightai/pull/174) — HITL; [#175](https://github.com/cmessoftware/chessinsightai/pull/175) tracker |
| FEAT-027 |                     | Importación masiva desde Lichess                                                                                                                                                                | ✅ Done | HITL — [#176](https://github.com/cmessoftware/chessinsightai/pull/176); hardening en `feature/11_146b_feat_027_lichess_hardening`               |
| FEAT-028 | FEAT-027            | Importación masiva desde Chess.com                                                                                                                                                              | ✅ Done | HITL OK — `feature/11_147_feat_028_chesscom_bulk_import`                                                                                        |
| FEAT-029 |                     | Cambio de usuario POV en todas las partidas (bulk)                                                                                                                                              | ✅ Done | HITL OK — `feature/11_148_feat_029_bulk_pov`                                                                                                    |
| FEAT-030 |                     | Menú principal: barra superior → **sidebar izquierdo** colapsable; secciones (Inicio, Partidas, Reportes) + **Coach** como submenú; sin Tablero (→ `/coach/position`); responsive                                                                 | ✅ Done | HITL OK — `feature/11_149_feat_030_coach_sidebar` — `AppShell`; Home con tarjetas; logo                                                                 |
| FEAT-031 | FEAT-019 / FEAT-020 | Modificar: al copiar PGN copiar también el encabezado del mismo                                                                                                                                 | ⬜ Todo |                                                                                                                                                 |
| FEAT-032 |                     | En tabla partidas agregar ritmo (Blitz, Rapid, Classical, Correspondence, Unknown)                                                                                                              | ✅ Done | `feature/11_147_feat_033_partidas_ritmo`; `CoachGamesPanel` + `coachSpeedClassLabel`                                                            |
| FEAT-033 | FEAT-027            | Por defecto no migrar: cant. movimientos ≤10 excepto análisis de posiciones que no empiezan desde la inicial; en ese caso marcar Fuente=Estudio                                                 | 🔄 WIP  | `feature/11_150_feat_033_skip_short_games`                                                                                                      |
| FEAT-034 |                     | En tabla partidas agregar campo Fuente (`corpus_type` de `coach_games`)                                                                                                                         | ⬜ Todo | Id duplicado en borrador — renumerar al implementar                                                                                             |
| FEAT-035 |                     | En tablero de análisis mostrar arriba y abajo mini iconos de piezas capturadas, adaptar si se gira el tablero                                                                                   | ⬜ Todo |                                                                                                                                                 |
| FEAT-036 | FEAT-033            | Agregar a descripción de la partida el ritmo y ritmo numérico (ej. Rapid 15+10)                                                                                                                 | ✅ Done | `formatCoachGameDescription`; API `description` + `time_control`                                                                                |
| BUG-037  |                     | No funciona botón de seleccionar/deseleccionar ítem del listado de partidas                                                                                                                     | ✅ Done | Poll 5s reseteaba `selectedIds` vía `useEffect(queueableGames)`                                                                                 |
| FEAT-038 |                     | Habilitar cargar una posición FEN desde la imagen de un tablero                                                                                                                                 | ⬜ Todo |                                                                                                                                                 |
| FEAT-039 |                     | Habilitar cargar una posición FEN desde drag&drop de iconos de piezas externas al tablero; permitir posiciones ilegales                                                                         | ⬜ Todo |                                                                                                                                                 |
| FEAT-040 | UI-G3               | Retirar **Navegador de Partidas** del menú principal y Home; redirect `/games` → `/coach/partidas` (alias temporal). Mantener `/api/chess/games` para admin / filtros avanzados (ver FEAT-042). | ⬜ Todo | `feature/11_151_feat_040_deprecate_games_navigator`; enlaza [GC UI-G3](../deep_analysis/coach-games-catalog-unify-mini-plan.md)                 |
| FEAT-041 | FEAT-024            | Retirar pestaña **Tablero** del AppBar; redirect `/chess-board` (y `/chess-board/:gameId` si aplica) → `/coach/position` o análisis Coach cuando haya partida.                                  | ⬜ Todo | `feature/11_152_feat_041_deprecate_chess_board_tab`; tablero canónico = `CoachStudyWorkspace`                                                   |
| FEAT-042 | FEAT-040 / GC-2     | Unificar UX Coach → Partidas con catálogo maestro: lista desde `games` (+ join `coach_games` para POV, jobs, análisis liviano); chips actuales; sin segunda tabla mental «Partidas vs Coach».   | ⬜ Todo | `feature/11_153_feat_042_coach_partidas_master_list` — entrega **UI-G3** del mini-plan catálogo; filtros corpus (UI-G2) opcional bajo rol admin |
| FEAT-043 |                     | Agregar soporte para organizar partidas por categoria (sub categorias de fuentes), por ejemplo, por Torneo, Tema tactico , Estudios etc                                                         | ⬜ Todo |                                                                                                                                                 |
| FEAT-044 |                     | En panel de analisis mostrar en gráfico de lineas la variaciónd cp, con el cero en el medio horizontal, -100 a +100 cp                                                                          | ⬜ Todo |                                                                                                                                                 |




## Features y bugs de login


| Tipo-Id     | IdRel | Descripción                                 | Estado | Comentarios |
| ----------- | ----- | ------------------------------------------- | ------ | ----------- |
| LOG-FEAT-01 |       | Soporte para login con usuario de Google    | ⬜ Todo |             |
| LOG-FEAT-02 |       | Soporte para login con usuario de Chess.com | ⬜ Todo |             |
| LOG-FEAT-03 |       | Soporte para login con usuario de Lichess   | ⬜ Todo |             |




## Features y bugs de estructura de tablas


| Tipo-Id    | IdRel | Descripción                                                      | Estado | Comentarios                             |
| ---------- | ----- | ---------------------------------------------------------------- | ------ | --------------------------------------- |
| DB-FEAT-01 |       | cambiar tabla module07_games por coach_games                     | ✅ Done | Actualizar referencias en código Python |
| DB-FEAT-02 |       | cambiar tabla module07_decision_points por coach_decision_points | ⬜ Todo | Actualizar referencias en código Python |
| DB-FEAT-03 |       | cambiar tabla module07_analysis_jobs por coach_analysis_jobs     | ⬜ Todo | Actualizar referencias en código Python |
| DB-FEAT-04 |       | cambiar tabla module07_ply_annotations por coach_ply_annotations | ⬜ Todo | Actualizar referencias en código Python |




### Resumen backlog


| Estado | IDs                                                                                                      |
| ------ | -------------------------------------------------------------------------------------------------------- |
| ✅ Done | FEAT-01…06, BUG-02/04/07/10/013/015/016, FEAT-08…11, FEAT-014/017…030, FEAT-032/036, BUG-037, DB-FEAT-01 |
| 🔄 WIP  | BUG-12, FEAT-07, FEAT-033                                                                                |
| ⬜ Todo | FEAT-031, FEAT-034…035, FEAT-038…044, LOG-FEAT-01…03, DB-FEAT-02…04                                       |


**Siguiente sugerido (orden):** FEAT-033 (no migrar cortas / Fuente=Estudio) → FEAT-031 (PGN + headers) → FEAT-040/041 (deprecar navegador + tablero sueltos) → FEAT-042 (UI-G3 lista unificada).