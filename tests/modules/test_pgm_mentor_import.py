"""PGM PGN Mentor selection (comments first)."""

from __future__ import annotations

import io
import sys
from pathlib import Path

import chess.pgn

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from modules.pgm.mentor_import import (  # noqa: E402
    score_candidates,
    select_games_for_import,
)
from modules.pgm.mentor_roster import PgnMentorPlayerSlug, resolve_slugs  # noqa: E402


def test_resolve_defaults_to_26_slugs():
    slugs = resolve_slugs(use_enum_defaults=True)
    assert len(slugs) == len(PgnMentorPlayerSlug)
    assert "Fischer" in slugs


def test_prefers_commented_games():
    line = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3"
    pgn_a = f'[Event "a"]\n[White "A"]\n[Black "B"]\n[Result "*"]\n\n{line} *\n'
    pgn_b = f'[Event "b"]\n[White "C"]\n[Black "D"]\n[Result "*"]\n\n1. e4 {{idea}} e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 *\n'
    games = []
    for text in (pgn_a, pgn_b):
        g = chess.pgn.read_game(io.StringIO(text))
        assert g is not None
        games.append(g)
    scored = score_candidates(iter(games))
    picked = select_games_for_import(scored, max_games=1)
    assert len(picked) == 1
    assert picked[0].has_comments is True