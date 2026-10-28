# Arquitectura · Módulo sparring Maia (+ Stockfish posterior)

**Spec:** [spec_sparring_maia_stockfish_unificado.md](../../spec_sparring_maia_stockfish_unificado.md)  
**SPAR-01 OpenSpec:** [spar-01-openspec-maia3.md](../../devops/spar-01-openspec-maia3.md) · config `modules.sparring.maia_settings`

**Plataforma compartida:** [architecture-shared-analysis-platform.md](./architecture-shared-analysis-platform.md)

**Análisis profundo de partidas importadas / revisión:** [architecture-deep-analysis-module.md](./architecture-deep-analysis-module.md) (cap. B reutilizable para analizar sesiones terminadas).

---

## 1. Límites del módulo

| Incluido | Excluido |
|----------|----------|
| Sesión en vivo humano vs Maia (servidor) | Stockfish corrigiendo jugadas Maia en vivo |
| Commit de jugadas idempotente (`expected_ply`, `request_id`) | LLM / planes automáticos en MVP |
| Job Stockfish **post** sesión (evidencia) | Mezclar scores Maia+SF en una barra |
| Eventos `sparring.*` + enlace a ejercicios/progreso | Duplicar cola de alumnos o motores |

Maia = **HumanMoveModel** (plausibilidad); Stockfish = evidencia objetiva aproximada **después** del juego.

---

## 2. Componentes

```text
UI sparring tablero
    → POST /sparring/sessions, /moves, /finish
    → Maia worker (UCI/Lc0+weights o Maia-3)
    → Postgres: session, moves, bot config efectiva
    → POST /sparring/sessions/{id}/analysis  (job idempotente)
    → Worker Stockfish (perfil liviano o server_deep según producto)
    → analysis.completed → review / ejercicios / progreso
```

Reutilizar:

- Cola y leases de [architecture-shared-analysis-platform.md](./architecture-shared-analysis-platform.md).
- Contrato `EngineAnalysis` para el job post-partida.
- Reglas de evaluación y `loss_cp` del spec sparring §2.1 (misma raíz, no cp sintético en mate).

---

## 3. Sesión y estado

Estados sesión (conceptual): `active`, `finished`, `abandoned`.

Persistir:

- `initial_fen`, movimientos UCI, `history_complete` cuando falte contexto.
- Rating declarado vs nivel solicitado vs configuración efectiva del bot (no igualar Elo plataforma = Elo red).
- En turno bot: `self_rating` / `opponent_rating` invertidos según bando del alumno.

Modos (producto): partida normal, conversión, resistencia, plan versionado — misma infra de sesión; flags en metadata.

---

## 4. Adaptador Maia (servidor sparring)

- Perfil UCI dedicado (`human_move` / elo target); preset consolidación / equilibrado / desafío (−100, 0, +100/+200 sobre nivel interno provisional).
- Inferencia **servidor** en sparring (distinto de Maia WASM en pestaña Análisis avanzado — ver [designs/coach-maia-advanced-analysis-mini-plan.md](../designs/coach-maia-advanced-analysis-mini-plan.md)).
- Validar rango de red; informar límite efectivo si el usuario pide fuera de rango.
- Cache key incluye **historial**, no solo FEN (repeticiones, reglas tablas).

---

## 5. API (implementación)

Contratos conceptuales spec §4 — adaptar rutas al router existente:

```text
POST /sparring/sessions
GET  /sparring/sessions/{id}
POST /sparring/sessions/{id}/moves
POST /sparring/sessions/{id}/finish
POST /sparring/sessions/{id}/analysis
GET  /sparring/sessions/{id}/analysis
```

Idempotencia en moves y en job de análisis (misma huella → mismo job_id).

---

## 6. Eventos e integración

Publicar (outbox):

- `sparring.session_started`, `sparring.move_committed`, `sparring.session_finished`
- `analysis.completed` (origen `sparring_session_id`)

Consumidores downstream (spec §5–7): generador ejercicios, instructor PRO, métricas progreso — **suscribirse por evento**, no acoplar sparring a tablas de ejercicios.

Permisos: reutilizar auth Coach; roles instructor/alumno según spec §2.5.

---

## 7. Análisis posterior (Stockfish)

Tras `finish`:

1. Encolar job con snapshot inmutable de la sesión.
2. Worker SF: clasificación / críticas según perfil acordado (MVP puede ser más liviano que `server_deep_v1` completo).
3. Persistir con procedencia `source: sparring` para no confundir con import PGN.
4. UI: enlace a revisión Coach (reutilizar layout [coach-game-analysis-layout-pgn.md](../designs/coach-game-analysis-layout-pgn.md) cuando la sesión se expone como “partida”).

Opcional futuro: contraste Lc0 en críticas de sesión sparring → mismo pipeline **C** con `source_analysis_id` apuntando al análisis post-sparring.

---

## 8. Ejercicios y continuidad

Continuar posición en sparring desde ejercicio: nueva sesión registrada, actividad distinta (spec). No reutilizar sesión activa sin `finish` explícito.

Tres evidencias en pipeline estratégico (SF, Maia, experto): sparring aporta trayectoria real Maia + SF posterior; experto/HITL fuera de este módulo ([spec_planes_hitl.md](../../spec_planes_hitl.md)).

---

## 9. Entregables engineering

Migraciones sesión/moves; adaptador Maia servidor; router sparring; worker moves + worker análisis; eventos outbox; tests idempotencia y rating; integración job module07 o cola unificada; documentación operativa (weights, GPU opcional Maia/Lc0).

Fuentes históricas: [sources/](./sources/).
