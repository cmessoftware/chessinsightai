# Issues · Clasificación de jugadas e importancia pedagógica

**Estado:** Seguimiento activo (UI MVP liviano)  
**Actualizado:** 2026-10-15  
**Spec origen:** [Clasificación de jugadas e importancia pedagógica](../../Clasificación_de_%20jugadas_e_%20importancia%20pedagógica.md)  
**Mini-plan CA-*:** [coach-move-classification-pedagogy-mini-plan.md](./coach-move-classification-pedagogy-mini-plan.md)  
**Split monolito #158:** integrado en `main` (#159–#164); ver [pr_158_riesgos.md](../../pr_158_riesgos.md).

**Estrategia (vigente):** MVP **Stockfish WASM** + UI de análisis avanzada en cliente. **SV-2** persiste clasificación por ply en Postgres (#159) cuando hay `gameId` y el usuario activa análisis liviano. Análisis profundo servidor → Phase 2 ([index.md](./index.md)).

**Superficie UI actual:** `CoachStudyWorkspace.jsx`, `CoachGameAnalysisPage.jsx`, `CoachPgnMoveList.jsx`, `AdvancedMoveAnalysisPanel.jsx`, `LiveEnginePanel.jsx`, hooks `usePgnMoveClassification`, `useSyncPlyClassificationPersistence`.

---

## 3. Issues de UI para MVP de análisis liviano

Ramas: `feature/11_11x_*` — un ítem por rama ([roadmap-branches.mdc](../../../../.cursor/rules/roadmap-branches.mdc)).

<!-- Tablas en HTML: Markdown Preview Enhanced (extended table) rompe pipe tables con celdas vacías. -->

<table>
<thead>
<tr><th>Tipo-Id</th><th>IdRel</th><th>Descripción</th><th>Estado</th><th>Comentarios</th></tr>
</thead>
<tbody>
<tr><td>FEAT-01</td><td></td><td>Eliminar barra vertical</td><td>✅ Done</td><td></td></tr>
<tr><td>BUG-02</td><td></td><td>Error en parseo general del PGN</td><td>✅ Done</td><td></td></tr>
<tr><td>FEAT-02</td><td></td><td>Sacar ok (redundante)</td><td>✅ Done</td><td></td></tr>
<tr><td>FEAT-03</td><td></td><td>Símbolos con colores en la ayuda superior</td><td>✅ Done</td><td></td></tr>
<tr><td>BUG-04</td><td></td><td>Falta <code>error_label</code> para las negras</td><td>✅ Done</td><td></td></tr>
<tr><td>FEAT-05</td><td></td><td>Tooltip en símbolo: descripción + PV alternativa</td><td>✅ Done</td><td></td></tr>
<tr><td>FEAT-06</td><td></td><td>Badge de error solo junto a la jugada (no junto a eval numérica)</td><td>✅ Done</td><td></td></tr>
<tr><td>BUG-07</td><td></td><td>Panel PGN no debe caer bajo el tablero en desktop/tablet</td><td>✅ Done</td><td></td></tr>
<tr><td>FEAT-08</td><td></td><td>Subvariantes (2 niveles); borrar jugadas hacia adelante con confirmación</td><td>✅ Done</td><td></td></tr>
<tr><td>FEAT-09</td><td>FEAT-08</td><td>Borrar desde jugada vía clic derecho (sin icono tijera)</td><td>✅ Done</td><td>Menú «Borrar jugadas desde aquí…»</td></tr>
<tr><td>BUG-10</td><td>FEAT-09</td><td>Una línea por par de plies</td><td>✅ Done</td><td>Fila flex blanca/negra + variantes inline</td></tr>
<tr><td>FEAT-11</td><td>FEAT-08</td><td>Font tooltip = font movidas PGN</td><td>✅ Done</td><td><code>pgnMoveTextSx</code></td></tr>
<tr><td>BUG-12</td><td></td><td>Blunders falsos según contexto (ganado/igual/perdido)</td><td>🔄 WIP</td><td><code>coachPedagogicalImpact.js</code>; etiqueta cp sin cambio</td></tr>
<tr><td>BUG-013</td><td></td><td>Tab Análisis avanzado desaparecía al cambiar PGN</td><td>✅ Done</td><td>Tabs sticky; reset por <code>gameId</code></td></tr>
<tr><td>FEAT-07</td><td></td><td><strong>Mental 1600</strong> (WASM + chess.js)</td><td>🔄 WIP</td><td>Tab en workspace; M-11 HITL: <a href="./coach-mental-1600-hitl-checklist.md">checklist</a></td></tr>
<tr><td>FEAT-014</td><td></td><td>Botón girar tablero</td><td>✅ Done</td><td>#159 — <code>FlipCameraAndroid</code></td></tr>
<tr><td>BUG-015</td><td></td><td>Numeración por movimiento PGN (no ply)</td><td>✅ Done</td><td>#159 — <code>moveNumberFromPlyCount</code></td></tr>
<tr><td>BUG-016</td><td></td><td>Tras importar y analizar hasta ply X, reabrir desde Partidas: tablero vs <strong>Análisis avanzado</strong> desincronizados (<a href="../../img/BUG-016.png">captura</a>)</td><td>✅ Done</td><td><a href="https://github.com/cmessoftware/chessinsightai/pull/165">#165</a> — <code>coachLastGameSession</code> cursor + sin auto-select 1ª decisión servidor</td></tr>
<tr><td>FEAT-017</td><td></td><td>Eliminar partidas desde Acciones (cola / biblioteca)</td><td>✅ Done</td><td><a href="https://github.com/cmessoftware/chessinsightai/pull/167">#167</a> — DELETE + bulk-delete; badges de estado en Partidas</td></tr>
<tr><td>FEAT-018</td><td></td><td>Análisis liviano <strong>off</strong> por defecto; icono power en <strong>Motor</strong> (sin WASM al entrar)</td><td>✅ Done</td><td><a href="https://github.com/cmessoftware/chessinsightai/pull/166">#166</a> merged</td></tr>
<tr><td>FEAT-019</td><td></td><td>Flechas ←/→ con foco en tablero (atrás/adelante en línea)</td><td>✅ Done</td><td><a href="https://github.com/cmessoftware/chessinsightai/pull/168">#168</a> — <code>usePgnKeyboardNav</code></td></tr>
<tr><td>FEAT-020</td><td></td><td>Menú contextual PGN: copiar variante principal</td><td>✅ Done</td><td><a href="https://github.com/cmessoftware/chessinsightai/pull/169">#169</a> — <code>formatMainLinePgnMovetext</code></td></tr>
<tr><td>FEAT-021</td><td>FEAT-20</td><td>Menú contextual PGN: copiar PGN con variantes</td><td>✅ Done</td><td><a href="https://github.com/cmessoftware/chessinsightai/pull/169">#169</a> — <code>formatTreePgnMovetext</code></td></tr>
<tr><td>FEAT-022</td><td></td><td>Mostrar FEN de la jugada actual bajo el tablero</td><td>✅ Done</td><td><a href="https://github.com/cmessoftware/chessinsightai/pull/170">#170</a> — <code>CoachCurrentFenBar</code></td></tr>
<tr><td>FEAT-023</td><td>FEAT-22</td><td>Botón copiar FEN al portapapeles</td><td>✅ Done</td><td><a href="https://github.com/cmessoftware/chessinsightai/pull/171">#171</a> — HITL</td></tr>
<tr><td>FEAT-024</td><td>FEAT-22</td><td>Link FEN → <code>/coach/position</code> con posición cargada</td><td>✅ Done</td><td><a href="https://github.com/cmessoftware/chessinsightai/pull/172">#172</a></td></tr>
<tr><td>FEAT-025</td><td></td><td>Importar Partidas: importación masiva PGN (texto/archivo, máx. 100); 1 partida → análisis; &gt;1 → Partidas</td><td>✅ Done</td><td><a href="https://github.com/cmessoftware/chessinsightai/pull/173">#173</a> — HITL</td></tr>
<tr><td>FEAT-026</td><td></td><td>Iconos Acciones: <a href="../../img/ver.png">VER</a> / <a href="../../img/analizar.png">ANALIZAR</a> / <a href="../../img/eliminar.png">ELIMINAR</a></td><td>✅ Done</td><td><a href="https://github.com/cmessoftware/chessinsightai/pull/174">#174</a> — HITL; <a href="https://github.com/cmessoftware/chessinsightai/pull/175">#175</a> tracker</td></tr>
<tr><td>FEAT-027</td><td></td><td>Importación masiva desde Lichess</td><td>🔄 WIP</td><td><code>feature/11_146_feat_027_lichess_bulk_import</code> — config por usuario, lotes 200, token opcional, alias POV, cursor/resume</td></tr>
<tr><td>FEAT-028</td><td></td><td>Importación masiva desde Chess.com</td><td>⬜ Todo</td><td>Igual FEAT-027 adaptado a Chess.com (usuario, fechas, ritmo; lotes 200; reinicio API; alias POV; rollback).</td></tr>
<tr><td>FEAT-029</td><td></td><td>Cambio de usuario POV en todas las partidas (bulk)</td><td>⬜ Todo</td><td>Preservar usuario original para rollback.</td></tr>
</tbody>
</table>

### Resumen backlog

<table>
<thead>
<tr><th>Estado</th><th>IDs</th></tr>
</thead>
<tbody>
<tr><td>✅ Done</td><td>FEAT-01…06, BUG-02/04/07/10/013/015/016, FEAT-08…11, FEAT-014/017…026</td></tr>
<tr><td>🔄 WIP</td><td>BUG-12, FEAT-07, FEAT-027</td></tr>
<tr><td>⬜ Todo</td><td>FEAT-028…029</td></tr>
</tbody>
</table>

**Siguiente sugerido (orden):** FEAT-027 (import Lichess) → FEAT-028 (Chess.com) → FEAT-029 (bulk POV).
