# Roadmap pendiente — resumen

[Versión completa](/changelog/pendientes) · [Índice del roadmap](./00-roadmap-index.md)

**Actualizado:** 2026-11-19 (UTC) · **Ítems:** 105

Solo **módulo** e **ítem** (ID + título). Generado con `npm run roadmap:sync-pending`.

## Coach UI (clasificación y catálogo)

- **BUG-103** — La descripción editada desde la tabla Partidas se revierte a «Blancas vs Negras» al abrir la partida.
- **BUG-117** — El spinner del análisis profundo no sigue el estado del trabajo solicitado.
- **BUG-118** — El listado muestra «Puntaje 0.0» cuando falta el puntaje.
- **DB-BUG-05** — Reintentar o volver a analizar una partida puede duplicar jugadas críticas y dejar resultados parciales.
- **DB-FEAT-02** — cambiar tabla module07_decision_points por coach_decision_points
- **DB-FEAT-03** — cambiar tabla module07_analysis_jobs por coach_analysis_jobs
- **DB-FEAT-04** — cambiar tabla module07_ply_annotations por coach_ply_annotations
- **EST-BUG-02** — Fuente de evaluación se registra como lichess para cualquier PGN con evals completas.
- **EST-FEAT-07** — Estado y errores accionables al calcular estadísticas.
- **FEAT-088** — En tabla Partidas permitir ordenamiento de columnas usando drag&drop
- **FEAT-101** — Distinguir categoría visual de fuente/corpus y registrar cambios manuales.
- **FEAT-104** — Cuando el usuario de chess.com o lichess no existe mostrar error (ahora no muestra nada).
- **FEAT-105** — En filtro avanzado agregar «Analisis manual».
- **FEAT-106** — En posiciones de analisis agregar un control visual de temporizador.
- **FEAT-107** — En modo analisis agregar campo para referencias externas, con texto con formato y links.
- **FEAT-108** — En modo analisis agregar campo para referencias externas, con texto con formato y links.
- **FEAT-109** — Importar PGN externo con título de estudio y descripción inicial.
- **FEAT-110** — Subnav Coach «Estudios» con los estudios cargados. Al elegir uno, abrir el tablero de análisis en el primer capítulo y la lista de capítulos a la izquierda,…
- **FEAT-116** — La pantalla de inicio (`/coach`) es la de análisis y sigue abriendo la última partida.
- **FEAT-119** — Móvil: mover piezas en el tablero eligiendo casilla inicial y casilla final (tap/clic). Hoy solo entra bien por drag&drop.
- **LOG-BUG-11** — Crear o editar un usuario puede guardar cambios aunque falle la asignación del grupo.
- **LOG-BUG-12** — El filtro por fecha del registro de actividad no coincide con la fecha que muestra la tabla.
- **LOG-FEAT-01** — Soporte para login con usuario de Google
- **LOG-FEAT-02** — Soporte para login con usuario de Chess.com
- **LOG-FEAT-03** — Soporte para login con usuario de Lichess
- **LOG-FEAT-07** — Rol de Instructor
- **LOG-FEAT-08** — Rol de Instructor
- **MENT-BUG-04** — Taxonomía de candidatas incompleta y amenaza D2 calculada con el turno equivocado.
- **MENT-BUG-05** — E10 afirma evaluaciones cercanas solo por contar tres candidatas.
- **MENT-BUG-07** — FEN y bando del tablero pueden no coincidir con la decisión explicada.
- **MENT-FEAT-01** — Validación humana ciega de criticidad y candidatas.
- **MENT-FEAT-02** — Separar modo ejercicio previo y revisión posterior.
- **MENT-FEAT-03** — Candidatas legibles y contrastables.
- **MENT-FEAT-04** — Criticidad explicada con evidencia de la posición.
- **MENT-FEAT-05** — Corpus equilibrado para evaluar el modelo.
- **MENT-FEAT-06** — Pausa orientativa y modo tranquilo con chequeo de seguridad.
- **MENT-FEAT-07** — Registro reproducible de cada revisión.
- **MENT-FEAT-08** — Advertencias proporcionales y ayudas escalonadas.
- **MENT-FEAT-09** — **Fixtures P1–P3 / E1–E2.**
- **MENT-FEAT-10** — **Recorrido ciego por posiciones.**
- **MENT-FEAT-11** — **Registro por decisión.**
- **MENT-FEAT-12** — **Contraste Stockfish / Lc0 / Maia.**
- **MENT-FEAT-13** — **Vistas de revisión.**
- **MENT-FEAT-14** — **Control trazable del gate.**
- **MENT-FEAT-15** — **Modelo de datos y persistencia.**
- **MENT-FEAT-16** — **Captura contextual en Mental 1600.**
- **MENT-FEAT-17** — **API, permisos e historial.**
- **MENT-FEAT-18** — **Bandeja y resolución del feedback.**
- **MENT-FEAT-19** — **Validación funcional HITL.**
- **RPT-FEAT-06** — Aperturas y defensas utilizadas. 1. Ordenadas de la más usada a la menos usada, por línea principal (PV) y por variantes. 2. Resultado de cada caso.
- **RPT-FEAT-07** — Listado de partidas con rachas. 1. Ganadas, según la combinación: > 0 blunders propios y sin blunder del rival; > 0 blunders propios y > 0 blunders del rival;…
- **RPT-FEAT-08** — Análisis de survivorship bias: diseñar qué presentar y cómo

## Análisis profundo (servidor)

- **DEEP-01** ⬜ Todo — Infra jobs compartida: leases, `attempt_id`, heartbeat, cancelación UCI, outbox transaccional
- **DEEP-02** ⬜ Todo — Migraciones entidades B: `GameAnalysis`, plies, `CriticalPosition`, dedup huella
- **DEEP-03** ⬜ Todo — Worker B perfil `server_deep_v1`: línea principal Stockfish, paridad CA Python
- **DEEP-04** ⬜ Todo — API B: encolar análisis partida, GET análisis/críticas, cancel/retry
- **DEEP-05** ⬜ Todo — UI: «Analizar en servidor», progreso poll, origen liviano vs profundo
- **DEEP-06** ⬜ Todo — Filtro «Partidas para revisar» + indicadores desde análisis persistido B
- **DEEP-08** ⬜ Todo — Adaptador UCI Lc0 + env/pesos/licencia (OpenSpec deploy)
- **DEEP-09** ⬜ Todo — Worker C `lc0_critical_v1`: before/after, candidatas, reanálisis 1 ronda
- **DEEP-10** ⬜ Todo — Persistencia `EngineRun` / `EngineComparison` + comparador versionado
- **DEEP-11** ⬜ Todo — API C: `POST .../lc0-jobs`, list/get comparisons
- **DEEP-12** ⬜ Todo — UI críticas: «Contrastar con Lc0», dos columnas SF vs Lc0 (sin barra mezclada)
- **DEEP-13** ⬜ Todo — Tablas/migraciones A: `deep_analysis_jobs`, runs, results, notifications
- **DEEP-14** ⬜ Todo — API A + worker posición perfil `general`
- **DEEP-15** ⬜ Todo — Socket.IO rooms `user:{id}` + notificaciones persistentes
- **DEEP-16** ⬜ Todo — Perfil `sacrifice_attack` + calibración defensas / Lc0 opcional en presupuesto
- **DEEP-17** ⬜ Todo — Redis read-through FEN (opcional robustez)
- **DEEP-18** ⬜ Todo — HITL 10–20 posiciones divergencia SF/Lc0 documentadas
- **DEEP-19** ⬜ Todo — Métricas operativas jobs (cola, fallos, GPU Lc0)

## Mental 1600

_Sin ítems pendientes._

## Sparring Maia (plan)

- **SPAR-01** ⬜ Todo — OpenSpec: binario Maia, pesos, licencias, variables `MAIA_*` / GPU opcional
- **SPAR-02** ⬜ Todo — Migraciones `SparringSession`, `SparringMove`, `ModelPrediction` (campos spec §4.3)
- **SPAR-03** ⬜ Todo — Adaptador Maia servidor: UCI, presets nivel (−100/0/+100), cache key con historial
- **SPAR-04** ⬜ Todo — API: `POST/GET /sparring/sessions`, estados `created→active→finished`
- **SPAR-05** ⬜ Todo — API moves: `expected_ply` + `request_id`, unicidad `(session_id, ply)`
- **SPAR-06** ⬜ Todo — Worker turno bot: latencia, timeout, pausa si falla Maia (sin sustituto SF)
- **SPAR-07** ⬜ Todo — `finish` / abandono / reloj: reglas chess.js + terminación registrada
- **SPAR-08** ⬜ Todo — UI: configuración (color, nivel, modo), tablero juego sin eval en vivo
- **SPAR-09** ⬜ Todo — Job post-sesión Stockfish: `POST .../analysis` idempotente, procedencia sparring
- **SPAR-10** ⬜ Todo — UI revisión: enlace a análisis Coach / decisiones post-partida
- **SPAR-11** ⬜ Todo — Eventos outbox: `sparring.session_*`, `analysis.completed`
- **SPAR-12** ⬜ Todo — Proveedor simulado + smoke test Maia real; medir latencia/memoria
- **SPAR-13** ⬜ Todo — Continuar desde FEN/PGN/ejercicio (metadata origen, sesión nueva)
- **SPAR-14** ⬜ Todo — Modos conversión / resistencia / plan versionado
- **SPAR-15** ⬜ Todo — (Opcional) Contraste Lc0 en críticas del análisis post-sparring

## Sparring Maia (servidor)

- **SPAR-04** ⬜ Todo — API: `POST/GET /sparring/sessions`, estados `created→active→finished`
- **SPAR-05** ⬜ Todo — API moves: `expected_ply` + `request_id`; unicidad `(session_id, ply)`
- **SPAR-06** ⬜ Todo — Worker turno bot: latencia real, timeout, pausa si falla Maia (sin sustituto SF)
- **SPAR-07** ⬜ Todo — `finish` / abandono / reloj: reglas chess.js + terminación registrada
- **SPAR-08** ⬜ Todo — UI: configuración (color, nivel, modo, ritmo opcional); tablero = reutilizar Coach (`ChessinsightBoard`, layout `CoachStudyWorkspace`, sin eval en vivo; §4.4.1)
- **SPAR-09** ⬜ Todo — Job post-sesión Stockfish: `POST .../analysis` idempotente, procedencia sparring
- **SPAR-10** ⬜ Todo — UI revisión: enlace análisis Coach / decisiones post-partida
- **SPAR-11** ⬜ Todo — Eventos outbox: `sparring.session_*`, `analysis.completed`
- **SPAR-12** ⬜ Todo — Proveedor simulado + smoke Maia real; medir latencia/memoria
- **SPAR-13** ⬜ Todo — Continuar desde FEN/PGN/ejercicio (origen en metadata, sesión nueva)
- **SPAR-14** ⬜ Todo — Modos conversión / resistencia / plan versionado
- **SPAR-15** ⬜ Todo — (Opcional) Lc0 en críticas del análisis post-sparring
- **SPAR-16** ⬜ Todo — Config «tiempo de reflexión» del bot en UI nueva partida sparring: `instant` · `fixed_ms` · `random_ms` [min,max] · presets (p. ej. Rápido / Normal / Lento,…
- **SPAR-17** ⬜ Todo — Orquestación servidor: calcular jugada Maia en cuanto toca al bot; responder API con UCI + `model_latency_ms`; aplicar `display_delay_ms = f(config, latency)`…
- **SPAR-18** ⬜ Todo — UI tablero: indicador «Maia está pensando…» durante delay; animación de pieza al expirar; opción desactivar humanización (torneo / análisis rápido). Tests:…
- **SPAR-19** ⬜ Todo — Reloj sparring: si hay `time_control`, descontar tiempo de reflexión del reloj del bot (no del humano); modo «práctica sin reloj» ignora descuento. Registrar…
- **SPAR-20** ⬜ Todo — Perfil avanzado (P2): delay proporcional al ritmo de sesión (blitz vs rapid) o a complejidad heurística (captura vs quiet move); documentar límites; default…
- **SPAR-21** ⬜ Todo — Reentrenar una decisión propia contra Maia conservando los relojes del punto de inicio. Una 15+10 puede retomarse en 03:21 y 06:48 con su +10, no con 15…
- **SPAR-A1** ⬜ Todo — Dependencia: pipeline Stockfish servidor estable (job partida o críticas persistido)
- **SPAR-A2** ⬜ Todo — Criterio aceptación #10: latencia p95 documentada con y sin humanización

