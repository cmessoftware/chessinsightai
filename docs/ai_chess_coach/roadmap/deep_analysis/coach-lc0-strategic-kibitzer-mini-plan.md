# Mini-plan · Lc0 kibitzer estratégico (posiciones críticas, solo servidor)

**Estado:** ⬜ Backlog  
**Prioridad:** P2 (después de AS-A y HITL CA-8; paralelo o posterior a AS-10 Maia server)  
**Spec (capacidad C):** [spec_analisis_profundo_unificado.md](../../spec_analisis_profundo_unificado.md) §3  
**Arquitectura C:** [architecture-deep-analysis-module.md](./architecture-deep-analysis-module.md) §5  
**Relacionado:** [03-phase-02-analysis-in-product.md](../03-phase-02-analysis-in-product.md), [coach-async-analysis-server-mini-plan.md](./coach-async-analysis-server-mini-plan.md) (AS-11), [architecture-shared-analysis-platform.md](./architecture-shared-analysis-platform.md)  
**Regla ramas:** un ítem por branch — [roadmap-branches.mdc](../../../../.cursor/rules/roadmap-branches.mdc)

**Inspiración producto:** kibitzers duales en Lucas Chess (Stockfish + Leela Zero) — SF para eval/táctica rápida; red neuronal como **segunda opinión** en momentos importantes, no en cada ply.

---

## Objetivo

En partidas analizadas en **servidor**, mantener **Stockfish** como motor **canónico** (MultiPV, cp_loss, críticas F07, clasificación pedagógica). Añadir **Lc0 (Leela Chess Zero)** solo en **plies críticos** ya seleccionados por el pipeline SF, con presupuesto de tiempo/nodos mayor, para:

- Validar o **cuestionar** la prioridad pedagógica de una crítica.
- Ofrecer línea/PV alternativa cuando SF y Lc0 **divergen** en la mejor jugada o en evaluación cualitativa.
- Enriquecer el **review pack** con metadatos explícitos (`engine_disagreement`), sin reemplazar silenciosamente la etiqueta SF.

**Fuera de alcance:** Lc0 en WASM/cliente liviano; re-clasificar toda la partida con Lc0; sustituir Stockfish como fuente única de `engine_label` en CA-1…CA-5.

---

## Principios

1. **SF primero:** críticas y ranking vienen de `rank_player_game` / job Stockfish existente.
2. **Lc0 bajo demanda:** solo FEN de plies en conjunto `critical` (top-N críticas o umbral de criticality).
3. **Dos voces visibles:** UI muestra “Stockfish (revisión)” y, si aplica, “Lc0 (estrategia)” — nunca mezclar cp sin marcar motor.
4. **Acuerdo explícito:** definir reglas de `agreement` (misma best move UCI, o WDL compatible, o divergente).
5. **Coste acotado:** cola/worker con GPU opcional; timeout; no bloquear job SF principal.

---

## Diferencia vs Maia (AS-10)

| | **Maia (AS-10)** | **Lc0 kibitzer (LZ-*)** |
|--|------------------|-------------------------|
| Pregunta | “¿Qué jugaría un humano ~Elo X?” | “¿La crítica SF es sólida desde otra óptica (red)?” |
| Presupuesto típico | `go nodes 1` + weights Elo | nodes/time cap mayor (estrategia) |
| Salida pedagógica | Jugada humana típica | Segunda opinión / divergencia |
| UI | CA-9 / human-like | Panel “Kibitzer Lc0” en jugada crítica |

---

## Catálogo de entregas (backlog)

| Id | Entrega | Prioridad | Rama sugerida | Depende de |
|----|---------|-----------|---------------|------------|
| **LZ-1** | OpenSpec: binario Lc0, weights, licencia, `STOCKFISH_PATH`-style env `LC0_PATH` | P2 | `feature/07_140_lc0_openspec` | AS-A estable |
| **LZ-2** | Runner UCI Lc0 en worker (async subprocess, timeout, WDL/cp parse) | P2 | `feature/07_141_lc0_uci_runner` | LZ-1 |
| **LZ-3** | Hook post-críticas: tras job SF, encolar sub-tarea Lc0 por `(game_id, ply)` | P2 | `feature/07_142_lc0_critical_hook` | AS-3, LZ-2 |
| **LZ-4** | Persistencia: extensión `review_pack` / JSON sidecar `lc0_kibitzer` en `module07_decision_points` | P2 | `feature/07_143_lc0_review_pack_schema` | LZ-3 |
| **LZ-5** | Reglas `agreement` + tests golden (misma PV, divergente, mate/tablebase edge) | P2 | `feature/07_144_lc0_agreement_rules` | LZ-4 |
| **LZ-6** | UI Coach: chip + panel en modo crítica (“SF vs Lc0”) | P2 | `feature/11_140_lc0_kibitzer_ui` | LZ-4 |
| **LZ-7** | HITL muestra: 10–20 posiciones divergentes documentadas | P3 | docs + checklist | LZ-5, CA-8 |
| **LZ-8** | (Opcional) Redis cache FEN para Lc0 | P3 | con AS-7 | AS-7, LZ-2 |

**Leyenda estado:** ⬜ Backlog · 🔄 En progreso · ✅ Hecho

---

## Contrato JSON (borrador `lc0_kibitzer` v1)

Adjunto al `review_pack` o campo hermano en decisión crítica:

```json
{
  "schema_version": 1,
  "engine_id": "lc0",
  "nodes": 800000,
  "time_ms": 12000,
  "best_move_uci": "e2e4",
  "score": { "kind": "wdl", "w": 0.42, "d": 0.31, "l": 0.27 },
  "pv_uci": ["e2e4", "c7c5", "g1f3"],
  "stockfish_best_uci": "d2d4",
  "agreement": "divergent_move",
  "agreement_notes": "SF prefiere espacio central; Lc0 prioriza e4"
}
```

`agreement` ∈ `same_move` | `equivalent_eval` | `divergent_move` | `inconclusive` | `timeout`.

---

## Criterios de aceptación (MVP LZ-3…LZ-6)

- [ ] Job Stockfish termina; en ≥1 ply crítico existe bloque `lc0_kibitzer` cuando worker Lc0 está configurado.
- [ ] Sin `LC0_PATH` / GPU: job SF **no falla**; flag `lc0_skipped: true` en meta.
- [ ] UI muestra divergencia sin ocultar eval/etiqueta SF.
- [ ] Tests: runner mock + 3 FEN golden (acuerdo / divergencia / timeout).
- [ ] Documentación deploy: CPU vs GPU, límites de cola.

---

## Orden recomendado

```text
1. AS-A (SF full line + decision points estables)
2. CA-8 HITL mínimo en clasificación SF
3. LZ-1 → LZ-2 (runner)
4. LZ-3 → LZ-4 (hook + persistencia)
5. LZ-5 (reglas) + LZ-6 (UI)
6. LZ-7 HITL divergencias; LZ-8 cache si AS-7 existe
```

---

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| cp SF vs WDL Lc0 incomparables | UI WDL para Lc0; acuerdo por **jugada**, no solo cp |
| Coste GPU en prod | Solo críticas; cap nodes; cola baja prioridad |
| Confundir con Maia | Copy y `engine_id` distintos; no mezclar en CA-9 WASM |
| Usuario espera Lc0 en live | Dejar claro “solo revisión servidor en críticas” |

---

## Referencia rápida implementación

| Área | Archivos actuales / target |
|------|---------------------------|
| Críticas / job | `modules/module07/worker.py`, `create_analysis_job` |
| Review pack | `analysis/review_pack.py`, `module07_decision_points.review_pack` |
| UI crítica | `CoachGameAnalysisPage.jsx`, `CoachStudyWorkspace.jsx` |
| Registry motores | [architecture-shared-analysis-platform.md](./architecture-shared-analysis-platform.md) §4 |

---

## Siguiente paso cuando se priorice

Abrir **LZ-1** en branch `feature/07_140_lc0_openspec`: versión Lc0, weights por defecto, variables de entorno y política de licencia en README deploy.
