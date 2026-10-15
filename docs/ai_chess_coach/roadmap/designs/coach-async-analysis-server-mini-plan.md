# Mini-plan · Análisis asíncrono en servidor (Phase 2)

**Estado:** ⬜ Planned  
**Arquitectura:** [arquitectura_candidata_servicios_analisis.md](../../arquitectura_candidata_servicios_analisis.md)  
**Precondición:** Phase 1 slice usable; curso **suspendido** (solo producto + `src/analysis/`).  
**Precondición funcional:** [POS-1 FEN texto](./coach-position-analysis-entry-mini-plan.md) (tablero + motor live para posición suelta) **antes** de AS-2…AS-4.

**Meta de fase:** Cerrar **infra + HITL** y que el **análisis profundo de línea principal** corra en **servidor** (Stockfish); cliente WASM = preview live. Posiciones sueltas: POS-1 (FEN) → AS-9 (server).

---

## Entregas en dos escalones

### Escalón A — MVP producto (validar el giro server-first)

Ramas sugeridas: `feature/07_130_server_full_line_analysis`, `feature/11_130_client_read_server_annotations` (o una sola si el ítem lo permite — preferir **07** worker + **11** UI por separado según [roadmap-branches.mdc](../../../../.cursor/rules/roadmap-branches.mdc)).

| Id | Entrega | Qué hacer | DoD |
|----|---------|-----------|-----|
| **AS-1** | SV-2 merge | `module07_ply_annotations` + PUT/GET; migración en CI | E2E: clasificar en server stub o worker mínimo |
| **AS-2** | SV-1 worker | Tras ingest/job: recorrer main line, `compare_played_to_candidates` / paridad CA-1…CA-5 Python, escribir annotations | Tests golden JSON vs fixtures JS |
| **AS-3** | Job `full_line` | Extender `POST /jobs` + worker (BackgroundTasks OK en MVP): progreso `plies_done/total` en job meta o poll games | Partida 50 plies persiste sin WASM background |
| **AS-4** | Cliente SV-3 | Desactivar CA-2 background por flag; hidratar solo GET annotations; WASM solo `useLiveStockfishAnalysis` | CA-4 muestra datos server + caption motor server |
| **AS-5** | Infra P0 | P0-2…P0-5 en verde | CI documentado en Phase 1 |
| **AS-6** | HITL CA-8 | Checklist firmado; ajustes copy/umbrales | Gate antes de multi-motor |

**Fuera de AS-A:** Redis Upstash, ARQ, Maia/Lc0/Alexander, `POST /analyze` FEN público.

---

### Escalón B — Piloto arquitectura robusta (post AS-A)

| Id | Entrega | Qué hacer |
|----|---------|-----------|
| **AS-7** | Redis + read-through | Docker Redis dev; clave FEN normalizada; worker escribe cache |
| **AS-8** | ARQ | Sustituir o complementar BackgroundTasks; worker container |
| **AS-9** | API FEN on-demand | `POST/GET .../analysis/fen` para tab live opcional sin WASM |
| **AS-10** | Motor Maia | Lc0 + weights; perfil `human_1500`; solo críticas o CA-9 server |
| **AS-11** | Lc0 + Alexander | Segundo/tercer perfil UCI; OpenSpec licencias y paths |
| *(detalle Lc0 críticas)* | [coach-lc0-strategic-kibitzer-mini-plan.md](./coach-lc0-strategic-kibitzer-mini-plan.md) | LZ-1…LZ-8 kibitzer estratégico (complemento SF, no sustituto) |

---

## Contrato ply (v1 server)

Igual que cliente WASM hoy + campos server:

```json
{
  "schema_version": 1,
  "rules_version": 1,
  "engine_id": "stockfish",
  "stockfish_depth": 20,
  "stockfish_multipv": 3,
  "position_after_score": { "kind": "cp", "cp": 65, "playerColor": "white" },
  "engine_label": "inaccuracy",
  "cp_loss": 72,
  "payload": { }
}
```

`position_after_score` obligatorio en server (eval en `fen_after`, POV coach).

---

## Criterios de aceptación MVP (AS-A)

- [ ] Usuario importa partida, encola job **full line**, espera (UI progreso), abre análisis **sin** esperar WASM background.
- [ ] PGN muestra etiquetas desde server; origen visible (“Servidor” vs “Live WASM”).
- [ ] Reabrir partida no re-analiza si snapshot + signature coinciden.
- [ ] CA-8 HITL completado para al menos 5 partidas POV.
- [ ] P0 verde en CI.

---

## Orden recomendado (7–14 días → 6–8 semanas)

```text
Semana 0–1: POS-1 FEN texto (tablero + WASM live) — ver mini-plan posición
Semana 1–2: AS-5 P0 + merge AS-1 (SV-2)
Semana 3–4: AS-2 + AS-3 worker full line
Semana 5:   AS-4 cliente + AS-6 HITL
Semana 6+:  AS-7…AS-11; POS-2 imagen / POS-3 editor según prioridad
```

---

## Relación con otros ítems

| Ítem | Cuándo |
|------|--------|
| CA-9 Maia WASM | **Opcional** si AS-10 server Maia entra; no duplicar |
| Mental 1600 (`11_117`) | Server mental_model en job críticas; cliente WIP aparte |
| Phase 3 M08 | Después GATE-MVP-PRAGMATIC |
