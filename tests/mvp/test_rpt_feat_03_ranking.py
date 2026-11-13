"""RPT-FEAT-03 — min, average and max rating per speed class."""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path(__file__).resolve().parents[2]
for path in (ROOT / "src", ROOT / "src" / "api"):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from models.database_models import Games  # noqa: E402
from models.module07_models import CoachGame  # noqa: E402
from modules.module07.ranking_by_speed import (  # noqa: E402
    build_ranking_report,
    load_ranking_rows,
    summarize_ranking,
)

TODAY = date(2026, 11, 12)


def _game(**overrides):
    row = {
        "player_color": "white",
        "player_username": "ada",
        "white_player": "Ada",
        "black_player": "Bob",
        "white_elo": "1500",
        "black_elo": "1400",
        "speed_class": "rapid",
        "time_control": "600+0",
        "date_played": "2026.06.01",
    }
    row.update(overrides)
    return row


def test_splits_rhythms_and_reports_min_average_and_max_with_dates():
    rows = [
        _game(date_played="2026.01.10", white_elo="1400", time_control="300+0", speed_class="rapid"),
        _game(date_played="2026.06.01", white_elo="1600", time_control="300+0", speed_class="rapid"),
        _game(date_played="2026.08.01", white_elo="1500", time_control="300+0", speed_class="rapid"),
        _game(date_played="2026.07.01", white_elo="1800", time_control="900+10", speed_class="blitz"),
    ]
    report = summarize_ranking(rows, today=TODAY, months=12)
    blitz = report["rhythms"][0]
    rapid = report["rhythms"][1]
    assert blitz["label"] == "Blitz"
    assert blitz["minimum"] == {"rating": 1400, "date": "2026-01-10"}
    assert blitz["maximum"] == {"rating": 1600, "date": "2026-06-01"}
    assert blitz["average"]["rating"] == 1500.0
    assert blitz["average"]["date"] == "2026-08-01"
    assert [point["rating"] for point in blitz["series"]] == [1400, 1600, 1500]
    assert rapid["label"] == "Rapid"
    assert rapid["games"] == 1
    assert report["from"] == "2025-11-12"
    assert report["players"] == ["ada"]


def test_default_window_drops_games_older_than_twelve_months():
    rows = [
        _game(date_played="2024.01.01", white_elo="900"),
        _game(date_played="2026.02.01", white_elo="1550"),
    ]
    report = summarize_ranking(rows, today=TODAY, months=12)
    assert report["rhythms"][0]["games"] == 1
    assert report["rhythms"][0]["minimum"]["rating"] == 1550


def test_skips_games_without_date_rhythm_or_player_rating():
    rows = [
        _game(date_played="2026.??.??"),
        _game(white_elo=""),
        _game(time_control="", speed_class="unknown"),
        _game(player_color="", player_username="other"),
    ]
    report = summarize_ranking(rows, today=TODAY, months=12)
    assert report["rhythms"] == []
    assert report["skipped"] == 4


def test_tied_minimum_uses_the_earliest_date_and_maximum_the_latest():
    rows = [
        _game(date_played="2026.03.01", white_elo="1400"),
        _game(date_played="2026.05.01", white_elo="1400"),
        _game(date_played="2026.04.01", white_elo="1700"),
        _game(date_played="2026.09.01", white_elo="1700"),
    ]
    report = summarize_ranking(rows, today=TODAY, months=12)
    rhythm = report["rhythms"][0]
    assert rhythm["minimum"]["date"] == "2026-03-01"
    assert rhythm["maximum"]["date"] == "2026-09-01"


def test_default_player_is_lichess_then_chesscom_then_alphabetical():
    rows = [_game(white_player="Zoe", black_player="Ada", white_elo="1500", black_elo="1700")]
    lichess = build_ranking_report(
        rows, today=TODAY, months=12, lichess_username="zoe", chesscom_username="ada"
    )
    assert lichess["player"] == "Zoe"
    assert lichess["players"] == ["Ada", "Zoe"]
    assert lichess["rhythms"][0]["minimum"]["rating"] == 1500

    chesscom = build_ranking_report(
        rows, today=TODAY, months=12, lichess_username="", chesscom_username="Ada"
    )
    assert chesscom["player"] == "Ada"
    assert chesscom["rhythms"][0]["minimum"]["rating"] == 1700

    alphabetical = build_ranking_report(
        rows, today=TODAY, months=12, lichess_username="  ", chesscom_username=""
    )
    assert alphabetical["player"] == "Ada"


def test_configured_lichess_user_stays_available_when_no_game_uses_that_name():
    rows = [_game(white_player="Ada", black_player="Bob")]
    report = build_ranking_report(rows, today=TODAY, months=12, lichess_username="Nueva")
    assert report["player"] == "Nueva"
    assert report["players"] == ["Ada", "Bob", "Nueva"]
    assert report["rhythms"] == []


def test_clock_overrides_a_stale_speed_class():
    rows = [_game(speed_class="rapid", time_control="300+0", white_elo="1510")]
    report = summarize_ranking(rows, today=TODAY, months=12)
    assert report["rhythms"][0]["speed_class"] == "blitz"


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    Games.__table__.create(engine)
    CoachGame.__table__.create(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_load_reads_only_the_owner_personal_games(db):
    db.add(
        Games(
            game_id="master-1",
            white_player="Ada",
            black_player="Bob",
            white_elo="1520",
            black_elo="1490",
            time_control="600+0",
            date_played="2026.04.02",
            speed_class="blitz",
            corpus_type="personal",
        )
    )
    db.add(
        Games(
            game_id="master-study",
            white_player="Ada",
            black_player="Bob",
            white_elo="2000",
            time_control="600+0",
            date_played="2026.04.03",
            speed_class="blitz",
            corpus_type="personal",
        )
    )
    db.add(
        CoachGame(
            id="coach-1",
            master_game_id="master-1",
            owner_user_id=7,
            content_game_id="content-1",
            player_username="ada",
            player_color="white",
            corpus_type="personal",
            speed_class="blitz",
        )
    )
    db.add(
        CoachGame(
            id="coach-study",
            master_game_id="master-study",
            owner_user_id=7,
            content_game_id="content-2",
            player_username="ada",
            player_color="white",
            corpus_type="study",
            speed_class="blitz",
        )
    )
    db.add(
        CoachGame(
            id="coach-other",
            master_game_id="master-1",
            owner_user_id=8,
            content_game_id="content-3",
            player_username="ada",
            player_color="black",
            corpus_type="personal",
            speed_class="blitz",
        )
    )
    db.commit()

    rows = load_ranking_rows(db, 7)
    assert len(rows) == 1
    assert rows[0]["white_elo"] == "1520"
    assert rows[0]["player_color"] == "white"
