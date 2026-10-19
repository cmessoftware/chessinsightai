"""Coach game description (ritmo + reloj)."""

from __future__ import annotations

import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[2] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from modules.game_import.game_description import (
    format_coach_game_description,
    format_time_control_display,
)


def test_time_control_seconds_to_minutes_increment():
    assert format_time_control_display("900+10") == "15+10"
    assert format_time_control_display("600") == "10+0"


def test_full_description_example():
    text = format_coach_game_description(
        white_player="Frontallappen",
        black_player="cmess1315",
        player_username="cmess1315",
        speed_class="rapid",
        time_control="900+10",
    )
    assert text == "Frontallappen vs cmess1315 · POV cmess1315 (Rapid 15+10)"
