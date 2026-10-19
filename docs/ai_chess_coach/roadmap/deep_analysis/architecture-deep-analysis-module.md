# Arquitectura · Módulo análisis profundo (A, B, C)

**Spec:** [spec_analisis_profundo_unificado.md](../../spec_analisis_profundo_unificado.md) (solo comportamiento y criterios de aceptación).

**Plataforma compartida:** [architecture-shared-analysis-platform.md](./architecture-shared-analysis-platform.md)

---

## 1. Límites del módulo

| Capacidad | Worker principal | Entrada | Salida persistida |
|-----------|------------------|---------|-------------------|
| **A** Posición | Stockfish (+ Lc0 opcional en presupuesto) | Snapshot FEN+UCI, perfil | `deep_analysis_*`, notificaciones, Socket.IO |
| **B** Partida | Stockfish `server_deep_v1` | `game_id`(s) | `GameAnalysis`, plies, `CriticalPosition`, indicadores |
| **C** Contraste Lc0 | Lc0 `lc0_critical_v1` | `analysis_id` + críticas | `EngineRun`, `EnginePositionResult`, `EngineComparison` |

B es **precondición** de C. A puede compartir adaptador Lc0 con C pero job distinto (presupuesto único vs batch críticas).

---

## 2. Integración servicio (A, B, C)

Reutilizar de la plataforma compartida:

- Trabajos asíncronos, autorización sobre recurso origen, progreso, cancelación.
- Persistencia de variantes/PV por run.
- Errores y trazabilidad (`error_code`, fingerprint motor).

Añadir en este módulo:

- Orquestación por perfil (`general`, `sacrifice_attack`, `server_deep_v1`, `lc0_critical_v1`).
- Selector de críticas (manual / hook post-B).
- Comparador determinista versionado (solo C).
- Notificaciones persistentes + socket (A).

**No** modificar datos Stockfish de B al completar C.

---

## 3. Capacidad A — implementación

### 3.1 Entidades (candidatas)

| Tabla | Campos clave |
|-------|----------------|
| `deep_analysis_jobs` | `user_id`, snapshot JSONB, `profile`, `scope`, `dedup_key`, status, lease, `attempt_id`, deadlines |
| `deep_analysis_runs` | `job_id`, stage, FEN/history, límites, motor, score, WDL, PV, warnings |
| `deep_analysis_results` | verdict, stability, compensation, `evidence_run_ids`, limitations |
| `notifications`, `outbox_events` | Avisos + entrega socket |

### 3.2 Perfil `sacrifice_attack`

Etapas típicas: exploración MultiPV → defensas críticas restringidas → opcional Lc0 dentro de `optional_budget_seconds`. Reserva `finalization_reserve_seconds` antes del deadline.

### 3.3 API (implementación)

Rutas spec §1.7; mapear a prefijo producto real (`/api/deep-analysis/...` o extensión module07). Socket.IO: rooms por usuario; fallback poll GET job.

---

## 4. Capacidad B — implementación

Alineado con AS-2/AS-3: recorrer línea principal, paridad CA-1…CA-5 en Python, escribir `module07_ply_annotations` + críticas.

- Job `full_line`: meta `plies_done/total`.
- Dedup: firma línea principal + `profile_id` + versión reglas.
- API spec §2.7; evolucionar desde `POST /api/v1/module07/jobs`.

Contrato ply server (JSON): `schema_version`, `rules_version`, `engine_id`, depth/multipv, `position_after_score`, `engine_label`, `cp_loss` — ver [coach-async-analysis-server-mini-plan.md](./coach-async-analysis-server-mini-plan.md).

---

## 5. Capacidad C — implementación (`lc0_critical_v1`)

Detalle técnico no duplicado en spec de producto.

### 5.1 Selección

- Entrada: `analysis_id`, `critical_position_ids[]`, `include_after`.
- **before:** raíz para comparar decisiones; **after:** continuidad post-jugada — no misma raíz lógica.
- Modos: manual UI; automático hook post-B (LZ-3).
- Deduplicar por contexto (repeticiones, tablas); `max_positions_per_job` configurable.

### 5.2 Perfil inicial

| Parámetro | Valor |
|-----------|--------|
| `base_time_ms` | 5000 / búsqueda |
| `max_candidates` | 3 |
| `disagreement_time_ms` | 15000 / revisión |
| `max_reanalysis_rounds` | 1 |
| `contempt` | off si compatible |

Presupuesto job = búsquedas × candidatas + ronda revisión opcional.

### 5.3 Candidatas

Inicial: mejor SF, jugada realizada, mejor Lc0; dedup. Comparar en Lc0 con misma raíz y `searchmoves` si existe. Candidatas extra manuales → perfil/presupuesto distinto.

### 5.4 Contraste (`comparison_policy_version`)

Dimensiones: jugada preferida; orden candidatas; gap intra-motor; categoría eval (umbrales **por motor**); estabilidad al subir presupuesto; mate anunciado.

Etiquetas: `agreement`, `alternative_preference`, `evaluation_disagreement`, `unstable`, `insufficient_evidence`.

Reanálisis: **una** ronda Lc0; guardar run inicial + revisado; recalcular etiqueta. Profundizar Stockfish = job/run SF **explícito**, no implícito en C.

WDL: registrar escala/origen; `E = W + 0.5*D` solo dentro de política documentada, sin calibración cruzada motores.

### 5.5 Persistencia

**EngineRun** — `job_id`, `source_analysis_id`, `engine_name`, `engine_fingerprint`, `network_hash`, `backend`, `device`, `profile_id`, `profile_version`, `effective_configuration`, status, timestamps.

**EnginePositionResult** — `engine_run_id`, `source_critical_position_id`, `role` (`before`|`after`), fen, `history_hash`, `search_kind`, `restricted_root_move`, scores tipados, PV, nodes, `elapsed_ms`, `requested_limits`, `reanalysis_round`.

**EngineComparison** — `stockfish_result_id`, `lc0_result_id`, `candidate_results`, `comparison_policy_version`, `label`, `reasons`, `comparability_limitations`, `requires_human_review`.

Contrastes inmutables; referencian run IDs concretos.

### 5.6 API

```text
POST /api/analyses/{analysis_id}/lc0-jobs
GET  /api/analysis-jobs/{job_id}
POST /api/analysis-jobs/{job_id}/cancel
POST /api/analysis-jobs/{job_id}/retry
GET  /api/analyses/{analysis_id}/engine-comparisons
GET  /api/engine-comparisons/{comparison_id}
```

Auth: mismo ámbito que análisis Stockfish origen. GPU/pesos ausentes → error claro; B intacto.

### 5.7 Entregables engineering

Adaptador Lc0; validación pesos/backend; migraciones; selector críticas; worker en cola compartida; comparador; endpoints; pruebas (perspectiva, UCI ausente, dedup, reanálisis, fallos); runbook operativo.

Plan ítems LZ-1…LZ-8: [coach-lc0-strategic-kibitzer-mini-plan.md](./coach-lc0-strategic-kibitzer-mini-plan.md).

---

## 6. Orden de implementación sugerido

Ver spec §4 y [coach-async-analysis-server-mini-plan.md](./coach-async-analysis-server-mini-plan.md): infra jobs → B → C → A (orden intercambiable si producto prioriza sacrificios).
