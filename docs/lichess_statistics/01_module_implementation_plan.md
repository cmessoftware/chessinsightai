# Module LS01 Implementation Plan — Lichess Statistics Tool

## Objective

Implement and validate progressively a **standalone Lichess statistics tool** (not ACC, not Module 07/08, not `ai_chess_coach_course`):

```text
Lichess NDJSON (official API) or multi-game PGN file
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

**Last status update:** 2026-09-26 (LS01-023 Stockfish-first default + export eval metadata).

### Current progress

| Area | Status | Notes |
|---|---|---|
| LS01.0 NDJSON client (LS01-001) | ✅ Done | `src/lichess_statistics/client.py`; fixture `tests/lichess_statistics/fixtures/cmess4401_rapid_two_games.ndjson`. |
| LS01.0 Filters (LS01-002) | ✅ Done | `filters.py`: skip `aiLevel` / name `lichess AI *`; skip &lt;10 plies. Titled BOT kept. |
| LS01.0 Project `game_id` (LS01-003) | ✅ Done | `game_id.py` wraps `pgn_utils.get_game_id`; `lichess_id` is metadata. |
| LS01.1 SQLite schema (LS01-004) | ✅ Done | `db.py`: `games` / `evals` / `stats`; PK `game_id`; second insert is `INSERT OR IGNORE`. |
| LS01.2 Game metadata (LS01-005) | ✅ Done | `import_games.py`: user POV `G`/`T`/`P`; `ranking_final = inicial + variacion`. |
| LS01.3 Lichess cloud evals (LS01-006) | ✅ Done | `evals.py`: complete `analysis` → one row/ply, `fuente_evaluacion=lichess`. |
| LS01.3 Local Stockfish fallback (LS01-007) | ✅ Done | `StockfishAnalysisService`; `fuente_evaluacion=stockfish_local`; `--force-stockfish` flag. |
| LS01.4 POV + win% (LS01-008) | ✅ Done | `accuracy.py`: Lichess `WinPercent`; user POV; mate → ±1000 cp. |
| LS01.4 AccuracyPercent (LS01-009) | ✅ Done | `accuracy.py`: per-move + volatility/harmonic mean → `precision_general`. |
| LS01.4 Phase classifier (LS01-010) | ✅ Done | `phases.py`: NDJSON `division` → Divider port → piece-count fallback. |
| LS01.4 Judgments (LS01-011) | ✅ Done | Insight bands 10/20/30% winningChances; counts + mean eval-swing ACPL. |
| LS01.5 Export XLSX/CSV (LS01-012) | ✅ Done | `export.py`: sheet `Jugar en Lichess`; UTF-8 CSV; no macros. |
| LS01.6 CLI (LS01-013) | ✅ Done | `python -m lichess_statistics`; `--from-ndjson` cassette; `--from-pgn` **Lichess export only**; counters in logs. Token: `LICHESS_API_TOKEN` then `LICHESS_TOKEN`. |
| LS01.7 Aggregates (LS01-014) | ✅ Done | `aggregates.py`; means always carry `n` + period; CLI `stats`. |
| LS01.8 Training analyzer (LS01-017–021) | ✅ Done | LS01-017–021 portable training analyzer complete. |
| LS01.9 Report JSON i18n (LS01-022) | ⬜ Future | Layer A/B/C keys still mix Spanish (LS01-014) with English (LS01-019–021); see §01.9. |
| UI / FastAPI / ACC / F07–F08 | ❌ Canceled | Old P3; does not apply to the portable tool. |

## Principles

- One verifiable capability at a time (catalog id). Epic base: **`feature/lichess_statistics_tool`**. Item branch: **`feature/ls01_<id>_<slug>`** (example: `feature/ls01_001_ndjson_client`). Not `feature/07_*`.
- This module is **Lichess-only**. Product ingest stays generic (any source → PostgreSQL). Do not merge NDJSON parsing into `player_ingest`.
- Do not import `docs/ai_chess_coach_course/` or `analysis/mental_model/`.
- Do not write to product `games` / `features` or change `games.game_id` semantics in PostgreSQL.
- Prefer Lichess cloud evaluations; local Stockfish is fallback only. Mixing sources on the same spreadsheet without `fuente_evaluacion` is forbidden.
- Accuracy and judgments follow **Lichess win%**, not raw 50/100/300 cp and not the ML classifier.
- Never log `LICHESS_API_TOKEN` or `LICHESS_TOKEN`.
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
| Auth | `LICHESS_API_TOKEN` in `.env` (preferred; same name as the rest of the repo), then `LICHESS_TOKEN`. Optional but required for large exports / rate limits. |
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
| 01.8 | Training analyzer (portable) | Rapid/classical/daily corpus; coach/player profile; exercise candidates |

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
| LS01-003 | Project `game_id` | PGN text | SHA256 hex, stable | Same PGN → same id as `pgn_utils.get_game_id` | P0 | ✅ Done | `identity_from_ndjson`; primary key SHA256; `lichess_id` metadata. Tests: `tests/lichess_statistics/test_ls01_003_game_id.py`. Branch `feature/ls01_003_game_id`. |

### 01.1 — SQLite persistence

| ID | Feature | Input | Verifiable output | Real-game test | Priority | Status | Comments |
|---|---|---|---|---|---|---|---|
| LS01-004 | Schema and unique `game_id` | SQLite URL | Tables `games`, `evals`, `stats` | Second insert of same `game_id` is no-op | P0 | ✅ Done | `StatisticsRepository`; default `data/lichess_statistics.sqlite`. Tests: `tests/lichess_statistics/test_ls01_004_sqlite_schema.py`. Branch `feature/ls01_004_sqlite_schema`. |

### 01.2 — Game metadata

| ID | Feature | Input | Verifiable output | Real-game test | Priority | Status | Comments |
|---|---|---|---|---|---|---|---|
| LS01-005 | Per-game basics | NDJSON + PGN | Row: date, user, color, opponent, G/T/P, time control, duration, ratings, opening, ECO, move count, PGN | One win, one draw, one loss; `ranking_final = inicial + variacion` | P0 | ✅ Done | `game_row_from_ndjson` / `GameImportService`. Draw fixture `cmess4401_rapid_draw.ndjson` (`5bJcGi3M`). Tests: `tests/lichess_statistics/test_ls01_005_game_metadata.py`. Branch `feature/ls01_005_game_metadata`. |

### 01.3 — Evaluations

| ID | Feature | Input | Verifiable output | Real-game test | Priority | Status | Comments |
|---|---|---|---|---|---|---|---|
| LS01-006 | Lichess cloud evals | NDJSON `evals` | One eval row per ply when complete | Fixture with complete cloud evals → `fuente_evaluacion=lichess` | P0 | ✅ Done | `persist_cloud_evals`; incomplete / missing analysis is skipped (LS01-007). Tests: `tests/lichess_statistics/test_ls01_006_lichess_cloud_evals.py`. Branch `feature/ls01_006_lichess_cloud_evals`. |
| LS01-007 | Local Stockfish fallback | PGN without complete evals | Same ply schema; `fuente_evaluacion=stockfish_local` | Incomplete evals game analyzed locally; complete cloud game **not** reanalyzed | P0 | ✅ Done | `persist_evals`; `STOCKFISH_PATH`, depth / movetime / threads / hash. `force_stockfish` overrides cloud. Tests: `tests/lichess_statistics/test_ls01_007_stockfish_fallback.py`. Branch `feature/ls01_007_stockfish_fallback`. |

### 01.4 — Accuracy (Lichess)

| ID | Feature | Input | Verifiable output | Real-game test | Priority | Status | Comments |
|---|---|---|---|---|---|---|---|
| LS01-008 | POV + win% | cp or mate, user color | Win probability before/after each user move | White and Black fixtures; mate sign | P0 | ✅ Done | `win_percent_user_pov`; k=-0.00368208; Cp.initial=15; Python float vs JVM Double (no extra rounding). Tests: `tests/lichess_statistics/test_ls01_008_pov_winpercent.py`. Branch `feature/ls01_008_pov_winpercent`. |
| LS01-009 | AccuracyPercent | Per-move win% series | `precision_general` 0–100 | Golden vs Lichess UI/API accuracy ± documented tolerance (e.g. 1.0) | P0 | ✅ Done | Port of lila `AccuracyPercent.gameAccuracy`; not mean of phases. Tests: `tests/lichess_statistics/test_ls01_009_accuracy_percent.py`. Branch `feature/ls01_009_accuracy_percent`. UI golden ±1.0 still HITL. |
| LS01-010 | Phase classifier | Board / material per ply | `opening` / `middlegame` / `endgame` | Same game: phase labels + phase accuracies | P0 | ✅ Done | Prefer NDJSON `division`; else scalachess Divider; else `features_generator` piece-count. Tests: `tests/lichess_statistics/test_ls01_010_phase_classifier.py`. Branch `feature/ls01_010_phase_classifier`. |
| LS01-011 | Judgments | Win% drop per move | Counts: imprecisiones, errores, errores graves; `perdida_promedio_cp` | Counts match Lichess analysis page within tolerance | P0 | ✅ Done | `Advice.scala` bands on `winningChances` [-1,1]; not ML `error_label`. ACPL = mean user eval swing (Lichess UI `acpl` is vs-best; ±1 on `tOsxrK57`). Tests: `tests/lichess_statistics/test_ls01_011_judgments.py`. Branch `feature/ls01_011_judgments`. |

### 01.5 — Export

| ID | Feature | Input | Verifiable output | Real-game test | Priority | Status | Comments |
|---|---|---|---|---|---|---|---|
| LS01-012 | CSV + XLSX | Stats rows | Files open in Excel and Google Sheets; sheet `Jugar en Lichess`; column order as spec | Snapshot test of headers + one data row | P0 | ✅ Done | `ExcelStatisticsExporter`; precisions numeric 0–100; `Comentarios` empty. Tests: `tests/lichess_statistics/test_ls01_012_csv_xlsx.py`. Branch `feature/ls01_012_csv_xlsx`. |

### 01.6 — CLI

| ID | Feature | Input | Verifiable output | Real-game test | Priority | Status | Comments |
|---|---|---|---|---|---|---|---|
| LS01-013 | CLI commands | argv + `.env` | `sync`, `analyze --only-missing`, `export`; `--from-ndjson`; `--from-pgn`; download-only; `--max-games`; `--perf-type`; `--force-stockfish` | Help + dry-run on fixture (no network) | P0 | ✅ Done | `cli.py` / `service.py` / `pgn_source.py`. Token from `.env`, never logged. Tests: `test_ls01_013_cli.py`, `test_ls01_pgn_import.py`. |

### 01.7 — Aggregates

| ID | Feature | Input | Verifiable output | Real-game test | Priority | Status | Comments |
|---|---|---|---|---|---|---|---|
| LS01-014 | Aggregate queries | SQLite stats | Rating evolution; mean ACPL; mean accuracy; mean by phase; judgment counts; W/B; opening; month; period compare; last N | Fixture of ≥5 games; averages include **n** and period | P1 | ✅ Done | `AggregateQueryService`; nulls excluded from means (`n` vs `n_games`). CLI `stats`. Tests: `tests/lichess_statistics/test_ls01_014_aggregates.py`. Branch `feature/ls01_014_aggregates`. |

### 01.8 — Training analyzer (portable P3)

Corpus is **rapid + classical + daily/correspondence** only. Bullet and blitz are out of the training profile, Excel “Entrenamiento”, and ChessInsight candidate queue (they may remain in SQLite). One track at a time; do not mix 15+10 with daily. Engine eval is magnitude (`EVALUATION_DROP` 150 cp), not pedagogical labels. Do not import Module 07 / HITL / course packages. No UI.

| ID | Feature | Input | Verifiable output | Real-game test | Priority | Status | Comments |
|---|---|---|---|---|---|---|---|
| LS01-017 | Training-track filter | Stored games (`perf` / time class / exact TC) | Keep rapid, classical, daily; drop bullet/blitz; each row labeled `track` | Rapid kept; 3+2 / bullet skipped; daily kept | P3 | ✅ Done | `training_track.py`; CLI `--track` / `--training` on `stats` and `export` (not ingest). Tests: `tests/chess_statistics/test_ls01_017_training_track.py`. Branch `feature/ls01_017_training_track`. |
| LS01-018 | Layer A track report | Filtered stats rows | Aggregates by track: color, phase, opening, month (existing metrics, scoped) | Same fixture: blitz rows absent; rapid means match n | P3 | ✅ Done | `summarize_rows` layer A + `by_phase` / `by_track`. CLI `stats --track` / `--training`. Tests: `tests/chess_statistics/test_ls01_018_track_report.py`. Branch `feature/ls01_018_track_report`. |
| LS01-019 | Layer B learning events | Stored `evals` + user moves | One event per significant user ply: FEN before, SAN, eval_loss, drop≥150 cp, judgment, phase, `game_id`, URL | Known blunder ply emits drop; quiet ply does not | P3 | ✅ Done | `learning_events.py`; CLI `stats` adds `learning_events` (layer B). `only_move` omitted (no MultiPV in SQLite). Tests: `tests/chess_statistics/test_ls01_019_learning_events.py`. Branch `feature/ls01_019_learning_events`. |
| LS01-020 | Layer C profile + Entrenamiento + JSON | Layer A + B | Excel sheet `Entrenamiento` (foci + ≤8 session positions) and versioned `player_training_profile` JSON | Golden: 3 foci + candidates with `allowed_uses` | P3 | ✅ Done | `training_profile.py`; `stats --training` → `training_profile`; `--profile-out`; XLSX sheet `Entrenamiento` with `--training`. Weaknesses: frequency × criticality × recency by phase. `allowed_uses`: `explain` only. Tests: `tests/chess_statistics/test_ls01_020_training_profile.py`. Branch `feature/ls01_020_training_profile`. |
| LS01-021 | Tactical motifs + endgame signatures | Layer B positions | `tactical_motifs` from board geometry; `endgame_signature` from material when `phase=endgame` | Fork/pin fixture tagged; KRPvsKR endgame signed | P3 | ✅ Done | `motifs.py`; JSON keys in English on layer B + profile candidates. Tests: `tests/chess_statistics/test_ls01_021_motifs_endgames.py`. Branch `feature/ls01_021_motifs_endgames`. |

### 01.8b — Cross-source eval policy

| ID | Feature | Input | Verifiable output | Real-game test | Priority | Status | Comments |
|---|---|---|---|---|---|---|---|
| LS01-023 | Stockfish-first policy | sync/analyze argv | Default `force_stockfish` on all sources; `--use-lichess-cloud` opt-in on Lichess sync; export columns **Fuente eval**, **Profundidad motor**, **Versión motor** | CLI sync fixture → `stockfish_local` without flag; `--use-lichess-cloud` → `lichess` when complete | P1 | ✅ Done | `eval_policy.py`; not comparable to Lichess UI by design. Reprocess old DB with `sync --reprocess` + SF or filter export by fuente. Branch `feature/ls01_023_unified_stockfish_policy`. |

### 01.9 — Future (report JSON, English-only consumers)

Excel/CSV column headers stay **Spanish** for the player (`Jugar en Lichess`, `Entrenamiento`). Machine-readable **`stats` / `player_training_profile` JSON** should not mix Spanish field names with English (Spanglish). Layers B/C (LS01-019–021) already use English keys; **layer A (LS01-014)** still exposes Spanish names from the original spreadsheet contract.

| ID | Feature | Input | Verifiable output | Real-game test | Priority | Status | Comments |
|---|---|---|---|---|---|---|---|
| LS01-022 | English report schema v2 | Layer A + B + C payloads | `schema_version: "2"` with English keys only (e.g. `opening_accuracy`, `mean_acpl_cp`, `inaccuracies`, `results.W/D/L` or documented codes); optional `--schema 1\|2` during transition | Golden: same fixture, v1 vs v2 field map documented; v2 has zero Spanish key names | P4 | ⬜ Future | Do **not** rename SQLite columns or XLSX headers in the same change. Either emit v2 alongside v1 keys for one release or bump profile `schema_version` only. Branch `feature/ls01_022_report_json_en`. |

**Examples to migrate (v1 → v2, illustrative):**

| v1 (current) | v2 (target) |
|---|---|
| `precision_apertura` | `opening_accuracy` |
| `precision_medio_juego` | `middlegame_accuracy` |
| `precision_final` | `endgame_accuracy` |
| `perdida_promedio_cp` | `mean_acpl_cp` |
| `imprecisiones` / `errores` / `errores_graves` | `inaccuracies` / `mistakes` / `blunders` |
| `resultado` G/T/P in DB | JSON `result`: `win` / `draw` / `loss` (aggregates keep counts under English keys) |

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
├── pgn_source.py          # PGN → NDJSON-shaped games
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
- [x] LS01-003 — Project `game_id`
- [x] LS01-004 — SQLite schema
- [x] LS01-005 — Metadata G/T/P + ratings
- [x] LS01-006 — Lichess cloud evals
- [x] LS01-007 — Local Stockfish fallback
- [x] LS01-008 — POV + win%
- [x] LS01-009 — AccuracyPercent
- [x] LS01-010 — Phases
- [x] LS01-011 — Judgments + ACPL
- [x] LS01-012 — CSV/XLSX
- [x] LS01-013 — CLI sync/analyze/export

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

- [x] Commands: download-only, analyze-only, export-only, reprocess, `--max-games`.
- [x] Counters in logs (no token).
- [x] LS01-014 queries with n + period.

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

P3 (portable training analyzer; one branch per id)
17. ✅ LS01-017 Training-track filter (rapid / classical / daily; exclude blitz/bullet)
18. ✅ LS01-018 Layer A report by track (color, phase, opening, month)
19. ✅ LS01-019 Layer B learning events (drops ≥150 cp, judgments, phase, FEN)
20. ✅ LS01-020 Layer C profile + Excel “Entrenamiento” + JSON for ChessInsight
21. ✅ LS01-021 Board tactical motifs + endgame material signatures

P4 (future — one branch per id)
22. ⬜ LS01-022 English-only `stats` / training profile JSON (`schema_version` 2; layer A key map; optional dual emit during transition)

P3 discarded (does not apply to the portable tool)
- UI / API / FastAPI / ACC
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
