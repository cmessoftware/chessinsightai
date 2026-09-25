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


def test_parse_pgn_without_player_username():
    games = parse_games_from_pgn_text(SAMPLE)
    assert len(games) == 1
    g = games[0]
    assert g.white_player == "Alice"
    assert g.black_player == "Bob"
    assert g.player_username is None
    assert g.player_color is None


def test_parse_pgn_with_optional_player():
    games = parse_games_from_pgn_text(SAMPLE, player_username="Bob")
    assert games[0].player_username == "Bob"
    assert games[0].player_color == "black"
