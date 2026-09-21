"""Tests for LS01-009 — Lichess AccuracyPercent → precision_general."""

from __future__ import annotations

import json
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from chess_statistics.accuracy import (  # noqa: E402
    accuracy_from_win_percents,
    force_as_cp,
    game_accuracy_percent,
    per_move_accuracies,
)
from chess_statistics.db import StatisticsRepository, connect, init_schema  # noqa: E402
from chess_statistics.evals import analysis_entries  # noqa: E402
from chess_statistics.import_games import GameImportService  # noqa: E402

FIXTURE_TWO = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_two_games.ndjson"
USER = "cmess4401"


def _load_line(path: Path, index: int = 0) -> dict:
    lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return json.loads(lines[index])


def _repo(tmp_path: Path) -> StatisticsRepository:
    conn = connect(tmp_path / "ls.sqlite")
    init_schema(conn)
    return StatisticsRepository(conn)


def _ply_cps(game: dict) -> list[int | None]:
    return [
        force_as_cp(entry.get("eval"), entry.get("mate"))
        for entry in analysis_entries(game)
    ]


def test_per_move_accuracy_improving_is_100():
    assert accuracy_from_win_percents(50.0, 60.0) == 100.0


def test_per_move_accuracy_drop_known_value():
    # 10% win drop: 103.1668*exp(-0.043544*10)-3.1669 + 1 ≈ 64.58
    value = accuracy_from_win_percents(100.0, 90.0)
    assert 64.0 < value < 66.0


def test_precision_general_is_not_mean_of_three_phase_slices():
    game = _load_line(FIXTURE_TWO, 0)
    cps = _ply_cps(game)
    overall = game_accuracy_percent(cps, "BLACK")
    assert overall is not None
    user_acc = [
        acc
        for item in per_move_accuracies(cps)
        if item is not None
        for is_white, acc in [item]
        if not is_white
    ]
    assert user_acc
    third = max(1, len(user_acc) // 3)
    phases = [
        sum(user_acc[:third]) / third,
        sum(user_acc[third : 2 * third]) / max(1, len(user_acc[third : 2 * third])),
        sum(user_acc[2 * third :]) / max(1, len(user_acc[2 * third :])),
    ]
    phase_mean = sum(phases) / 3
    assert abs(overall - phase_mean) > 0.01


def test_black_fixture_persists_precision_and_user_move_accuracy(tmp_path: Path):
    game = _load_line(FIXTURE_TWO, 0)
    repo = _repo(tmp_path)
    imported = GameImportService().import_game(repo, game, USER, fallback_local=False)
    assert imported is not None
    stats = repo.get_stats(imported.game_id)
    assert stats is not None
    expected = game_accuracy_percent(_ply_cps(game), "BLACK")
    assert expected is not None
    assert abs(stats["precision_general"] - expected) < 1e-9
    assert 0 <= stats["precision_general"] <= 100
    evals = repo.list_evals(imported.game_id)
    user_plies = [row for row in evals if row["ply"] % 2 == 0]
    assert user_plies
    assert all(row["move_accuracy"] is not None for row in user_plies)
    opponent = [row for row in evals if row["ply"] % 2 == 1]
    assert all(row["move_accuracy"] is None for row in opponent)


def test_white_fixture_precision_general(tmp_path: Path):
    game = _load_line(FIXTURE_TWO, 1)
    repo = _repo(tmp_path)
    imported = GameImportService().import_game(repo, game, USER, fallback_local=False)
    assert imported is not None
    stats = repo.get_stats(imported.game_id)
    assert stats is not None
    expected = game_accuracy_percent(_ply_cps(game), "WHITE")
    assert expected is not None
    assert abs(stats["precision_general"] - expected) < 1e-9
    assert 0 <= stats["precision_general"] <= 100
    first = repo.list_evals(imported.game_id)[0]
    assert first["move_accuracy"] is not None
