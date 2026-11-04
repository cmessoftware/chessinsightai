"""EST-FEAT-01 — Postgres tables for one Coach game's chess_statistics."""

from __future__ import annotations

import sys
from pathlib import Path

SRC_API = Path(__file__).resolve().parents[2] / "src" / "api"
if str(SRC_API) not in sys.path:
    sys.path.insert(0, str(SRC_API))

from models.module07_models import (  # noqa: E402
    CoachGameStatisticEval,
    CoachGameStatistics,
)


def test_summary_is_one_row_per_coach_game():
    table = CoachGameStatistics.__table__
    assert table.name == "coach_game_statistics"
    assert list(table.primary_key.columns.keys()) == ["coach_game_id"]
    assert "pgn" not in table.c
    fk = {c.parent.name: c for c in table.foreign_keys}
    assert fk["coach_game_id"].column.table.name == "coach_games"
    assert fk["coach_game_id"].ondelete == "CASCADE"
    assert fk["master_game_id"].column.table.name == "games"
    for name in (
        "player_username",
        "player_color",
        "opponent",
        "speed_class",
        "initial_rating",
        "rating_change",
        "final_rating",
        "inaccuracies",
        "mistakes",
        "blunders",
        "average_cp_loss",
        "accuracy",
        "opening_accuracy",
        "middlegame_accuracy",
        "endgame_accuracy",
        "evaluation_source",
        "stockfish_version",
        "stockfish_depth",
        "analyzed_at",
    ):
        assert name in table.c


def test_evals_are_keyed_by_coach_game_and_ply():
    table = CoachGameStatisticEval.__table__
    assert table.name == "coach_game_statistic_evals"
    assert list(table.primary_key.columns.keys()) == ["coach_game_id", "ply"]
    assert table.c.played_by.nullable is True
    checks = [c.sqltext.text for c in table.constraints if c.__class__.__name__ == "CheckConstraint"]
    assert any("white" in text and "black" in text for text in checks)
