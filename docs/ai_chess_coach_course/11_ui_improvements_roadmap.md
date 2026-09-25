# UI Improvements Roadmap

> **Hub global:** [00_roadmap_index.md](./00_roadmap_index.md)

**Stack:** React 19 + Vite + MUI · FastAPI · PostgreSQL  
**Related:** [08_mvp_product_roadmap.md](./08_mvp_product_roadmap.md) (M11 shell, Coach S0) · [LS01](../lichess_statistics/01_module_implementation_plan.md) (statistics schema & metrics source of truth)

**Default priority:** **P1** for all items below unless marked **P2 (prioridad media)**.

**Branch rule:** one catalog id per branch — `feature/11_<id>_<short_slug>`.

**Hub / estado:** [00_roadmap_index.md](./00_roadmap_index.md) · **Last updated:** 2026-09-25.

**Status legend:** **🧪 In Testing** = código en dev, sin validación ajedrecística/HITL. **✅** solo infra/UI no ajedrez. No usar ✅ en flujos Coach hasta gates en status doc.

---

## Product requirements (source)

Unless noted otherwise, **priority 1**.

### 1 — Importación de partidas

| # | Requirement |
|---|-------------|
| **1.1** | Copy & paste de PGN en text box. |
| **1.2** | Upload de archivo PGN (explorador de archivos). |
| **1.3** | Upload de archivo PGN (drag & drop). |
| **—** | Elegir **tipo de corpus**: `personal`, `elite`, `fide`, `novice`, `stockfish`. |
| **1.4** | Importación desde **Chess.com** — filtros: usuario, desde fecha, tipo de partida (todas, daily, **classic**, rapid, blitz, bullet). |
| **1.5** | Importación desde **Lichess** — mismos filtros que 1.4. |

**Nota de datos:** el **tipo de partida** (speed class) debe ser **columna persistida en `games`** (y filtros en UI/API).

### 2 — Modernización del tablero genérico

Reutilizable en partidas, vs motor, análisis y puzzles. **Diseño: [Chessground](https://github.com/lichess-org/chessground)** (look & feel Lichess).

| # | Requirement |
|---|-------------|
| **2.1** | Vista **normal**: tablero a la izquierda, listado de jugadas a la derecha. |
| **2.1** | Vista **pantalla completa**: tablero maximizado; jugadas ocultas (toggle/drawer). |

### 3 — Carga de posiciones

| # | Requirement | Priority |
|---|-------------|----------|
| **3.1** | FEN pegado en text box. | P1 |
| **3.2** | Posiciones armadas a mano en el tablero. | **P2** |
| **3.3** | Carga desde **imagen** de tablero (investigar OSS tipo ChessVision). | **P2** |

### 4 — Reportes

| # | Requirement |
|---|-------------|
| **4.1** | Replicar dashboard de **lichess_statistics** (LS01) en la UI producto. |

---

## Locked decisions (§7 — 2026-09-24)

| Id | Topic | Decision |
|----|--------|----------|
| **7.1** | Import UX | **Single import page** unifying Coach ingest + legacy `games` (one hub; one backend contract over time). |
| **7.2** | Corpus type | **`personal` by default** for normal users; **`elite` / `fide` / `novice` / `stockfish` — admin only**. |
| **7.3** | Site auth | **Lichess:** API token required for sync (`LICHESS_API_TOKEN` / server config). **Chess.com:** **no token** required to download public games (username + filters). |
| **7.4** | Board library | **Chessground** (not `react-chessboard` as long-term default). |
| **7.5** | Reports data | **Replicate LS01 SQLite schema in PostgreSQL** (same logical model: games / evals / stats + aggregates); React dashboard reads product DB via API — no browser SQLite. |
| **7.6** | Session vs chess identity | **JWT / session user** = `owner_user_id` (future: saved filters, analyzed games, puzzles). **Chess handle** = chosen at **analysis queue** time (PGN `[White]`/`[Black]` or site username) — **not** at import; not tied to login. |
| **7.7** | Sign-in | **Google OAuth** (or equivalent) for session login — roadmap **UI-108**; keep username/password JWT until OAuth ships. |

---

## Current baseline (2026-09-24)

| Area | Today | Gap |
|------|--------|-----|
| Import | Coach: paste only; legacy `ImportPage`: file + DnD → `games` | Single page; corpus + speed; site sync |
| `games` table | `source` string | Missing **`corpus_type`**, **`speed_class`** |
| Board | `SimpleChessBoard` vs `ChessinsightBoard` | Chessground + shared layouts |
| FEN | Ad hoc | UI-301 |
| Reports | LS01 CLI + SQLite | Postgres LS01 model + UI-401 |

---

## 1. Game import — implementation catalog

**Data model (Alembic):**

- **`games`** (and metadata on ingest into **`module07_games`** where applicable):
  - `corpus_type` — `personal` \| `elite` \| `fide` \| `novice` \| `stockfish`
  - `speed_class` — `all` (filter only) \| `daily` \| `classical` \| `rapid` \| `blitz` \| `bullet` \| `unknown`  
    (UI label “classic” = **`classical`** in DB/API.)
  - `source` — provenance: `lichess`, `chesscom`, `pgn_upload`, …
- RBAC: non-admin imports force `corpus_type = personal` (7.2).

| Id | Maps to | Acceptance | Status |
|----|---------|------------|--------|
| **UI-101** | 1.1 | PGN paste; multi-game; **no player at import**; POV at analysis (7.6) | 🧪 `/import` |
| **UI-102** | 1.2 | File picker → same ingest as 1.1 | 🧪 UnifiedImportPage |
| **UI-103** | 1.3 | DnD (e.g. `react-dropzone`) on unified import page | 🧪 UnifiedImportPage |
| **UI-104** | corpus | Selector; admin sees all types; persist + filter on Games | 🧪 DB + API; Games filter ⬜ |
| **UI-105** | 1.4 | Chess.com job: user, since date, speed filter; no user token (7.3) | ⬜ |
| **UI-106** | 1.5 | Lichess job: same filters; server token (7.3) | ⬜ |
| **UI-107** | 7.1 | **Unified Import page** + API contract; Module 07 queue + `games` row where needed | 🧪 `/import`; legacy at `/import/legacy` |

**Order:** UI-107 (shell) → UI-104 + migration → UI-101 widen → UI-102 → UI-103 → UI-105 ‖ UI-106.

---

## 2. Board — implementation catalog

**Locked:** Chessground (7.4).

| Id | Maps to | Acceptance | Status |
|----|---------|------------|--------|
| **UI-201** | spike | Chessground + `chess.js`; FEN, moves, orientation | ⬜ |
| **UI-202** | — | Shared `ChessinsightBoard` (Chessground); retire `SimpleChessBoard` in product | ⬜ |
| **UI-203** | 2.1 normal | Board left, moves right | ⬜ |
| **UI-204** | 2.1 fullscreen | Fullscreen; moves hidden by default | ⬜ |
| **UI-205** | — | Migrate Partidas, Stockfish, puzzles, Coach review | ⬜ |
| **UI-206** | — | Update [ui/chessinsight_board/CONTRACT.md](./ui/chessinsight_board/CONTRACT.md) | ⬜ |

---

## 3. Load position — implementation catalog

| Id | Maps to | Priority | Status |
|----|---------|----------|--------|
| **UI-301** | 3.1 | P1 | ⬜ |
| **UI-302** | 3.2 | P2 | ⬜ |
| **UI-303** | 3.3 | P2 — research OSS scanners | ⬜ |

---

## 4. Reports — implementation catalog

**Locked:** Postgres schema aligned with LS01 SQLite (7.5). Reference: LS01 `games` / `evals` / `stats` in [`lichess_statistics` package](../../src/lichess_statistics/) and [01_module_implementation_plan.md](../lichess_statistics/01_module_implementation_plan.md).

| Id | Maps to | Acceptance | Status |
|----|---------|------------|--------|
| **UI-404** | 7.5 | Alembic: LS01-equivalent tables in PostgreSQL; migration path from portable SQLite optional | ⬜ |
| **UI-405** | 7.5 | Port/adapt LS01 pipeline steps to write Postgres (or ETL job from NDJSON/PGN ingest) | ⬜ |
| **UI-401** | 4.1 | React dashboard parity with LS01 UI (screenshot reference in design folder) | ⬜ |
| **UI-402** | — | Filters: player, date range, speed_class, corpus_type | ⬜ |
| **UI-403** | — | Export PDF/link | P2 |

**Order:** UI-404 → UI-405 → UI-401 → UI-402.

---

## 5. Auth & session (P1)

| Id | Maps to | Acceptance | Status |
|----|---------|------------|--------|
| **UI-108** | 7.7 | Google Sign-In (OAuth2) → JWT session; link to existing `owner_user_id`; optional profile (display name, email) | ⬜ |

**Today:** username/password JWT for dev and early MVP. Session scopes all Module 07 rows by `owner_user_id`; import always sends `player_username` for POV (7.6).

---

## 6. Cross-cutting (P1)

| Id | Item |
|----|------|
| **UI-501** | Frontend `/api/*` path audit (ongoing) |
| **UI-502** | Nav: single **Import** entry (7.1); Coach **cola masiva** `/coach/jobs`; **análisis 1 partida** `/coach/games/:id/analysis` (MultiPV estilo Lichess) |
| **UI-503** | Dev ergonomics: `scripts/start_coach_dev.ps1` |

---

## 7. Priority summary

| Priority | Scope |
|----------|--------|
| **P1** | §1 (UI-101–107), §2 (UI-201–206), UI-301, §4 (UI-404, UI-405, UI-401, UI-402), **UI-108**, UI-501–503 |
| **P2** | UI-302, UI-303, UI-403 |

---

## 8. Traceability to M11 / F11

| Catalog | [08_mvp_product_roadmap.md](./08_mvp_product_roadmap.md) |
|---------|----------------------------------------------------------|
| UI-101–107 | **F11-002** import / sync |
| UI-201–206 | **F11-006** + all board surfaces |
| UI-401–405 | New **F11-007** (statistics dashboard + PG schema) when promoted |
| UI-108 | **F11-008** (Google OAuth session) when promoted |
| UI-501–503 | **F11-004**, **F11-005** |

Promote UI ids to official **F11-00x** rows in doc 08 when starting implementation.
