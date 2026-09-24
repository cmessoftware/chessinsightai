"""Module 07 MVP — SQLAlchemy schema registration."""

from __future__ import annotations

import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[2] / "src" / "api"
SRC_DIR = API_DIR.parent
for path in (str(SRC_DIR), str(API_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)

from models.database_models import Base
from models.module07_models import (
    DEFAULT_STOCKFISH_DEPTH,
    DEFAULT_STOCKFISH_MULTIPV,
    Module07AnalysisJob,
    Module07DecisionPoint,
    Module07Game,
)


def test_module07_tables_registered_on_metadata():
    names = set(Base.metadata.tables.keys())
    assert "module07_games" in names
    assert "module07_analysis_jobs" in names
    assert "module07_decision_points" in names


def test_stockfish_job_defaults():
    assert DEFAULT_STOCKFISH_DEPTH == 12
    assert DEFAULT_STOCKFISH_MULTIPV == 3
    depth_col = Module07AnalysisJob.__table__.c.stockfish_depth
    multipv_col = Module07AnalysisJob.__table__.c.stockfish_multipv
    assert depth_col.default.arg == 12
    assert multipv_col.default.arg == 3


def test_decision_point_unique_constraint_name():
    constraints = {
        c.name for c in Module07DecisionPoint.__table__.constraints if c.name
    }
    assert "uq_module07_decision_game_ply" in constraints
