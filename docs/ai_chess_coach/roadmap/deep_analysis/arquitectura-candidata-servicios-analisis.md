# Arquitectura candidata · Servidor de análisis asíncrono

**Estado:** Borrador refinado (roadmap Phase 2)  
**Hub:** [00-roadmap-index.md](../00-roadmap-index.md) · [index.md](./index.md)  
**Spec (producto):** [spec_analisis_profundo_unificado.md](../../spec_analisis_profundo_unificado.md)  
**Arquitectura módulos:** [architecture-shared-analysis-platform.md](./architecture-shared-analysis-platform.md) · [architecture-deep-analysis-module.md](./architecture-deep-analysis-module.md)  
**Mini-plan MVP:** [coach-async-analysis-server-mini-plan.md](./coach-async-analysis-server-mini-plan.md)

---

## 0. Alcance y límites

| Incluido | Excluido (suspendido) |
|----------|------------------------|
| Producto Coach: `module07`, API FastAPI, worker, Postgres, UI React | Carpeta **`docs/ai_chess_coach_course/`** (notebooks, scripts de curso, gates del curso) — ver [SUSPENDED.md](../../../ai_chess_coach_course/SUSPENDED.md) |
| Librería **`src/analysis/`** reutilizada vía `f07_bridge` (reglas F07 ya probadas en tests) | Ejecutar o mantener pipelines Jupyter / “lab Paso N” como entrega |
| Análisis profundo **servidor** + persistencia + HITL | Clonar Lichess en UX o paridad 1:1 de etiquetas |

**Objetivo de la siguiente fase a cerrar:** **infra (P0) + HITL** y **mover el análisis profundo del cliente al servidor**, dejando WASM solo para **preview en vivo** y variantes ligeras.

---

## 1. Situación actual vs objetivo

```text
HOY (Phase 1)
  Import → module07 job (BackgroundTasks) → top-5 críticas + review_pack (server)
  + CA-2 WASM: clasificación línea principal en navegador (depth ~12)
  + SV-2 (rama): ply_annotations en Postgres

OBJETIVO (Phase 2 — MVP servidor)
  Import → job de partida → worker analiza línea principal (Stockfish server, depth mayor)
  → ply_annotations + decisiones críticas en Postgres
  Cliente: GET annotations; WASM solo tab Motor live / exploración

OBJETIVO (Phase 2 — robusto)
  Cola ARQ + Redis read-through por FEN + registro de motores (SF, Maia, Lc0, Alexander)
  Perfiles de job: deep_eval | human_move | neural_hybrid
```

| Capa | Hoy | MVP servidor | Arquitectura robusta |
|------|-----|--------------|----------------------|
| Cola | `BackgroundTasks` en API | Mismo o **ARQ** en Docker dev | ARQ + Redis gestionado (ej. Upstash) |
| Caché FEN | No | Redis opcional local | Read-through Redis, TTL + clave normalizada |
| Motores | Stockfish binario en worker | Stockfish | **Registry**: Stockfish, Maia (Lc0 `nodes 1`), Lc0, Alexander |
| Clasificación ply | JS WASM | Python (paridad CA-1…CA-5, SV-1) | Idem + metadatos motor en JSON |
| Cliente | WASM background + PUT annotations | Poll job + lee DB | Poll + cache hits para FEN sueltos (live) |

---

## 2. Principios de diseño

1. **Un contrato versionado** por ply (`rules_version`, `engine_id`, `depth`, `multipv`, payload JSON) — alineado con `module07_ply_annotations` y spec pedagógica v1.
2. **Idempotencia:** mismo `(fen_normalized, engine_profile, depth, multipv)` → mismo cache key; jobs de partida reemplazan snapshot por `main_line_signature`.
3. **No duplicar CPU:** caché read-through antes de encolar (ver §4).
4. **Motores plug-in:** interfaz UCI común; Maia vía Lc0 + weights; perfiles declarativos, no lógica dispersa en routers.
5. **Cliente delgado:** análisis profundo nunca bloquea UI; progreso por job + barra k/N plies.

---

## 3. Integración con `module07` (no API paralela forever)

El borrador original (`POST /api/analyze` suelto) sirve como **patrón**; en producto conviene **extender module07**:

| Recurso | Uso |
|---------|-----|
| `module07_analysis_jobs` | Job de partida o lote; status, depth, multipv, **engine_profile** (nuevo campo P2) |
| `coach_games` | FK → `games.game_id`; POV, flags análisis cliente (PGN en maestro) |
| `module07_decision_points` | Top críticas + review_pack (FK → `coach_games.id`) |
| `module07_ply_annotations` | Clasificación / eval por `path_key` (SV-2; FK → `coach_games.id`) |

**Endpoints MVP (evolución):**

- `POST /api/v1/module07/jobs` — ampliar body: `analysis_mode: full_line | critical_only`, `engine_profile: stockfish_default`.
- `GET /api/v1/module07/games/{id}/annotations` — cliente deja de depender de WASM para main line.
- Opcional Fase robusta: `POST /api/v1/analysis/fen` — analyze-on-demand con cache (live tab puede usar esto en lugar de WASM).

---

## 4. Flujo read-through (caché FEN)

Basado en el draft ARQ + Redis:

1. Normalizar FEN: primeros **4 campos** (tablero, STM, en passant, castling) — **sin** halfmove/fullmove para hit-rate en aperturas.
2. Clave: `analysis:v1:{engine_profile}:{depth}:{multipv}:{fen_norm}`.
3. **HIT:** devolver JSON cacheado (marcar `source: cache_hit`).
4. **MISS:** encolar tarea; worker ejecuta motor; **SETEX** con TTL (ej. 24 h dev, 7 d prod); persistir en Postgres si el FEN pertenece a una partida activa del usuario.

**Nota:** la caché FEN complementa, no reemplaza, `ply_annotations` (que es snapshot por partida y firma de línea).

---

## 5. Registro de motores (fase robusta)

| `engine_id` | Backend | Uso pedagógico |
|-------------|---------|----------------|
| `stockfish` | UCI binary | Eval, MultiPV, cp_loss, críticas |
| `maia` | Lc0 + weights, `go nodes 1` | Jugada humana ~Elo (CA-9 server-side opcional) |
| `lc0` | Lc0 UCI | Variante neural / segundo opinión |
| `alexander` | UCI (binario acordado en deploy) | Perfil adicional (definir en OpenSpec: versión, licencia) |

Perfil de job ejemplo:

```json
{
  "engine_profile": "deep_line_v1",
  "engines": [
    { "engine_id": "stockfish", "depth": 20, "multipv": 3 },
    { "engine_id": "maia", "elo_target": 1500, "nodes": 1 }
  ]
}
```

MVP: solo `stockfish` con depth/multipv configurables en job.

---

## 6. Worker (referencia ARQ — fase piloto)

El código de ejemplo del draft se mantiene como **referencia**; en implementación usar `python-chess` + `STOCKFISH_PATH` existente, tests en CI, y **no** hardcodear Upstash en MVP local.

```python
# Patrón tarea ARQ (esqueleto; ver draft histórico en git)
async def analyze_fen_task(ctx, fen: str, engine_profile: str, depth: int, multipv: int) -> dict:
    fen_norm = normalize_fen_four_field(fen)
    cached = await redis.get(cache_key(...))
    if cached:
        return json.loads(cached)
    result = await run_uci_multipv(fen_norm, depth, multipv)
    await redis.setex(cache_key(...), TTL, json.dumps(result))
    return result
```

Heurística `es_posicion_critica` del draft (brecha MultiPV > 175 cp) es **independiente** de F07-012; alinear con `rank_player_game` existente para críticas.

---

## 7. Cliente React

| Función | WASM (mantener) | Servidor (nuevo default) |
|---------|-----------------|---------------------------|
| Tab Motor live | Sí (baja latencia) | Opcional: poll FEN cache |
| **Posición suelta (POS-1)** | **FEN texto → tablero + live** | AS-9 analyze FEN |
| CA-2 background main line | **Deprecar** tras MVP | Job + GET annotations |
| Análisis avanzado CA-4 | Lee `positionAfterScore` de payload server | Mismo contrato JSON |
| Variantes editadas | WASM puntual o “no clasificar” v1 | Fase posterior |
| Imagen / editor tablero | — | POS-2 / POS-3 (planificado) |

Entrada por posición (UI): POS-1 FEN — planificado en Phase 2; ver [03-phase-02-analysis-in-product.md](../03-phase-02-analysis-in-product.md).

---

## 8. Infra + HITL (misma fase)

Cerrar en paralelo al piloto servidor:

- **P0-2…P0-5** (driver DB, `npm run build` CI, Alembic CI, E2E import → job → annotations).
- **CA-8** checklist firmado ([coach-classification-hitl-checklist.md](./coach-classification-hitl-checklist.md)).
- **expert_gold** borrador 10 → 30 posiciones.
- **BUG-12 / cp_loss simétrico** en Python (SV-1), no solo JS.

---

## 9. Riesgos y decisiones abiertas

| Tema | MVP | Robusto |
|------|-----|---------|
| Redis | Container local en `docker-compose` | Upstash / ElastiCache |
| Cola | BackgroundTasks aceptable si 1 worker | ARQ horizontal |
| Maia | No en MVP | Lc0 en imagen Docker + volúmenes weights |
| OpenSpec | Cambio obligatorio antes de `POST /analysis/fen` público | Sí |

---

## 10. Referencias

- Draft original (FastAPI + ARQ + Upstash): contenido base en §4–§6 de este doc.
- [coach-move-classification-pedagogy-mini-plan.md](./coach-move-classification-pedagogy-mini-plan.md) (SV-1…SV-3)
- [03-phase-02-analysis-in-product.md](../03-phase-02-analysis-in-product.md)

**Última revisión:** 2026-10-09
