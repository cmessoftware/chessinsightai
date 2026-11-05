# Mini-plan · FEAT-093 estadísticas de partida en Postgres

> **Sync:** espejo de [`../deep_analysis/feat-093-chess-statistics-postgres-mini-plan.md`](../deep_analysis/feat-093-chess-statistics-postgres-mini-plan.md) (mismo contenido; este archivo permite enlaces desde `designs/`).

**Estado:** ✅ CS-1 hecho. 🔄 CS-2 en progreso. 🔄 CS-3 en progreso. CS-4 y CS-5 pendientes. FEAT-093 sigue 🔄 WIP en el tracker.  
**Actualizado:** 2026-11-02  
**Tracker:** [issues § FEAT-093](./issues-coach-move-classification-pedagogy-mini-plan.md)  
**Proceso que se conserva:** `src/chess_statistics/` (`accuracy.py`, `phases.py`, juicios). El archivo `data/chess_statistics.sqlite` era del curso suspendido ([plan LS01](../../../lichess_statistics/01_module_implementation_plan.md)).  
**Regla ramas:** un ítem de esta tabla por branch — [roadmap-branches.mdc](../../../../.cursor/rules/roadmap-branches.mdc)

**Objetivo:** el panel bajo el PGN muestra el mismo resultado que calcula `chess_statistics`, leído desde Postgres. El producto no crea ni consulta el SQLite del curso.

---

## Situación actual

| Hoy | Consecuencia |
| --- | --- |
| `GET /api/v1/module07/games/{id}/chess-statistics` abre `chess_statistics.sqlite` si el archivo existe | En Neon no hay ese archivo. El panel queda vacío. |
| SQLite del curso: tablas `games`, `evals`, `stats` | Su `games` duplica el catálogo Postgres `games`. |
| `accuracy.py`, fases y juicios | Es el cálculo a conservar. No hace falta otra fórmula. |
| Postgres `games` + `coach_games` | PGN, jugadores, resultado, ECO y ritmo ya están. `coach_games` es por dueño y trae el color. |
| `features` y `module07_ply_annotations` | Otra clasificación (ML / pedagogía del cliente). No son esta precisión. |

---

## Decisiones

1. No hay una segunda tabla de partidas. El PGN sigue en `games`.
2. La fila de estadísticas es de `coach_games.id`. Precisión, rival y ranking son del punto de vista del dueño. Dos dueños del mismo PGN no comparten la fila.
3. Se guarda también `games.game_id` para unir con el catálogo.
4. El panel sigue con los mismos campos: resultado, ritmo, rival, imprecisiones, errores, errores graves, pérdida promedio, precisión general y por fase, ranking inicial y final, fuente de la evaluación.
5. Hace falta la tabla por jugada. RPT-FEAT-07 distingue blunder propio y del rival; el resumen solo trae conteos.
6. El paquete SQLite queda congelado. Ningún camino del producto escribe `chess_statistics.sqlite`.
7. Sin fila calculada, el panel muestra el vacío. No se inventan ceros.
8. Cada ítem es una revisión Alembic sobre el host directo de Neon (sin `-pooler` en el host).
9. Resultado, ECO, apertura y fecha de la partida se leen de `games`. No se copian.

---

## Catálogo

| Id | Entrega | Estado | Rama | Depende de |
| --- | --- | --- | --- | --- |
| **CS-1** | Tablas Postgres del resumen y de las jugadas | ✅ Hecho | `est_feat_01_stat_schema` | — |
| **CS-2** | Repositorio que lee y escribe esas tablas | 🔄 En progreso | `est_feat_02_stat_repository` | CS-1 |
| **CS-3** | Calcular una partida Coach con el proceso existente y guardarla | 🔄 En progreso | `est_feat_03_stat_compute` | CS-2 |
| **CS-4** | El endpoint de FEAT-093 lee Postgres y deja de abrir SQLite | ⏳ Pendiente | `feature/11_093_cs4_stat_panel_pg` | CS-2 |
| **CS-5** | Job para calcular las partidas del usuario que todavía no tienen fila | ⏳ Pendiente | `feature/11_093_cs5_stat_backfill` | CS-3 |

**Orden:** CS-1, CS-2. Después CS-3 y CS-4 pueden ir en paralelo. CS-5 cierra el lote. Hasta que CS-3 o CS-5 escriban la fila, el panel dice que esa partida todavía no tiene estadísticas.

**Leyenda:** ✅ Hecho · 🔄 En progreso · ⏳ Pendiente

---

## CS-1 — Tablas

### `coach_game_statistics`

Una fila por `coach_games.id`.

| Columna | Uso |
| --- | --- |
| `coach_game_id` | FK `coach_games.id` ON DELETE CASCADE, única |
| `master_game_id` | FK `games.game_id` |
| `player_username`, `player_color`, `opponent` | Punto de vista de quien se analiza |
| `speed_class` | El ritmo con el que se calculó |
| `initial_rating`, `rating_change`, `final_rating` | No están en `games` (ahí solo hay Elo de cabecera) |
| `inaccuracies`, `mistakes`, `blunders` | Conteos del proceso |
| `average_cp_loss` | |
| `accuracy`, `opening_accuracy`, `middlegame_accuracy`, `endgame_accuracy` | |
| `evaluation_source`, `stockfish_version`, `stockfish_depth` | De dónde salió la eval |
| `analyzed_at` | |

### `coach_game_statistic_evals`

PK `(coach_game_id, ply)`. FK `coach_games.id` ON DELETE CASCADE.

Por jugada: `fen`, `move_uci`, `move_san`, evaluación antes y después en cp, `best_move`, `cp_loss`, probabilidad de ganar antes y después, `move_accuracy`, `judgment`, `phase`, `played_by` (`white` o `black`).

Índice en `master_game_id` del resumen, para los reportes que agrupen por partida del catálogo.

---

## CS-2 — Repositorio

Sesión SQLAlchemy del API. Operaciones: leer el resumen por `coach_game_id`, reemplazar el resumen y reemplazar las jugadas de esa partida Coach. Los tests no llaman a `sqlite3` ni a `connect()` de `chess_statistics.db`.

---

## CS-3 — Cálculo de una partida

Entrada: el PGN de `games` vía `coach_games.master_game_id`. El punto de vista es `player_color` y `player_username` de esa fila Coach.

Se reutilizan `chess_statistics.accuracy`, `phases` y las bandas de juicio. El resultado se guarda con CS-2.

La evaluación sigue el orden del curso: el análisis que ya trae la exportación (Lichess u otra) y, si no alcanza, Stockfish local. La clasificación WASM guardada en `module07_ply_annotations` no es esta precisión y no se usa como fuente.

---

## CS-4 — Panel

`lookup_chess_statistics` deja de usar `CHESS_STATISTICS_DB` y el archivo sqlite.

`GET /api/v1/module07/games/{id}/chess-statistics` responde el mismo JSON `{available, found, fields[]}`.

- `available` es verdadero cuando el esquema existe.
- `found` es falso cuando esa partida Coach todavía no tiene fila.
- El acordeón de React no cambia de campos.
- Texto vacío: «Esta partida todavía no tiene estadísticas.»

---

## CS-5 — Biblioteca del usuario

Un job recorre las partidas Coach del dueño que no tienen fila. Es idempotente. Un fallo en una partida no frena el resto. No bloquea la tabla Partidas.

---

## Fuera de este plan

- RPT-FEAT-03 … RPT-FEAT-08. Cuando existan, leen estas tablas. No se implementan acá.
- Copiar el SQLite del curso a Neon.
- Seguir usando `python -m chess_statistics` como camino del producto.
- Cambiar la fórmula de precisión.
- Renombrar `module07_*` (DB-FEAT-02 … DB-FEAT-04).

---

## Aceptación de FEAT-093

En el entorno Postgres, el panel bajo el PGN muestra precisión, fases, imprecisiones, errores y errores graves de esa partida Coach cuando el cálculo ya corrió. No hace falta un archivo sqlite. Una partida sin cálculo muestra el vacío, no ceros y no la fila de otra persona.
