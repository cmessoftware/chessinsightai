"""FEAT-027 — Lichess coach import helpers."""

from __future__ import annotations

import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[2] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from modules.module07.lichess_coach_import import (
    LichessImportCursor,
    effective_player_alias,
    replace_lichess_username_in_pgn,
)

PGN = """
[Event "Rated Rapid"]
[White "AliceLichess"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0
"""


def test_replace_alias_white_only():
    out = replace_lichess_username_in_pgn(PGN, "AliceLichess", "MyAlias")
    assert '[White "MyAlias"]' in out
    assert '[Black "Bob"]' in out
    assert "AliceLichess" not in out


def test_effective_alias_ignores_app_login():
    assert (
        effective_player_alias(
            "cmess4401",
            "admin",
            reject_usernames=("admin",),
        )
        is None
    )
    assert effective_player_alias("cmess4401", "MyTag", reject_usernames=("admin",)) == "MyTag"


def test_cursor_roundtrip():
    c = LichessImportCursor(perf_index=2, completed=False)
    restored = LichessImportCursor.from_json(c.to_json())
    assert restored.perf_index == 2
    assert restored.completed is False
