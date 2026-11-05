"""EST-FEAT-02 — Postgres repository for Coach chess statistics."""

from __future__ import annotations

import inspect
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
SRC_API = SRC / "api"
for path in (SRC, SRC_API):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from models.module07_models import (  # noqa: E402
    CoachGameStatisticEval,
    CoachGameStatistics,
)
from modules.module07.coach_game_statistics_repository import (  # noqa: E402
    get_evals,
    get_summary,
    replace_evals,
    replace_summary,
)


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    CoachGameStatistics.__table__.create(engine)
    CoachGameStatisticEval.__table__.create(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_repository_does_not_open_the_course_sqlite():
    import modules.module07.coach_game_statistics_repository as repo

    source = inspect.getsource(repo)
    assert "sqlite3" not in source
    assert "chess_statistics" not in source


def test_summary_round_trip_replaces_the_same_row(db):
    assert get_summary(db, "coach-1") is None
    first = replace_summary(
        db,
        "coach-1",
        {
            "master_game_id": "master-1",
            "player_username": "ada",
            "accuracy": 80.0,
            "blunders": 1,
        },
    )
    assert first.coach_game_id == "coach-1"
    assert first.accuracy == 80.0

    second = replace_summary(
        db,
        "coach-1",
        {"master_game_id": "master-1", "accuracy": 91.5},
    )
    assert second.blunders is None
    assert second.accuracy == 91.5
    assert db.query(CoachGameStatistics).count() == 1


def test_evals_replace_drops_previous_plies(db):
    replace_evals(
        db,
        "coach-1",
        [
            {"ply": 1, "played_by": "white", "judgment": "blunder"},
            {"ply": 2, "played_by": "black", "cp_loss": 12},
        ],
    )
    replace_evals(
        db,
        "coach-1",
        [{"ply": 3, "played_by": "white", "move_san": "Nf3"}],
    )
    rows = get_evals(db, "coach-1")
    assert [row.ply for row in rows] == [3]
    assert rows[0].move_san == "Nf3"

    replace_evals(db, "coach-1", [])
    assert get_evals(db, "coach-1") == []


def test_replace_rejects_unknown_fields_and_bad_color(db):
    with pytest.raises(ValueError, match="unknown summary fields"):
        replace_summary(db, "coach-1", {"master_game_id": "m", "pgn": "1. e4"})
    with pytest.raises(ValueError, match="played_by"):
        replace_evals(db, "coach-1", [{"ply": 1, "played_by": "both"}])
