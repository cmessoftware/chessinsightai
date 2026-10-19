"""FEAT-028 — Chess.com coach import helpers."""

from __future__ import annotations

import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[2] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from modules.module07.chesscom_coach_import import (
    CHESSCOM_PERF_TYPES,
    ChessComImportCursor,
    fetch_chesscom_batch,
)

PGN = """
[Event "Live Chess"]
[White "AliceCom"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0
"""


class _FakeClient:
    def __init__(self, games):
        self._games = games

    def iter_user_games(self, *args, **kwargs):
        yield from self._games


def test_chesscom_perf_defaults():
    assert "bullet" in CHESSCOM_PERF_TYPES
    assert "daily" in CHESSCOM_PERF_TYPES


def test_fetch_batch_parses_games(monkeypatch):
    game = {
        "pgn": PGN.strip(),
        "external_game_id": "999",
        "speed": "rapid",
        "perf": "rapid",
    }
    monkeypatch.setattr(
        "modules.module07.chesscom_coach_import.ChessComClient",
        lambda: _FakeClient([game]),
    )
    batch = fetch_chesscom_batch(
        chesscom_username="AliceCom",
        since=None,
        until=None,
        perf_types=["rapid"],
        batch_size=200,
        cursor=ChessComImportCursor(),
        player_alias=None,
    )
    assert batch.fetched_from_chesscom == 1
    assert len(batch.parsed_games) == 1
    assert batch.provenance[0]["chesscom_id"] == "999"
