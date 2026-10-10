"""Module 07 PGN ingest without player POV."""

from __future__ import annotations

import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[2] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from modules.module07.ingest import parse_games_from_pgn_text

SAMPLE = """
[Event "Test"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0
"""

MULTI = """
[Event "One"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 1-0

[Event "Two"]
[White "Carol"]
[Black "Dan"]
[Result "0-1"]

1. d4 d5 0-1
"""


def test_parse_pgn_without_player_username():
    result = parse_games_from_pgn_text(SAMPLE)
    assert result.total_games_in_pgn == 1
    assert len(result.games) == 1
    g = result.games[0]
    assert g.white_player == "Alice"
    assert g.black_player == "Bob"
    assert g.player_username is None
    assert g.player_color is None


def test_parse_pgn_with_optional_player():
    result = parse_games_from_pgn_text(SAMPLE, player_username="Bob")
    assert result.games[0].player_username == "Bob"
    assert result.games[0].player_color == "black"


def test_parse_pgn_without_headers_uses_side_labels():
    bare = "1. e4 e5 2. Nf3 Nc6 1-0\n"
    result = parse_games_from_pgn_text(bare)
    assert result.games[0].white_player == "Blancas"
    assert result.games[0].black_player == "Negras"


def test_parse_multi_game_pgn_max_games_one():
    result = parse_games_from_pgn_text(MULTI, max_games=1)
    assert result.total_games_in_pgn == 2
    assert len(result.games) == 1
    assert result.games[0].white_player == "Alice"


def test_parse_multi_game_pgn_unlimited():
    result = parse_games_from_pgn_text(MULTI, max_games=None)
    assert result.total_games_in_pgn == 2
    assert len(result.games) == 2
