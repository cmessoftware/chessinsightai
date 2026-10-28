# Issues · Plan de implementación — Sparring Maia (CI-SPAR-01)

**Estado:** Planificación activa (post Phase 2 mínimo)  
**Actualizado:** 2026-10-28  
**Tracker detallado:** [issues-sparring-maia-server-mini-plan.md](./issues-sparring-maia-server-mini-plan.md) (SPAR-16…20 humanización tiempo Maia)  
**Spec:** [spec_sparring_maia_stockfish_unificado.md](../../spec_sparring_maia_stockfish_unificado.md) §4 (BASE sparring)  
**Arquitectura:** [architecture-sparring-maia-module.md](./architecture-sparring-maia-module.md) · [architecture-shared-analysis-platform.md](./architecture-shared-analysis-platform.md)

**Estrategia (vigente):** MVP **solo sparring en vivo** (Maia servidor) + **Stockfish después** del `finish` (job async, procedencia `sparring`); sin SF corrigiendo jugadas Maia; sin LLM. Reutilizar cola/jobs y contrato `EngineAnalysis` de la plataforma compartida. Ejercicios (§5), instructor PRO (§6) y métricas (§7) **fuera** de este plan salvo hooks de eventos. Ramas: `feature/07_*` API/worker/Maia, `feature/11_*` UI tablero sparring.

**Superficie código esperada:** nuevo router `sparring` (o módulo Coach), adaptador Maia UCI, tablas sesión/movimiento, integración `module07` para análisis post-partida, componentes React tablero + config, eventos outbox.

**Precondiciones:** Auth estable; tablero Coach reutilizable; worker Stockfish operativo (DEEP-03/AS-A o job críticas existente); decisión deploy Maia-3 ✅ ([OpenSpec](../../devops/spar-01-openspec-maia3.md)).

---

## Catálogo de entregas (MVP sparring)

<table>
<thead>
<tr><th>Tipo-Id</th><th>IdRel</th><th>Descripción</th><th>Estado</th><th>Comentarios</th></tr>
</thead>
<tbody>
<tr><td>SPAR-01</td><td></td><td>OpenSpec: binario Maia, pesos, licencias, variables <code>MAIA_*</code> / GPU opcional</td><td>✅ Done</td><td><a href="../../devops/spar-01-openspec-maia3.md">OpenSpec</a> · runbook · smoke</td></tr>
<tr><td>SPAR-02</td><td></td><td>Migraciones <code>SparringSession</code>, <code>SparringMove</code>, <code>ModelPrediction</code> (campos spec §4.3)</td><td>✅ Done</td><td><code>feature/07_200_sparring_schema</code></td></tr>
<tr><td>SPAR-03</td><td>SPAR-01</td><td>Adaptador Maia servidor: UCI, presets nivel (−100/0/+100), cache key con historial</td><td>⬜ Todo</td><td>Arch §4; no descargar pesos por turno</td></tr>
<tr><td>SPAR-04</td><td>SPAR-02</td><td>API: <code>POST/GET /sparring/sessions</code>, estados <code>created→active→finished</code></td><td>⬜ Todo</td><td>Spec §4.3; auth owner</td></tr>
<tr><td>SPAR-05</td><td>SPAR-04</td><td>API moves: <code>expected_ply</code> + <code>request_id</code>, unicidad <code>(session_id, ply)</code></td><td>⬜ Todo</td><td>Idempotencia spec §2.4</td></tr>
<tr><td>SPAR-06</td><td>SPAR-03</td><td>Worker turno bot: latencia, timeout, pausa si falla Maia (sin sustituto SF)</td><td>⬜ Todo</td><td>Aceptación SPAR #4</td></tr>
<tr><td>SPAR-07</td><td>SPAR-05</td><td><code>finish</code> / abandono / reloj: reglas chess.js + terminación registrada</td><td>⬜ Todo</td><td>Spec §4.2; modos normal (MVP)</td></tr>
<tr><td>SPAR-08</td><td>SPAR-07</td><td>UI: configuración (color, nivel, modo), tablero juego sin eval en vivo</td><td>⬜ Todo</td><td><code>feature/11_200_sparring_board_ui</code></td></tr>
<tr><td>SPAR-09</td><td>SPAR-07</td><td>Job post-sesión Stockfish: <code>POST .../analysis</code> idempotente, procedencia sparring</td><td>⬜ Todo</td><td>Reutilizar DEEP-03/ module07; perfil liviano MVP</td></tr>
<tr><td>SPAR-10</td><td>SPAR-09</td><td>UI revisión: enlace a análisis Coach / decisiones post-partida</td><td>⬜ Todo</td><td>Layout [coach-game-analysis-layout-pgn.md](../designs/coach-game-analysis-layout-pgn.md)</td></tr>
<tr><td>SPAR-11</td><td>SPAR-04</td><td>Eventos outbox: <code>sparring.session_*</code>, <code>analysis.completed</code></td><td>⬜ Todo</td><td>Spec §4.3; schema versionado</td></tr>
<tr><td>SPAR-12</td><td>SPAR-06</td><td>Proveedor simulado + smoke test Maia real; medir latencia/memoria</td><td>⬜ Todo</td><td>Aceptación SPAR #10–11</td></tr>
<tr><td>SPAR-13</td><td>SPAR-08</td><td>Continuar desde FEN/PGN/ejercicio (metadata origen, sesión nueva)</td><td>⬜ Todo</td><td>Spec §4.1; post MVP core</td></tr>
<tr><td>SPAR-14</td><td>SPAR-09</td><td>Modos conversión / resistencia / plan versionado</td><td>⬜ Todo</td><td>P1; flags en <code>SparringSession</code></td></tr>
<tr><td>SPAR-15</td><td>DEEP-11</td><td>(Opcional) Contraste Lc0 en críticas del análisis post-sparring</td><td>⬜ Todo</td><td>Dep. plan <a href="./issues-plan-implementacion-analisis-profundo.md">DEEP-08…12</a></td></tr>
</tbody>
</table>

### Resumen backlog

<table>
<thead>
<tr><th>Estado</th><th>IDs</th></tr>
</thead>
<tbody>
<tr><td>✅ Done</td><td>SPAR-01, SPAR-02</td></tr>
<tr><td>⬜ Todo</td><td>SPAR-03…15</td></tr>
</tbody>
</table>

**Orden sugerido (MVP):** SPAR-01 → SPAR-02 → SPAR-03 → SPAR-04 → SPAR-05 → SPAR-06 → SPAR-07 → SPAR-08 → SPAR-09 → SPAR-10 → SPAR-11 → SPAR-12 → SPAR-13.

**Después del MVP:** SPAR-14 (modos avanzados) → integración STRAT/INST (spec §5–6) en planes separados → SPAR-15 si DEEP **C** está en prod.

**Dependencia crítica:** SPAR-09 requiere pipeline Stockfish servidor estable (mínimo job partida o análisis críticas persistido).
