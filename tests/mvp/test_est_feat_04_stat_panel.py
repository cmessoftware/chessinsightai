"""EST-FEAT-04 — the PGN panel reads Postgres and skips a game without a row."""

from __future__ import annotations

import inspect
import sys
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
SRC_API = SRC / "api"
for path in (SRC, SRC_API):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from models.database_models import Games  # noqa: E402
from models.module07_models import (  # noqa: E402
    CoachGame,
    CoachGameStatistics,
)
from modules.module07.chess_statistics_summary import (  # noqa: E402
    lookup_chess_statistics,
)
from modules.module07.coach_game_statistics_repository import replace_summary  # noqa: E402


def _session():
    engine = create_engine("sqlite://")
    Games.__table__.create(engine)
    CoachGame.__table__.create(engine)
    return sessionmaker(bind=engine)(), engine


def _coach(db, coach_id: str, *, result: str = "1-0", time_control: str = "15+10"):
    master_id = f"master-{coach_id}"
    db.add(
        Games(
            game_id=master_id,
            pgn="1. e4 e5 *",
            white_player="Ada",
            black_player="Bob",
            result=result,
            time_control=time_control,
            corpus_type="personal",
            speed_class="blitz",
        )
    )
    row = CoachGame(
        id=coach_id,
        master_game_id=master_id,
        owner_user_id=1,
        content_game_id=f"content-{coach_id}",
        player_username="ada",
        player_color="white",
        speed_class="blitz",
    )
    db.add(row)
    db.commit()
    return row


def test_panel_lookup_does_not_open_the_course_sqlite():
    import modules.module07.chess_statistics_summary as summary

    source = inspect.getsource(summary)
    assert "sqlite3" not in source
    assert "CHESS_STATISTICS_DB" not in source
    assert "chess_statistics.db" not in source
    assert "chess_statistics.sqlite" not in source


def test_lookup_returns_the_same_fields_from_postgres():
    db, engine = _session()
    CoachGameStatistics.__table__.create(engine)
    coach = _coach(db, "coach-1")
    replace_summary(
        db,
        "coach-1",
        {
            "master_game_id": "master-coach-1",
            "opponent": "Bob",
            "speed_class": "blitz",
            "inaccuracies": 3,
            "mistakes": 1,
            "blunders": 0,
            "average_cp_loss": 18.2,
            "accuracy": 81.25,
            "opening_accuracy": 90,
            "middlegame_accuracy": 70,
            "endgame_accuracy": 80,
            "initial_rating": 1500,
            "final_rating": 1512,
            "evaluation_source": "lichess",
        },
    )
    payload = lookup_chess_statistics(db, coach)
    by_key = {row["key"]: row["value"] for row in payload["fields"]}
    assert payload["available"] is True
    assert payload["found"] is True
    assert by_key["resultado"] == "1-0"
    assert by_key["ritmo"] == "15+10"
    assert by_key["rival"] == "Bob"
    assert by_key["imprecisiones"] == "3"
    assert by_key["errores"] == "1"
    assert by_key["errores_graves"] == "0"
    assert by_key["perdida_promedio_cp"] == "18.2"
    assert by_key["precision_general"] == "81.2%"
    assert by_key["precision_apertura"] == "90.0%"
    assert by_key["precision_medio_juego"] == "70.0%"
    assert by_key["precision_final"] == "80.0%"
    assert by_key["ranking_inicial"] == "1500"
    assert by_key["ranking_final"] == "1512"
    assert by_key["fuente_evaluacion"] == "lichess"
    db.close()


def test_missing_row_is_empty_and_does_not_invent_zeros():
    db, engine = _session()
    CoachGameStatistics.__table__.create(engine)
    coach = _coach(db, "coach-empty")
    payload = lookup_chess_statistics(db, coach)
    assert payload == {"available": True, "found": False, "fields": []}
    db.close()


def test_missing_schema_is_unavailable():
    db, _engine = _session()
    coach = _coach(db, "coach-1")
    payload = lookup_chess_statistics(db, coach)
    assert payload == {"available": False, "found": False, "fields": []}
    db.close()


def test_another_coach_game_does_not_see_this_row():
    db, engine = _session()
    CoachGameStatistics.__table__.create(engine)
    owner = _coach(db, "coach-owner")
    other = _coach(db, "coach-other", result="0-1", time_control="3+2")
    replace_summary(
        db,
        owner.id,
        {
            "master_game_id": "master-coach-owner",
            "opponent": "Bob",
            "accuracy": 91.0,
            "blunders": 2,
        },
    )
    payload = lookup_chess_statistics(db, other)
    assert payload["available"] is True
    assert payload["found"] is False
    assert payload["fields"] == []
    db.close()
