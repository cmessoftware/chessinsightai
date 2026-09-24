"""Module 07 MVP — multi-game PGN ingest."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

SRC_DIR = Path(__file__).resolve().parents[2] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from modules.module07.ingest import (
    parse_games_from_pgn_text,
    resolve_player_color,
)

TWO_GAME_PGN = """
[Event "A"]
[White "alice"]
[Black "bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0

[Event "B"]
[White "alice"]
[Black "carol"]
[Result "0-1"]

1. d4 d5 2. c4 e6 0-1
"""


def test_resolve_player_color_white_or_black():
    assert resolve_player_color("alice", "bob", "alice") == "white"
    assert resolve_player_color("alice", "bob", "bob") == "black"


def test_resolve_player_color_mismatch_raises():
    with pytest.raises(ValueError, match="does not match"):
        resolve_player_color("alice", "bob", "eve")


def test_parse_multiple_games_same_username():
    games = parse_games_from_pgn_text(TWO_GAME_PGN, player_username="alice")
    assert len(games) == 2
    assert games[0].player_color == "white"
    assert games[1].player_color == "white"
    assert games[0].content_game_id != games[1].content_game_id
    assert "e4" in games[0].pgn
    assert "d4" in games[1].pgn
