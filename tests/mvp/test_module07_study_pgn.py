"""FEAT-066: persist study PGN with variations."""

from __future__ import annotations

import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[2] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from modules.module07.ingest import parse_games_from_pgn_text

PGN_WITH_RAV = """
[Event "Study"]
[White "A"]
[Black "B"]
[Result "*"]

1. e4 e5 (1... c5) 2. Nf3 *
"""


def test_parse_pgn_with_variations_for_study_save():
    result = parse_games_from_pgn_text(PGN_WITH_RAV, max_games=1)
    assert len(result.games) == 1
    pgn = result.games[0].pgn
    assert "c5" in pgn
    assert "e5" in pgn
