"""EST-FEAT-06 — both colors, compared from the plies already stored."""

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
from models.module07_models import (  # noqa: E402
    CoachGame,
    CoachGameStatisticEval,
    CoachGameStatistics,
)
from modules.module07.chess_statistics_summary import (  # noqa: E402
    lookup_chess_statistics,
)
from modules.module07.coach_game_statistics_repository import (  # noqa: E402
    replace_evals,
    replace_summary,
)

PGN = """[White "Ada"]
[Black "Bob"]
[WhiteElo "1500"]
[BlackElo "1600"]
[WhiteRatingDiff "12"]
[Result "1-0"]

1. e4 e5 *
"""


def _session():
    engine = create_engine("sqlite://")
    Games.__table__.create(engine)
    CoachGame.__table__.create(engine)
    CoachGameStatistics.__table__.create(engine)
    CoachGameStatisticEval.__table__.create(engine)
    return sessionmaker(bind=engine)(), engine


def _coach(db):
    db.add(
        Games(
            game_id="master-1",
            pgn=PGN,
            white_player="Ada",
            black_player="Bob",
            result="1-0",
            time_control="15+10",
            corpus_type="personal",
            speed_class="blitz",
        )
    )
    row = CoachGame(
        id="coach-1",
        master_game_id="master-1",
        owner_user_id=1,
        content_game_id="content-1",
        player_username="ada",
        player_color="white",
        speed_class="blitz",
    )
    db.add(row)
    db.commit()
    return row


def test_both_colors_are_compared_from_stored_plies():
    db, _engine = _session()
    coach = _coach(db)
    replace_summary(
        db,
        "coach-1",
        {
            "master_game_id": "master-1",
            "player_color": "white",
            "opponent": "Bob",
            "evaluation_source": "lichess",
            "accuracy": 90,
        },
    )
    replace_evals(
        db,
        "coach-1",
        [
            {
                "ply": 1,
                "move_san": "e4",
                "evaluation_after_cp": 20,
                "played_by": "white",
            },
            {
                "ply": 2,
                "move_san": "e5",
                "evaluation_after_cp": 400,
                "played_by": "black",
            },
        ],
    )

    payload = lookup_chess_statistics(db, coach)
    comparison = payload["comparison"]
    by_key = {row["key"]: row for row in comparison["rows"]}

    assert comparison["white_name"] == "Ada"
    assert comparison["black_name"] == "Bob"
    assert comparison["point_of_view"] == "white"
    assert by_key["errores_graves"]["white"] == "0"
    assert by_key["errores_graves"]["black"] == "1"
    assert by_key["ranking_inicial"]["white"] == "1500"
    assert by_key["ranking_inicial"]["black"] == "1600"
    assert by_key["ranking_final"]["white"] == "1512"
    assert by_key["ranking_final"]["black"] is None
    assert by_key["precision_general"]["white"]
    assert by_key["precision_general"]["black"]
    assert {row["key"] for row in payload["fields"]} >= {"resultado", "ritmo", "fuente_evaluacion"}
    db.close()


def test_summary_without_plies_keeps_the_single_column():
    db, _engine = _session()
    coach = _coach(db)
    replace_summary(
        db,
        "coach-1",
        {"master_game_id": "master-1", "opponent": "Bob", "accuracy": 80},
    )
    payload = lookup_chess_statistics(db, coach)
    assert "comparison" not in payload
    assert payload["found"] is True
    db.close()
