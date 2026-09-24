"""Tests for LS01-003 — project game_id matches pgn_utils.get_game_id."""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path

import chess.pgn
import pytest

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from modules.pgn_utils import get_game_id  # noqa: E402
from lichess_statistics.game_id import (  # noqa: E402
    GameIdError,
    game_id_from_pgn_text,
    identity_from_ndjson,
)

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_two_games.ndjson"

SAMPLE_PGN = """[Event \"Rated Rapid game\"]
[Site \"https://lichess.org/tOsxrK57\"]
[White \"Robertqwe\"]
[Black \"cmess4401\"]
[Result \"0-1\"]

1. e4 e5 2. Nf3 0-1
"""


def test_pgn_text_matches_product_get_game_id():
    parsed = chess.pgn.read_game(io.StringIO(SAMPLE_PGN))
    assert parsed is not None
    assert game_id_from_pgn_text(SAMPLE_PGN) == get_game_id(parsed)


def test_empty_pgn_raises():
    with pytest.raises(GameIdError, match="empty"):
        game_id_from_pgn_text("  ")


def test_ndjson_fixture_stable_hash_and_lichess_id():
    line = FIXTURE.read_text(encoding="utf-8").splitlines()[0]
    game = json.loads(line)
    identity = identity_from_ndjson(game)
    parsed = chess.pgn.read_game(io.StringIO(game["pgn"]))
    assert parsed is not None
    assert identity.game_id == get_game_id(parsed)
    assert identity.lichess_id == game["id"]
    assert identity.game_id != identity.lichess_id
    assert len(identity.game_id) == 64


def test_same_pgn_twice_same_id():
    first = game_id_from_pgn_text(SAMPLE_PGN)
    second = game_id_from_pgn_text(SAMPLE_PGN)
    assert first == second
