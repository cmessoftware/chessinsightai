"""GC-2 — coach_games FK to master games catalog."""

from __future__ import annotations

import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[2] / "src" / "api"
SRC_DIR = API_DIR.parent
for path in (str(SRC_DIR), str(API_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)

from models.database_models import Base, Games
from models.module07_models import CoachGame, Module07DecisionPoint, Module07Game


def test_coach_games_table_registered():
    names = set(Base.metadata.tables.keys())
    assert "coach_games" in names
    assert "module07_games" not in names


def test_module07_game_alias_is_coach_game():
    assert Module07Game is CoachGame


def test_coach_game_has_master_fk_and_no_pgn_column():
    cols = CoachGame.__table__.c
    assert "master_game_id" in cols
    assert "pgn" not in cols
    assert "white_player" not in cols
    fk_targets = {
        fk.target_fullname for fk in CoachGame.__table__.foreign_keys
    }
    assert "games.game_id" in fk_targets


def test_child_tables_fk_coach_games():
    for model in (Module07DecisionPoint,):
        targets = {fk.target_fullname for fk in model.__table__.foreign_keys}
        assert "coach_games.id" in targets


def test_coach_game_display_properties_from_master():
    master = Games(
        game_id="abc",
        pgn="[Event \"x\"]\n\n1. e4 e5",
        white_player="W",
        black_player="B",
        result="1-0",
    )
    row = CoachGame(
        id="1",
        master_game_id="abc",
        owner_user_id=1,
        content_game_id="cid",
        source="pgn",
        corpus_type="personal",
        speed_class="blitz",
    )
    row.master_game = master
    assert row.pgn == master.pgn
    assert row.white_player == "W"
    assert row.black_player == "B"
    assert row.result == "1-0"
