# Mini-plan · Catálogo maestro `games`, naming Coach y navegador de partidas

**Estado:** ✅ GC-1 … GC-3 en repo (migración GC-2: `alembic upgrade head` desde la raíz del repo)  
**Última actualización catálogo:** 2026-10-09  
**Relacionado:** [06-phase-05-coach-ui-complete.md](../06-phase-05-coach-ui-complete.md) (UI-104+), [02-phase-01-coach-web-slice.md](../02-phase-01-coach-web-slice.md), [architecture-shared-analysis-platform.md](./architecture-shared-analysis-platform.md)  
**Regla ramas:** un ítem por branch — [roadmap-branches.mdc](../../../../.cursor/rules/roadmap-branches.mdc)

**Objetivo:** una sola **biblioteca de partidas** (`games` maestra), capa **Coach** en tablas relacionadas (hoy `module07_*`), fuente **`ANALYSIS`** para partidas importadas para estudio Coach, y **Navegador de Partidas** con borrado y filtros avanzados.

---

## Situación actual (problema)

| Hoy | Consecuencia |
|-----|----------------|
| Catálogo **legacy** `games` + API `/api/chess/games` | Menú **Partidas** |
| Capa Coach **`coach_games`** + `/api/v1/module07/*` (alias temporal) | **Coach → Partidas** |
| ~~Sin FK~~ → **GC-2:** `coach_games.master_game_id` → `games` | PGN canónico en `games` |
| Nombre **module07** en código/DB | Poco claro para producto |

**Target:**

```text
games (maestra, PK game_id)
  ├── source ∈ { lichess, chess.com, pgn, elite, …, ANALYSIS }
  └── coach_game (1:1 o 1:N por owner) → jobs, decision_points, ply_annotations
```

Rutas y paquetes de producto hablan **Coach**; tablas SQL pueden migrarse por fases (`module07_*` → `coach_*`).

---

## Principios

1. **`games` es la verdad** para PGN, jugadores, ECO, fecha, resultado, corpus, `imported_by`.
2. **Coach persiste análisis**, no otra copia canónica del PGN (salvo cache denormalizado opcional).
3. Import Coach → **upsert `games`** con `source = 'ANALYSIS'` (constante documentada).
4. API pública nueva preferible **`/api/v1/coach/*`**; `/api/v1/module07/*` alias deprecado hasta remover.
5. Borrado en navegador: respeta permisos (`view_all_games` vs solo propias); cascada definida hacia filas Coach.

---

## Catálogo de entregas (orden sugerido)

| Id | Entrega | Prioridad | Estado | Actualizado | Rama sugerida | Depende de |
|----|---------|-----------|--------|-------------|---------------|------------|
| **GC-1** | Constante `ANALYSIS` + ingest Coach escribe en `games` | P0 | ✅ Hecho | 2026-10-09 | `feature/11_130_games_source_analysis` | — |
| **GC-2** | Tabla `coach_games` (FK `games.game_id`) + lecturas Coach desde maestro | P0 | ✅ Hecho | 2026-10-09 | `feature/11_131_coach_games_fk` | GC-1 |
| **GC-3** | Cierre slim Coach: docs/código sin `module07_games`; datos huérfanos | P1 | ✅ Hecho | 2026-10-09 | `feature/11_132_coach_slim_game_row` | GC-2 |
| **GC-4** | Renombre API/rutas/código: `module07` → `coach` (alias 1 release) | P1 | ⏳ Pendiente | — | `feature/11_133_coach_api_rename` | GC-2 |
| **GC-5** | Renombre tablas SQL `module07_*` → `coach_*` (Alembic) | P2 | ⏳ Pendiente | — | `feature/11_134_coach_tables_rename` | GC-3, GC-4 |
| **UI-G1** | Borrar partida(s) desde Navegador de Partidas | P1 | ⏳ Pendiente | — | `feature/11_135_games_delete` | GC-1 |
| **UI-G2** | Filtros avanzados en Navegador (ver § Filtros) | P1 | ⏳ Pendiente | — | `feature/11_136_games_filters` | GC-1 |
| **UI-G3** | Unificar UX: Coach → Partidas lista desde `games` (+ badge análisis) | P2 | ⏳ Pendiente | — | `feature/11_137_coach_list_master_games` | GC-2, UI-G2 |

**Leyenda estado:** ✅ Hecho · 🔄 En progreso · ⏳ Pendiente · 🚫 Bloqueado

**Notas de estado (2026-10-09):**

- **GC-1:** upsert maestro, filtro ANALYSIS acotado a biblioteca Coach, `game_id` SHA-256 alineado a legacy, limpieza duplicados MD5.
- **GC-2:** tabla `coach_games`; eliminada `module07_games`; decisiones/anotaciones FK → `coach_games.id`; migración Alembic `20261010_000001`.
- **GC-3:** `coach_catalog.py`, sync renombrado, health/repair API, docs arquitectura; tabla `module07_games` solo en historial Alembic.

---

## GC-1 — Fuente `ANALYSIS`

### Alcance

- Definir en backend (p. ej. `game_import` / schemas): `SOURCE_ANALYSIS = "ANALYSIS"`.
- **Ingest Coach** (`POST …/ingest`): además de (o en lugar de) fila huérfana module07, **upsert `games`** con:
  - `source = 'ANALYSIS'`
  - `imported_by` = usuario JWT
  - `corpus_type` / `speed_class` según body ingest
- Idempotencia: mismo PGN → mismo `game_id` (regla existente legacy o hash alineado con `content_game_id`).

### Criterios de aceptación

- [x] Tras import Coach, la partida aparece en **Navegador de Partidas** filtrando fuente **ANALYSIS**.
- [x] Re-import no duplica fila maestra (upsert por `game_id` SHA-256 PGN canónico, alineado legacy).
- [x] Tests pytest `test_gc1_master_games.py` (+ manual list filtrado por source).

### Fuera de GC-1

- Renombre tablas; borrado masivo UI.

---

## GC-2 / GC-3 — Coach sobre `games`

### GC-2

- Nueva tabla `coach_games` (nombre final): `id`, `game_id` FK → `games.game_id`, `owner_user_id`, `player_username`, `player_color`, timestamps, flags (`client_analyzed_at`, … migrados desde `module07_games`).
- Jobs / annotations / decisions: FK a `coach_games.id` o directamente `game_id` + `owner_user_id` (elegir una; documentar en implementación).
- Rutas Coach resuelven PGN desde `games`.

**Estado repo (GC-2):**

- [x] Alembic `20261010_000001_gc2_coach_games`: crea `coach_games`, migra desde `module07_games`, repunta FKs de decisiones/anotaciones, elimina `module07_games`.
- [x] ORM `CoachGame` (+ alias `Module07Game`); PGN/jugadores vía `master_game` → `games`.
- [x] Ingest/repository/worker/API leen PGN del catálogo maestro.
- [x] Tests `test_gc2_coach_games.py`.
- **FK hijos:** `module07_decision_points.game_id` y `module07_ply_annotations.game_id` → `coach_games.id` (mismo UUID que antes).

### GC-3

- ~~Retirar columnas duplicadas en `module07_games`~~ *(cubierto por GC-2: fila Coach en `coach_games` sin PGN)*.
- Auditar repo/docs/tests: sin referencias operativas a `module07_games`.
- Documentar re-ingest manual si quedan filas Coach sin fila en `games` (huérfanos).

**Estado repo (GC-3):**

- [x] Módulo `modules/game_import/coach_catalog.py`: `sync_coach_library_to_master_games`, `coach_catalog_health`, `remove_coach_games_with_missing_master`.
- [x] API `GET /api/v1/module07/coach-catalog/health` y `POST …/coach-catalog/repair` (scope usuario JWT).
- [x] Docs producto (`arquitectura_candidata_servicios_analisis.md`) → `coach_games` + FKs.
- [x] Tests `test_gc3_coach_slim.py`.

**Re-import manual (PGN vacío o partida ilegible):**

1. `GET /api/v1/module07/coach-catalog/health` — si `empty_master_pgn` > 0 o `missing_master` > 0.
2. `POST /api/v1/module07/coach-catalog/repair` — elimina huérfanos Coach y re-sincroniza metadata maestro.
3. Si persiste `empty_master_pgn`: **Coach → Importar PGN** con el mismo texto PGN (upsert idempotente por hash).

---

## GC-4 / GC-5 — Naming **Coach** (ex module07)

| Capa | GC-4 (alias) | GC-5 (DB) |
|------|----------------|-----------|
| Router FastAPI | `/api/v1/coach/*` + redirect 308 desde `module07` | — |
| Python package | `modules/coach/` (re-export temporal `module07`) | — |
| Frontend service | `coachService.js` | — |
| Postgres | — | `coach_analysis_jobs`, `coach_ply_annotations`, … |

**Criterio:** documentación y UI solo dicen **Coach**; logs pueden mencionar alias una release.

---

## UI-G1 — Borrar partida(s)

### Alcance

- Tabla **Navegador de Partidas** (`GamesPage`): checkbox por fila + “Eliminar selección”.
- Confirmación modal; errores por fila si FK bloquea (mensaje claro).
- API: `DELETE /api/chess/games/{game_id}` y opcional `POST /api/chess/games/bulk-delete` `{ game_ids: [] }`.
- Permisos: no-admin solo filas con `imported_by = yo` o jugador White/Black = yo (misma regla que listado).
- Cascada: borrar `games` elimina `features` / SHAP si aplica; borrar o bloquear si existe `coach_*` activo (política: **cascade coach** al borrar maestra).

### Criterios de aceptación

- [ ] Admin borra cualquier partida listada.
- [ ] Usuario borra solo partidas permitidas; 403 en el resto.
- [ ] Tras borrar, desaparece de Coach si estaba enlazada.

---

## UI-G2 — Filtros avanzados (Navegador de Partidas)

### Campos UI

| Filtro | Comportamiento |
|--------|----------------|
| **Fuente** | Select / multi-select; incluye **ANALYSIS** |
| **Jugador blancas** | Texto; wildcard `*` → SQL `ILIKE` |
| **Jugador negras** | Idem |
| **ECO** | Exacto o prefijo (ej. `B9*`) |
| **Apertura** | Texto con wildcards en columna `opening` |
| **Fecha** | Desde / hasta (columna `date_played` o normalizada) |
| **Resultado** | Multi-select (`1-0`, `0-1`, `1/2-1/2`, `*`) |

### Lógica booleana

- Entre **dimensiones distintas** (fuente + ECO + fecha + resultado + apertura + …): **AND**.
- **Resultado** (varios valores elegidos): partida cumple **AND** (debe ser uno de los seleccionados — semántica IN, equivalente a OR sobre resultados, acotado a una dimensión).
- **Jugador blancas** y **Jugador negras**:
  - Solo **blancas** relleno → `white_player ILIKE patrón`.
  - Solo **negras** → `black_player ILIKE patrón`.
  - **Ambos** rellenos → `(white_player ILIKE blancas) OR (black_player ILIKE negras)` *(excepción acordada: no exige pareja blancas+negras simultánea)*.

### API

- Extender `GET /api/chess/games` query params (documentar en OpenAPI).
- Paginación existente (`limit`/`offset`) sin cambios.

### Criterios de aceptación

- [ ] Combinación fuente=ANALYSIS + ECO muestra subconjunto correcto.
- [ ] Wildcard apertura `*gambit*` funciona.
- [ ] Tests servicio `chess_service.get_games_list` con matrices mínimas AND/OR jugadores.

---

## UI-G3 — Coach → Partidas alineado al maestro

- Lista Coach consume **`GET /api/chess/games?source=ANALYSIS`** (o endpoint dedicado que join `coach_*`).
- Chips actuales (“Analizado liviano”, “Stockfish”) leen flags desde join Coach.
- Eliminar segunda tabla duplicada en UI cuando GC-2 esté en prod.

---

## Riesgos y decisiones abiertas

| Tema | Opciones | Recomendación MVP |
|------|----------|-------------------|
| `game_id` al import Coach | UUID legacy vs hash PGN | Reutilizar generador legacy si existe; si no, hash estable GC-1 |
| Partidas solo module07 sin `games` | Migración one-shot | Script Alembic data + nota en GC-3 |
| Borrado vs archivo | Hard delete vs soft | Hard delete GC UI-G1; soft delete → P2 |
| FEN / posiciones sueltas | No van a `games` | Siguen fuera (POS-*); no mezclar con ANALYSIS |

---

## Test plan transversal

- Pytest: ingest Coach → row en `games.source=ANALYSIS`; list + filters; delete cascade.
- Vitest: filtros UI (mock API); confirmación borrado.
- Manual: import PGN Coach → **Partidas** con filtro ANALYSIS → abrir Coach análisis → volver → chip “Analizado liviano”.

---

## Referencia rápida implementación (archivos tocados hoy)

| Área | Hoy | Tras GC-* |
|------|-----|-----------|
| Ingest | `modules/module07/ingest.py`, `repository.py`, `game_import/coach_catalog.py` | + write `games`, `modules/coach/` (GC-4) |
| Listado legacy | `services/chess_service.py`, `GamesPage.tsx` | GC-1, UI-G1, UI-G2 |
| Listado Coach | `CoachGamesPanel.jsx`, `module07Service.js` | UI-G3, GC-4 |

---

## Siguiente paso recomendado

1. Aplicar migraciones: `cd` raíz del repo → `alembic upgrade head`.
2. Siguiente ítem sugerido: **GC-4** (alias `/api/v1/coach/*`) o **UI-G1** / **UI-G2** según prioridad producto.
