"""Tests for LS01-002 — import filters (Lichess AI and short games)."""

from __future__ import annotations

import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from lichess_statistics.filters import (  # noqa: E402
    MIN_TOTAL_MOVES,
    REASON_LICHESS_AI,
    REASON_TOO_SHORT,
    filter_import_game,
    is_lichess_ai_game,
    iter_importable_games,
    total_move_count,
)


def _human(*, plies: int) -> dict:
    sans = " ".join(["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4", "exd4"][:plies])
    if plies > 10:
        sans = " ".join(["e4"] * plies)
    return {
        "id": f"human{plies:02d}",
        "players": {
            "white": {"user": {"name": "cmess4401", "id": "cmess4401"}},
            "black": {"user": {"name": "opponentone", "id": "opponentone"}},
        },
        "moves": sans,
    }


def test_lichess_ai_level_field_is_skipped():
    game = {
        "id": "aiLevel1",
        "players": {
            "white": {"user": {"name": "cmess4401"}},
            "black": {"aiLevel": 6},
        },
        "moves": " ".join(["e4"] * 40),
    }
    result = filter_import_game(game)
    assert result.keep is False
    assert result.reason == REASON_LICHESS_AI
    assert is_lichess_ai_game(game) is True


def test_lichess_ai_display_name_is_skipped():
    game = {
        "id": "aiName",
        "players": {
            "white": {"user": {"name": "lichess AI level 3"}},
            "black": {"user": {"name": "cmess4401"}},
        },
        "moves": " ".join(["e4"] * 40),
    }
    result = filter_import_game(game)
    assert result.keep is False
    assert result.reason == REASON_LICHESS_AI


def test_titled_bot_account_is_not_lichess_ai():
    game = {
        "id": "humanBot",
        "players": {
            "white": {"user": {"name": "cmess4401"}},
            "black": {"user": {"name": "maia9", "title": "BOT"}},
        },
        "moves": " ".join(["e4"] * 40),
    }
    assert is_lichess_ai_game(game) is False
    assert filter_import_game(game).keep is True


def test_eight_ply_game_is_skipped():
    game = _human(plies=8)
    result = filter_import_game(game)
    assert result.keep is False
    assert result.reason == REASON_TOO_SHORT
    assert result.move_count == 8
    assert result.move_count < MIN_TOTAL_MOVES


def test_forty_ply_human_is_kept():
    game = _human(plies=40)
    result = filter_import_game(game)
    assert result.keep is True
    assert result.reason == ""
    assert result.move_count == 40


def test_move_count_falls_back_to_pgn_mainline():
    pgn = """[Event "x"]
[White "cmess4401"]
[Black "opponentone"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 1-0
"""
    game = {
        "id": "pgnOnly",
        "players": {
            "white": {"user": {"name": "cmess4401"}},
            "black": {"user": {"name": "opponentone"}},
        },
        "pgn": pgn,
    }
    assert total_move_count(game) == 9
    assert filter_import_game(game).reason == REASON_TOO_SHORT


def test_iter_importable_games_preserves_skips():
    games = [_human(plies=8), _human(plies=40)]
    rows = list(iter_importable_games(games))
    assert rows[0][1].keep is False
    assert rows[1][1].keep is True
