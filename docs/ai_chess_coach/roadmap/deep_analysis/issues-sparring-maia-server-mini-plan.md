# Issues · Sparring Maia servidor (CI-SPAR-01)

**Estado:** Planificación activa (post Phase 2 mínimo)  
**Actualizado:** 2026-10-28  

**Spec origen:** [spec_sparring_maia_stockfish_unificado.md](../../spec_sparring_maia_stockfish_unificado.md) §4 (CI-SPAR-01 BASE)  
**Arquitectura:** [architecture-sparring-maia-module.md](./architecture-sparring-maia-module.md) · [architecture-shared-analysis-platform.md](./architecture-shared-analysis-platform.md)  
**Plan previo (tabla corta):** [issues-plan-implementacion-sparring-maia.md](./issues-plan-implementacion-sparring-maia.md) — IDs **SPAR-*** conservados; este doc es el tracker detallado.

**Estrategia (vigente):** MVP **sparring en vivo** contra **Maia-3** UCI ([maia3](https://github.com/CSSLab/maia3)); adaptador `HumanMoveModel`; fallback Lc0+Maia-2 solo si `MAIA_PROVIDER=lc0_maia2`. **Stockfish solo después** de `finish` (job async, procedencia `sparring`). Sin SF corrigiendo jugadas Maia en vivo; sin LLM. Reutilizar cola/jobs y contrato `EngineAnalysis`. Ejercicios (§5), instructor PRO (§6) y progreso (§7) en planes separados.

**Superficie código esperada:** router `sparring`, adaptador Maia, tablas `SparringSession` / `SparringMove` / `ModelPrediction`, worker turno bot, UI tablero + configuración sesión, integración análisis post-partida (`module07` o cola unificada), eventos outbox.

**Ramas:** `feature/07_2xx_*` API/worker/Maia · `feature/11_2xx_*` UI sparring ([roadmap-branches.mdc](../../../../.cursor/rules/roadmap-branches.mdc)).

---

## Análisis spec · Maia servidor y humanización

| Tema | Qué dice la spec hoy | Gap |
| --- | --- | --- |
| **Inferencia bot** | `predict` + `choose_move`; `ModelPrediction.latency`; fallo Maia → pausa, no consumir reloj alumno por infra (§3.1, §4.5 #4) | OK para MVP técnico; no define **presentación** humana de la jugada |
| **Tiempo por jugada** | `SparringMove.elapsed_ms`, `clock_state`; `time_control` en sesión (§4.3) | Reloj de partida sí; **no** hay política de «pensamiento» del bot antes de mover la pieza |
| **UI sparring** | Configuración, tablero, revisión; nivel solicitado/efectivo (§4.4) | Falta configuración **estilo Lucas Chess** (retardo fijo / aleatorio / presets) |
| **Worker SPAR-06** | Latencia, timeout, pausa (plan previo) | Mide latencia real; **no** expone `think_delay_ms` al cliente ni en snapshot |

**Conclusión:** la spec cubre **Maia servidor + idempotencia + SF posterior**; **no** incluye humanizar el tiempo de respuesta del bot. Referencia producto: en **Lucas Chess** (motor oponente) se configura tiempo de reflexión simulado (fijo o rango aleatorio), independiente de que el motor ya haya calculado. ChessInsight debe modelarlo en **SPAR-16…SPAR-19** (no mezclar delay de UX con latencia de infra ni descontar reloj humano por fallos Maia).

---

## Catálogo sparring (backend, worker, UI)

<!-- Tablas HTML: Markdown Preview Enhanced rompe pipe tables con celdas largas. -->

<table>
<thead>
<tr><th>Tipo-Id</th><th>IdRel</th><th>Descripción</th><th>Estado</th><th>Comentarios</th></tr>
</thead>
<tbody>
<tr><td>SPAR-01</td><td></td><td>OpenSpec: binario Maia, pesos, licencias, variables <code>MAIA_*</code> / GPU opcional</td><td>✅ Done</td><td><a href="../../devops/spar-01-openspec-maia3.md">spar-01-openspec-maia3.md</a> · <a href="../../devops/spar-01-maia-local-windows.md">runbook</a> · <code>maia_settings.py</code> · <a href="./sources/maia_mocktest.md">smoke</a></td></tr>
<tr><td>SPAR-02</td><td></td><td>Migraciones <code>SparringSession</code>, <code>SparringMove</code>, <code>ModelPrediction</code> (§4.3)</td><td>✅ Done</td><td><code>feature/07_200_sparring_schema</code></td></tr>
<tr><td>SPAR-03</td><td>SPAR-01</td><td>Adaptador Maia-3: UCI (<code>maia3-5m</code> / <code>python -m maia3.uci</code>), opciones <code>Elo</code>/<code>SelfElo</code>/<code>OppoElo</code>, <code>--use-uci-history</code>, cache key con historial</td><td>⬜ Todo</td><td>Presets consolidación/equilibrado/desafío vía Elo; ver [spar-01-maia-local-windows.md](../../devops/spar-01-maia-local-windows.md)</td></tr>
<tr><td>SPAR-04</td><td>SPAR-02</td><td>API: <code>POST/GET /sparring/sessions</code>, estados <code>created→active→finished</code></td><td>⬜ Todo</td><td>Auth owner; spec §4.3</td></tr>
<tr><td>SPAR-05</td><td>SPAR-04</td><td>API moves: <code>expected_ply</code> + <code>request_id</code>; unicidad <code>(session_id, ply)</code></td><td>⬜ Todo</td><td>Idempotencia §2.4</td></tr>
<tr><td>SPAR-06</td><td>SPAR-03</td><td>Worker turno bot: latencia real, timeout, pausa si falla Maia (sin sustituto SF)</td><td>⬜ Todo</td><td>Aceptación SPAR #4; registrar <code>ModelPrediction.latency</code></td></tr>
<tr><td>SPAR-07</td><td>SPAR-05</td><td><code>finish</code> / abandono / reloj: reglas chess.js + terminación registrada</td><td>⬜ Todo</td><td>Modo normal MVP; spec §4.2</td></tr>
<tr><td>SPAR-08</td><td>SPAR-07</td><td>UI: configuración (color, nivel, modo, ritmo opcional), tablero sin eval en vivo</td><td>⬜ Todo</td><td><code>feature/11_200_sparring_board_ui</code></td></tr>
<tr><td>SPAR-09</td><td>SPAR-07</td><td>Job post-sesión Stockfish: <code>POST .../analysis</code> idempotente, procedencia sparring</td><td>⬜ Todo</td><td>DEEP-03 / module07; perfil liviano MVP</td></tr>
<tr><td>SPAR-10</td><td>SPAR-09</td><td>UI revisión: enlace análisis Coach / decisiones post-partida</td><td>⬜ Todo</td><td><a href="../designs/coach-game-analysis-layout-pgn.md">coach-game-analysis-layout-pgn</a></td></tr>
<tr><td>SPAR-11</td><td>SPAR-04</td><td>Eventos outbox: <code>sparring.session_*</code>, <code>analysis.completed</code></td><td>⬜ Todo</td><td>Schema versionado §4.3</td></tr>
<tr><td>SPAR-12</td><td>SPAR-06</td><td>Proveedor simulado + smoke Maia real; medir latencia/memoria</td><td>⬜ Todo</td><td>Aceptación SPAR #10–11</td></tr>
<tr><td>SPAR-13</td><td>SPAR-08</td><td>Continuar desde FEN/PGN/ejercicio (origen en metadata, sesión nueva)</td><td>⬜ Todo</td><td>Post MVP core</td></tr>
<tr><td>SPAR-14</td><td>SPAR-09</td><td>Modos conversión / resistencia / plan versionado</td><td>⬜ Todo</td><td>P1; flags en sesión</td></tr>
<tr><td>SPAR-15</td><td>DEEP-11</td><td>(Opcional) Lc0 en críticas del análisis post-sparring</td><td>⬜ Todo</td><td><a href="./issues-plan-implementacion-analisis-profundo.md">DEEP-08…12</a></td></tr>
</tbody>
</table>

## Humanización tiempo de jugada Maia (estilo Lucas Chess)

<table>
<thead>
<tr><th>Tipo-Id</th><th>IdRel</th><th>Descripción</th><th>Estado</th><th>Comentarios</th></tr>
</thead>
<tbody>
<tr><td>SPAR-16</td><td>SPAR-08</td><td><strong>Config «tiempo de reflexión» del bot</strong> en UI nueva partida sparring: <code>instant</code> · <code>fixed_ms</code> · <code>random_ms</code> [min,max] · presets (p. ej. Rápido / Normal / Lento, equivalente Lucas Chess). Persistir en <code>model_config_snapshot</code> / JSON de sesión.</td><td>⬜ Todo</td><td>No confundir con nivel Elo Maia; copy UX «humanizar movimiento»</td></tr>
<tr><td>SPAR-17</td><td>SPAR-06</td><td><strong>Orquestación servidor:</strong> calcular jugada Maia en cuanto toca al bot; responder API con UCI + <code>model_latency_ms</code>; aplicar <code>display_delay_ms = f(config, latency)</code> (p. ej. <code>max(config_min, latency + jitter)</code> con tope). Cliente recibe jugada solo tras ventana de presentación acordada o recibe ambos timestamps para animar localmente.</td><td>⬜ Todo</td><td>Fallo infra: sin delay artificial; spec §3.1 no consumir reloj humano</td></tr>
<tr><td>SPAR-18</td><td>SPAR-16</td><td><strong>UI tablero:</strong> indicador «Maia está pensando…» durante delay; animación de pieza al expirar; opción desactivar humanización (torneo / análisis rápido). Tests: delay 0 vs 2–5 s no bloquea commit idempotente del ply.</td><td>⬜ Todo</td><td><code>feature/11_201_sparring_bot_think_delay</code></td></tr>
<tr><td>SPAR-19</td><td>SPAR-07</td><td><strong>Reloj sparring:</strong> si hay <code>time_control</code>, descontar tiempo de reflexión del <strong>reloj del bot</strong> (no del humano); modo «práctica sin reloj» ignora descuento. Registrar en <code>SparringMove.elapsed_ms</code> tiempo visible + latencia modelo por separado si hace falta auditoría.</td><td>⬜ Todo</td><td>Alinear con Lucas Chess cuando hay reloj simétrico</td></tr>
<tr><td>SPAR-20</td><td>SPAR-17</td><td><strong>Perfil avanzado (P2):</strong> delay proporcional al ritmo de sesión (blitz vs rapid) o a complejidad heurística (captura vs quiet move); documentar límites; default off en MVP.</td><td>⬜ Todo</td><td>Solo tras SPAR-16–18 HITL</td></tr>
</tbody>
</table>

## Infra y aceptación (recordatorio)

<table>
<thead>
<tr><th>Tipo-Id</th><th>IdRel</th><th>Descripción</th><th>Estado</th><th>Comentarios</th></tr>
</thead>
<tbody>
<tr><td>SPAR-A1</td><td>SPAR-09</td><td>Dependencia: pipeline Stockfish servidor estable (job partida o críticas persistido)</td><td>⬜ Todo</td><td>Bloqueante SPAR-09</td></tr>
<tr><td>SPAR-A2</td><td>SPAR-12</td><td>Criterio aceptación #10: latencia p95 documentada con y sin humanización</td><td>⬜ Todo</td><td>Spec §4.5</td></tr>
</tbody>
</table>

### Resumen backlog

<table>
<thead>
<tr><th>Estado</th><th>IDs</th></tr>
</thead>
<tbody>
<tr><td>✅ Done</td><td>SPAR-01</td></tr>
<tr><td>✅ Done</td><td>SPAR-01, SPAR-02</td></tr>
<tr><td>⬜ Todo</td><td>SPAR-03…20, SPAR-A1, SPAR-A2</td></tr>
</tbody>
</table>

**Orden sugerido (MVP sparring):** SPAR-01 → SPAR-02 → SPAR-03 → SPAR-04 → SPAR-05 → SPAR-06 → **SPAR-16 → SPAR-17 → SPAR-18** (humanización en la misma entrega UI que SPAR-08) → SPAR-07 → SPAR-08 → SPAR-09 → SPAR-10 → SPAR-11 → SPAR-12 → SPAR-19 (si hay reloj en MVP) → SPAR-13.

**Después del MVP:** SPAR-14 → SPAR-15 → SPAR-20.

**Nota Lucas Chess:** configuración de «tiempo por movimiento» del motor oponente es referencia UX; implementación ChessInsight vía **SPAR-16/17/18** (config + delay de presentación + tablero), sin usar Stockfish ni eval en vivo durante el sparring.
