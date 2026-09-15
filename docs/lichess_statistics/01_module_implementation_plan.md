# Module LS01 Implementation Plan — Lichess Statistics Tool

## Objective

Implement and validate progressively a **standalone Lichess statistics tool** (not ACC, not Module 07/08, not `ai_chess_coach_course`):

```text
Lichess NDJSON (official API)
→ filter (no Lichess AI, ≥10 moves)
→ project game_id (SHA256 of PGN)
→ SQLite (tool-owned)
→ Lichess cloud evals (Stockfish local only if missing/incomplete)
→ win% + AccuracyPercent (Lichess algorithm)
→ per-game metrics
→ CSV / XLSX (“Jugar en Lichess”)
→ aggregate queries (not a second eval engine)
```

Source requirement: [`docs/lichess_statistics_tool.md`](../lichess_statistics_tool.md).

**Last status update:** 2026-09-15 (LS01-002 done).

### Current progress

| Area | Status | Notes |
|---|---|---|
| LS01.0 NDJSON client (LS01-001) | ✅ Done | `src/lichess_statistics/client.py`; fixture `tests/lichess_statistics/fixtures/cmess4401_rapid_two_games.ndjson`. |
| LS01.0 Filters (LS01-002) | ✅ Done | `filters.py`: skip `aiLevel` / name `lichess AI *`; skip &lt;10 plies. Titled BOT kept. |
| LS01.0 Project `game_id` (LS01-003) | ⬜ Todo | SHA256 of PGN as in `get_game_id` (`src/modules/pgn_utils.py`). Store Lichess `id` only as metadata. |
| LS01.1 SQLite schema (LS01-004) | ⬜ Todo | Separate file; not `course_data.sqlite`, not product PostgreSQL `games`/`features`. |
| LS01.2 Game metadata (LS01-005) | ⬜ Todo | G/T/P, ratings, ECO, clocks, opening. |
| LS01.3 Lichess cloud evals (LS01-006) | ⬜ Todo | Prefer API `evals=true`. |
| LS01.3 Local Stockfish fallback (LS01-007) | ⬜ Todo | Only when cloud evals missing or incomplete. |
| LS01.4 POV + win% (LS01-008) | ⬜ Todo | Player-perspective cp/mate → win probability (Lichess). |
| LS01.4 AccuracyPercent (LS01-009) | ⬜ Todo | Port public Lichess algorithm; overall ≠ mean of phases. |
| LS01.4 Phase classifier (LS01-010) | ⬜ Todo | Replaceable component; Lichess divider preferred over piece-count fallback. |
| LS01.4 Judgments (LS01-011) | ⬜ Todo | Inaccuracy / mistake / blunder from Lichess win% insight, not ML `error_label`. |
| LS01.5 Export XLSX/CSV (LS01-012) | ⬜ Todo | Sheet `Jugar en Lichess`; fixed column order. |
| LS01.6 CLI (LS01-013) | ⬜ Todo | `sync` / `analyze` / `export`; `LICHESS_TOKEN` from `.env`. |
| LS01.7 Aggregates (LS01-014) | ⬜ Todo | Queries over stored stats; no extra engine. |
| UI / FastAPI / ACC / F07–F08 | ❌ Canceled | Out of this epic. |

## Principles

- One verifiable capability at a time (catalog id). Epic base: **`feature/lichess_statistics_tool`**. Item branch: **`feature/ls01_<id>_<slug>`** (example: `feature/ls01_001_ndjson_client`). Not `feature/07_*`.
- This module is **Lichess-only**. Product ingest stays generic (any source → PostgreSQL). Do not merge NDJSON parsing into `player_ingest`.
- Do not import `docs/ai_chess_coach_course/` or `analysis/mental_model/`.
- Do not write to product `games` / `features` or change `games.game_id` semantics in PostgreSQL.
- Prefer Lichess cloud evaluations; local Stockfish is fallback only. Mixing sources on the same spreadsheet without `fuente_evaluacion` is forbidden.
- Accuracy and judgments follow **Lichess win%**, not raw 50/100/300 cp and not the ML classifier.
- Never log `LICHESS_TOKEN`.
- No UI in this epic.
- Aggregates are SQL/services over persisted rows, not a second analysis engine.
- Tests must not call the live Lichess API (NDJSON fixtures).

## Locked decisions (2026-09-12)

| Topic | Decision |
|---|---|
| Identity | Project `game_id` = SHA256 of PGN (same helper as the rest of the repo). Lichess `GameId` is optional metadata, not the primary key. |
| Database | Dedicated SQLite file for this tool (CLI `--database`, default under `data/`). |
| Isolation | Separate Python package + tests. Exclusive Lichess statistics epic. |
| Accuracy | Lichess `AccuracyPercent` (win%, volatility-weighted mean, harmonic mean, average of both). |
| Eval source | Lichess cloud first; local Stockfish if incomplete. |
| Auth | `LICHESS_TOKEN` in `.env`, optional but required for large exports / rate limits. |
| Git | `feature/lichess_statistics_tool`. |
| Filters | Skip Lichess AI opponents and games with fewer than 10 moves. |

## 1. Module breakdown

| Submodule | Responsibility | Deliverable |
|---|---|---|
| 01.0 | NDJSON client, filters, `game_id` | Streamed games, no AI / short games, SHA256 ids |
| 01.1 | Persistence | SQLite: games, evals, stats; unique `game_id` |
| 01.2 | Metadata | Rating, G/T/P, opening, clocks |
| 01.3 | Evaluations | Cloud evals + local fallback + `fuente_evaluacion` |
| 01.4 | Accuracy | win%, AccuracyPercent, phases, judgments |
| 01.5 | Export | CSV + XLSX Excel/Sheets-safe |
| 01.6 | CLI | sync / analyze / export / limit / force-local |
| 01.7 | Aggregates | Rating, ACPL, precision, color, opening, month, last N |

## 2. Feature catalog

### Status legend

| Status | Meaning |
|---|---|
| ⬜ Todo | Not started (default) |
| 🟡 In Progress | Implementation underway |
| 🧪 In Testing | Implemented; under validation |
| ❌ Canceled | Out of scope or superseded |
| ✅ Done | Completed and accepted |

### 01.0 — NDJSON client and identity

| ID | Feature | Input | Verifiable output | Real-game test | Priority | Status | Comments |
|---|---|---|---|---|---|---|---|
| LS01-001 | Lichess NDJSON client | username, since/until, perfType | Stream of game objects (`id`, pgn, players, evals…) | Fixture NDJSON `cmess4401` rapid | P0 | ✅ Done | `LichessClient.iter_user_games`; official `GET /api/games/user/{user}`; `Accept: application/x-ndjson`; `clocks`/`evals`/`opening`; timeout; retries; HTTP 429 wait ≥60s. Tests: `tests/lichess_statistics/test_ls01_001_ndjson_client.py`. Branch `feature/ls01_001_ndjson_client`. |
| LS01-002 | Import filters | NDJSON game | Keep / skip + reason | AI bot game skipped; 8-move game skipped; 40-move human kept | P0 | ✅ Done | `filter_import_game`; reasons `lichess_ai` / `too_short`; ply count from `moves` or PGN. Tests: `tests/lichess_statistics/test_ls01_002_import_filters.py`. Branch `feature/ls01_002_import_filters`. |
| LS01-003 | Project `game_id` | PGN text | SHA256 hex, stable | Same PGN → same id as `pgn_utils.get_game_id` | P0 | ⬜ Todo | Primary key in SQLite. Persist `lichess_id` separately if present. |

### 01.1 — SQLite persistence

| ID | Feature | Input | Verifiable output | Real-game test | Priority | Status | Comments |
|---|---|---|---|---|---|---|---|
| LS01-004 | Schema and unique `game_id` | SQLite URL | Tables `games`, `evals`, `stats` | Second insert of same `game_id` is no-op | P0 | ⬜ Todo | Tool-owned SQLite. No Alembic on product Postgres. Schema created by the module. |

### 01.2 — Game metadata

| ID | Feature | Input | Verifiable output | Real-game test | Priority | Status | Comments |
|---|---|---|---|---|---|---|---|
| LS01-005 | Per-game basics | NDJSON + PGN | Row: date, user, color, opponent, G/T/P, time control, duration, ratings, opening, ECO, move count, PGN | One win, one draw, one loss; `ranking_final = inicial + variacion` | P0 | ⬜ Todo | Result from **user** POV: `G` / `T` / `P`. |

### 01.3 — Evaluations

| ID | Feature | Input | Verifiable output | Real-game test | Priority | Status | Comments |
|---|---|---|---|---|---|---|---|
| LS01-006 | Lichess cloud evals | NDJSON `evals` | One eval row per ply when complete | Fixture with complete cloud evals → `fuente_evaluacion=lichess` | P0 | ⬜ Todo | Uniform config snapshot stored (engine name/version if present). |
| LS01-007 | Local Stockfish fallback | PGN without complete evals | Same ply schema; `fuente_evaluacion=stockfish_local` | Incomplete evals game analyzed locally; complete cloud game **not** reanalyzed | P0 | ⬜ Todo | `STOCKFISH_PATH`, depth / movetime / threads / hash from config. `--force-stockfish` overrides. |

### 01.4 — Accuracy (Lichess)

| ID | Feature | Input | Verifiable output | Real-game test | Priority | Status | Comments |
|---|---|---|---|---|---|---|---|
| LS01-008 | POV + win% | cp or mate, user color | Win probability before/after each user move | White and Black fixtures; mate sign | P0 | ⬜ Todo | Document any rounding vs Lichess Scala. |
| LS01-009 | AccuracyPercent | Per-move win% series | `precision_general` 0–100 | Golden vs Lichess UI/API accuracy ± documented tolerance (e.g. 1.0) | P0 | ⬜ Todo | cp→win%; per-move accuracy; volatility-weighted mean; harmonic mean; average of both. **Not** the mean of opening/middle/end. |
| LS01-010 | Phase classifier | Board / material per ply | `opening` / `middlegame` / `endgame` | Same game: phase labels + phase accuracies | P0 | ⬜ Todo | Port Lichess divider; piece-count (`features_generator`) only as documented fallback. Independent component. |
| LS01-011 | Judgments | Win% drop per move | Counts: imprecisiones, errores, errores graves; `perdida_promedio_cp` | Counts match Lichess analysis page within tolerance | P0 | ⬜ Todo | Lichess Insight / win% bands, not ML `error_label`. |

### 01.5 — Export

| ID | Feature | Input | Verifiable output | Real-game test | Priority | Status | Comments |
|---|---|---|---|---|---|---|---|
| LS01-012 | CSV + XLSX | Stats rows | Files open in Excel and Google Sheets; sheet `Jugar en Lichess`; column order as spec | Snapshot test of headers + one data row | P0 | ⬜ Todo | Precisions numeric 0–100. No macros. `Comentarios` may be empty. |

### 01.6 — CLI

| ID | Feature | Input | Verifiable output | Real-game test | Priority | Status | Comments |
|---|---|---|---|---|---|---|---|
| LS01-013 | CLI commands | argv + `.env` | `sync`, `analyze --only-missing`, `export`; download-only; analyze-only; reprocess game/period; `--max-games`; `--perf-type`; `--force-stockfish` | Help + dry-run on fixture (no network) | P0 | ⬜ Todo | Adapt module path to repo (`src/lichess_statistics`, argparse like other scripts). `LICHESS_TOKEN` from env. Logs: downloaded/new/skipped/lichess-analyzed/local-analyzed/errors/timings. |

### 01.7 — Aggregates

| ID | Feature | Input | Verifiable output | Real-game test | Priority | Status | Comments |
|---|---|---|---|---|---|---|---|
| LS01-014 | Aggregate queries | SQLite stats | Rating evolution; mean ACPL; mean accuracy; mean by phase; judgment counts; W/B; opening; month; period compare; last N | Fixture of ≥5 games; averages include **n** and period | P1 | ⬜ Todo | Read-only over stored metrics. |

## 3. Per-feature test format

Each feature must have at least one test from a **real Lichess game** (or an official-shaped NDJSON fixture derived from one).

| Field | Description |
|---|---|
| `feature_id` | Catalog id (`LS01-009`, …) |
| `case_id` | Stable case identifier |
| `game_id` | Project SHA256 `game_id` |
| `lichess_id` | Lichess id in the fixture (metadata) |
| `ndjson_source` | Path under `tests/lichess_statistics/fixtures/` |
| `player` | Analyzed username |
| `player_color` | `WHITE` or `BLACK` |
| `expected_result` | Numbers or flags |
| `actual_result` | Algorithm result |
| `tolerance` | Documented (e.g. accuracy ±1.0) |
| `status` | `PASS`, `FAIL`, or `NEEDS_REVIEW` |
| `notes` | Rounding / cloud vs local |

### Example

```json
{
  "feature_id": "LS01-009",
  "case_id": "LS01-009-001",
  "game_id": "<sha256>",
  "lichess_id": "abcdefgh",
  "ndjson_source": "tests/lichess_statistics/fixtures/cmess4401_rapid_one_game.ndjson",
  "player": "cmess4401",
  "player_color": "WHITE",
  "expected_result": {
    "precision_general": 72.0,
    "fuente_evaluacion": "lichess"
  },
  "actual_result": {},
  "tolerance": {"precision_general": 1.0},
  "status": "NEEDS_REVIEW",
  "notes": "Values from Lichess analysis page; not bitwise equal to cloud eval JSON."
}
```

## 4. Documentation and code structure

```text
docs/lichess_statistics/
├── 01_module_implementation_plan.md    ← this file
└── (later) decisions.md

docs/lichess_statistics_tool.md         ← original requirement

src/lichess_statistics/                 ← new package (not under course, not player_ingest)
├── __main__.py
├── client.py              # LS01-001
├── filters.py             # LS01-002
├── game_id.py             # LS01-003 (wrap/reuse pgn_utils.get_game_id)
├── db.py                  # LS01-004
├── import_games.py        # LS01-005
├── evals.py               # LS01-006 / 007
├── accuracy.py            # LS01-008 / 009 / 011
├── phases.py              # LS01-010
├── export.py              # LS01-012
├── cli.py                 # LS01-013
└── aggregates.py          # LS01-014

tests/lichess_statistics/
├── fixtures/*.ndjson
└── test_ls01_*.py

data/lichess_statistics.sqlite          # local only; gitignored
```

## 5. First implementable increment

### Goal

Minimal vertical slice on real Lichess games:

```text
NDJSON fixture
→ filter
→ SHA256 game_id
→ SQLite
→ cloud evals (or local fallback)
→ AccuracyPercent
→ XLSX sheet “Jugar en Lichess”
```

### Included features

- [x] LS01-001 — NDJSON client
- [x] LS01-002 — Filters
- [ ] LS01-003 — Project `game_id`
- [ ] LS01-004 — SQLite schema
- [ ] LS01-005 — Metadata G/T/P + ratings
- [ ] LS01-006 — Lichess cloud evals
- [ ] LS01-007 — Local Stockfish fallback
- [ ] LS01-008 — POV + win%
- [ ] LS01-009 — AccuracyPercent
- [ ] LS01-010 — Phases
- [ ] LS01-011 — Judgments + ACPL
- [ ] LS01-012 — CSV/XLSX
- [ ] LS01-013 — CLI sync/analyze/export

### Out of scope for this increment

- ACC / FastAPI / Streamlit / any UI
- Modules 07 and 08
- `docs/ai_chess_coach_course`
- Product PostgreSQL ingest
- Chess.com
- Lc0
- LLM
- LS01-014 aggregates (P1 after the XLSX path works)

## 6. Implementation phases

### Phase 1 — Contracts and fixtures

- [ ] Freeze DTOs (game row, eval row, stats row).
- [ ] Add NDJSON fixtures (at least one full game with cloud evals; one AI skip; one short skip).
- [ ] Record expected G/T/P, ratings, and Lichess accuracy for one golden game.

**Completion criterion:** tests describe expected stats without the live API.

### Phase 2 — Client, filters, identity, SQLite

- [ ] Stream NDJSON with retries / 429.
- [ ] Apply AI and move-count filters.
- [ ] Compute project `game_id`.
- [ ] Insert into SQLite; second run skips duplicates.

**Completion criterion:** `sync` on a fixture (or recorded cassette) is incremental and does not duplicate `game_id`.

### Phase 3 — Evals

- [ ] Parse Lichess evals onto plies.
- [ ] Fallback Stockfish with `fuente_evaluacion`.
- [ ] Do not reanalyze complete cloud games.

**Completion criterion:** mixed fixture set labels `lichess` vs `stockfish_local` correctly.

### Phase 4 — Accuracy and export

- [ ] win% + AccuracyPercent + phases + judgments.
- [ ] Overall accuracy ≠ mean of three phases.
- [ ] XLSX columns in spec order; Excel/Sheets-safe.

**Completion criterion:** golden game accuracy within documented tolerance; spreadsheet opens.

### Phase 5 — CLI, observability, aggregates

- [ ] Commands: download-only, analyze-only, export-only, reprocess, `--max-games`.
- [ ] Counters in logs (no token).
- [ ] LS01-014 queries with n + period.

**Completion criterion:** `cmess4401` rapid window can be synced, analyzed, and exported twice without duplicate rows.

## 7. First-increment acceptance criteria

- [ ] Downloads (or fixture-replays) games for `cmess4401`.
- [ ] Second run does not duplicate `game_id` or reanalyze complete games.
- [ ] Games without Lichess evals can be analyzed with local Stockfish.
- [ ] Metrics use the user’s color (White and Black).
- [ ] Overall precision is not the average of the three phases.
- [ ] Four precision columns export as 0–100 numbers.
- [ ] Initial and final rating are correct (`final = initial + delta`).
- [ ] XLSX opens in Excel and Google Sheets.
- [ ] Automated tests pass without the live API.
- [ ] Product ingest, ACC, and Module 07/08 behavior is unchanged.

## 8. Priority order

```text
P0
1. NDJSON client + fixtures
2. Filters (AI, <10 moves)
3. Project game_id
4. SQLite
5. Metadata (G/T/P, ratings)
6. Lichess cloud evals
7. Local Stockfish fallback
8. win% + AccuracyPercent
9. Phases + judgments
10. XLSX / CSV
11. CLI + .env token

P1
12. Aggregates (n + period)
13. Period comparison / last N
14. Reprocess one game or date range (if not in P0 CLI)

P2
15. Extra perf types / rated-only polish
16. Richer comments column

P3
17. UI / API (explicitly out of this epic)
```

## 9. Decision on existing code

Do **not** implement this epic by growing:

```text
src/modules/fetch_games.py
src/modules/player_ingest.py
src/db/models/games.py
src/db/models/features.py
docs/ai_chess_coach_course/
```

| Existing piece | Use |
|---|---|
| `pgn_utils.get_game_id` | Reuse for LS01-003 (or a thin wrapper that calls it). |
| `STOCKFISH_PATH` / `chess.engine` | Fallback evals only. |
| `fetch_lichess_games` | **Do not** call for this module; write `LichessClient` against NDJSON. |
| `features.phase` piece-count | Fallback only, documented. |
| `error_label` / ML | Do not use for Excel judgments. |
| Course `normalize_for_player` | Reimplement POV/win% next to AccuracyPercent (Lichess formulas), do not import the course package. |

Components to add (requirement names):

```text
LichessClient
GameImportService
StockfishAnalysisService
PhaseClassifier
LichessAccuracyCalculator
GameStatisticsService
StatisticsRepository
ExcelStatisticsExporter
```

Keep business logic out of the CLI entrypoint. Keep export independent of HTTP. Keep SQL in the repository. No Lichess website scraping.
