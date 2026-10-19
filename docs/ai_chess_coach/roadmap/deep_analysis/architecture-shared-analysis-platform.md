# Arquitectura compartida · Plataforma de análisis (motores y jobs)

**Estado:** implementación · **Reutilización:** módulo análisis profundo (A/B/C) y sparring Maia + post-análisis Stockfish.

**Specs de producto:** [spec_analisis_profundo_unificado.md](../../spec_analisis_profundo_unificado.md) · [spec_sparring_maia_stockfish_unificado.md](../../spec_sparring_maia_stockfish_unificado.md)

**Borrador Phase 2 ampliado:** [arquitectura-candidata-servicios-analisis.md](./arquitectura-candidata-servicios-analisis.md)

---

## 1. Principios

1. **Un contrato versionado** por resultado de motor (`schema_version`, `rules_version`, `engine_id`, `profile_id`, `engine_fingerprint`, payload JSON).
2. **Idempotencia:** huella de entrada + `Idempotency-Key`; jobs con lease, `attempt_id`, heartbeat; cancelación UCI `stop`/`quit`.
3. **No bloquear HTTP:** análisis completo solo vía cola/worker; API devuelve 202 + `job_id`.
4. **Motores plug-in:** adaptador UCI común; perfiles declarativos (`server_deep_v1`, `lc0_critical_v1`, `human_move`, …).
5. **Scores separados por motor:** persistir tipado (`cp`, `mate`, `wdl`, `unavailable`); perspectiva blanca en almacenamiento; convertir al mostrar. **No** mezclar ni promediar Stockfish y Lc0/Lc0-Maia.
6. **Cliente delgado:** WASM = preview live; servidor = fuente preferida para profundo y clasificación persistida.
7. **Eventos:** outbox en la misma transacción que el cambio de estado del job; esquemas versionados (`event_id`, `schema_version`, `source_id`, UTC).

---

## 2. Capas

| Capa | Tecnología | Responsabilidad |
|------|------------|-----------------|
| UI | React (+ socket.io-client donde aplique A) | Solicitud, progreso, resultados; **sin** UCI en profundo |
| API | FastAPI + SQLAlchemy | Auth, contratos, persistencia, dedup |
| Tiempo real | python-socketio (cap. A) | Rooms `user:{id}`, eventos de job |
| DB | PostgreSQL | Jobs, runs, análisis, outbox, notificaciones |
| Cola | Celery/Redis, ARQ o extensión `module07` jobs | Workers |
| Workers | Procesos aislados | Stockfish CPU; Lc0 GPU opcional; Maia vía Lc0+weights |

Un proceso UCI **no** sirve dos trabajos concurrentes sin exclusión.

---

## 3. Integración `module07` (producto actual)

Extender recursos existentes antes de APIs paralelas permanentes:

| Recurso | Uso |
|---------|-----|
| `module07_analysis_jobs` | Partida, lote, posición profunda, contraste Lc0; `engine_profile`, progreso |
| `coach_games` / `games` | FK, PGN canónico, POV |
| `module07_decision_points` | Críticas + review_pack |
| `module07_ply_annotations` | Clasificación por `path_key` (paridad CA-1…CA-5 Python) |

Evolución MVP: `POST /api/v1/module07/jobs` con `analysis_mode`, `engine_profile`; cliente hidrata con GET annotations.

---

## 4. Registro de motores

| `engine_id` | Backend | Rol pedagógico |
|-------------|---------|----------------|
| `stockfish` | UCI binario | Eval, MultiPV, `cp_loss`, críticas, profundo B |
| `maia` | Lc0 + weights, `go nodes 1` (o Maia-3 UCI) | Jugada humana ~Elo; **sparring**; opcional CA-9 server |
| `lc0` | Lc0 UCI | Contraste críticas (C); opcional en job posición (A) |
| `alexander` | UCI (deploy) | Perfil adicional; OpenSpec licencia |

Maia en sparring **no** se corrige con Stockfish en tiempo real. Stockfish analiza **después** (evidencia), salvo producto explícito distinto.

---

## 5. Adaptador UCI (todos los motores)

Al arrancar cada worker/run:

1. Negociación UCI (`uci` / `isready`).
2. Leer opciones; validar parámetros del perfil.
3. Registrar configuración efectiva + fingerprint (hash binario, hash red, backend, device).
4. Detectar capacidades: MultiPV, WDL, `searchmoves`, contempt.
5. Si falta capacidad requerida: alternativa documentada **o** error `unsupported` — sin inventar scores ni cambiar backend en silencio.

Presupuestos distintos por motor: **no** asumir que el mismo `time_ms` implica búsquedas equivalentes SF vs Lc0.

---

## 6. Caché FEN (read-through)

1. Normalizar FEN: cuatro campos (tablero, STM, en passant, enroque) — sin halfmove/fullmove para hit-rate.
2. Clave: `analysis:v1:{engine_profile}:{limits_hash}:{fen_norm}`.
3. HIT → JSON cacheado (`source: cache_hit`); MISS → worker → SETEX + persistencia en partida si aplica.

Complementa `ply_annotations`; no reemplaza snapshot por firma de línea principal.

---

## 7. Ciclo de vida de jobs

Estados: `queued`, `running`, `cancel_requested`, `completed`, `cancelled`, `failed`.

- Reclamo con lease; worker idempotente por `attempt_id`.
- Cancelación: conservar resultados parciales identificados por run.
- Retry: nuevo `attempt_id` / job hijo cuando el fallo sea recuperable (`POST .../retry`).
- Dedup de **cálculo:** posición + historial + motor + pesos + perfil + candidatas + límites.
- Dedup de **contraste:** recomputar etiquetas con nueva `comparison_policy_version` sin re-ejecutar motor si los runs existen.

---

## 8. Contrato `EngineAnalysis` (compartido)

Payload mínimo reutilizable en sparring post-partida, profundo B y runs sueltos:

- `root_fen`, `history_uci`, `history_complete`
- `search_kind` (`full`, `restricted`, `nodes`, `depth`)
- `score_type`, valores tipados, `best_move`, `variations[]`
- `nodes`, `elapsed_ms`, `requested_limits`
- `engine_name`, `engine_fingerprint`, `network_hash`, `profile_id`, `profile_version`

Comparar candidatas desde la **misma raíz**; `searchmoves` cuando el perfil lo exija.

---

## 9. Referencias de implementación

- Entregas AS/LZ: [coach-async-analysis-server-mini-plan.md](./coach-async-analysis-server-mini-plan.md), [coach-lc0-strategic-kibitzer-mini-plan.md](./coach-lc0-strategic-kibitzer-mini-plan.md)
- Clasificación ply: [coach-move-classification-pedagogy-mini-plan.md](./coach-move-classification-pedagogy-mini-plan.md)
- Phase 2: [03-phase-02-analysis-in-product.md](../03-phase-02-analysis-in-product.md)
