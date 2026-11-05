"""EST-FEAT-05 — calculate the open analysis game on demand."""

from __future__ import annotations

import inspect
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
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
from modules.module07.coach_game_statistics_compute import (  # noqa: E402
    compute_open_game_statistics,
)
from modules.module07.coach_game_statistics_repository import get_summary  # noqa: E402

EXPORT_PGN = """[Event "t"]
[White "Ada"]
[Black "Bob"]
[Result "1-0"]

1. e4 { [%eval 0.30] } e5 { [%eval 0.25] } 1-0
"""

BARE_PGN = """[Event "t"]
[White "Ada"]
[Black "Bob"]

1. e4 e5 *
"""


def _session():
    engine = create_engine("sqlite://")
    Games.__table__.create(engine)
    CoachGame.__table__.create(engine)
    CoachGameStatistics.__table__.create(engine)
    CoachGameStatisticEval.__table__.create(engine)
    return sessionmaker(bind=engine)()


def _seed(db, coach_id: str, pgn: str) -> None:
    master_id = f"master-{coach_id}"
    db.add(
        Games(
            game_id=master_id,
            pgn=pgn,
            white_player="Ada",
            black_player="Bob",
            result="1-0",
            time_control="15+10",
            corpus_type="personal",
            speed_class="blitz",
        )
    )
    db.add(
        CoachGame(
            id=coach_id,
            master_game_id=master_id,
            owner_user_id=1,
            content_game_id=f"content-{coach_id}",
            player_username="ada",
            player_color="white",
            speed_class="blitz",
        )
    )
    db.commit()


def test_on_demand_calculates_only_the_open_game_and_replaces_it():
    db = _session()
    _seed(db, "open-game", EXPORT_PGN)
    _seed(db, "other-game", EXPORT_PGN)

    first = compute_open_game_statistics(db, "open-game")
    assert first["available"] is True
    assert first["found"] is True
    assert {row["key"] for row in first["fields"]} >= {"precision_general", "rival", "resultado"}
    assert get_summary(db, "other-game") is None

    second = compute_open_game_statistics(db, "open-game")
    assert second["found"] is True
    assert db.query(CoachGameStatistics).count() == 1
    assert db.query(CoachGameStatisticEval).count() == 2
    db.close()


def test_missing_color_uses_the_analysis_default_white():
    db = _session()
    _seed(db, "open-game", EXPORT_PGN)
    row = db.query(CoachGame).filter(CoachGame.id == "open-game").one()
    row.player_color = None
    db.commit()

    payload = compute_open_game_statistics(db, "open-game")
    by_key = {item["key"]: item["value"] for item in payload["fields"]}
    assert by_key["rival"] == "Bob"
    assert get_summary(db, "open-game").player_color == "white"
    db.close()


def test_missing_engine_does_not_store_a_row():
    db = _session()
    _seed(db, "open-game", BARE_PGN)
    engine = SimpleNamespace(available=lambda: False, analyse_game=lambda _game: [])
    with pytest.raises(ValueError, match="Stockfish local no está disponible"):
        compute_open_game_statistics(db, "open-game", stockfish_service=engine)
    assert get_summary(db, "open-game") is None
    db.close()


def test_handler_asks_for_one_game():
    source = inspect.getsource(compute_open_game_statistics)
    assert ".all(" not in source
    router = (SRC_API / "routers" / "module07.py").read_text(encoding="utf-8")
    start = router.index("def post_game_chess_statistics")
    chunk = router[start : router.index("\n@router", start)]
    assert "compute_open_game_statistics(db, row.id)" in chunk
    assert ".all(" not in chunk
