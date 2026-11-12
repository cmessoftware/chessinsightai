# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Historial recuperado de Coach / ChessDash — hasta 2026-11-09

Se actualiza el historial desde el despliegue de Module 07 hasta la beta de Coach. Fuentes: [roadmap](docs/ai_chess_coach/roadmap/00-roadmap-index.md), [tracker de issues](docs/ai_chess_coach/roadmap/designs/issues-coach-move-classification-pedagogy-mini-plan.md) y metadatos de integración de GitHub. No se asigna una versión publicada nueva. Las fechas de integración de la tabla se expresan en UTC.

### Added

- Análisis con Stockfish WASM, clasificación por jugada y modelo mental 1600 (#156, #157); persistencia de clasificaciones y catálogo de partidas (#159, #161).
- Espacio de estudio, entrada FEN, navegación y gestión de partidas (#162, #163, #165–#174).
- Importación masiva PGN, Lichess y Chess.com; selección del punto de vista (#173, #176, #177, #181, #183).
- Biblioteca con campos de catálogo, ordenamiento, columnas configurables, categorías y ritmos (#187–#195, #203, #204).
- Comentarios y etiquetas por jugada, selector de coronación y persistencia/edición de estudios (#197, #198, #204, #214).
- Gestión de usuarios y roles (#211); estadísticas en la interfaz y persistidas en Postgres, comparación por color y cálculo bajo demanda (#218, #225).
- La etiqueta `beta-<commit>` abre este changelog (#228, #243, FEAT-111).
- Un administrador consulta en `/admin/activity` el log de login, logout, importación de partidas, solicitud de estadísticas y análisis profundo, con filtros por usuario, fechas y evento (#249, LOG-FEAT-09).
- Un usuario con sesión envía un fallo o una idea de mejora desde Comentarios (`/feedback`) y queda como issue de GitHub (#251, LOG-FEAT-10).

### Changed

- Análisis liviano activado por el usuario (#166); gráfico de evaluación, pantalla completa, controles y panel PGN (#194, #209, #212, #217).
- Marcas de estudio y análisis manual, filtros de importación/ritmo y búsqueda por estudio (#212, #215, #218, #224).
- La selección masiva muestra cuántas partidas están marcadas en esta página y en otras, y pide confirmación antes de cambiar categoría o fuente (#231).
- En Filtros avanzados, Jugador blancas, Jugador negras y Estudio buscan por nombre parcial, con mínimo de 3 caracteres. Fuente filtra por Torneo, Chess.com, Estudios, Lichess y el resto de categorías sin asignarlas (#244).
- En el tablero de análisis, un icono ejecuta el análisis profundo y muestra un spinner sin salir de esa pantalla (#245).
- El panel de jugadas críticas abre el criterio del listado: puntaje, niveles y los cuatro motivos. El MultiPV no elige esas jugadas (#246).
- La página `/changelog` muestra el archivo como documento: títulos, listas, enlaces y la tabla de pull requests (#255).

### Fixed

- El modo crítico de Mental 1600 ya no depende de la jugada ya hecha. La diferencia de evaluación queda como revisión posterior (#235).
- S2 de Mental 1600 avisa solo si el rey de quien movió queda en jaque. Dar mate no dispara esa alerta (#234).
- Mental 1600 conserva la última jugada rival al evaluar los triggers. Sin esa jugada, una FEN sola no inventa la captura ni el tempo (#233).
- Mental 1600 mira ataques y defensas de ambos colores. Una pieza atacada y defendida no se presenta como material gratis (#232).
- Sincronización del cursor (#165), importación Lichess (#177), selección/configuración de base de datos (#178), exportación PGN con encabezados y carga desde FEN (#185), presentación del ECO (#188).
- Compilación frontend, dependencias y arranque de la API en Render, conexión a Neon y CORS (#210, #213, #215, #216, #219–#223).
- El tablero en pantalla completa queda dentro del viewport (#227).
- Al entrar a Partidas ya no se marcan todas las partidas; categoría, fuente, borrar y exportar usan solo las filas elegidas (#230).
- Un acceso directo a login, Partidas, análisis, FEN o configuración sirve la aplicación. Los assets publicados siguen como archivo; `/api` y las rutas desconocidas siguen en 404 (#241).

### Documentation

- Arquitectura de motores y análisis profundo (#164, #179); diseño de tutor opcional y antiimpulsividad (#199).
- Tracker de incidencias y protocolo de revisión de criticidad/candidatas (#175, #226). La restricción a rapid o ritmos más lentos es un requisito documentado pendiente de implementar; blitz y bullet se excluyen de la validación mental.
- Changelog de Coach con la tabla de pull requests (#228).
- Revisión Mental 1600, seguimiento M-11, feedback HITL y spec candidata de ejercitaciones: objetivos abiertos, fuentes de candidatas y fundamento por jugada (#229).
- Partidas públicas de la revisión mental y un solo tracker de issues (#239).
- El PGN de la revisión mental carga cada capítulo publicado completo, con variantes y comentarios (#244).
- La tabla de issues separa la prioridad del estado. Una candidata se marca con ✨ (#245).
- SPAR-21 documenta reentrenar errores propios con Maia usando los relojes originales de la partida (#238).
- BUG-103 registra que la descripción editada en Partidas vuelve a «Blancas vs Negras» al abrir la partida (#248). El PR #236 no se mergea.
- El tracker deja Prioridad como segunda columna y el estado como icono más nombre. El spec de ejercicios suma la exportación de partidas o estudios a alumnos o grupos (#250).

### Límites y trazabilidad

Integrado no significa validado de punta a punta en producción. Reportes sigue pendiente. BUG-099, FEAT-100 y BUG-098 quedaron integrados (#230, #231, #241); el CDN aplica las rewrites de la SPA al sincronizar el Blueprint. El cálculo de estadísticas y los bugs o mejoras del modelo mental siguen en el tracker. El PR #178 no demuestra resuelto el bug de selección masiva reportado posteriormente. #199 y #226 documentan trabajo futuro y no implementan esas funciones.

#158 no se integró: su trabajo se dividió en #159–#164. #207 y #208 no tienen merge propio; el tracker atribuye su incorporación a #209. Se listan con su estado real para no confundir referencia documental con entrega integrada. Los títulos de la tabla conservan el texto de GitHub para facilitar auditoría.

| Fecha de merge (UTC) | PR | Tipo | Cambio registrado |
| --- | --- | --- | --- |
| 2026-11-12 | [#255](https://github.com/cmessoftware/chessinsightai/pull/255) | Cambio integrado | La página de changelog muestra el Markdown con títulos, listas, enlaces y la tabla. |
| 2026-11-11 | [#250](https://github.com/cmessoftware/chessinsightai/pull/250) | Documentación | Prioridad queda como segunda columna y el estado como icono más nombre. El spec de ejercicios suma exportar partidas o estudios. |
| 2026-11-12 | [#251](https://github.com/cmessoftware/chessinsightai/pull/251) | Cambio integrado | Un bug o una sugerencia enviados desde `/feedback` se abren como issue de GitHub. |
| 2026-11-11 | [#249](https://github.com/cmessoftware/chessinsightai/pull/249) | Cambio integrado | El admin ve la actividad de usuarios: login, logout, importación, estadísticas y análisis profundo. |
| 2026-11-10 | [#248](https://github.com/cmessoftware/chessinsightai/pull/248) | Documentación | BUG-103 queda en el tracker. El #236 no se mergea: su diff reescribía un tracker viejo. |
| 2026-11-10 | [#238](https://github.com/cmessoftware/chessinsightai/pull/238) | Documentación | SPAR-21: reentrenar errores propios con Maia y los relojes originales de la partida. |
| 2026-11-10 | [#235](https://github.com/cmessoftware/chessinsightai/pull/235) | Cambio integrado | El modo crítico ya no depende de la jugada hecha. Esa diferencia queda como revisión posterior. |
| 2026-11-10 | [#234](https://github.com/cmessoftware/chessinsightai/pull/234) | Cambio integrado | S2 avisa solo si el rey de quien movió queda en jaque. Dar mate no dispara esa alerta. |
| 2026-11-10 | [#233](https://github.com/cmessoftware/chessinsightai/pull/233) | Cambio integrado | Los triggers de Mental 1600 reciben la última jugada rival. Una FEN sola no inventa la captura ni el tempo. |
| 2026-11-10 | [#232](https://github.com/cmessoftware/chessinsightai/pull/232) | Cambio integrado | Mental 1600 calcula ataques y defensas de ambos colores. Una pieza defendida no se presenta como material gratis. |
| 2026-11-09 | [#246](https://github.com/cmessoftware/chessinsightai/pull/246) | Cambio integrado | La ayuda de jugadas críticas explica el puntaje, los niveles y los cuatro motivos. |
| 2026-11-09 | [#245](https://github.com/cmessoftware/chessinsightai/pull/245) | Cambio integrado | El tablero de análisis ejecuta el análisis profundo con un icono y un spinner, sin ir a Partidas. La tabla de issues separa la prioridad. |
| 2026-11-09 | [#244](https://github.com/cmessoftware/chessinsightai/pull/244) | Cambio integrado | Jugador y estudio se buscan por nombre parcial. Fuente filtra por categoría sin asignarla. El PGN de revisión mental trae los capítulos completos. |
| 2026-11-09 | [#243](https://github.com/cmessoftware/chessinsightai/pull/243) | Cambio integrado | La etiqueta beta abre este changelog. El historial suma los pull requests mergeados hasta #241. |
| 2026-11-09 | [#241](https://github.com/cmessoftware/chessinsightai/pull/241) | Cambio integrado | Las rutas de la SPA sirven `index.html`. Assets, `/api` y rutas desconocidas siguen igual. |
| 2026-11-09 | [#231](https://github.com/cmessoftware/chessinsightai/pull/231) | Cambio integrado | Muestra el alcance de las partidas marcadas antes de cambiar categoría o fuente. |
| 2026-11-09 | [#239](https://github.com/cmessoftware/chessinsightai/pull/239) | Documentación | Publica partidas de la revisión mental y deja un solo tracker de issues. |
| 2026-11-09 | [#230](https://github.com/cmessoftware/chessinsightai/pull/230) | Cambio integrado | Al entrar a Partidas ya no se preseleccionan todas las partidas para edición masiva. |
| 2026-11-07 | [#229](https://github.com/cmessoftware/chessinsightai/pull/229) | Documentación | Revisión Mental 1600, seguimiento M-11, feedback HITL y ejercitaciones con objetivos abiertos, fuentes de candidatas y fundamento por jugada. |
| 2026-11-07 | [#228](https://github.com/cmessoftware/chessinsightai/pull/228) | Documentación | Recupera el changelog de Coach y lo enlaza con los pull requests del roadmap. |
| 2026-11-07 | [#227](https://github.com/cmessoftware/chessinsightai/pull/227) | Cambio integrado | El tablero de pantalla completa queda dentro del viewport. FEAT-038 queda en WIP. |
| 2026-11-06 | [#226](https://github.com/cmessoftware/chessinsightai/pull/226) | Documentación | Document beta issues and prepare mental-model instructor review |
| 2026-11-05 | [#225](https://github.com/cmessoftware/chessinsightai/pull/225) | Cambio integrado | Store Coach statistics in Postgres and compare both colors |
| 2026-11-04 | [#224](https://github.com/cmessoftware/chessinsightai/pull/224) | Cambio integrado | Ship Done catalog items for Render |
| 2026-11-04 | [#223](https://github.com/cmessoftware/chessinsightai/pull/223) | Cambio integrado | Allow the published Coach UI to call the API |
| 2026-11-03 | [#222](https://github.com/cmessoftware/chessinsightai/pull/222) | Cambio integrado | Install requests so Coach import can start |
| 2026-11-03 | [#221](https://github.com/cmessoftware/chessinsightai/pull/221) | Cambio integrado | Keep Coach startup from loading the course Lichess client |
| 2026-11-03 | [#220](https://github.com/cmessoftware/chessinsightai/pull/220) | Cambio integrado | Start the Coach API without the LLM analysis module |
| 2026-11-03 | [#219](https://github.com/cmessoftware/chessinsightai/pull/219) | Cambio integrado | Start the Render API without psycopg2 |
| 2026-11-03 | [#218](https://github.com/cmessoftware/chessinsightai/pull/218) | Cambio integrado | Show chess statistics, the board manual-analysis mark, and Partidas filters |
| 2026-11-02 | [#217](https://github.com/cmessoftware/chessinsightai/pull/217) | Cambio integrado | Show import progress, the fullscreen game title, and the move symbol on the piece |
| 2026-11-01 | [#216](https://github.com/cmessoftware/chessinsightai/pull/216) | Cambio integrado | Use psycopg 3 so the Render API can open Neon |
| 2026-11-01 | [#215](https://github.com/cmessoftware/chessinsightai/pull/215) | Cambio integrado | Partidas: manual analysis, PGN result, and API start on Render |
| 2026-11-01 | [#214](https://github.com/cmessoftware/chessinsightai/pull/214) | Cambio integrado | Coach study: blank game, header edit, variations, and comments |
| 2026-10-31 | [#213](https://github.com/cmessoftware/chessinsightai/pull/213) | Cambio integrado | Fix Render frontend TypeScript build |
| 2026-10-31 | [#212](https://github.com/cmessoftware/chessinsightai/pull/212) | Cambio integrado | Coach study marks and fullscreen controls |
| 2026-10-30 | [#211](https://github.com/cmessoftware/chessinsightai/pull/211) | Cambio integrado | LOG-FEAT-04: gestión de usuarios y roles (admin / user) |
| 2026-10-31 | [#210](https://github.com/cmessoftware/chessinsightai/pull/210) | Cambio integrado | fix(render): PyJWT and Coach API deps for Render |
| 2026-10-29 | [#209](https://github.com/cmessoftware/chessinsightai/pull/209) | Cambio integrado | Coach UI: FEAT-070–074 (gráfico, fullscreen, export PGN, ocultar panel) |
| 2026-10-28 | [#204](https://github.com/cmessoftware/chessinsightai/pull/204) | Cambio integrado | persist study PGN, variation edits, rhythm filters (FEAT-066 et al.) |
| 2026-10-28 | [#203](https://github.com/cmessoftware/chessinsightai/pull/203) | Cambio integrado | feat(coach): Partidas filters, corpus fuente, ECO opening (FEAT-063-065) |
| 2026-10-26 | [#199](https://github.com/cmessoftware/chessinsightai/pull/199) | Documentación | docs: tutor opcional, antiimpulsividad y práctica desde aperturas en sparring Maia |
| 2026-10-26 | [#198](https://github.com/cmessoftware/chessinsightai/pull/198) | Cambio integrado | feat(coach): FEAT-062 promotion piece picker |
| 2026-10-25 | [#197](https://github.com/cmessoftware/chessinsightai/pull/197) | Cambio integrado | feat(coach): FEAT-061 move comments and NAG labels |
| 2026-10-23 | [#196](https://github.com/cmessoftware/chessinsightai/pull/196) | Cambio integrado | Coach: FEAT-046/058/059, BUG-060, eval and Partidas UX |
| 2026-10-22 | [#195](https://github.com/cmessoftware/chessinsightai/pull/195) | Cambio integrado | feat(coach): FEAT-046/057 Partidas categories and config UI |
| 2026-10-22 | [#194](https://github.com/cmessoftware/chessinsightai/pull/194) | Cambio integrado | feat(coach): FEAT-047 cp eval line chart |
| 2026-10-22 | [#193](https://github.com/cmessoftware/chessinsightai/pull/193) | Cambio integrado | feat(FEAT-056): Ritmo column in Partidas |
| 2026-10-22 | [#192](https://github.com/cmessoftware/chessinsightai/pull/192) | Cambio integrado | feat(FEAT-055): Partida column white vs black only |
| 2026-10-22 | [#191](https://github.com/cmessoftware/chessinsightai/pull/191) | Cambio integrado | feat(FEAT-052): show/hide Partidas table columns |
| 2026-10-22 | [#190](https://github.com/cmessoftware/chessinsightai/pull/190) | Cambio integrado | feat(FEAT-035): captured pieces on Coach analysis board |
| 2026-10-22 | [#189](https://github.com/cmessoftware/chessinsightai/pull/189) | Cambio integrado | feat(FEAT-051): sort Coach Partidas table |
| 2026-10-22 | [#188](https://github.com/cmessoftware/chessinsightai/pull/188) | Cambio integrado | fix(FEAT-050): compact ECO column (URL values) |
| 2026-10-22 | [#187](https://github.com/cmessoftware/chessinsightai/pull/187) | Cambio integrado | feat(FEAT-050): catalog fields in Coach Partidas table |
| 2026-10-22 | [#185](https://github.com/cmessoftware/chessinsightai/pull/185) | Cambio integrado | feat(FEAT-031): PGN copy with headers; fix BUG-049 FEN study PGN |
| 2026-10-21 | [#184](https://github.com/cmessoftware/chessinsightai/pull/184) | Cambio integrado | FEAT-040/045: deprecate games navigator; edit Partida title and result |
| 2026-10-20 | [#183](https://github.com/cmessoftware/chessinsightai/pull/183) | Cambio integrado | Feature/11 148 feat 029 bulk pov |
| 2026-10-19 | [#182](https://github.com/cmessoftware/chessinsightai/pull/182) | Cambio integrado | Coach UX: BUG-044, FEAT-043/045 confirm badges and correspondence PGN |
| 2026-10-19 | [#181](https://github.com/cmessoftware/chessinsightai/pull/181) | Cambio integrado | feat(coach): FEAT-028 Chess.com bulk import, FEAT-036 game descriptions |
| 2026-10-19 | [#180](https://github.com/cmessoftware/chessinsightai/pull/180) | Cambio integrado | Feature/11 031 remove top import menu |
| 2026-10-18 | [#179](https://github.com/cmessoftware/chessinsightai/pull/179) | Documentación | docs(coach): spec unificada analisis profundo (posicion + partida) |
| 2026-10-16 | [#178](https://github.com/cmessoftware/chessinsightai/pull/178) | Cambio integrado | fix(coach): BUG-037 Partidas selection + API DB env |
| 2026-10-19 | [#177](https://github.com/cmessoftware/chessinsightai/pull/177) | Cambio integrado | fix(coach): FEAT-027 Lichess import hardening |
| 2026-10-16 | [#176](https://github.com/cmessoftware/chessinsightai/pull/176) | Cambio integrado | feat(coach): FEAT-027 bulk Lichess import |
| 2026-10-15 | [#175](https://github.com/cmessoftware/chessinsightai/pull/175) | Documentación | docs(coach): FEAT-026 tracker and fix issues table |
| 2026-10-15 | [#174](https://github.com/cmessoftware/chessinsightai/pull/174) | Cambio integrado | feat(coach): FEAT-026 Partidas action icons |
| 2026-10-15 | [#173](https://github.com/cmessoftware/chessinsightai/pull/173) | Cambio integrado | feat(coach): FEAT-025 bulk import Partidas (max 100) |
| 2026-10-15 | [#172](https://github.com/cmessoftware/chessinsightai/pull/172) | Cambio integrado | FEAT-024: link FEN to Posicion tab |
| 2026-10-15 | [#171](https://github.com/cmessoftware/chessinsightai/pull/171) | Cambio integrado | FEAT-023: copy FEN button under board |
| 2026-10-15 | [#170](https://github.com/cmessoftware/chessinsightai/pull/170) | Cambio integrado | FEAT-022: current FEN under board |
| 2026-10-15 | [#169](https://github.com/cmessoftware/chessinsightai/pull/169) | Cambio integrado | FEAT-020: copy main-line PGN from context menu |
| 2026-10-15 | [#168](https://github.com/cmessoftware/chessinsightai/pull/168) | Cambio integrado | FEAT-019: board focus arrow-key navigation |
| 2026-10-15 | [#167](https://github.com/cmessoftware/chessinsightai/pull/167) | Cambio integrado | FEAT-017: delete Coach games from Partidas |
| 2026-10-15 | [#166](https://github.com/cmessoftware/chessinsightai/pull/166) | Cambio integrado | FEAT-018: opt-in light WASM classification (Motor tab) |
| 2026-10-15 | [#165](https://github.com/cmessoftware/chessinsightai/pull/165) | Cambio integrado | BUG-016: cursor sync for advanced analysis + #158 split doc |
| 2026-10-15 | [#164](https://github.com/cmessoftware/chessinsightai/pull/164) | Documentación | PR E: Engine architecture and mini-plans (split #158) |
| 2026-10-15 | [#163](https://github.com/cmessoftware/chessinsightai/pull/163) | Cambio integrado | PR D: Coach nav, Partidas, and FEN entry (split #158) |
| 2026-10-15 | [#162](https://github.com/cmessoftware/chessinsightai/pull/162) | Cambio integrado | PR C: CoachStudyWorkspace (split #158) |
| 2026-10-14 | [#161](https://github.com/cmessoftware/chessinsightai/pull/161) | Cambio integrado | PR B (GC-1–GC-3): coach_games catalog and master games upsert |
| 2026-10-14 | [#160](https://github.com/cmessoftware/chessinsightai/pull/160) | Documentación | Docs: #158 split traceability and PR template |
| 2026-10-14 | [#159](https://github.com/cmessoftware/chessinsightai/pull/159) | Cambio integrado | PR A (SV-2): persist Coach WASM ply classifications |
| 2026-10-08 | [#157](https://github.com/cmessoftware/chessinsightai/pull/157) | Cambio integrado | Feature/11 117 mental 1600 wip |
| 2026-10-08 | [#156](https://github.com/cmessoftware/chessinsightai/pull/156) | Cambio integrado | Coach: client Stockfish WASM, move classification, and advanced analysis UI |
| 2026-09-27 | [#155](https://github.com/cmessoftware/chessinsightai/pull/155) | Cambio integrado | LS01-023: Stockfish-first eval policy and export metadata |
| 2026-09-28 | [#154](https://github.com/cmessoftware/chessinsightai/pull/154) | Cambio integrado | Coach unified import, analysis UI, and P0-1 CI |
| 2026-09-24 | [#153](https://github.com/cmessoftware/chessinsightai/pull/153) | Cambio integrado | Coach MVP local setup: Alembic imports and slim requirements |
| 2026-09-24 | [#152](https://github.com/cmessoftware/chessinsightai/pull/152) | Cambio integrado | S0 Module 07 MVP: schema, worker, Coach UI |

---

## [v0.1.138] - 2026-05-25

### Added
- **🎓 AI Engineering Course** (PR #95) - New learning material in `docs/courses/`:
  - AI Engineer roadmap with phase-by-phase learning plan
  - Three Jupyter notebooks: architecture overview, feature pipeline, dataset builder
  - SQLite migration script for portable course data
- **📊 Course Data Access Layer** (PR #97, #98) - Portable SQLAlchemy-based data layer:
  - `docs/courses/data_access/features_repository.py` - SQLAlchemy repository with SQLite default and optional PostgreSQL via `CHESS_COURSE_DB_URL`
  - `docs/courses/data_access/notebook_data_helper.py` - Helper utilities for notebooks
  - `docs/courses/dataset/build_training_dataset.py` - Standalone dataset builder module
  - `tests/docs_courses/test_course_data_access.py` - Test suite for data access layer
  - `tests/docs_courses/test_build_training_dataset.py` - Test suite for dataset builder
- **🗺️ AI Chess Coach Roadmap** (PR #98) - Phase 1–2 feature list at `docs/ai_chess_coach/roadmap/02-phase-1-2-feature-list.md`
- **📚 ML Theory & Analysis Docs** (PR #93) - New documentation organized by category:
  - `docs/ml_theory/ML_THEORETICAL_FRAMEWORK.md`
  - `docs/ml_analysis/ML_CURRENT_STATE_ANALYSIS.md`, `PAGES_ARCHITECTURE_ANALYSIS.md`, `ISSUE_21_COMPLETION_REPORT.md`
  - `docs/devops/DATASETS_VOLUMES_CONFIG.md`, `DOCKER_DEVELOPMENT_STRATEGY.md`, `MLFLOW_POSTGRES_INTEGRATION.md`
- **🔧 Copilot Instructions** (PR #94) - `.github/copilot-instructions.md` with project conventions
- **📋 Tesseract Setup Guide** - `INSTALL_TESSERACT_GUIDE.md` for OCR prerequisites

### Changed
- **🏷️ Project Renamed** (PR #93) - Project renamed from ChessTrainer to **CHESSINSIGHTAI** in README and description
- **📁 Docs Reorganization** (PR #99) - AI Coach and OCR docs moved into `docs/ai_chess_coach/`:
  - `AI_CHESS_COACH_TESTING_GUIDE.md`, `AI_COACH_CHECKLIST.md`, `AI_COACH_IMPLEMENTATION_GUIDE.md`, `AI_COACH_QUICKSTART.md`, `OCR_SETUP_GUIDE.md`
- **📓 Course Notebooks Updated** (PR #97, #98) - Notebooks aligned to use new portable data layer and normalized entry points
- **🗄️ Alembic Migrations** (PR #94) - Added multiple new schema migrations: batch tracking, users table, SHAP analysis tables, views, and merge heads

### Fixed
- **📐 Course README Placeholders** (PR #97) - Normalized script entry points and clarified placeholder values

### Technical Details
- **Version**: v0.1.138
- **PRs merged**: #93, #94, #95, #97, #98, #99
- **Branch**: `main`
- **Date range**: 2026-05-17 to 2026-05-25

---

## [v0.1.103] - 2026-03-26

### Added
- **Arquitectura Orquestada - Fase 0 Completada** - Documentación técnica completa para rediseño del módulo ai_chess_coach
- **Especificación Técnica** (`docs/arquitectura-orquestada/00-fase0-especificacion-tecnica.md`) - 1,200 líneas detallando:
  - 5 componentes arquitectónicos (Planner, Executor, Critic, Memory, Explainer)
  - 5 reglas de validación programáticas del Critic
  - Implementación completa de AnalyzeGameUseCase con Clean Architecture
  - Estrategia de testing, métricas y patrones de diseño
- **Interfaces y Schemas JSON** (`docs/arquitectura-orquestada/00-fase0-interfaces-json.md`) - 1,100 líneas con:
  - 7 schemas completos con validación (AnalysisOptions, AnalysisPlan, ExecutionResult, CriticResult, EnrichedResult, AnalysisReport, PlayerPatterns)
  - Modelos Pydantic con validadores personalizados
  - Ejemplos de uso y documentación OpenAPI
- **Plan de Migración** (`docs/arquitectura-orquestada/00-fase0-plan-migracion.md`) - 1,200 líneas cubriendo:
  - Estrategia de migración en 5 fases sin breaking changes
  - Implementación de dual write/read con feature flags
  - Migraciones Alembic para esquema v2.0
  - Plan de rollback y estrategia de pruebas
- **Diagramas de Arquitectura** (`docs/arquitectura-orquestada/00-fase0-diagramas-arquitectura.md`) - 930 líneas con 10 diagramas Mermaid:
  - Componentes (arquitectura de alto nivel con 4 capas)
  - Secuencia (flujo completo AnalyzeGameUseCase)
  - Flujo de datos (pipeline de transformación)
  - Base de datos (ERD con esquema v2.0)
  - Despliegue (topología Docker con puertos)
  - Estados del Critic (máquina de estados con validaciones)
  - Ciclo de vida (proceso end-to-end desde PGN hasta frontend)
  - Migración (timeline de 5 fases visualizado)
  - Dependencias (relaciones entre servicios)
  - Feature flags (control de rollback y versiones)
- **README Navegable** (`docs/arquitectura-orquestada/README.md`) - 350 líneas con índice de navegación y guía de referencia

### Changed
- **Issue Management** - Creados 6 issues para fases 0-5 (#85-90) del proyecto de Arquitectura Orquestada
- **Branch Strategy** - Creadas 6 ramas de feature para implementación por fases

### Fixed
- **Git Cleanup** - Eliminadas 10 ramas obsoletas de desarrollo anterior
- **Issue Organization** - Cerrados 10 issues legacy para mantener enfoque en nueva arquitectura

### Technical Details
- **Total Documentation**: ~4,400 líneas de especificación técnica
- **Branch**: `feature/arquitectura-orquestada-fase0-documentacion`
- **Commits**: 5 commits (b2c60c8, 58538fc, f678c97, 8f3d7f0, 1e8ec3d)
- **Issue Closed**: #85 - Fase 0: Documentación y Preparación
- **Architecture Pattern**: Clean Architecture + Planner/Executor/Critic/Memory/Explainer
- **Migration Strategy**: 5 phases with feature flags (ENABLE_ORCHESTRATED_ANALYSIS, ENABLE_DUAL_WRITE, PREFER_VERSION)
- **Design Patterns**: Use Case, Strategy, Chain of Responsibility, Builder, Repository, Facade

### Next Steps
- **Fase 1**: Implementación de Planner + Executor + Memory (Issue #86)
- **Database**: Crear migraciones Alembic para tablas move_analyses y player_patterns
- **Services**: Implementar PlannerService, ExecutorService, MemoryService con feature flags
- **Testing**: Unit tests e integration tests para flujo Planner → Executor → Memory

---

## [v0.1.108] - 2026-03-26

### Added
- **Arquitectura Orquestada - Fase 1 Completada** - Implementación core de Planner, Executor y Memory con ~1,650 líneas de código
- **Database Migration** (`alembic/versions/d65ac6f4b42a_add_move_analyses_and_player_patterns_.py`) - Migración completa con:
  - Tabla `move_analyses` (25 columnas): game_id, player_id, ply, move_san, FENs, evaluaciones engine, features JSONB, tactical_tags[], ML predictions, RAG context JSONB, explanation, critic validation, metadata
  - Tabla `player_patterns` (11 columnas): player_id UNIQUE, estadísticas agregadas, error_distribution JSONB, frequent_tactics JSONB, weak_phases[], phase_error_rates JSONB, improvement_trend, error_clusters JSONB
  - 7 índices optimizados (game_ply composite, player_created DESC, version, ml_prediction, critic_consistent, player_patterns_last_updated)
  - 6 constraints (CHECK para confidence/score 0-1, UNIQUE game_id+ply+version)
  - Foreign keys con CASCADE delete desde games/users
  - Rollback completo en downgrade()
- **Pydantic Schemas** (`src/ai_coach/orchestrated/schemas.py`) - 7 modelos con validación (~420 líneas):
  - `AnalysisOptions`: depth (10-40, múltiplo de 5), enable_ml/rag/cv, elo_threshold (800-3000), focus_mode enum (critical/full/tactical/positional)
  - `AnalysisPlan`: game_id UUID, target_moves, analysis_modes, priorities dict, metadata
  - `ExecutionResult`: Análisis completo con engine evals, features dict, phase enum, MLPrediction opcional, RAGContext opcional, auto score_diff @validator
  - `CriticResult`: is_consistent bool, confidence (0-1), ValidationIssue list, passed/failed rules, @validator previene consistencia con errores
  - `EnrichedResult`: Wrapper de execution + explanation + critique, @property helpers (is_high_quality >0.85, requires_review <0.70)
  - `AnalysisReport`: Reporte a nivel de partida con enriched_results[], @property consistency_rate y avg_confidence
  - `PlayerPatterns`: Estadísticas agregadas (error_distribution, frequent_tactics, weak_phases, trends)
  - Todos con Config.schema_extra examples y validadores de negocio
- **PlannerService** (`src/ai_coach/orchestrated/planner_service.py`) - 300 líneas, decisión de QUÉ analizar:
  - `build_plan()`: Entry point con AnalysisOptions → AnalysisPlan
  - Identificación de momentos críticos con scoring basado en 5 criterios:
    * Eval swing (>100cp=10pts, 50-100cp=5pts, 20-50cp=2pts)
    * Material change (<-200=8pts, <-100=4pts)
    * Tactical tags (2pts cada uno)
    * Error labels (blunder=10pts, mistake=7pts, inaccuracy=4pts)
    * Phase adjustment según focus_mode
  - 4 focus modes (critical=threshold 5 max 20 moves, full=0/200, tactical=3/30, positional=4/25)
  - Asignación de prioridades (high/medium/low) por move
  - Logging extensivo (info/debug) con tiempos y estadísticas
- **ExecutorService** (`src/ai_coach/orchestrated/executor_service.py`) - 450 líneas async, producción de EVIDENCIA:
  - `async execute()`: Loop principal iterando target_moves del plan
  - Pipeline de 4 pasos por movimiento:
    1. Engine analysis (bloqueante) - eval_before/after, score_diff, best_move/line, tactical_tags
    2. Feature extraction (depende de engine) - king_safety, material_balance, center_control, piece_activity
    3. ML + RAG en paralelo con `asyncio.gather(*tasks, return_exceptions=True)` - MLPrediction + RAGContext
    4. Ensamblaje de ExecutionResult con toda la evidencia
  - Placeholders (TODO) para integración con servicios reales (AnalysisService, FeatureService, ChessErrorPredictor, RAG)
  - Error handling robusto (try/except con continue-on-error)
  - CV support opcional en constructor
  - Logging detallado por paso con tiempos de ejecución
- **MemoryService** (`src/ai_coach/orchestrated/memory_service.py`) - 480 líneas async, persistencia de RESULTADOS:
  - Dual-write strategy con feature flags (ENABLE_DUAL_WRITE default=true, PREFER_VERSION default=v2.0)
  - `async store_move_analysis()`: Guarda EnrichedResult con dual-write v2.0 + v1.0 opcional
  - `async _store_v2_move_analysis()`: INSERT masivo en move_analyses (30 parámetros) con SQLAlchemy text() y JSONB
  - `async update_player_patterns()`: Agregación + UPSERT con ON CONFLICT(player_id) DO UPDATE
  - `_compute_player_statistics()`: Calcula error_distribution, frequent_tactics (top 10), weak_phases (error_rate >0.15), phase_error_rates, improvement_trend, recent_avg_error_rate
  - `async get_player_patterns()`: SELECT con lookback_days filter (default 30)
  - Placeholder para _store_v1_move_legacy() (backward compatibility)
  - Manejo de sesiones async con commits explícitos

### Changed
- **Module Structure** - Nuevo paquete `src/ai_coach/orchestrated/` con __init__.py exportando schemas públicos
- **Architecture** - Implementación completa del patrón Clean Architecture especificado en Fase 0
- **Async/Await** - Executor y Memory completamente asíncronos para escalabilidad
- **Parallelization** - ML + RAG ejecutan en paralelo reduciendo latencia por movimiento

### Technical Details
- **Total Code**: ~1,650 líneas de producción (migration 170, schemas 420, planner 300, executor 450, memory 480)
- **Branch**: `feature/arquitectura-orquestada-fase1-planner-executor`
- **Commits**: 2 feat commits (c6c4ca9 migration+schemas+planner, 4c28cb4 executor+memory)
- **Version**: v0.1.108-4c28cb4
- **Issue**: #86 - Fase 1: Planner + Executor + Memory (core completado)
- **Design Patterns**: Strategy, Async/Await, Feature Toggle, Repository (implicit), Chain of Responsibility (pipeline)
- **Testing Strategy**: Placeholders in place for pytest unit/integration tests
- **Performance**: asyncio.gather() parallelization reduces analyze time, async I/O for database operations

### Next Steps
- **Testing**: Crear pytest suite (unit tests para cada service, integration test e2e Planner→Executor→Memory)
- **Integration**: Reemplazar placeholders con servicios reales (AnalysisService, FeatureSummarizer, ChessErrorPredictor, RAG)
- **Fase 2**: Implementar CriticService con 5 reglas de validación programáticas (Issue #87)
- **Fase 3**: ExplainerService (LLM) + RAG improvements (Issue #88)

---

## [v0.1.43] - 2025-06-30

### Added
- **Documentation Structure Enhancement** - Comprehensive documentation improvements addressing issue #62
- **Spanish Language Documentation** - Complete Spanish versions for all major documentation files:
  - `src/architecture_es.md` - System architecture diagram and explanations in Spanish
  - `tests/README.md` - Complete testing guide with runner documentation in Spanish
  - `DATASETS_VOLUMES_CONFIG_es.md` - Docker volumes configuration for dataset sharing in Spanish
- **Documentation Index** - Organized navigation structure replacing requirements sections in both VERSION_BASE files
- **Docker Installation References** - Clear references to automatic dependency installation via:
  - `Dockerfile` - Main application container setup
  - `dockerfile.notebooks` - Jupyter environment setup
  - `requirements.txt` - Complete Python dependencies
  - `docker-compose.yml` - Container orchestration

### Changed
- **VERSION_BASE Files Restructured** - Documentation index now serves as primary navigation replacing basic requirements section
- **Cross-Reference Enhancement** - Better organization and linking between English and Spanish documentation versions
- **Issue Management Optimization** - Removed #MIGRATED-TODO keys from English version to prevent duplicate GitHub issues

### Fixed
- **Docker Build Issues** - Resolved pytest package installation error in Dockerfile (issue #62)
- **Documentation Organization** - Logical categorization into Core Documentation, Configuration, Architecture, Testing, and Reports sections

### Technical Details
- **Commit**: `6f8d69b6fa66173cf4e4e13d385fc061fef7ca02`
- **Author**: Sergio Salanitri
- **Date**: Mon Jun 30 15:06:47 2025 -0300
- **Branch**: `62-compartir-datasets-ente-containers`

---

## Previous Versions

### [v0.1.42] - 2025-06-30
- **Fixed Docker build**: Remove pytest packages from apt-get install
- **Resolved build error**: 'E: Unable to locate package pytest'
- **Technical Details**: Commit `e6619b7` - Fixes #62, moved pytest packages to pip installation

### [v0.1.41] - 2025-06-30
- **Git LFS Configuration**: Added Docker Git LFS support and selective volume sharing
- **Docker Updates**: Enhanced dockerfile and dockerfile.notebooks with proper Git LFS installation
- **Documentation**: Created comprehensive dataset volume sharing documentation
- **Windows Support**: Added Windows setup guide and LFS usage documentation
- **Volume Sharing**: Updated docker-compose.yml for selective export/models sharing between containers

### [v0.1.40] - 2025-06-30
- **Source Parameter Support**: Added source parameter in feature generation process (issue #59)
- **Testing Enhancements**: Associated tests for source parameter functionality
- **Feature Filtering**: Added filter by source in generate_feature process (issue #56)
- **Bug Fixes**: Fixed max-games control failure

### [v0.1.39] - 2025-06-29
- **PostgreSQL Migration**: Migrated entire system from SQLite to PostgreSQL
- **Testing Suite**: Added comprehensive tests for analyze_tactics_parallel
- **Requirements Update**: Updated requirements.txt with all references (app, notebooks, and tests)
- **Pipeline Improvements**: Enhanced analyze_tactics process with fixes and optimizations

### [v0.1.38] - 2025-06-26
- **Git LFS Setup**: Configured Git LFS for large files and processed games
- **Performance**: Optimized storage for large dataset files

## Major Releases

### [v0.2] - 2025-06-14
- **Major Version Update**: New stable version with enhanced features
- **Commit**: `09eacce` - Significant system improvements and optimizations

### [v0.1] - 2025-05-31  
- **Initial Stable Release**: Backend stabilization and core functionality
- **Training Dataset**: Successfully generating training_dataset.csv
- **Commit**: `30f47e3` - First stable version with working training dataset generation

## Recent Feature Development (June 2025)

### Dataset and Source Management
- **Multi-source Support**: Enhanced support for multiple datasets (issue #8)
- **Source Filtering**: Improved feature generation with source-based filtering
- **Data Processing**: Optimized pipeline for different data sources

### Infrastructure and DevOps  
- **Docker Optimization**: Complete containerization with Git LFS support
- **PostgreSQL Migration**: Full database migration from SQLite to PostgreSQL
- **Volume Sharing**: Intelligent dataset sharing between containers
- **Testing Framework**: Comprehensive test suite implementation

### Documentation and Localization
- **Bilingual Documentation**: Complete Spanish translations for all major docs
- **Architecture Documentation**: Detailed system architecture diagrams
- **Testing Guides**: Comprehensive testing documentation and runner guides
- **Installation Automation**: Docker-first approach with automatic dependency management

<!-- Template for future entries:

## [Unreleased]

### Added
### Changed  
### Deprecated
### Removed
### Fixed
### Security

-->
