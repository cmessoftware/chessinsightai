"""Tests for LS01-006 — Lichess cloud evals onto evals rows."""

from __future__ import annotations

import json
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from lichess_statistics.db import StatisticsRepository, connect, init_schema  # noqa: E402
from lichess_statistics.evals import (  # noqa: E402
    FUENTE_LICHESS,
    cloud_evals_complete,
    parse_cloud_evals,
    persist_cloud_evals,
)
from lichess_statistics.import_games import GameImportService  # noqa: E402

FIXTURE_TWO = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_two_games.ndjson"
FIXTURE_DRAW = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_draw.ndjson"
USER = "cmess4401"


def _load_line(path: Path, index: int = 0) -> dict:
    lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return json.loads(lines[index])


def _repo(tmp_path: Path) -> StatisticsRepository:
    conn = connect(tmp_path / "ls.sqlite")
    init_schema(conn)
    return StatisticsRepository(conn)


def test_complete_cloud_evals_one_row_per_ply():
    game = _load_line(FIXTURE_TWO, 0)
    assert game["id"] == "tOsxrK57"
    assert cloud_evals_complete(game) is True
    rows = parse_cloud_evals(game)
    assert rows is not None
    assert len(rows) == len(game["moves"].split()) == len(game["analysis"])
    assert rows[0].evaluation_before_cp is None
    assert rows[0].evaluation_after_cp == game["analysis"][0]["eval"]
    assert rows[0].move_san == "e4"
    assert rows[0].move_uci == "e2e4"
    assert rows[13].best_move == "e8h8"
    assert rows[13].judgment == "Inaccuracy"


def test_incomplete_analysis_is_not_lichess_source(tmp_path: Path):
    game = _load_line(FIXTURE_TWO, 0)
    game = dict(game)
    game["analysis"] = game["analysis"][:-1]
    assert cloud_evals_complete(game) is False
    repo = _repo(tmp_path)
    imported = GameImportService().import_game(repo, game, USER, fallback_local=False)
    assert imported is not None
    stored = repo.get_game(imported.game_id)
    assert stored is not None
    assert stored["fuente_evaluacion"] is None
    assert repo.list_evals(imported.game_id) == []


def test_draw_fixture_without_analysis_skips_cloud(tmp_path: Path):
    game = _load_line(FIXTURE_DRAW, 0)
    assert cloud_evals_complete(game) is False
    repo = _repo(tmp_path)
    imported = GameImportService().import_game(repo, game, USER, fallback_local=False)
    assert imported is not None
    stored = repo.get_game(imported.game_id)
    assert stored is not None
    assert stored["fuente_evaluacion"] is None
    assert repo.list_evals(imported.game_id) == []


def test_import_complete_fixture_sets_fuente_lichess(tmp_path: Path):
    game = _load_line(FIXTURE_TWO, 0)
    repo = _repo(tmp_path)
    imported = GameImportService().import_game(repo, game, USER, fallback_local=False)
    assert imported is not None
    stored = repo.get_game(imported.game_id)
    assert stored is not None
    assert stored["fuente_evaluacion"] == FUENTE_LICHESS
    evals = repo.list_evals(imported.game_id)
    assert len(evals) == len(game["analysis"])
    assert evals[0]["evaluation_after_cp"] == 18
    assert evals[0]["fen"]
    again = persist_cloud_evals(repo, game, game_id=imported.game_id)
    assert again.stored is True
    assert len(repo.list_evals(imported.game_id)) == len(game["analysis"])


def test_mate_plies_keep_row_without_cp(tmp_path: Path):
    game = _load_line(FIXTURE_TWO, 1)
    assert game["id"] == "ApzutTLl"
    assert cloud_evals_complete(game) is True
    repo = _repo(tmp_path)
    imported = GameImportService().import_game(repo, game, USER, fallback_local=False)
    assert imported is not None
    stored = repo.get_game(imported.game_id)
    assert stored is not None
    assert stored["fuente_evaluacion"] == FUENTE_LICHESS
    evals = repo.list_evals(imported.game_id)
    assert len(evals) == 62
    mate_plies = [i + 1 for i, item in enumerate(game["analysis"]) if "mate" in item]
    assert mate_plies
    for ply in mate_plies:
        assert evals[ply - 1]["evaluation_after_cp"] is None
        assert evals[ply - 1]["ply"] == ply
