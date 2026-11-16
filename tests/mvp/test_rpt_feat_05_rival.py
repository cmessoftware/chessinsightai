"""RPT-FEAT-05 — rival ranking and precision only in games against me."""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
for path in (ROOT / "src", ROOT / "src" / "api"):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from modules.module07.rival_comparison import build_rival_report  # noqa: E402

TODAY = date(2026, 11, 12)


def _game(**overrides):
    row = {
        "coach_game_id": "g1",
        "white_player": "Ada",
        "black_player": "Bob",
        "white_elo": "1500",
        "black_elo": "1700",
        "speed_class": "rapid",
        "time_control": "900+10",
        "date_played": "2026.06.01",
        "stats_color": "black",
        "accuracy": 88.0,
        "opening_accuracy": 80.0,
        "middlegame_accuracy": 70.0,
        "endgame_accuracy": 60.0,
    }
    row.update(overrides)
    return row


def test_rival_report_uses_the_opponents_rating_and_precision_only_against_me():
    rows = [
        _game(),
        _game(
            coach_game_id="g2",
            black_player="Zoe",
            black_elo="1400",
            stats_color="black",
            accuracy=50.0,
            date_played="2026.07.01",
        ),
        _game(
            coach_game_id="other",
            white_player="Bob",
            black_player="Zoe",
            white_elo="2000",
            black_elo="1900",
            stats_color="white",
            accuracy=10.0,
        ),
    ]
    report = build_rival_report(rows, today=TODAY, months=12, player="Ada")
    assert report["player"] == "Ada"
    assert report["rival"] == "Bob"
    assert report["rivals"] == ["Bob", "Zoe"]
    rhythm = report["rhythms"][0]
    assert rhythm["speed_class"] == "rapid"
    assert rhythm["ranking"]["games"] == 1
    assert rhythm["ranking"]["minimum"]["rating"] == 1700
    assert rhythm["ranking"]["mine_series"][0]["rating"] == 1500
    assert rhythm["ranking"]["rival_series"][0]["rating"] == 1700
    assert rhythm["precision"]["precision_general"]["mean"] == 88.0

    zoe = build_rival_report(rows, today=TODAY, months=12, player="Ada", rival="Zoe")
    assert zoe["rival"] == "Zoe"
    assert zoe["rhythms"][0]["ranking"]["minimum"]["rating"] == 1400
    assert zoe["rhythms"][0]["precision"]["precision_general"]["mean"] == 50.0


def test_clock_still_defines_the_rhythm_for_the_shared_games():
    rows = [_game(speed_class="rapid", time_control="300+0")]
    report = build_rival_report(rows, today=TODAY, months=12, player="Ada")
    assert report["rhythms"][0]["speed_class"] == "blitz"
