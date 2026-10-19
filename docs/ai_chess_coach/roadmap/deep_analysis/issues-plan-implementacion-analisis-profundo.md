# Issues · Plan de implementación — Análisis profundo (A / B / C)

**Estado:** Planificación activa (Phase 2+)  
**Actualizado:** 2026-10-19  
**Spec:** [spec_analisis_profundo_unificado.md](../../spec_analisis_profundo_unificado.md)  
**Arquitectura:** [architecture-deep-analysis-module.md](./architecture-deep-analysis-module.md) · [architecture-shared-analysis-platform.md](./architecture-shared-analysis-platform.md)  
**Mini-plans:** [coach-async-analysis-server-mini-plan.md](./coach-async-analysis-server-mini-plan.md) (AS-*) · [coach-lc0-strategic-kibitzer-mini-plan.md](./coach-lc0-strategic-kibitzer-mini-plan.md) (LZ-*)

**Estrategia (vigente):** Una **plataforma de jobs** compartida con `module07`; **B** (`server_deep_v1`) primero en producto (partida + críticas + UI polling); **C** (Lc0 críticas) después de B estable; **A** (posición async + Socket.IO) en paralelo o tras B según prioridad sacrificios. Cliente WASM = preview live; no mezclar scores entre motores. Ramas: `feature/07_*` worker/API, `feature/11_*` UI — [roadmap-branches.mdc](../../../../.cursor/rules/roadmap-branches.mdc).

**Superficie código esperada:** `src/api/modules/module07/`, workers Stockfish/Lc0, migraciones Alembic, `src/frontend/src/components/coach/`, `module07Service.js`, hooks de job/polling; reutilizar `src/analysis/` (F07 bridge).

**Precondiciones:** Phase 1 slice (import → jobs críticas top-5); CA-8 HITL en progreso; P0 CI verde; POS-1 FEN / tablero posición usable.

---

## Catálogo de entregas

Ramas sugeridas en **Comentarios**; un ítem por branch salvo migración acoplada documentada.

<table>
<thead>
<tr><th>Tipo-Id</th><th>IdRel</th><th>Descripción</th><th>Estado</th><th>Comentarios</th></tr>
</thead>
<tbody>
<tr><td>DEEP-01</td><td></td><td>Infra jobs compartida: leases, <code>attempt_id</code>, heartbeat, cancelación UCI, outbox transaccional</td><td>⬜ Todo</td><td>Spec §0.3; extender <code>module07_analysis_jobs</code>; <code>feature/07_120_deep_job_platform</code></td></tr>
<tr><td>DEEP-02</td><td>DEEP-01</td><td>Migraciones entidades B: <code>GameAnalysis</code>, plies, <code>CriticalPosition</code>, dedup huella</td><td>⬜ Todo</td><td>Alinear AS-1/SV-2; Alembic en CI</td></tr>
<tr><td>DEEP-03</td><td>DEEP-02</td><td>Worker <strong>B</strong> perfil <code>server_deep_v1</code>: línea principal Stockfish, paridad CA Python</td><td>⬜ Todo</td><td>AS-2, AS-3; <code>feature/07_130_server_full_line_analysis</code></td></tr>
<tr><td>DEEP-04</td><td>DEEP-03</td><td>API B: encolar análisis partida, GET análisis/críticas, cancel/retry</td><td>⬜ Todo</td><td>Spec §2.7; evolución <code>POST /module07/jobs</code></td></tr>
<tr><td>DEEP-05</td><td>DEEP-04</td><td>UI: «Analizar en servidor», progreso poll, origen liviano vs profundo</td><td>⬜ Todo</td><td>AS-4; <code>feature/11_130_client_read_server_annotations</code></td></tr>
<tr><td>DEEP-06</td><td>DEEP-05</td><td>Filtro «Partidas para revisar» + indicadores desde análisis persistido B</td><td>⬜ Todo</td><td>Spec §2; catálogo Coach</td></tr>
<tr><td>DEEP-07</td><td>DEEP-03</td><td>Gate HITL CA-8 firmado antes de multi-motor en prod</td><td>🔄 WIP</td><td>AS-6; <a href="./coach-classification-hitl-checklist.md">checklist</a></td></tr>
<tr><td>DEEP-08</td><td>DEEP-04</td><td>Adaptador UCI Lc0 + env/pesos/licencia (OpenSpec deploy)</td><td>⬜ Todo</td><td>LZ-1; <code>feature/07_140_lc0_openspec</code></td></tr>
<tr><td>DEEP-09</td><td>DEEP-08</td><td>Worker <strong>C</strong> <code>lc0_critical_v1</code>: before/after, candidatas, reanálisis 1 ronda</td><td>⬜ Todo</td><td>LZ-2, LZ-3; arch §5</td></tr>
<tr><td>DEEP-10</td><td>DEEP-09</td><td>Persistencia <code>EngineRun</code> / <code>EngineComparison</code> + comparador versionado</td><td>⬜ Todo</td><td>LZ-4, LZ-5</td></tr>
<tr><td>DEEP-11</td><td>DEEP-10</td><td>API C: <code>POST .../lc0-jobs</code>, list/get comparisons</td><td>⬜ Todo</td><td>Spec §3.8</td></tr>
<tr><td>DEEP-12</td><td>DEEP-11</td><td>UI críticas: «Contrastar con Lc0», dos columnas SF vs Lc0 (sin barra mezclada)</td><td>⬜ Todo</td><td>LZ-6; <code>feature/11_140_lc0_kibitzer_ui</code></td></tr>
<tr><td>DEEP-13</td><td>DEEP-01</td><td>Tablas/migraciones <strong>A</strong>: <code>deep_analysis_jobs</code>, runs, results, notifications</td><td>⬜ Todo</td><td>Spec §1.6</td></tr>
<tr><td>DEEP-14</td><td>DEEP-13</td><td>API A + worker posición perfil <code>general</code></td><td>⬜ Todo</td><td>Spec §1.7; job 202 + poll</td></tr>
<tr><td>DEEP-15</td><td>DEEP-14</td><td>Socket.IO rooms <code>user:{id}</code> + notificaciones persistentes</td><td>⬜ Todo</td><td>Spec §1; botón «Análisis profundo» tablero</td></tr>
<tr><td>DEEP-16</td><td>DEEP-15</td><td>Perfil <code>sacrifice_attack</code> + calibración defensas / Lc0 opcional en presupuesto</td><td>⬜ Todo</td><td>Spec §1.4–1.5</td></tr>
<tr><td>DEEP-17</td><td>DEEP-03</td><td>Redis read-through FEN (opcional robustez)</td><td>⬜ Todo</td><td>AS-7, AS-8; post AS-A</td></tr>
<tr><td>DEEP-18</td><td>DEEP-12</td><td>HITL 10–20 posiciones divergencia SF/Lc0 documentadas</td><td>⬜ Todo</td><td>LZ-7; gate pedagógico</td></tr>
<tr><td>DEEP-19</td><td>DEEP-01</td><td>Métricas operativas jobs (cola, fallos, GPU Lc0)</td><td>⬜ Todo</td><td>Spec roadmap fase 6; observability</td></tr>
</tbody>
</table>

### Resumen backlog

<table>
<thead>
<tr><th>Estado</th><th>IDs</th></tr>
</thead>
<tbody>
<tr><td>🔄 WIP</td><td>DEEP-07 (CA-8 HITL)</td></tr>
<tr><td>⬜ Todo</td><td>DEEP-01…06, DEEP-08…19</td></tr>
</tbody>
</table>

**Orden sugerido (happy path):** DEEP-01 → DEEP-02 → DEEP-03 → DEEP-04 → DEEP-05 → DEEP-06 → (DEEP-07 gate) → DEEP-08…12 (**C**) → DEEP-13…16 (**A**) → DEEP-17…19.

**Alternativa producto:** DEEP-13…16 (**A** sacrificios) antes de DEEP-06 si se prioriza análisis de posición sobre filtro de partidas.

**Fuera de este plan (referencia):** AS-9 FEN on-demand live; AS-10 Maia server en análisis avanzado (no confundir con Lc0 **C**).
