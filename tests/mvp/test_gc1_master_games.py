"""GC-1 — master ``games`` row on Coach ingest."""

from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

SRC_DIR = Path(__file__).resolve().parents[2] / "src"
API_DIR = SRC_DIR / "api"
for path in (str(SRC_DIR), str(API_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)

from modules.game_import.master_games import (  # noqa: E402
    SOURCE_ANALYSIS,
    master_game_id_from_pgn,
    upsert_master_game_from_coach_item,
)

SAMPLE_PGN = """
[Event "Test"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]
[ECO "C00"]
[Opening "French Defense"]

1. e4 e6 1-0
""".strip()


def test_master_game_id_stable():
    a = master_game_id_from_pgn(SAMPLE_PGN)
    b = master_game_id_from_pgn(SAMPLE_PGN)
    assert a == b
    assert len(a) == 64


def test_source_analysis_constant():
    assert SOURCE_ANALYSIS == "ANALYSIS"


def _mock_db(*, existed: bool):
    db = MagicMock()
    select_result = MagicMock()
    select_result.first.return_value = (1,) if existed else None
    db.execute.return_value = select_result
    return db


def test_upsert_master_game_inserts_new_row():
    db = _mock_db(existed=False)
    item = SimpleNamespace(
        pgn=SAMPLE_PGN,
        white_player="Alice",
        black_player="Bob",
        result="1-0",
        speed_class="rapid",
    )
    game_id, is_new = upsert_master_game_from_coach_item(
        db,
        item,
        imported_by="alice_login",
        corpus_type="personal",
    )
    assert is_new is True
    assert game_id == master_game_id_from_pgn(SAMPLE_PGN)
    assert db.execute.call_count == 2


def test_upsert_master_game_updates_existing():
    db = _mock_db(existed=True)
    item = SimpleNamespace(
        pgn=SAMPLE_PGN,
        white_player="Alice",
        black_player="Bob",
        result="1-0",
        speed_class="blitz",
    )
    game_id, is_new = upsert_master_game_from_coach_item(
        db,
        item,
        imported_by="bob",
        corpus_type="personal",
    )
    assert is_new is False
    assert game_id == master_game_id_from_pgn(SAMPLE_PGN)
    upsert_call = db.execute.call_args_list[1]
    assert upsert_call[0][1]["source"] == SOURCE_ANALYSIS
