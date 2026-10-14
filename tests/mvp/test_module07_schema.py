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
    CLIENT_CLASSIFICATION_RULES_VERSION,
    CLIENT_CLASSIFICATION_SOURCE,
    DEFAULT_STOCKFISH_DEPTH,
    DEFAULT_STOCKFISH_MULTIPV,
    Module07AnalysisJob,
    Module07DecisionPoint,
    Module07Game,
    Module07PlyAnnotation,
)


def test_module07_tables_registered_on_metadata():
    names = set(Base.metadata.tables.keys())
    assert "module07_games" in names
    assert "module07_analysis_jobs" in names
    assert "module07_decision_points" in names
    assert "module07_ply_annotations" in names


def test_stockfish_job_defaults():
    assert DEFAULT_STOCKFISH_DEPTH == 12
    assert DEFAULT_STOCKFISH_MULTIPV == 3
    depth_col = Module07AnalysisJob.__table__.c.stockfish_depth
    multipv_col = Module07AnalysisJob.__table__.c.stockfish_multipv
    assert depth_col.default.arg == 12
    assert multipv_col.default.arg == 3


def test_module07_game_corpus_and_speed_columns():
    cols = Module07Game.__table__.c
    assert "corpus_type" in cols
    assert "speed_class" in cols
    assert "client_analyzed_at" in cols
    assert "client_analysis_ply_count" in cols
    assert "client_main_line_signature" in cols


def test_decision_point_unique_constraint_name():
    constraints = {
        c.name for c in Module07DecisionPoint.__table__.constraints if c.name
    }
    assert "uq_module07_decision_game_ply" in constraints


def test_ply_annotation_defaults_and_unique_constraint():
    assert CLIENT_CLASSIFICATION_RULES_VERSION == 1
    assert CLIENT_CLASSIFICATION_SOURCE == "client_wasm"
    constraints = {
        c.name for c in Module07PlyAnnotation.__table__.constraints if c.name
    }
    assert "uq_module07_ply_ann_game_path" in constraints
