"""FEAT-093: the PGN panel reads the Postgres row for that Coach game."""

from __future__ import annotations

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
from models.module07_models import CoachGame, CoachGameStatistics  # noqa: E402
from modules.module07.chess_statistics_summary import lookup_chess_statistics  # noqa: E402
from modules.module07.coach_game_statistics_repository import replace_summary  # noqa: E402


def _db():
    engine = create_engine("sqlite://")
    Games.__table__.create(engine)
    CoachGame.__table__.create(engine)
    CoachGameStatistics.__table__.create(engine)
    return sessionmaker(bind=engine)()


def _coach(db):
    db.add(
        Games(
            game_id="master-1",
            pgn="1. e4 e5 1-0",
            white_player="A",
            black_player="B",
            result="1-0",
            time_control="15+10",
            corpus_type="personal",
            speed_class="rapid",
        )
    )
    row = CoachGame(
        id="coach-1",
        master_game_id="master-1",
        owner_user_id=1,
        content_game_id="content-1",
        player_username="A",
        player_color="white",
        speed_class="rapid",
    )
    db.add(row)
    db.commit()
    return row


def test_lookup_returns_precision_when_the_game_was_processed():
    db = _db()
    coach = _coach(db)
    replace_summary(
        db,
        coach.id,
        {
            "master_game_id": "master-1",
            "opponent": "B",
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
            "evaluation_source": "stockfish_local",
        },
    )
    payload = lookup_chess_statistics(db, coach)
    by_key = {row["key"]: row["value"] for row in payload["fields"]}
    assert payload["available"] is True
    assert payload["found"] is True
    assert by_key["precision_general"] == "81.2%"
    assert by_key["errores_graves"] == "0"
    assert by_key["rival"] == "B"
    assert by_key["perdida_promedio_cp"] == "18.2"
    assert by_key["resultado"] == "1-0"
    assert by_key["ritmo"] == "15+10"
    db.close()


def test_lookup_reports_unknown_game():
    db = _db()
    coach = _coach(db)
    payload = lookup_chess_statistics(db, coach)
    assert payload["available"] is True
    assert payload["found"] is False
    assert payload["fields"] == []
    db.close()
