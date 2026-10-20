"""FEAT-029 — bulk POV helpers and API routes."""

from __future__ import annotations

import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[2] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from modules.module07.lichess_coach_import import replace_lichess_username_in_pgn
from modules.module07.pov_bulk import _name_in_game, _players_from_pgn

PGN = """
[Event "Test"]
[White "AliceCom"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0
"""


def test_replace_username_in_headers_only():
    out = replace_lichess_username_in_pgn(PGN.strip(), "AliceCom", "CoachMe")
    assert '[White "CoachMe"]' in out
    assert '[Black "Bob"]' in out
    white, black = _players_from_pgn(out)
    assert white == "CoachMe"
    assert black == "Bob"
    assert _name_in_game(white, black, "AliceCom") is False
    assert _name_in_game(white, black, "CoachMe") is True


def test_module07_router_exposes_pov_bulk_routes():
    API_DIR = Path(__file__).resolve().parents[2] / "src" / "api"
    if str(API_DIR) not in sys.path:
        sys.path.insert(0, str(API_DIR))
    from routers import module07 as router_mod

    paths = {getattr(r, "path", None) for r in router_mod.router.routes}
    assert "/api/v1/module07/pov-bulk/status" in paths
    assert "/api/v1/module07/pov-bulk/apply" in paths
    assert "/api/v1/module07/pov-bulk/rollback" in paths
