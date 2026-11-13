"""RPT-FEAT-04 — mean precision per speed class, the chess_statistics fields."""

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
from models.module07_models import CoachGame, CoachGameStatisticEval, CoachGameStatistics  # noqa: E402
from modules.module07.precision_by_speed import (  # noqa: E402
    build_precision_report,
    load_precision_rows,
    precisions_for_row,
    summarize_precision,
)

TODAY = date(2026, 11, 12)


def _game(**overrides):
    row = {
        "player_color": "white",
        "stats_color": "white",
        "player_username": "ada",
        "white_player": "Ada",
        "black_player": "Bob",
        "speed_class": "rapid",
        "time_control": "900+10",
        "date_played": "2026.06.01",
        "precision_general": 80.0,
        "precision_apertura": 90.0,
        "precision_medio_juego": 70.0,
        "precision_final": 60.0,
    }
    row.update(overrides)
    return row


def test_means_skip_null_phases_and_keep_each_rhythm():
    rows = [
        _game(
            date_played="2026.01.10",
            time_control="300+0",
            speed_class="rapid",
            precision_general=60,
            precision_apertura=80,
            precision_medio_juego=50,
            precision_final=40,
        ),
        _game(
            date_played="2026.06.01",
            time_control="300+0",
            speed_class="rapid",
            precision_general=80,
            precision_apertura=None,
            precision_medio_juego=70,
            precision_final=60,
        ),
        _game(date_played="2026.07.01", time_control="900+10", speed_class="blitz", precision_general=90),
    ]
    report = summarize_precision(rows, today=TODAY, months=12)
    blitz = report["rhythms"][0]
    rapid = report["rhythms"][1]
    assert blitz["label"] == "Blitz"
    assert blitz["games"] == 2
    assert blitz["precision_general"] == {"mean": 70.0, "n": 2}
    assert blitz["precision_apertura"] == {"mean": 80.0, "n": 1}
    assert blitz["precision_medio_juego"] == {"mean": 60.0, "n": 2}
    assert blitz["precision_final"] == {"mean": 50.0, "n": 2}
    assert [point["rating"] for point in blitz["series"]] == [60, 80]
    assert rapid["label"] == "Rapid"
    assert rapid["games"] == 1
    assert rapid["precision_general"]["mean"] == 90.0
    assert report["from"] == "2025-11-12"


def test_default_window_drops_games_older_than_twelve_months():
    rows = [
        _game(date_played="2024.01.01", precision_general=10),
        _game(date_played="2026.02.01", precision_general=80),
    ]
    report = summarize_precision(rows, today=TODAY, months=12)
    assert report["rhythms"][0]["games"] == 1
    assert report["rhythms"][0]["precision_general"]["mean"] == 80.0


def test_skips_games_without_date_or_rhythm_and_keeps_a_rhythm_without_precision():
    rows = [
        _game(date_played="2026.??.??"),
        _game(time_control="", speed_class="unknown"),
        _game(
            precision_general=None,
            precision_apertura=None,
            precision_medio_juego=None,
            precision_final=None,
        ),
    ]
    report = summarize_precision(rows, today=TODAY, months=12)
    assert report["skipped"] == 2
    rhythm = report["rhythms"][0]
    assert rhythm["speed_class"] == "rapid"
    assert rhythm["games"] == 1
    assert rhythm["precision_general"] == {"mean": None, "n": 0}


def test_rhythm_without_precision_stays_selectable_next_to_blitz():
    rows = [
        _game(time_control="300+0", speed_class="rapid", precision_general=70),
        _game(
            time_control="900+10",
            speed_class="blitz",
            precision_general=None,
            precision_apertura=None,
            precision_medio_juego=None,
            precision_final=None,
        ),
    ]
    report = summarize_precision(rows, today=TODAY, months=12)
    assert [rhythm["speed_class"] for rhythm in report["rhythms"]] == ["blitz", "rapid"]
    rapid = report["rhythms"][1]
    assert rapid["games"] == 1
    assert rapid["precision_general"]["mean"] is None


def test_clock_overrides_a_stale_speed_class():
    rows = [_game(speed_class="rapid", time_control="300+0")]
    report = summarize_precision(rows, today=TODAY, months=12)
    assert report["rhythms"][0]["speed_class"] == "blitz"


def test_stored_precision_stays_on_its_color_and_the_other_color_uses_evals():
    stored = _game(accuracy=10.0, stats_color="white", player_color="white")
    same = precisions_for_row(
        {**stored, "accuracy": 10.0, "opening_accuracy": 20.0, "middlegame_accuracy": 30.0, "endgame_accuracy": 40.0},
        [{"ply": 1, "evaluation_after_cp": 100, "move_san": "e4"}],
    )
    assert same["precision_general"] == 10.0
    assert same["precision_final"] == 40.0

    other = precisions_for_row(
        {
            "player_color": "black",
            "stats_color": "white",
            "accuracy": 10.0,
            "opening_accuracy": 20.0,
            "middlegame_accuracy": 30.0,
            "endgame_accuracy": 40.0,
        },
        [
            {"ply": 1, "evaluation_after_cp": 30, "move_san": "e4"},
            {"ply": 2, "evaluation_after_cp": 20, "move_san": "e5"},
        ],
    )
    assert other["precision_general"] != 10.0
    assert other["precision_general"] is not None

    missing = precisions_for_row(
        {"player_color": "black", "stats_color": "white", "accuracy": 10.0},
        [],
    )
    assert missing["precision_general"] is None


def test_default_player_uses_that_color_precision():
    rows = [
        _game(
            white_player="Zoe",
            black_player="Ada",
            stats_color="white",
            player_color="white",
            accuracy=55.0,
            opening_accuracy=55.0,
            middlegame_accuracy=55.0,
            endgame_accuracy=55.0,
            precision_general=55.0,
        )
    ]
    report = build_precision_report(
        rows, today=TODAY, months=12, lichess_username="zoe", chesscom_username="ada"
    )
    assert report["player"] == "Zoe"
    assert report["rhythms"][0]["precision_general"]["mean"] == 55.0

    opponent = build_precision_report(rows, today=TODAY, months=12, player="Ada")
    assert opponent["player"] == "Ada"
    assert opponent["rhythms"][0]["games"] == 1
    assert opponent["rhythms"][0]["precision_general"]["mean"] is None


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    Games.__table__.create(engine)
    CoachGame.__table__.create(engine)
    CoachGameStatistics.__table__.create(engine)
    CoachGameStatisticEval.__table__.create(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_pending_ids_are_games_in_the_window_without_precision():
    from modules.module07.precision_by_speed import pending_precision_ids

    rows = [
        _game(coach_game_id="ready", precision_general=80),
        _game(
            coach_game_id="missing",
            precision_general=None,
            precision_apertura=None,
            precision_medio_juego=None,
            precision_final=None,
        ),
        _game(
            coach_game_id="old",
            date_played="2024.01.01",
            precision_general=None,
            precision_apertura=None,
            precision_medio_juego=None,
            precision_final=None,
        ),
        _game(
            coach_game_id="undated",
            date_played="2026.??.??",
            precision_general=None,
            precision_apertura=None,
            precision_medio_juego=None,
            precision_final=None,
        ),
    ]
    assert pending_precision_ids(rows, today=TODAY, months=12) == ["missing"]


def test_load_reads_only_the_owner_personal_games(db):
    db.add(
        Games(
            game_id="master-1",
            white_player="Ada",
            black_player="Bob",
            time_control="900+10",
            date_played="2026.04.02",
        )
    )
    db.add(
        Games(
            game_id="master-study",
            white_player="Ada",
            black_player="Bob",
            time_control="900+10",
            date_played="2026.04.03",
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
            speed_class="rapid",
        )
    )
    db.add(
        CoachGameStatistics(
            coach_game_id="coach-1",
            master_game_id="master-1",
            player_color="white",
            accuracy=77.0,
            opening_accuracy=80.0,
            middlegame_accuracy=74.0,
            endgame_accuracy=70.0,
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
            speed_class="rapid",
        )
    )
    db.add(
        CoachGame(
            id="coach-other",
            master_game_id="master-1",
            owner_user_id=8,
            content_game_id="content-3",
            player_username="ada",
            player_color="white",
            corpus_type="personal",
            speed_class="rapid",
        )
    )
    db.commit()

    rows, evals = load_precision_rows(db, 7)
    assert len(rows) == 1
    assert rows[0]["accuracy"] == 77.0
    assert rows[0]["stats_color"] == "white"
    assert evals == {}
