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

| Tipo-Id  | IdRel   | Descripción                                                                                                                                       | Estado | Comentarios                                                                                                                            |
| -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| FEAT-01  |         | Eliminar barra vertical                                                                                                                           | ✅ Done |                                                                                                                                        |
| BUG-02   |         | Error en parseo general del PGN                                                                                                                   | ✅ Done |                                                                                                                                        |
| FEAT-02  |         | Sacar ok (redundante)                                                                                                                             | ✅ Done |                                                                                                                                        |
| FEAT-03  |         | Símbolos con colores en la ayuda superior                                                                                                         | ✅ Done |                                                                                                                                        |
| BUG-04   |         | Falta `error_label` para las negras                                                                                                               | ✅ Done |                                                                                                                                        |
| FEAT-05  |         | Tooltip en símbolo: descripción + PV alternativa                                                                                                  | ✅ Done |                                                                                                                                        |
| FEAT-06  |         | Badge de error solo junto a la jugada (no junto a eval numérica)                                                                                  | ✅ Done |                                                                                                                                        |
| BUG-07   |         | Panel PGN no debe caer bajo el tablero en desktop/tablet                                                                                          | ✅ Done |                                                                                                                                        |
| FEAT-08  |         | Subvariantes (2 niveles); borrar jugadas hacia adelante con confirmación                                                                          | ✅ Done |                                                                                                                                        |
| FEAT-09  | FEAT-08 | Borrar desde jugada vía clic derecho (sin icono tijera)                                                                                           | ✅ Done | Menú «Borrar jugadas desde aquí…»                                                                                                      |
| BUG-10   | FEAT-09 | Una línea por par de plies                                                                                                                        | ✅ Done | Fila flex blanca/negra + variantes inline                                                                                              |
| FEAT-11  | FEAT-08 | Font tooltip = font movidas PGN                                                                                                                   | ✅ Done | `pgnMoveTextSx`                                                                                                                        |
| BUG-12   |         | Blunders falsos según contexto (ganado/igual/perdido)                                                                                             | 🔄 WIP  | `coachPedagogicalImpact.js`; etiqueta cp sin cambio                                                                                    |
| BUG-013  |         | Tab Análisis avanzado desaparecía al cambiar PGN                                                                                                  | ✅ Done | Tabs sticky; reset por `gameId`                                                                                                        |
| FEAT-07  |         | **Mental 1600** (WASM + chess.js)                                                                                                                 | 🔄 WIP  | Tab en workspace; M-11 HITL: [checklist](./coach-mental-1600-hitl-checklist.md)                                                        |
| FEAT-014 |         | Botón girar tablero                                                                                                                               | ✅ Done | #159 — `FlipCameraAndroid`                                                                                                             |
| BUG-015  |         | Numeración por movimiento PGN (no ply)                                                                                                            | ✅ Done | #159 — `moveNumberFromPlyCount`                                                                                                        |
| BUG-016  |         | Tras importar y analizar hasta ply X, reabrir desde Partidas: tablero vs **Análisis avanzado** desincronizados ([captura](../../img/BUG-016.png)) | ✅ Done | [#165](https://github.com/cmessoftware/chessinsightai/pull/165) — `coachLastGameSession` cursor + sin auto-select 1ª decisión servidor |
| FEAT-017 |         | Eliminar partidas desde Acciones (cola / biblioteca)                                                                                              | ✅ Done | [#167](https://github.com/cmessoftware/chessinsightai/pull/167) — DELETE + bulk-delete; badges de estado en Partidas                   |
| FEAT-018 |         | Análisis liviano **off** por defecto; icono power en **Motor** (sin WASM al entrar)                                                               | ✅ Done | [#166](https://github.com/cmessoftware/chessinsightai/pull/166) merged                                                                 |
| FEAT-019 |         | Flechas ←/→ con foco en tablero (atrás/adelante en línea)                                                                                         | ✅ Done | [#168](https://github.com/cmessoftware/chessinsightai/pull/168) — `usePgnKeyboardNav`                                                  |
| FEAT-020 |         | Menú contextual PGN: copiar variante principal                                                                                                    | ✅ Done | [#169](https://github.com/cmessoftware/chessinsightai/pull/169) — `formatMainLinePgnMovetext`                                          |
| FEAT-021 | FEAT-20 | Menú contextual PGN: copiar PGN con variantes                                                                                                     | ✅ Done | [#169](https://github.com/cmessoftware/chessinsightai/pull/169) — `formatTreePgnMovetext`                                              |
| FEAT-022 |         | Mostrar FEN de la jugada actual bajo el tablero                                                                                                   | ✅ Done | [#170](https://github.com/cmessoftware/chessinsightai/pull/170) — `CoachCurrentFenBar`                                                 |
| FEAT-023 | FEAT-22 | Botón copiar FEN al portapapeles                                                                                                                  | ✅ Done | [#171](https://github.com/cmessoftware/chessinsightai/pull/171) — HITL                                                                 |
| FEAT-024 | FEAT-22 | Link FEN → `/coach/position` con posición cargada                                                                                                 | ✅ Done | [#172](https://github.com/cmessoftware/chessinsightai/pull/172)                                                                        |
| FEAT-025 |         | Importar Partidas: importación masiva PGN (texto/archivo, máx. 100); 1 partida → análisis; &gt;1 → Partidas                                       | ✅ Done | [#173](https://github.com/cmessoftware/chessinsightai/pull/173) — HITL                                                                 |
| FEAT-026 |         | Iconos Acciones: [VER](../../img/ver.png) / [ANALIZAR](../../img/analizar.png) / [ELIMINAR](../../img/eliminar.png)                               | 🔄 WIP  | `feature/11_144_feat_026_partidas_action_icons` — MUI Visibility / Analytics / DeleteOutline + tooltips                                |
| FEAT-027 |         | Importaciones masiva desde lichess                                                                                                                | ⬜ Todo | Mostrar pantallas de configuracion que se se guarde por usuario:                                                                       |
    1. Campos: usuario lichess, desde, hasta, ritmo.
    1. Por defecto bajar todos los ritmos de a 200 partidas desde la mas nueva a las mas vieja. 
    2. Mostrar la opción de mejorar el rate/limit permitiendo cargar el token de autenticaciónd de la api (agregar un breve instructivo de como obtenerlo con permisos de solo get de partidas publicas).
    3. Permitir reinicio si hay desconección a la api de lichess
    4. Permitir agregar una alias para reemplazar el usuario de lichess en las copias de partidas importadas (solo el usuario de las partidas importadas, no de rivales) 
    5. Preservar el usario original apra permitir roollback  | ⬜ Todo | |
| FEAT-028 || Importaciones masiva desde chess.com | ⬜ Todo | Mostrar pantallas de configuracion que se se guarde por usuario:
    1. Campos: usuario lichess, desde, hasta, ritmo.
    2. Por defecto bajar todos los ritmos de a 200 partidas desde la mas nueva a las mas vieja. 
    3. Permitir reinicio si hay desconección a la api de chess.com
    4. Permitir agregar una alias para reemplazar el usuario de lichess en las copias de partidas importadas (solo el usuario de las partidas importadas, no de rivales).
    5. Preservar el usuario original para permitir rollback   | ⬜ Todo | |
| FEAT-029 || Permitir cambio de usuario en todas las partidas
              Preservar el usuario original para permitir rollback    | ⬜ Todo | |


### Resumen backlog

| Estado | IDs                                                                   |
| ------ | --------------------------------------------------------------------- |
| ✅ Done | FEAT-01…06, BUG-02/04/07/10/013/015/016, FEAT-08…11, FEAT-014/017…025 |
| 🔄 WIP  | BUG-12, FEAT-07, FEAT-026                                              |
| ⬜ Todo | FEAT-027…029                                                           |

**Siguiente sugerido (orden):** FEAT-026 (iconos Partidas) → FEAT-027 (import Lichess).
