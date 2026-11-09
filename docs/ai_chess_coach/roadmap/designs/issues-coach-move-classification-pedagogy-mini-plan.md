# Issues · Clasificación de jugadas e importancia pedagógica

**Estado:** Seguimiento activo (UI MVP liviano)
**Actualizado:** 2026-11-06

> **Canónico.** No hay copia en `deep_analysis/`.

**Spec origen:** [Clasificación de jugadas e importancia pedagógica](../../Clasificación_de_%20jugadas_e_%20importancia%20pedagógica.md)
**Mini-plan CA-*:** [coach-move-classification-pedagogy-mini-plan.md](./coach-move-classification-pedagogy-mini-plan.md)
**Split monolito #158:** integrado en `main` (#159–#164); ver [pr_158_riesgos.md](../../pr_158_riesgos.md).

**Estrategia (vigente):** MVP **Stockfish WASM** + UI de análisis avanzada en cliente. **SV-2** persiste clasificación por ply en Postgres (#159) cuando hay `gameId` y el usuario activa análisis liviano. **Variantes de estudio** (FEAT-066): botón «Guardar estudio» persiste RAV en PGN del catálogo; al reabrir se reconstruye el árbol con <code>buildTreeFromPgn</code>. Análisis profundo servidor → Phase 2 ([deep_analysis index](../deep_analysis/index.md)).

**Superficie UI actual:** `CoachStudyWorkspace.jsx`, `CoachGameAnalysisPage.jsx`, `CoachPgnMoveList.jsx`, `AdvancedMoveAnalysisPanel.jsx`, `LiveEnginePanel.jsx`, hooks `usePgnMoveClassification`, `useSyncPlyClassificationPersistence`.

---


## Revisión de beta · 2026-11-06

Reunión prevista: **lunes 2026-11-09**, con entrenador de **2100 Elo FIDE y 25 años de experiencia como instructor**. Prioridad funcional: refinar FEAT-07, detección de momentos críticos y generación/comparación de candidatas.

**Reportes está pendiente de implementación.** El formulario legado visible no acredita que RPT-FEAT-01…08 estén terminados. Sergio prevé deshabilitar su acceso para evitar confusión; no se da por ejecutado ese cambio. El error de rutas ya estaba detectado y se registra aquí como pendiente.

**Corrección del diagnóstico de corpus:** las partidas propias marcadas como elite provienen de una **actualización manual con alcance inesperado**, según Sergio. No se atribuye a una clasificación automática por nivel. Hay dos operaciones distintas: categoría local (override) y fuente/corpus persistida. Investigar ambas sin modificar datos reales para reproducir.

Evidencia: recorrido autenticado de Render `beta-00035f0` el 2026-11-06; código de `main` en `b7d18587f2ede20fecd51d3085bf07d741a7d0e9`. Los hallazgos de código se distinguen de bugs reproducidos en UI y de propuestas todavía sin implementar. Ninguna entrada nueva se considera resuelta por esta actualización documental.

**Guía para la reunión:** [protocolo, posiciones, FEN y plantilla de feedback](../deep_analysis/coach-mental-review-2026-11-09.md). Incluye PGN de ejemplo y casos de control. No depende del módulo Reportes.

## 3. Issues de UI para MVP de análisis liviano

Ramas: `feature/11_11x_*` — un ítem por rama ([roadmap-branches.mdc](../../../../.cursor/rules/roadmap-branches.mdc)).

<!-- Tablas en HTML: Markdown Preview Enhanced (extended table) rompe pipe tables con celdas vacías. -->

## Features y bugs de UI

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
<tr><td>FEAT-027</td><td></td><td>Importación masiva desde Lichess</td><td>✅ Done</td><td>HITL — <a href="https://github.com/cmessoftware/chessinsightai/pull/176">#176</a>; hardening en <code>feature/11_146b_feat_027_lichess_hardening</code></td></tr>
<tr><td>FEAT-028</td><td>FEAT-027</td><td>Importación masiva desde Chess.com</td><td>✅ Done</td><td>HITL OK — <code>feature/11_147_feat_028_chesscom_bulk_import</code></td></tr>
<tr><td>FEAT-029</td><td></td><td>Cambio de usuario POV en todas las partidas (bulk)</td><td>✅ Done</td><td>HITL OK — <code>feature/11_148_feat_029_bulk_pov</code></td></tr>
<tr><td>FEAT-030</td><td></td><td>Menú principal: barra superior → sidebar izquierdo colapsable; Coach como submenú; sin Tablero (redirect <code>/coach/position</code>)</td><td>✅ Done</td><td>HITL OK — <code>feature/11_149_feat_030_coach_sidebar</code> — <code>AppShell</code></td></tr>
<tr><td>FEAT-031</td><td>FEAT-019 / FEAT-020</td><td>Modificar: al copiar PGN copiar también el encabezado del mismo</td><td>✅ Done</td><td><code>feature/11_156_feat_031_pgn_copy_headers</code> — <code>buildPgnClipboardText</code></td></tr>
<tr><td>FEAT-032</td><td></td><td>En tabla partidas agregar ritmo (Blitz, Rapid, Classical, Correspondence, Unknown)</td><td>✅ Done</td><td><code>feature/11_147_feat_033_partidas_ritmo</code>; <code>CoachGamesPanel</code> + <code>coachSpeedClassLabel</code></td></tr>
<tr><td>FEAT-033</td><td>FEAT-027</td><td>Por defecto no migrar: cant. movimientos ≤10 excepto análisis de posiciones que no empiezan desde la inicial; en ese caso marcar Fuente=Estudio</td><td>✅ Done</td><td><code>feature/11_150_feat_033_skip_short_games</code> — <code>coach_import_policy</code></td></tr>
<tr><td>FEAT-034</td><td></td><td>En tabla partidas agregar campo Fuente (<code>corpus_type</code> de <code>coach_games</code>)</td><td>🔁 Duplicado</td><td>Id duplicado en borrador — renumerar al implementar</td></tr>
<tr><td>FEAT-035</td><td></td><td>En tablero de análisis mostrar arriba y abajo mini iconos de piezas capturadas, adaptar si se gira el tablero</td><td>✅ Done</td><td><code>feature/11_157_feat_035_captured_pieces</code> — <code>CoachCapturedPiecesStack</code></td></tr>
<tr><td>FEAT-036</td><td>FEAT-033</td><td>Agregar a descripción de la partida el ritmo y ritmo numérico (ej. Rapid 15+10)</td><td>✅ Done</td><td><code>formatCoachGameDescription</code>; API <code>description</code> + <code>time_control</code></td></tr>
<tr><td>BUG-037</td><td></td><td>No funciona botón de seleccionar/deseleccionar ítem del listado de partidas</td><td>✅ Done</td><td>Poll 5s reseteaba <code>selectedIds</code> vía <code>useEffect(queueableGames)</code></td></tr>
<tr><td>FEAT-038</td><td></td><td>Habilitar cargar una posición FEN desde la imagen de un tablero</td><td>🔄 WIP</td><td>Rama <code>feature/07_038_fen_from_image</code> (local, sin PR). En Posición (FEN) «Pegar imagen» y «Elegir archivo» están deshabilitados, tooltip «En progreso». El recorte del tablero (OpenCV) y el clasificador ONNX están en el working tree; la detección todavía no es confiable para cargar el FEN.</td></tr>
<tr><td>FEAT-039</td><td></td><td>Habilitar cargar una posición FEN desde drag&amp;drop de iconos de piezas externas al tablero; permitir posiciones ilegales</td><td>⬜ Todo</td><td></td></tr>
<tr><td>FEAT-040</td><td>UI-G3</td><td>Retirar <strong>Navegador de Partidas</strong> del menú principal y Home; redirect <code>/games</code> → <code>/coach/partidas</code> (alias temporal). Mantener <code>/api/chess/games</code> para admin / filtros avanzados (ver FEAT-042).</td><td>✅ Done</td><td><code>feature/11_151_feat_040_deprecate_games_navigator</code> — redirect <code>/games</code>, <code>AppShell</code></td></tr>
<tr><td>FEAT-041</td><td>FEAT-024</td><td>Retirar pestaña <strong>Tablero</strong> del AppBar; redirect <code>/chess-board</code> (y <code>/chess-board/:gameId</code> si aplica) → <code>/coach/position</code> o análisis Coach cuando haya partida.</td><td>✅ Done</td><td><code>App.tsx</code> redirects <code>/chess-board</code> → <code>/coach/position</code></td></tr>
<tr><td>FEAT-042</td><td>FEAT-040 / GC-2</td><td>Unificar UX Coach → Partidas con catálogo maestro: lista desde <code>games</code> (+ join <code>coach_games</code> para POV, jobs, análisis liviano); chips actuales; sin segunda tabla mental «Partidas vs Coach».</td><td>✅ Done</td><td><code>coach_games</code> + join <code>master_game</code>; Partidas canónica en Coach</td></tr>
<tr><td>FEAT-043</td><td>FEAT-045</td><td>Partidas: eliminar selección / icono — confirmación con badge (sin <code>window.confirm</code>)</td><td>✅ Done</td><td><code>feature/11_154_bug_044_feat_043_045_coach_ux</code> — <code>CoachGamesPanel</code></td></tr>
<tr><td>BUG-044</td><td>FEAT-036</td><td>Correspondencia: reloj en días (<code>1/86400</code>); PGN anotado multilínea = una sola partida</td><td>✅ Done</td><td><code>game_description</code>, <code>normalize_pgn_text_for_parse</code> — HITL OK</td></tr>
<tr><td>FEAT-045</td><td>FEAT-08 / FEAT-09</td><td>Menú PGN (borrar desde aquí / quitar variante): confirmación con badge, sin <code>window.confirm</code></td><td>✅ Done</td><td><code>CoachConfirmBadge</code>, <code>CoachStudyWorkspace</code></td></tr>
<tr><td>FEAT-046</td><td>FEAT-054</td><td>
1. Categorías por reglas (fuente, corpus, palabras clave) y chips de filtro en Partidas.
2. Configuración: crear/editar categorías y reglas (<code>CoachGameCategoriesSettings</code>).
3. Desde Partidas: asignar o cambiar categoría por fila (selector en columna Fuente).
4. Asignación masiva: selector «Asignar a selección» para las filas marcadas.
5. Opción <strong>Automática (reglas)</strong> quita la asignación manual (override en <code>localStorage</code>).</td><td>✅ Done</td><td>HITL OK — <code>feature/11_166_feat_046_category_assign</code> — overrides + bulk</td></tr>
<tr><td>FEAT-047</td><td></td><td>
1. En panel de analisis mostrar en gráfico de lineas la variación de cp, con el cero en el medio horizontal, escala ±2000 cp (≈ ±20 peones).
2. En eje x poner numero de jugadas.
3. Habilitar opción de mostrar el valor de cada punto como tooltip.
4. Habilitar que en click se desplace el tablero al movimiento correspondiente.
5. Eval en UI (gráfico, PGN, motor WASM, MultiPV): convención estándar + blancas / − negras (como Lichess), sin invertir por POV del jugador; la clasificación CA sigue en POV jugador.</td><td>✅ Done</td><td><code>CoachEvalCpChart</code>, <code>formatStandardEval</code></td></tr>
<tr><td>FEAT-048</td><td></td><td>En lista de partidas editar descripción (Partida) y resultado inline (lápiz; 1-0 / 0-1 / 1/2-1/2 / Sin resultado)</td><td>✅ Done</td><td><code>CoachGamesPanel</code> — PATCH <code>/api/v1/module07/games/{id}</code></td></tr>
<tr><td>BUG-049</td><td></td><td>A cargar una pgn desde FEN de una posición no iniclal, no da error pero carga parida vacia</td><td>✅ Done</td><td><code>ensure_fen_setup_headers</code>, <code>coachPgnReplay</code> SetUp + replay desde FEN</td></tr>
<tr><td>FEAT-050</td><td></td><td>Replicar campos faltantes del módulo Partidas a módulo Coach: ECO, Elo Negras, Elo Blancas, Descripcion Apertura, Fecha, Fuente </td><td>✅ Done</td><td><code>feature/11_158_feat_050_coach_catalog_fields</code> — API + <code>CoachGamesPanel</code></td></tr>
<tr><td>FEAT-051</td><td></td><td>En tablas Partidas permitir ordenar por Jugador Negras, Jugador Blancas, ECO, Elo Negras, Elo Blancas, Descripcion Apertura, Fecha, Fuente,Analisis, Resultado </td><td>✅ Done</td><td><code>feature/11_159_feat_051_partidas_sort</code> — <code>CoachGamesPanel</code> + <code>coachGamesSort</code></td></tr>
<tr><td>FEAT-052</td><td>FEAT-054</td><td>Agregar soporte para agregar o eliminar campos a viazualizar en la tabla</td><td>✅ Done</td><td>HITL OK — <code>feature/11_160_feat_052_table_columns</code> — Coach → Configuración</td></tr>
<tr><td>FEAT-053</td><td>FEAT-061</td><td>Agrega cuadro de texto para cargar comentarios para movidas en particular</td><td>✅ Done</td><td>HITL OK — <code>CoachPlyAnnotationPanel</code> (pestaña Comentario, debajo del tablero; autoguardado por ply) · mismo entregable que FEAT-061 · <a href="https://github.com/cmessoftware/chessinsightai/pull/197">#197</a></td></tr>
<tr><td>FEAT-054</td><td></td><td>Menú <strong>Configuración</strong> en Coach (subnav) para preferencias de UI; primer ítem: columnas visibles en Partidas (FEAT-052)</td><td>✅ Done</td><td>HITL OK — <code>/coach/configuracion</code>, <code>CoachConfiguracionPage</code></td></tr>
<tr><td>FEAT-055</td><td></td><td>En campo Partida, mostrar solo Jugador blancas vs jugador negras</td><td>✅ Done</td><td>HITL OK — <code>feature/11_161_feat_055_partida_players_label</code> — <code>formatCoachPartidaTableLabel</code></td></tr>
<tr><td>FEAT-056</td><td>FEAT-052</td><td>Agegar a tabla y configuracion campo "Ritmo"</td><td>✅ Done</td><td>HITL OK — PR #193</td></tr>
<tr><td>FEAT-057</td><td>FEAT-054</td><td>En paginas Configuración poner cada grupo como tablas apilables y colapsables.</td><td>✅ Done</td><td>HITL OK — <code>feature/11_165_feat_057_config_accordion</code> — <code>CoachConfigSectionAccordion</code></td></tr>
<tr><td>FEAT-058</td><td></td><td>Incluir la lista de Jobs en un panel colapsable y paginar a 5 items por página</td><td>✅ Done</td><td>HITL OK — <code>feature/11_167_feat_058_059_partidas_pagination</code></td></tr>
<tr><td>FEAT-059</td><td></td><td>Paginar lista de partidas a 20 items por página</td><td>✅ Done</td><td>HITL OK — selección entre páginas</td></tr>
<tr><td>BUG-060</td><td>FEAT-047</td><td>Gráfico cp saturado en ±100; mates (M1…) cerca de 0; escala ±2000 cp y <code>mateScoreToChartCp</code></td><td>✅ Done</td><td><code>playerScoreToChartCp</code></td></tr>
<tr><td>FEAT-061</td><td></td><td>Agregar soporte para agregar comentarios por movida, incluida opción para etiquetar la movida (?,??,!!,!?,?!,-+,+-,==)</td><td>✅ Done</td><td>HITL OK — <code>CoachPlyAnnotationPanel</code> — <a href="https://github.com/cmessoftware/chessinsightai/pull/197">#197</a></td></tr>
<tr><td>FEAT-062</td><td></td><td>Agregar soporte gráfico para elegir qué pieza coronar; desplegar menú con piezas sobre la casilla de coronación</td><td>✅ Done</td><td>HITL OK — <code>CoachPromotionPicker</code> — <a href="https://github.com/cmessoftware/chessinsightai/pull/198">#198</a></td></tr>
<tr><td>FEAT-063</td><td>UI-G2</td><td>Filtros avanzados en <strong>Coach → Partidas</strong> (fuente, jugadores con <code>*</code>, ECO, apertura, fecha, resultado); AND/OR según [UI-G2](./coach-games-catalog-unify-mini-plan.md#ui-g2); API listado Coach con query params; complementa chips FEAT-046</td><td>✅ Done</td><td>HITL OK — <code>feature/11_065_partidas_opening_combo</code> (063–065); ver también FEAT-064/065</td></tr>
<tr><td>FEAT-064</td><td>FEAT-063</td><td>Filtro <strong>Fuente</strong> en Partidas: usar <code>coach_games.corpus_type</code> (no <code>games.source</code>); API <code>corpus_types</code> + <code>GET …/games/corpus-types</code></td><td>✅ Done</td><td>HITL OK — <code>feature/11_064_partidas_fuente_corpus_type</code>; etiquetas corpus sin traducción</td></tr>
<tr><td>FEAT-065</td><td>FEAT-063</td><td>Catálogo ECO+nombre; combo <strong>Aperturas</strong> (<code>ECO — name</code>); wildcards en ECO y descripción; al elegir fila filtrar <code>games.eco</code> <strong>o</strong> <code>games.opening</code> (OR); ECO manual opcional sin catálogo</td><td>✅ Done</td><td>HITL OK — <code>feature/11_065_partidas_opening_combo</code>; JSON Lichess CC0 + <code>opening_eco_or</code></td></tr>
<tr><td>FEAT-066</td><td>FEAT-08 / FEAT-021</td><td><strong>Persistir estudio:</strong> guardar variantes del tablero de análisis en el PGN de la partida del catálogo (<code>PATCH</code> <code>/api/v1/module07/games/{id}</code> o botón «Guardar estudio»). Al reabrir, reconstruir árbol desde PGN con RAV (no solo <code>buildTreeFromMainLine</code>). Comentarios/NAG por ply (FEAT-061) siguen en su tabla aparte.</td><td>✅ Done</td><td><code>coachPgnTreeParse</code>, <code>patchCoachGameStudyPgn</code>, autoguardado <code>useCoachStudyPersistence</code></td></tr>
<tr><td>BUG-067</td><td>FEAT-09 / FEAT-45</td><td>Menú contextual PGN: no se podían borrar jugadas <strong>dentro</strong> de variantes (solo línea principal o quitar rama en la cabeza)</td><td>✅ Done</td><td><code>deleteLeafMoveAtPath</code>; truncar / borrar hoja / quitar variante completa en <code>CoachPgnMoveList</code></td></tr>
<tr><td>FEAT-068</td><td>FEAT-032 / FEAT-036</td><td><strong>Ritmo Lichess:</strong> clasificar y mostrar ritmo desde reloj PGN (UltraBullet &lt;30 s, Bullet &lt;3 min, Blitz, Rapid, Classical); columna/descripción <code>formatCoachRhythmDisplay</code>; regla categoría <code>speed_class</code>; import <code>infer_speed_class_from_time_control</code></td><td>✅ Done</td><td><a href="https://github.com/cmessoftware/chessinsightai/pull/204">#204</a></td></tr>
<tr><td>FEAT-069</td><td><a href="../../spec_sparring_maia_stockfish_unificado.md#spar-03">SPAR-03</a></td><td>Coach → <strong>Sparring</strong>: subnav + tarjeta en <strong>home</strong> (<code>sparring.png</code>), ruta <code>/coach/sparring</code>, status <code>GET /api/v1/sparring/status</code>; tablero SPAR-08 reutiliza UI Coach</td><td>🔄 WIP</td><td><a href="../deep_analysis/issues-sparring-maia-server-mini-plan.md">Mini plan Sparring Maia</a> · rama <code>feature/11_070_eval_chart_collapsible</code>. <code>CoachSparringPage</code> · <a href="https://github.com/cmessoftware/chessinsightai/pull/206">#206</a>; home y tablero pendientes.</td></tr>
<tr><td>FEAT-070</td><td>FEAT-047</td><td>Panel del <strong>gráfico de evaluación</strong> (pestaña Motor / análisis liviano): colapsable, <strong>expandido por defecto</strong></td><td>✅ Done</td><td><code>CoachEvalChartCollapsible</code> · <a href="https://github.com/cmessoftware/chessinsightai/pull/208">#208</a> (incl. #207)</td></tr>
<tr><td>FEAT-071</td><td>FEAT-08</td><td><strong>Pantalla completa</strong> del tablero en análisis: solo tablero + flechas de navegación; panel <strong>PGN a la derecha</strong> visible por defecto; opción para <strong>ocultar</strong> el PGN</td><td>✅ Done</td><td><code>CoachBoardFullscreenOverlay</code> · <a href="https://github.com/cmessoftware/chessinsightai/pull/208">#208</a></td></tr>
<tr><td>FEAT-072</td><td>FEAT-021</td><td>En lista de <strong>Partidas</strong>, botón para <strong>exportar</strong> el PGN (con variantes guardadas en catálogo) de las partidas seleccionadas</td><td>✅ Done</td><td><code>CoachGamesPanel</code> · <code>coachGamesPgnExport.js</code> · <code>feature/11_072_export_selected_pgn</code></td></tr>
<tr><td>FEAT-073</td><td>FEAT-072</td><td>Agregar además botón «Ocultar panel PGN» a la izq. del botón «Guardar estudio» dentro del panel</td><td>✅ Done</td><td><code>CoachPgnMoveList</code> · <code>CoachStudyWorkspace</code> · #209</td></tr>
<tr><td>BUG-074</td><td>FEAT-073</td><td>Al ocultar movidas del panel PGN, el contenedor conservaba <code>minHeight</code> vacío y el tablero no ampliaba ancho útil</td><td>✅ Done</td><td>Layout Grid + tope 640 px al colapsar · #209</td></tr>
<tr><td>FEAT-075</td><td>FEAT-08</td><td>Agregar soporte para insertar círculo de colores en casilla del tablero de análisis (reutilizable a sparring): 1. botón derecho = verde; 2. Ctrl + botón derecho = rojo; 3. Alt + botón derecho = azul; 4. Ctrl+Alt + botón derecho = naranja (repetir mismo gesto quita el anillo); 5. clic izquierdo en casilla marcada quita el círculo</td><td>✅ Done</td><td>HITL · <code>feature/11_075_square_color_circles</code> — <code>coachBoardSquareCircles.js</code>, <code>ChessinsightBoard</code></td></tr>
<tr><td>FEAT-076</td><td>FEAT-08</td><td>Botón (icono) en el panel PGN del análisis que abre una tabla con los tags del encabezado importado (Event, Site, Date, Round, White, Black, Result, Elo, ECO, Annotator, StudyCategory y el resto), en el orden del PGN</td><td>✅ Done</td><td><code>CoachPgnHeadersDialog</code> · <code>listPgnHeaderRows</code></td></tr>
<tr><td>BUG-077</td><td>FEAT-073</td><td>En el tablero normal, «Ocultar panel PGN» rompía el layout (columna del tablero aplastada). El botón queda solo en pantalla completa</td><td>✅ Done</td><td><code>CoachStudyWorkspace</code> · icono en <code>CoachBoardFullscreenOverlay</code></td></tr>
<tr><td>FEAT-078</td><td>FEAT-064</td><td>En Partidas, cambiar la fuente (corpus: personal, elite, FIDE, novice, stockfish) de todas las filas seleccionadas</td><td>✅ Done</td><td><code>POST /games/bulk-corpus</code> · «Fuente de la selección»</td></tr>
<tr><td>FEAT-079</td><td>FEAT-061</td><td>En pantalla completa, el control de comentario y etiqueta de la jugada (el mismo del modo normal) aparece colapsado por defecto, debajo de las flechas</td><td>✅ Done</td><td><code>CoachPlyAnnotationPanel</code> · <code>CoachBoardFullscreenOverlay</code></td></tr>
<tr><td>FEAT-080</td><td>FEAT-019</td><td>En pantalla completa, las mismas teclas del tablero normal mueven la partida: ←/→ retrocede y avanza, Inicio y Fin van a la primera posición y al final de la rama. No actúan mientras se escribe un comentario</td><td>✅ Done</td><td>HITL OK — <code>usePgnKeyboardNav</code> · <code>CoachBoardFullscreenOverlay</code></td></tr>
<tr><td>BUG-081</td><td>FEAT-075</td><td>El círculo de color queda en la casilla al cambiar de jugada. Debe verse y persistir solo en la jugada donde se marcó: ni en las anteriores ni en las siguientes. Ejemplo: anillo verde en e3 en la jugada 18; en la 17 esa casilla no lo muestra; al volver a la 18 reaparece</td><td>✅ Done</td><td>HITL OK — <code>squareCirclesForPath</code> · localStorage por jugada</td></tr>
<tr><td>FEAT-082</td><td></td><td>Beta 1: el nombre visible pasa a ChessDash y, debajo, la etiqueta <code>beta-&lt;commit&gt;</code> tomada de <code>VERSION</code></td><td>✅ Done</td><td>HITL OK — <code>ProductMark</code> · barra, login y tablero</td></tr>
<tr><td>FEAT-083</td><td>FEAT-076 / FEAT-08</td><td>Cargar una partida desde cero en el tablero de análisis (posición inicial, sin jugadas) y editar el encabezado del PGN (tags y valores). Al guardar, el PGN de la partida conserva las jugadas</td><td>✅ Done</td><td>HITL OK — <code>Nueva partida</code> · <code>CoachPgnHeadersDialog</code></td></tr>
<tr><td>BUG-084</td><td>FEAT-09 / BUG-067</td><td>En el menú contextual de la última jugada (sin continuación) no aparece la opción de borrarla. Debe poder borrarse, también si es la última de la línea principal</td><td>✅ Done</td><td>HITL OK — <code>deleteLeafMoveAtPath</code> · «Borrar esta jugada»</td></tr>
<tr><td>FEAT-085</td><td>FEAT-08</td><td>Pasar una variante secundaria a línea principal (PV), y el inverso: pasar una jugada de la línea principal (y lo que sigue) a variante secundaria cuando ya hay otra línea en esa posición</td><td>✅ Done</td><td>HITL OK — <code>promotePathToMainLine</code> · <code>demoteMainLineAtPath</code></td></tr>
<tr><td>FEAT-086</td><td>FEAT-061</td><td>Con variante, el comentario queda debajo de su jugada y la variante se inserta antes de seguir la línea. Sin variante, los dos plies siguen en la misma línea y el comentario va después de su jugada</td><td>✅ Done</td><td>HITL OK — comentario después de la jugada; con variante, la variante va antes de la continuación</td></tr>
<tr><td>FEAT-087</td><td></td><td>Agregar campo "Analisis Manual" tipo bool para indicar cuando se hizo.</td><td>✅ Done</td><td>HITL OK — <code>coach_games.manual_analysis</code> · checkbox en Partidas</td></tr>
<tr><td>FEAT-088</td><td></td><td>En tabla Partidas permitir ordenamiento de columnas usando drag&amp;drop</td><td>⬜ Todo</td><td></td></tr>
<tr><td>FEAT-089</td><td></td><td>Agregar spinner indicando que se está procesando la importación de las partias, en todos los casos implementados.</td><td>✅ Done</td><td>HITL OK — <code>CoachImportProgress</code> · PGN, Lichess y Chess.com</td></tr>
<tr><td>BUG-090</td><td></td><td>En modo full screen de tablero de analisis mostrar en la misma fila superior descripción de la partida, por ejemplo: Jugador A vs Jugador B · POV Jugador B (Rapid 10+5)</td><td>✅ Done</td><td>HITL OK — descripción en la barra superior de <code>CoachBoardFullscreenOverlay</code></td></tr>
<tr><td>FEAT-091</td><td></td><td>Cuando se asigne un simbolo a ua movida representarolo en el tablero como icono en la parte superior derecha de la pieza en cuestión. Simil Lichess.</td><td>✅ Done</td><td>HITL OK — glifo en la esquina superior derecha de la pieza que acaba de mover</td></tr>
<tr><td>FEAT-092</td><td></td><td>Mostrar el resultado al final de la lista PGN (1-0, 0-1 o tablas). Hoy, si la partida es tablas, no aparece nada después de la última jugada</td><td>✅ Done</td><td>HITL OK — el rótulo queda debajo de la última jugada</td></tr>
<tr><td>FEAT-093</td><td></td><td>Agregar panel colapsable debajo en el panel pgn con el resultado del proceso ya existente chess_estatics </td><td>✅ Done</td><td>HITL OK — panel bajo el PGN lee Postgres; mini plan EST-FEAT-01…06 — <a href="./feat-093-chess-statistics-postgres-mini-plan.md">mini plan</a></td></tr>
<tr><td>FEAT-094</td><td>FEAT-087</td><td>En vista tablero de analisis agregar checkbox para indicar que fue analizado manualmente, mismo campo que el vista de tablas Partidas.</td><td>✅ Done</td><td>HITL OK — mismo <code>coach_games.manual_analysis</code> · checkbox bajo el tablero y en pantalla completa</td></tr>
<tr><td>FEAT-095</td><td></td><td>En tabla Partidas agregar campo FechaImportacion, agregar como filtro al FIltro avanzados.</td><td>✅ Done</td><td>HITL OK — columna Fecha importación (<code>last_imported_at</code>) y rango en Filtros avanzados</td></tr>
<tr><td>FEAT-096</td><td></td><td>En Filtros avanzados de Partidas agregar Ritmo.</td><td>✅ Done</td><td>HITL OK — selector múltiple; Correspondencia se pide como <code>rhythms=daily</code></td></tr>
<tr><td>FEAT-097</td><td></td><td>Buscar partidas por estudio con un nombre determinado.</td><td>✅ Done</td><td>HITL OK — filtro Estudio sobre el tag PGN <code>StudyName</code></td></tr>
<tr><td>BUG-098</td><td>FEAT-030 / FEAT-082</td><td>Rutas de la SPA: acceso directo a <code>/reports</code> devuelve Not Found aunque la navegación interna funciona.</td><td>✅ Done</td><td>Rewrite a <code>index.html</code> solo para las rutas de la app, en el static site <code>chessdash-frontend</code> (<code>render.yaml</code>). Un archivo publicado se sirve tal cual. <code>/api</code> y las rutas desconocidas siguen en 404. <code>ProtectedRoute</code> no cambia. <code>/reports</code> carga el shell; la pantalla se prueba cuando se rehabilite. El CDN aplica las reglas al sincronizar el Blueprint: Render no lee <code>public/_redirects</code>.</td></tr>
<tr><td>BUG-099</td><td>FEAT-046 / FEAT-078 / BUG-037</td><td>Asignación manual de categoría o corpus alcanza partidas que el usuario no pretendía seleccionar.</td><td>✅ Done</td><td>Al entrar no se marca la biblioteca. Categoría, fuente, borrar y exportar usan solo las filas marcadas; sin selección no hacen nada. El refresco no agrega ids. <code>feature/11_099_bug_099_bulk_selection</code> — <code>coachGameSelection.js</code></td></tr>
<tr><td>FEAT-100</td><td>BUG-099</td><td>Selección masiva explícita y alcance visible.</td><td>✅ Done</td><td>La tabla empieza vacía. Muestra cuántas filas están marcadas en esta página y en otras. Hay acciones para la página, los resultados filtrados y limpiar. Categoría y fuente piden confirmación con ese alcance. <code>feature/11_100_feat_100_selection_scope</code></td></tr>
<tr><td>FEAT-101</td><td>BUG-099 / FEAT-100</td><td>Distinguir categoría visual de fuente/corpus y registrar cambios manuales.</td><td>Todo · P1</td><td>Mostrar origen: regla automática, override local o corpus persistido. Resumen de valores previos/nuevos, IDs modificados/rechazados y conteo; restauración del lote mediante valores anteriores. Cambiar corpus hoy borra overrides de los IDs actualizados: hacer ese efecto visible y acordar si debe mantenerse. Verificado 2026-11-08 en <code>main</code>: hay selector «Automática» y chip Manual, y el corpus es otro control, pero el aviso de fuente no dice que se borran los overrides, no lista previos/nuevos ni rechazados, y no restaura el lote.</td></tr>
<tr><td>FEAT-103</td><td>FEAT-039</td><td>Poder crear una posición de estudio en base a una posición dada.</td><td>⬜ Todo</td><td></td></tr>
<tr><td>FEAT-104</td><td></td><td>Cuando el usuario de chess.com o lichess no existe mostrar error (ahora no muestra nada).</td><td>⬜ Todo</td><td></td></tr>
<tr><td>FEAT-105</td><td></td><td>En filtro avanzado agregar «Analisis manual».</td><td>⬜ Todo</td><td></td></tr>
<tr><td>FEAT-106</td><td></td><td>En posiciones de analisis agregar un control visual de temporizador.</td><td>⬜ Todo</td><td></td></tr>
<tr><td>FEAT-107</td><td></td><td>En modo analisis agregar campo para referencias externas, con texto con formato y links.</td><td>⬜ Todo</td><td></td></tr>
<tr><td>FEAT-108</td><td></td><td>En modo analisis agregar campo para referencias externas, con texto con formato y links.</td><td>⬜ Todo</td><td>Mismo texto que FEAT-107 en el borrador local; se conserva el ID hasta decidir si es duplicado.</td></tr>
<tr><td>FEAT-109</td><td>FEAT-025 / FEAT-097</td><td>Importar PGN externo con título de estudio y descripción inicial.</td><td>⬜ Todo · P1</td><td>Solicitado por Sergio el 2026-11-08. Agregar campos opcionales «Título / nombre del estudio» y «Descripción» (multilínea) al importar texto pegado o archivo PGN. Persistir el título en el tag <code>StudyName</code>, reutilizando el filtro avanzado Estudio existente (FEAT-097); no reemplazar White/Black, Event ni el rótulo de jugadores. Insertar la descripción como comentario PGN de la posición inicial, después de los encabezados y antes de la primera jugada, también con SetUp/FEN. Conservar comentarios iniciales preexistentes, variantes, NAG y demás encabezados. Campos vacíos conservan el PGN original; si ya existe StudyName, precargarlo para una partida y permitir su edición explícita. En importación múltiple, indicar que título y descripción ingresados se aplican a cada partida del lote; sin valores ingresados se conservan los metadatos individuales. Escapar comillas/barra inversa en tags y serializar delimitadores de comentario sin invalidar el PGN. Aceptación: texto y archivo, una y varias partidas, PGN con/sin StudyName o comentario inicial, Unicode/multilínea y FEN; tras importar, recargar y reabrir se conserva el título y se encuentra mediante filtro avanzado; copiar/exportar PGN incluye StudyName y descripción antes de la primera jugada. Verificar reimportación sin duplicar el comentario agregado ni perder anotaciones. Evidencia de revisión: PgnImportPanel.jsx y CoachImportPage.jsx no ofrecen estos campos; filtro StudyName sí existe. Documentación solamente; implementación pendiente.</td></tr>
<tr><td>FEAT-110</td><td>FEAT-109 / FEAT-097 / FEAT-066 / FEAT-030</td><td>Subnav Coach «Estudios» con los estudios cargados. Al elegir uno, abrir el tablero de análisis en el primer capítulo y la lista de capítulos a la izquierda, colapsable y extendida por defecto. En el análisis, mostrar el contexto del estudio y navegar entre capítulos.</td><td>⬜ Todo · P1</td><td>Si la partida o posición analizada pertenece a un estudio, mostrar su título y descripción (FEAT-109), nombre del capítulo si existe y contador «Capítulo i / N». Agregar botones «Capítulo anterior» y «Capítulo siguiente» con estilo equivalente a retroceso/avance de movimientos, en un grupo separado y con etiquetas/tooltips inequívocos. Cada botón abre el análisis de la partida o posición del capítulo destino. Si el estudio surge de una importación, el nombre visible por defecto es el tag <code>StudyName</code> (el ingresado en FEAT-109 o el que ya traía el PGN) y es editable. Al guardar el cambio se reescribe <code>StudyName</code> en los capítulos de ese estudio, de modo que el filtro avanzado Estudio sigue encontrándolo; no se modifican White, Black ni Event. Los capítulos de la misma importación conservan su orden. Una importación nueva con el mismo <code>StudyName</code> se agrega a ese estudio. Al importar un estudio, persistir orden original del PGN o del proveedor y referencia estable de cada capítulo; mantener posiciones SetUp/FEN y capítulos con posiciones iguales como ítems distintos. Resolver título/descripcion del estudio a partir de FEAT-109; conservar los comentarios iniciales particulares de cada capítulo sin convertirlos automáticamente en descripción común ni sobrescribirlos. Mostrar i/N sobre todos los capítulos accesibles del estudio, independientemente de paginación/filtros de Partidas. Deshabilitar anterior en el primero y siguiente en el último, sin recorrido circular; con un solo capítulo ambos quedan deshabilitados. Sin estudio ocultar contexto y navegación; datos ausentes no se inventan. Al navegar, completar guardado pendiente o mostrar error antes de abandonar; actualizar PGN/FEN, turno, POV, análisis y comentarios del destino sin arrastrar estado del capítulo anterior ni aplicar respuestas asíncronas tardías. Reabrir un capítulo recupera su cursor guardado o su posición inicial si no existe. Mantener el contexto al abrir por URL directa, recargar y usar pantalla completa; respetar permisos y no contar/exponer capítulos no autorizados. Aceptación: estudios de 1 y varios capítulos, títulos iguales de estudios distintos, mezcla de partidas/posiciones FEN, capítulos eliminados o no disponibles, navegación rápida con guardado/error, extremos, refresco, móvil y pantalla completa; verificar título/descripción, orden y contador consistentes. Entrada por el subnav Coach «Estudios» (FEAT-030, <code>AppShell</code> / <code>CoachSubNav</code>), ruta prevista <code>/coach/estudios</code>. La lista de Estudios, cuando el estudio surge de una importación, muestra por defecto <code>StudyName</code> y deja ese nombre editable. Dos importaciones con el mismo <code>StudyName</code> son un solo estudio. Renombrar actualiza el tag y el filtro. Sin estudios, la lista queda vacía. No se listan ni se abren estudios o capítulos no autorizados. Elegir un estudio abre el análisis del primer capítulo del orden persistido, en su cursor guardado o en su posición inicial. Una URL directa a otro capítulo abre ese capítulo. A la izquierda del tablero se listan todos los capítulos del estudio, con el abierto marcado: ocultar el actual rompería el contador i/N y el nombre de capítulo que esta misma fila ya pide. El orden es el de anterior/siguiente. Elegir un capítulo de la lista usa las mismas reglas de guardado pendiente y de no arrastrar estado. La lista nace extendida y el usuario puede colapsarla; colapsada siguen el contexto, el contador y anterior/siguiente. En un viewport angosto arranca colapsada para no tapar el tablero. En pantalla completa sigue disponible sin cubrir el tablero. Si un capítulo se abre desde Partidas y pertenece a un estudio, se muestra la misma lista y el subnav marca Estudios. Sigue en Todo; documentación solamente; implementación pendiente.</td></tr>
<tr><td>FEAT-111</td><td>FEAT-082 / #228</td><td>Agregar link al documento del changelog (PR #228) accesible desde el número de versión, por ejemplo beta-00035f0.</td><td>✅ Done</td><td>La etiqueta <code>beta-&lt;commit&gt;</code> de <code>ProductMark</code> abre <code>/changelog</code>, también sin sesión. El documento es <code>CHANGELOG.md</code>. La ruta entra en el fallback de la SPA.</td></tr>
<tr><td>FEAT-112</td><td></td><td>En tablero de analsis cambiar "IR A COLA DE ANALISIS" por un icono acorde a "Ejecutar analisis profundo" (usar ese texto como tooltip) , cuando el usaurio presione mostrar un spinner no pasar a la pagian de Partidas.  </td><td>⬜ Todo</td><td></td></tr>
<tr><td>FEAT-113</td><td>FEAT-063 / FEAT-097</td><td>En filtro avanzado, buscar por nombre parcial en Jugador blancas, Jugador negras y Estudio. Mínimo 3 caracteres. Sin comodín <code>*</code>.</td><td>✅ Done</td><td>Un campo vacío no filtra. Menos de 3 caracteres no se envía. «car» encuentra Carlsen y Caruana. <code>*</code> no es comodín en estos tres campos. <code>partial_name_ilike_pattern</code></td></tr>
<tr><td>BUG-114</td><td>FEAT-064 / FEAT-046</td><td>En Filtros avanzados, Fuente solo ofrece corpus. Hay que poder elegir Torneo, Chess.com, Estudios, Lichess y el resto de fuentes para filtrar, sin asignarlas.</td><td>✅ Done</td><td>El selector lista las fuentes configuradas y deja en la tabla las partidas de cualquiera de las elegidas. No cambia la fuente de la partida. <code>coachGameMatchesSourceFilter</code></td></tr>
</tbody>
</table>



## Ejercitaciones y seguimiento en análisis · specs candidatas

| Tipo-Id  | Relación                 | Descripción                                                                                                                                         | Estado                     | Aceptación / alcance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FEAT-102 | LOG-FEAT-07/08 / FEAT-07 | Módulo general de ejercitaciones creadas por el usuario o su instructor y registro de actividad sobre partidas/posiciones marcadas como ejercicios. | Candidata · P1 · a refinar | [Spec candidata y tareas EX-FEAT-01…17](../designs/analysis-user-instructor-exercises-candidate-spec.md). Ejercicios abiertos por objetivos, sin solución prefijada; rúbricas de proceso y resultado, evaluación humana/híbrida, Maia como rival por nivel y motor objetivo como evidencia. Incluye factibilidad, piloto, autoría/asignaciones, intentos y seguimiento; candidatas Stockfish/Maia/manuales, comparación cp/probabilidad y fundamento revisable por jugada. Separar práctica del alumno de feedback HITL sobre el sistema; conservar versiones y primer intento. No implementado. |

## Features del módulo de reportes

Módulo pendiente. La pantalla heredada no se presenta como funcionalidad terminada. Diseño previsto: menú **Módulo de Reportes**, visualización en el sistema y salida PDF o Markdown.

<table>
<thead>
<tr><th>Tipo-Id</th><th>IdRel</th><th>Descripción</th><th>Estado</th><th>Comentarios</th></tr>
</thead>
<tbody>
<tr><td>RPT-FEAT-01</td><td></td><td>Menú <strong>Módulo de Reportes</strong> en el sidebar, con una entrada por cada reporte de esta tabla</td><td>⬜ Todo</td><td></td></tr>
<tr><td>RPT-FEAT-02</td><td>RPT-FEAT-01</td><td>Generar cada reporte en PDF o en Markdown</td><td>⬜ Todo</td><td>El usuario elige el formato al generar</td></tr>
<tr><td>RPT-FEAT-03</td><td>RPT-FEAT-01</td><td>Ranking por ritmo.
1. Mínimo, promedio y máximo, cada uno con su fecha.
2. Gráfico de variación por fecha. Por defecto: últimos 12 meses.</td><td>⬜ Todo</td><td>Un ranking por ritmo (Blitz, Rapid, Classical, …)</td></tr>
<tr><td>RPT-FEAT-04</td><td>RPT-FEAT-01</td><td>Precisión por ritmo: la misma que calcula el proceso ya existente <code>chess_statistics</code></td><td>⬜ Todo</td><td><code>precision_general</code>, apertura, medio juego y final</td></tr>
<tr><td>RPT-FEAT-05</td><td>RPT-FEAT-03 / RPT-FEAT-04</td><td>Comparación de partidas con otro rival: el mismo ranking y la misma precisión de RPT-FEAT-03 y RPT-FEAT-04, para el rival solo en las partidas contra mí</td><td>⬜ Todo</td><td></td></tr>
<tr><td>RPT-FEAT-06</td><td>RPT-FEAT-01</td><td>Aperturas y defensas utilizadas.
1. Ordenadas de la más usada a la menos usada, por línea principal (PV) y por variantes.
2. Resultado de cada caso.</td><td>⬜ Todo</td><td></td></tr>
<tr><td>RPT-FEAT-07</td><td>RPT-FEAT-01</td><td>Listado de partidas con rachas.
1. Ganadas, según la combinación:
&gt; 0 blunders propios y sin blunder del rival;
&gt; 0 blunders propios y &gt; 0 blunders del rival;
igual para errores;
igual para solo inexactitudes;
ganadas por tiempo.
2. Perdidas, con las mismas combinaciones, y perdidas por tiempo.
3. Tablas: con desventaja en el medio juego; con ventaja en el medio juego; tipo (ahogado, repetición, acuerdo, material insuficiente).</td><td>⬜ Todo</td><td>Blunder, error e inexactitud salen de <code>chess_statistics</code></td></tr>
<tr><td>RPT-FEAT-08</td><td>RPT-FEAT-01</td><td>Análisis de survivorship bias: diseñar qué presentar y cómo</td><td>⬜ Todo</td><td>El entregable de este ítem es el diseño, antes de implementarlo</td></tr>
</tbody>
</table>

<table>
<thead><tr><th>Tipo-Id</th><th>IdRel</th><th>Descripción</th><th>Estado</th><th>Comentarios / aceptación</th></tr></thead>
<tbody>
<tr><td>RPT-FEAT-09</td><td>RPT-FEAT-01…08</td><td>Ocultar o deshabilitar temporalmente los accesos a Reportes mientras el módulo esté pendiente.</td><td>Todo · P1 · decisión de producto</td><td>Sergio indica que realizará el cambio. Cubrir tarjeta de Home, sidebar y ruta directa con mensaje de no disponibilidad; sin formulario operativo aparente. No marcar Done hasta verificar despliegue. Reportes no bloquea la sesión de FEAT-07.</td></tr>
</tbody>
</table>

## Features del módulo de estadísticas

El cálculo de <code>chess_statistics</code> deja el SQLite del curso suspendido y pasa a Postgres. El panel de FEAT-093 lee estas tablas. Detalle: <a href="./feat-093-chess-statistics-postgres-mini-plan.md">mini plan</a>.

<table>
<thead>
<tr><th>Tipo-Id</th><th>IdRel</th><th>Descripción</th><th>Estado</th><th>Comentarios</th></tr>
</thead>
<tbody>
<tr><td>EST-FEAT-01</td><td>FEAT-093</td><td>Tablas Postgres del resumen y de las jugadas de una partida Coach (<code>coach_game_statistics</code>, <code>coach_game_statistic_evals</code>). Una fila por <code>coach_games.id</code>. El PGN sigue en <code>games</code>.</td><td>✅ Done</td><td>HITL OK — tablas en Postgres</td></tr>
<tr><td>EST-FEAT-02</td><td>EST-FEAT-01</td><td>Repositorio que lee y escribe esas tablas en Postgres. El producto no abre el SQLite del curso.</td><td>✅ Done</td><td>CS-2 · <code>est_feat_02_stat_repository</code></td></tr>
<tr><td>EST-FEAT-03</td><td>EST-FEAT-02</td><td>Calcular una partida Coach con el proceso ya existente <code>chess_statistics</code> (precisión, fases y juicios) y guardarla en Postgres.</td><td>✅ Done</td><td>CS-3 · <code>est_feat_03_stat_compute</code></td></tr>
<tr><td>EST-FEAT-04</td><td>EST-FEAT-02 / FEAT-093</td><td>El panel bajo el PGN lee Postgres. Si la partida todavía no tiene fila, muestra el vacío.</td><td>✅ Done</td><td>CS-4 · <code>est_feat_04_stat_panel</code></td></tr>
<tr><td>EST-FEAT-05</td><td>EST-FEAT-03</td><td>Calcular, a demanda desde el panel de Análisis, la partida abierta. No recorre la biblioteca.</td><td>✅ Done</td><td>CS-5 · <code>est_feat_05_stat_on_demand</code></td></tr>
<tr><td>EST-FEAT-06</td><td>EST-FEAT-05</td><td>Evaluar ambos colores y mostrar una tabla comparativa entre las estadísticas de blancas y negras.</td><td>✅ Done</td><td>CS-6 · <code>est_feat_06_stat_both_colors</code></td></tr>
</tbody>
</table>

## Incidencias de estadísticas en beta

<table>
<thead><tr><th>Tipo-Id</th><th>IdRel</th><th>Descripción</th><th>Estado</th><th>Comentarios / aceptación</th></tr></thead>
<tbody>
<tr><td>EST-BUG-01</td><td>EST-FEAT-05 / FEAT-093</td><td>Calcular estadísticas en Render termina en Network Error.</td><td>Todo · P1 · observado</td><td>Partida propia analizada durante el recorrido; identificador conservado en el material privado de revisión. Panel mantiene vacío tras la acción. Causa no confirmada: revisar respuesta HTTP, duración, logs de API y disponibilidad del motor. No atribuirlo automáticamente a CORS. Aceptación: una sola partida calculada, ambas columnas, reabrir conserva resultado y no modifica otras filas.</td></tr>
<tr><td>EST-BUG-02</td><td>EST-FEAT-03</td><td>Fuente de evaluación se registra como lichess para cualquier PGN con evals completas.</td><td>Todo · P1 · código</td><td><code>coach_game_statistics_compute.py</code>: SOURCE_EXPORT = lichess. Distinguir proveedor de importación, evaluación embebida y motor/version/profundidad cuando estén informados. Origen desconocido permanece desconocido; no inventar procedencia.</td></tr>
<tr><td>EST-FEAT-07</td><td>EST-BUG-01</td><td>Estado y errores accionables al calcular estadísticas.</td><td>Todo · P1</td><td>Mostrar cálculo en curso, fallo y reintento; separar error de cálculo de ausencia de estadísticas. Si el tiempo de procesamiento requiere job, diseñarlo antes de asumir un timeout mayor. No presentar ceros como cálculo exitoso.</td></tr>
</tbody>
</table>

## Features y bugs de login y seguridad.

<table>
<thead>
<tr><th>Tipo-Id</th><th>IdRel</th><th>Descripción</th><th>Estado</th><th>Comentarios</th></tr>
</thead>
<tbody>
<tr><td>LOG-FEAT-01</td><td></td><td>Soporte para login con usuario de Google</td><td>⬜ Todo</td><td></td></tr>
<tr><td>LOG-FEAT-02</td><td></td><td>Soporte para login con usuario de Chess.com</td><td>⬜ Todo</td><td></td></tr>
<tr><td>LOG-FEAT-03</td><td></td><td>Soporte para login con usuario de Lichess</td><td>⬜ Todo</td><td></td></tr>
<tr><td>LOG-FEAT-04</td><td></td><td>Módulo de gestión de usuarios y roles (<code>admin</code>, <code>user</code>), accesible solo para admin</td><td>✅ Done</td><td>HITL · <code>/admin/users</code>, API <code>/api/auth/users</code></td></tr>
<tr><td>LOG-FEAT-05</td><td></td><td>opción de cambio de pass (solo admin)</td><td>✅ Done</td><td>HITL OK — cambio de contraseña en <code>/admin/users</code></td></tr>
<tr><td>LOG-FEAT-06</td><td></td><td>Modulo de gestión de grupos</td><td>⬜ Todo</td><td>
1. ABM de grupos.
   1. ABM de usuarios al grupo (vista de dos paneles usuarios <--> grupo)
   2. Asignación de un grupo al crear o modificar un usuario.
   3. Asignación de roles al grupo.
</td></tr>
<tr><td>LOG-FEAT-07</td><td></td><td>Rol de Instructor</td><td>⬜ Todo</td><td>
    1. Rol de user
    2. Agregar permisos para gestionar grupos de alumnos.
</td></tr>
<tr><td>LOG-FEAT-08</td><td></td><td>Rol de Instructor</td><td>⬜ Todo</td><td>
    1. Agregar permisos para gestionar partidas de alumnos / grupos de alumnos.
       1. Clonar estudios completos o partidas seleccionadas por filtro avanzado.
       2. Insertar nuevas partidas/estudios desde menu "insertar partidas" a un alumno o grupo de alumnos.
    2. Agregar permisos para ver reportes de alumnos.
</td></tr>
</tbody>
</table>

## Features y bugs de estructura de tablas

<table>
<thead>
<tr><th>Tipo-Id</th><th>IdRel</th><th>Descripción</th><th>Estado</th><th>Comentarios</th></tr>
</thead>
<tbody>
<tr><td>DB-FEAT-01</td><td></td><td>cambiar tabla module07_games por coach_games</td><td>✅ Done</td><td>Actualizar referencias en código Python</td></tr>
<tr><td>DB-FEAT-02</td><td></td><td>cambiar tabla module07_decision_points por coach_decision_points</td><td>⬜ Todo</td><td>Actualizar referencias en código Python</td></tr>
<tr><td>DB-FEAT-03</td><td></td><td>cambiar tabla module07_analysis_jobs por coach_analysis_jobs</td><td>⬜ Todo</td><td>Actualizar referencias en código Python</td></tr>
<tr><td>DB-FEAT-04</td><td></td><td>cambiar tabla module07_ply_annotations por coach_ply_annotations</td><td>⬜ Todo</td><td>Actualizar referencias en código Python</td></tr>
</tbody>
</table>

## Modelo mental · críticas y candidatas (FEAT-07)

Estado global **WIP**: M-1…M-10 implementados no implica validación pedagógica ni corrección de todos los detectores. Los hallazgos siguientes provienen de revisión estática; todavía no se ejecutaron pruebas funcionales de corrección. El entrenador valida utilidad didáctica; los fixtures validan semántica del tablero. No bloquear toda la beta por Reportes, pero no cerrar M-11 con P0 de modelo pendientes.

**Alcance de FEAT-07:** rapid o ritmos más lentos (clásicas y correspondencia). Blitz y bullet excluidos de análisis mental, ejemplos, calibración y pruebas pedagógicas. Implementar guarda explícita por ritmo; los ritmos excluidos solo intervienen en controles negativos de admisión, sin generar assessment. Referencias sin reloj: ejercicio sin límite, fuera de métricas por ritmo hasta verificar origen.

### Bugs / verificaciones técnicas

<table>
<thead><tr><th>Tipo-Id</th><th>IdRel</th><th>Descripción</th><th>Estado</th><th>Comentarios / aceptación</th></tr></thead>
<tbody>
<tr><td>MENT-BUG-01</td><td>FEAT-07 / M-2 / M-6</td><td>Detección de ataques/defensas basada en jugadas legales del bando al turno.</td><td>Todo · P0 · código</td><td><code>isAttackedBy</code> filtra <code>chess.moves()</code> por color: no calcula ambos colores ni defensores sobre piezas propias. Afecta E1/E2/E7/E8 y S1/S4. Usar mapa de ataques/defensas y separar ataque geométrico, captura legal y pieza realmente ganable. Validar clavadas, peones, reyes y piezas defendidas; no afirmar material gratis sin cálculo.</td></tr>
<tr><td>MENT-BUG-02</td><td>FEAT-07 / M-2</td><td>Los triggers pierden la última jugada rival al reconstruir Chess desde FEN.</td><td>Todo · P0 · código</td><td><code>assessDecisionPoint</code> reconstruye lastOpponentVerbose pero solo lo entrega a <code>detectNotableCritical</code>; <code>detectTriggers</code> consulta history vacío. Además E4 intenta volver a aplicar la jugada previa sobre la posición actual. Pasar contexto explícito y comparar before/after correctos. Caso: captura central y avance de peón con tempo en PGN y variante.</td></tr>
<tr><td>MENT-BUG-03</td><td>FEAT-07 / M-6</td><td>S2 confunde dar jaque con dejar al propio rey en jaque.</td><td>Todo · P0 · código</td><td>Tras trial.move cambia el turno; <code>trial.inCheck()</code> consulta el rey rival. Dar un jaque legal puede disparar S2. Usar rey/color explícito; rechazar jugadas ilegales por legalidad. Fixture: e4 e5 Qh5 Nc6 Bc4 Nf6 Qxf7# no debe alertar S2 por dar mate.</td></tr>
<tr><td>MENT-BUG-04</td><td>FEAT-07 / M-5</td><td>Taxonomía de candidatas incompleta y amenaza D2 calculada con el turno equivocado.</td><td>Todo · P1 · código</td><td>D4 no tiene retorno; D2 inspecciona trial.moves del rival y exige objetivo del mismo color rival. Separar amenaza propia, defensa/profilaxis y plan posicional con evidencia; admitir etiqueta no determinada. Captura o jaque no implica candidata buena ni prioridad final.</td></tr>
<tr><td>MENT-BUG-05</td><td>FEAT-07 / M-3 / M-5</td><td>E10 afirma evaluaciones cercanas solo por contar tres candidatas.</td><td>Todo · P1 · código</td><td>El hook pasa cantidad de UCI; no se comprueba cercanía de scores. Transportar scores, POV, mate y profundidad; computar diferencia comparable. Sin scores: no afirmar cercanía. MultiPV=3 por configuración no demuestra dificultad.</td></tr>
<tr><td>MENT-BUG-06</td><td>FEAT-07 / M-3 / BUG-12</td><td>El modo crítico puede depender del error ya cometido.</td><td>Todo · P0 · diseño/código</td><td>El hook usa bestScore y playedScore de la decisión; su diferencia retrospectiva entra en critical/E11. No equivale a detectar necesidad de cálculo antes de mover. Separar diagnóstico previo de revisión posterior; al variar jugada realizada manteniendo posición/contexto, la criticidad previa debe permanecer estable.</td></tr>
<tr><td>MENT-BUG-07</td><td>FEAT-07 / M-9</td><td>FEN y bando del tablero pueden no coincidir con la decisión explicada.</td><td>Todo · P1 · verificar UI</td><td>El hook analiza parent.fen al seleccionar la jugada ya realizada; en un punto crítico de job el cursor puede estar antes de la decisión. Mostrar explícitamente FEN, turno, movimiento objetivo y fuente cliente/job. Probar selección PGN, crítica, variante, negras y girar tablero. Registrar discrepancia antes de cambiar contrato.</td></tr>
</tbody>
</table>

### Mejoras a implementar

<table>
<thead><tr><th>Tipo-Id</th><th>IdRel</th><th>Descripción</th><th>Estado</th><th>Comentarios / aceptación</th></tr></thead>
<tbody>
<tr><td>MENT-FEAT-01</td><td>FEAT-07 / M-11</td><td>Validación humana ciega de criticidad y candidatas.</td><td>Todo · P0</td><td>Sesión 2026-11-09; entrenador 2100 FIDE/25 años. Primero juicio humano sin motor ni continuación, después UI y finalmente motor. Conservar discrepancias con motivo y FEN; no tratar la opinión de un revisor como verdad universal.</td></tr>
<tr><td>MENT-FEAT-02</td><td>MENT-BUG-06</td><td>Separar modo ejercicio previo y revisión posterior.</td><td>Todo · P1</td><td>Ejercicio: amenaza rival, 2–3 candidatas del alumno, mejor respuesta rival y elección razonada antes de revelar partida/eval. Revisión: comparar elección, continuación jugada y evidencia motor. No filtrar eval_after, jugada futura ni resultado hacia diagnóstico previo.</td></tr>
<tr><td>MENT-FEAT-03</td><td>MENT-BUG-04 / M-5</td><td>Candidatas legibles y contrastables.</td><td>Todo · P1</td><td>Mostrar SAN, idea, motivo de inclusión, respuesta rival exigente y descarte concreto; UCI solo técnico. D1–D5 agrupa tipos, no sustituye ranking objetivo. Mantener ranking motor separado del orden didáctico y permitir defensa, profilaxis o mejora tranquila; máximo 2–3 opciones iniciales, ampliables.</td></tr>
<tr><td>MENT-FEAT-04</td><td>MENT-BUG-01 / M-3</td><td>Criticidad explicada con evidencia de la posición.</td><td>Todo · P1</td><td>Explicar casillas/piezas, amenaza o transformación y qué verificar. Distinguir forzada, táctica, estratégica y tranquila; una única respuesta legal no exige comparar tres candidatas. Crit no es gravedad del error. Reemplazar crit 9.7 aislado por significado y escala documentada; calibración aún pendiente.</td></tr>
<tr><td>MENT-FEAT-05</td><td>MENT-FEAT-01 / M-11</td><td>Corpus equilibrado para evaluar el modelo.</td><td>Todo · P1</td><td>Admitir solo rapid, clásicas y correspondencia; excluir blitz y bullet del análisis mental, ejemplos y validación. Separar propias/elite, ritmos admitidos, blancas/negras, críticas/tranquilas y tácticas/estratégicas. Ritmo desconocido requiere verificación antes de métricas por ritmo. Congelar muestra antes de ver salidas. Medir omisiones y falsas alarmas por estrato; no medir solo coincidencia con la primera línea del motor. Ampliar muestra con posiciones estratégicas elegidas por el entrenador.</td></tr>
<tr><td>MENT-FEAT-06</td><td>M-4</td><td>Pausa orientativa y modo tranquilo con chequeo de seguridad.</td><td>Todo · P1</td><td>No presentar 10 s como regla universal. Bloquear assessment en blitz/bullet con mensaje de alcance; permitir rapid, clásicas y correspondencia. Considerar ritmo numérico PGN, incremento, reloj si existe y complejidad; si falta reloj declarar dato ausente. No penalizar ajedrez diario con una pausa artificial. Revisar parseo 600+5, 900+10, clásicas y 1/259200; 300 s se usa únicamente como control negativo de admisión y debe rechazarse para análisis mental; Elo por sí solo no valida el tiempo.</td></tr>
<tr><td>MENT-FEAT-07</td><td>MENT-FEAT-01</td><td>Registro reproducible de cada revisión.</td><td>Todo · P1</td><td>Guardar versión app/reglas, PGN/FEN, ply y rama, POV, fuente, scores/depth, juicio ciego del instructor y respuesta alumno. Separar no disponible de seguro/sin alerta. Misma posición por PGN y FEN sin contexto debe declarar la información que falta.</td></tr>
<tr><td>MENT-FEAT-08</td><td>M-6 / M-8</td><td>Advertencias proporcionales y ayudas escalonadas.</td><td>Todo · P1</td><td>S1–S4 sin alertas no certifica seguridad. Sacrificio intencional requiere respuesta y compensación verificadas; no rechazarlo solo por material atacado. Ayudas: pista del cambio → recurso rival → candidatas → línea corta, conservando intento inicial.</td></tr>
</tbody>
</table>

### Especificación de revisión Mental 1600 · sesión 2026-11-09

**Alcance de esta actualización:** requisitos y aceptación en el tracker; implementación pendiente. No crear ni desplegar un Site. El flujo debe explicar **cómo debería haber pensado el jugador**: separar hechos del tablero, autorreporte del alumno, juicio del instructor e hipótesis del modelo. Nunca afirmar como hecho «no calculaste», «pensaste X» o «jugaste impulsivamente» sin evidencia explícita; preferir «aquí convenía detenerse y verificar…». Una demora observada no demuestra cálculo.

| ID           | Relación                      | Prioridad / estado | Requisito y aceptación                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------ | ----------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MENT-FEAT-09 | MENT-FEAT-05/07               | P1 · Todo          | **Fixtures P1–P3 / E1–E2.** Cargar PGN y fragmentos SetUp/FEN; organizar tres partidas propias rapid y dos de estudio/elite. Mantener IDs estables, corpus explícito, POV, ritmo original y verificado, fuente, integridad/completitud y posiciones C01–C16. Verificar exactamente cinco fixtures y reportar omisiones/duplicados sin sobrescribir. Rechazar blitz/bullet para assessment y métricas; ritmo desconocido queda pendiente salvo estudio sin reloj, fuera de métricas por ritmo. E1 histórico no equivale a elite moderna; fragmentos no cuentan como partidas completas. Conservar PGN propios y metadatos en ámbito privado, sin volcarlos al repo público.                               |
| MENT-FEAT-10 | MENT-FEAT-01/02/07            | P1 · Todo          | **Recorrido ciego por posiciones.** Congelar selección antes de revelar salidas; incluir críticas y controles tranquilos. Ocultar continuación histórica, resultado, comentarios reveladores, Mental y motores. Guardar primer intento del alumno y juicio independiente del instructor antes de revelar Mental y después evidencia motor. Marcar casos reconocidos y excluirlos de medición ciega. Reabrir conserva intento original; ayudas y nuevos intentos quedan separados.                                                                                                                                                                                                                        |
| MENT-FEAT-11 | MENT-FEAT-03/07               | P1 · Todo          | **Registro por decisión.** Guardar si se detuvo (sí/no/no consta), fuente de ese dato (autorreporte/observación/registro de reloj), tiempo de sesión separado del reloj histórico, amenaza detectada, 2–3 candidatas SAN con idea, respuesta rival prevista y continuación calculada por candidata, elección y motivo. Permitir una sola candidata si la posición lo justifica. Separar respuesta rival prevista de la realmente jugada y elección del ejercicio de jugada histórica. No inferir pensamientos a partir del tiempo ni completar campos ausentes con suposiciones.                                                                                                                         |
| MENT-FEAT-12 | MENT-BUG-05 / MENT-FEAT-03/07 | P1 · Todo          | **Contraste Stockfish / Lc0 / Maia.** Relacionar elección y jugada histórica con candidatas humanas, del modelo y de cada motor; conservar coincidencias, alternativas válidas, omisiones y respuestas refutadoras. Guardar FEN/POV/rama, motor y versión/red o modelo/Elo, parámetros, PV, score/tipo/POV, profundidad o presupuesto disponible y procedencia/fecha. Stockfish y Lc0 aportan evaluación/líneas; Maia aporta plausibilidad humana según su modelo, no verdad objetiva. No mezclar probabilidades Maia con centipeones ni promediar scores incompatibles. Evidencia ausente o incompleta se indica como tal, sin fabricar evaluación ni exigir los tres motores para registrar la sesión. |
| MENT-FEAT-13 | MENT-FEAT-09…12               | P1 · Todo          | **Vistas de revisión.** Fixtures con admisión y completitud; resumen por partida; detalle por posición con intentos, fases y evidencia; comparación propias vs estudio/elite por tema, color y ritmo; comentarios del instructor con autor, fecha, caso/FEN, decisión y estado; backlog priorizado filtrable MENT-BUG/MENT-FEAT. Navegar de un hallazgo a su posición y versión sin contaminar la fase ciega. Los comentarios posteriores no alteran el juicio ciego original.                                                                                                                                                                                                                           |
| MENT-FEAT-14 | M-11 / MENT-FEAT-01/07/13     | P1 · Todo          | **Control trazable del gate.** Mostrar cada requisito M-11 como pendiente/cumplido/bloqueado/no aplica con evidencia enlazada y motivo; conteos verificables por partida/posición, versión, revisores y firma/fecha. Separar cobertura de fixtures, cierre técnico y aceptación pedagógica. Cinco fixtures o una reunión no cierran automáticamente M-11. Mantener sus requisitos vigentes y bloqueos P0.                                                                                                                                                                                                                                                                                                |

**Datos mínimos y trazabilidad:** sesión → fixture → posición (FEN antes de mover, turno, ply, rama y última jugada rival) → intento ciego → revelación/contraste → comentario/hallazgo. Guardar versión app/reglas y del fixture; los cambios de reglas crean una nueva corrida, sin borrar resultados previos. Identificar inequívocamente posición y corpus: los IDs de referencia **E1/E2** no se confunden con triggers E1–E11.

**Clasificación de hallazgos:** MENT-BUG para incumplimiento reproducible del contrato o comportamiento incorrecto; MENT-FEAT para capacidad nueva o mejora pedagógica. Reutilizar los IDs existentes antes de asignar otro. Cada hallazgo incluye prioridad, estado, observado/hipótesis/confirmado, caso/FEN/POV, versión, pasos, esperado/obtenido, evidencia, comentario del instructor, criterio de aceptación y ticket/commit de resolución. Una discrepancia de estilo no confirma un bug. Ordenar P0 semánticos y fuga retrospectiva primero; después flujo ciego/registro y contraste; luego agregados y presentación.

**Comparación propias vs estudio/elite:** informar N y denominadores por estrato: pausa registrada, críticas humanas detectadas/omitidas, tranquilas con falsa alarma, candidatas útiles cubiertas/omitidas, respuesta rival y cálculo documentados, explicaciones suficientes y casos sin datos. No equiparar dificultad, exposición previa o representatividad de P y E; no inferir causalidad ni precisión general con esta muestra.

**Aceptación M-11:** usar el [checklist vigente](../deep_analysis/coach-mental-1600-hitl-checklist.md), incluidas ≥3 partidas rapid, ≥15 decisiones, ≥3 critical y ≥3 fast aceptables, casos obligatorios, revisor, versión y firma; registrar acuerdo con denominador y tickets para desacuerdos según §6. Los ejemplos E complementan y no sustituyen las tres propias rapid del protocolo. P0 semánticos abiertos bloquean cierre. Decisión explícita: congelar v1 / iterar v1.1 / bloquear Phase 2 worker. MENT-FEAT-09…14 permanecen Todo: esta spec no acredita implementación, pruebas ni feedback recibido.

### Módulo de comentarios HITL sobre propuestas del modelo mental

**Propósito:** registrar feedback durante sesiones HITL directamente sobre lo que propone Mental 1600, además de las respuestas del alumno y los comentarios generales de sesión. Desglosa MENT-FEAT-13; todas las tareas siguientes están pendientes.

| ID           | Relación                    | Prioridad / estado | Tarea y criterio de aceptación                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------ | --------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MENT-FEAT-15 | MENT-FEAT-07/13             | P1 · Todo          | **Modelo de datos y persistencia.** Definir sesión HITL, revisión y comentario vinculado a partida/fixture, FEN antes de mover, turno/POV, ply/rama y corrida. Guardar autor, rol, fechas, versión app/reglas y una instantánea inmutable de la propuesta revisada: modo fast/critical, pausa, trigger E*, candidata D*, chequeo S* o explicación/plan. Admitir comentario general del assessment. La referencia debe permitir reconstruir qué se comentó aunque el modelo cambie. Persistir en servidor con migración y contrato API documentados; no depender solo de memoria o localStorage.                                                                                         |
| MENT-FEAT-16 | MENT-FEAT-15 / MENT-FEAT-10 | P1 · Todo          | **Captura contextual en Mental 1600.** Acción “Comentar” junto a cada propuesta y al assessment completo; panel con texto del sistema, comentario libre, acuerdo/desacuerdo/parcial/no evaluable, motivo y propuesta de corrección o ejemplo. Motivos: omisión, falsa alarma, error técnico, candidata/respuesta rival inadecuada, explicación o vocabulario confuso, pausa impropia o falta de contexto. Elegir una candidata conserva SAN/UCI y su idea. Guardar sin perder posición ni campos al navegar; mostrar guardando/guardado/error y reintento sin duplicados. Disponible después de revelar el modelo; nunca revelar propuestas o feedback previo durante el intento ciego. |
| MENT-FEAT-17 | MENT-FEAT-15/16             | P1 · Todo          | **API, permisos e historial.** Crear, consultar, responder y editar comentarios con historial de revisiones, sin sobrescribir el juicio ciego ni la instantánea evaluada. Controlar acceso por propietario o participación autorizada en la sesión; rol instructor no concede acceso global a partidas privadas. Conservar autores distintos y desacuerdos entre revisores. Definir política de eliminación y validar aislamiento entre usuarios, referencia a corrida/posición y reintentos idempotentes. Reabrir sesión tras recargar recupera comentarios y estados.                                                                                                                 |
| MENT-FEAT-18 | MENT-FEAT-13/14/17          | P1 · Todo          | **Bandeja y resolución del feedback.** Listar por sesión, partida y posición; filtrar por autor, componente del modelo, motivo, prioridad y estado: abierto/en revisión/acordado/descartado/resuelto. Cada transición guarda responsable, fecha y motivo; “resuelto” requiere evidencia o nueva corrida. Vincular o proponer MENT-BUG/MENT-FEAT reutilizando issues existentes, con esperado/obtenido y criterio de aceptación; no crear tickets externos automáticamente. Navegar de comentario a propuesta original y comparar con la versión corregida. Exportar resumen de sesión con comentarios, decisiones y referencias; excluir material privado de cualquier salida pública.  |
| MENT-FEAT-19 | MENT-FEAT-15…18 / M-11      | P1 · Todo          | **Validación funcional HITL.** Verificar recorrido completo: abrir sesión → revelar assessment → comentar trigger, candidata y explicación → recargar → recuperar → resolver o vincular issue → repetir con reglas nuevas conservando originales. Cubrir negras, variantes, FEN repetida en distintas partidas, cambio rápido de posición, motor ausente, error de guardado y usuario sin acceso. Confirmar ausencia de filtración al recorrido ciego y que comentarios/resoluciones no marcan automáticamente M-11 como aprobado. Documentar evidencia de aceptación antes de marcar Done.                                                                                             |

**Orden de implementación:** MENT-FEAT-15 → MENT-FEAT-16/17 → MENT-FEAT-18 → MENT-FEAT-19. Registrar feedback no requiere ejecutar un nuevo análisis de motor ni congelar las reglas. La sesión conserva su juicio humano inicial separado de los comentarios posteriores. El feedback describe la calidad de la propuesta del sistema y cómo convendría razonar; no certifica qué pensó realmente el jugador.

### Orden y cierre

1. BUG-099 + FEAT-100: aislar alcance de edición; no corregir corpus histórico sin revisar IDs afectados.
2. MENT-BUG-01/02/03/06: eliminar errores semánticos y fuga retrospectiva antes de evaluar fiabilidad.
3. Sesión MENT-FEAT-01: registrar feedback incluso si esos arreglos aún no están desplegados, etiquetando versión y limitaciones.
4. MENT-BUG-04/05/07 y MENT-FEAT-02…19 según decisiones del instructor.
5. EST-BUG-01/02 con verificación en Render. BUG-098 está en el Blueprint; el CDN lo aplica al sincronizarlo. Reportes continúa en backlog.

El cierre pedagógico exige casos tranquilos y críticos, ambos colores, causas documentadas de desacuerdo, cero P0 semánticos pendientes y pruebas de regresión de los bugs corregidos. El 80% de acuerdo de M-11 es un criterio exploratorio, no una medida de precisión general del producto. Ver [guía de sesión](../deep_analysis/coach-mental-review-2026-11-09.md).

### Resumen backlog

<table>
<thead>
<tr><th>Estado</th><th>IDs</th></tr>
</thead>
<tbody>
<tr><td>✅ Done</td><td>FEAT-01…06, BUG-02/04/07/10/013/015/016/044/049/060/067/074/077/081/084/090, FEAT-08…11, FEAT-014/017…033, FEAT-032/035/036/040…042/046/047/048/050/051/052/053/054/055/056/057/058/059, FEAT-043/045/061/066/068/070/071/072/073/075/076/078/079/080/082/083/085/086/087/089/091/092/094/095/096/097, LOG-FEAT-04, LOG-FEAT-05, BUG-037, BUG-098, BUG-099, BUG-114, FEAT-111, FEAT-113, DB-FEAT-01, FEAT-093, EST-FEAT-01…06</td></tr>
<tr><td>🔄 WIP</td><td>BUG-12, FEAT-07 (M-11 pendiente; nuevos hallazgos abiertos), FEAT-069</td></tr>
<tr><td>⬜ Todo</td><td>FEAT-038…039, FEAT-088, FEAT-103…110, FEAT-112, LOG-FEAT-01…03, LOG-FEAT-06…08, DB-FEAT-02…04, RPT-FEAT-01…09, BUG-099, FEAT-100/101, FEAT-102 (candidata), EST-BUG-01/02, EST-FEAT-07, MENT-BUG-01…07, MENT-FEAT-01…19</td></tr>
<tr><td>🔁 Duplicado</td><td>FEAT-034</td></tr>
</tbody>
</table>

**Prioridad vigente:** corrección de selección masiva y revisión de FEAT-07 para la reunión del 2026-11-09. FEAT-038/039 permanecen en backlog.
