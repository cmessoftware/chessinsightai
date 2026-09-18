"""Tests for LS01-008 — user POV win% from cp/mate (Lichess formula)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from lichess_statistics.accuracy import (  # noqa: E402
    CP_CEILING,
    CP_INITIAL,
    is_user_move_ply,
    win_percent_from_cp,
    win_percent_from_mate,
    win_percent_user_pov,
)
from lichess_statistics.db import StatisticsRepository, connect, init_schema  # noqa: E402
from lichess_statistics.import_games import COLOR_BLACK, COLOR_WHITE, GameImportService  # noqa: E402

FIXTURE_TWO = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_two_games.ndjson"
USER = "cmess4401"


def _load_line(path: Path, index: int = 0) -> dict:
    lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return json.loads(lines[index])


def _repo(tmp_path: Path) -> StatisticsRepository:
    conn = connect(tmp_path / "ls.sqlite")
    init_schema(conn)
    return StatisticsRepository(conn)


def test_lichess_win_percent_known_values():
    assert win_percent_from_cp(0) == 50.0
    # 50 + 50 * (2/(1+exp(-0.00368208*100))-1) ≈ 59.10
    assert abs(win_percent_from_cp(100) - 59.102) < 0.01
    assert abs(win_percent_from_cp(CP_CEILING) + win_percent_from_cp(-CP_CEILING) - 100.0) < 1e-9
    assert win_percent_from_mate(3) == win_percent_from_cp(CP_CEILING)
    assert win_percent_from_mate(-9) == win_percent_from_cp(-CP_CEILING)
    assert win_percent_from_cp(5000) == win_percent_from_cp(CP_CEILING)


def test_pov_inverts_white_scores_for_black():
    white = win_percent_user_pov(18, None, COLOR_WHITE)
    black = win_percent_user_pov(18, None, COLOR_BLACK)
    assert white is not None and black is not None
    assert abs(white + black - 100.0) < 1e-9
    assert black < 50 < white


def test_black_user_move_win_percent_on_real_game(tmp_path: Path):
    game = _load_line(FIXTURE_TWO, 0)
    assert game["id"] == "tOsxrK57"
    repo = _repo(tmp_path)
    imported = GameImportService().import_game(repo, game, USER, fallback_local=False)
    assert imported is not None
    evals = {row["ply"]: row for row in repo.list_evals(imported.game_id)}
    # Black's first move is ply 2 (d6); before is White's first eval (e4), inverted.
    ply = evals[2]
    assert is_user_move_ply(2, COLOR_BLACK)
    expected_before = win_percent_user_pov(game["analysis"][0]["eval"], None, COLOR_BLACK)
    expected_after = win_percent_user_pov(game["analysis"][1]["eval"], None, COLOR_BLACK)
    assert ply["win_probability_before"] == expected_before
    assert ply["win_probability_after"] == expected_after
    assert ply["win_probability_before"] < 50
    assert ply["win_probability_after"] < 50


def test_white_user_move_win_percent_on_real_game(tmp_path: Path):
    game = _load_line(FIXTURE_TWO, 1)
    assert game["id"] == "ApzutTLl"
    repo = _repo(tmp_path)
    imported = GameImportService().import_game(repo, game, USER, fallback_local=False)
    assert imported is not None
    ply = repo.list_evals(imported.game_id)[0]
    assert is_user_move_ply(1, COLOR_WHITE)
    assert ply["win_probability_before"] == win_percent_from_cp(CP_INITIAL)
    assert ply["win_probability_after"] == win_percent_user_pov(
        game["analysis"][0]["eval"], None, COLOR_WHITE
    )


def test_mate_sign_is_user_pov(tmp_path: Path):
    game = _load_line(FIXTURE_TWO, 1)
    repo = _repo(tmp_path)
    imported = GameImportService().import_game(repo, game, USER, fallback_local=False)
    assert imported is not None
    mate_index = next(i for i, item in enumerate(game["analysis"]) if "mate" in item)
    row = repo.list_evals(imported.game_id)[mate_index]
    mate = game["analysis"][mate_index]["mate"]
    assert mate < 0
    # White POV mate for Black → user (White) win% is the losing ceiling (~2.5).
    assert row["win_probability_after"] == win_percent_from_mate(mate)
    assert row["win_probability_after"] < 5.0
    assert row["evaluation_after_cp"] is None
