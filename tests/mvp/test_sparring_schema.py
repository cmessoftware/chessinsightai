"""SPAR-02 — SQLAlchemy schema for sparring sessions."""

from __future__ import annotations

import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[2] / "src" / "api"
SRC_DIR = API_DIR.parent
for path in (str(SRC_DIR), str(API_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)

from models.database_models import Base
from models.sparring_models import (
    SESSION_STATUS_CREATED,
    SparringMove,
    SparringModelPrediction,
    SparringSession,
)


def test_sparring_tables_registered_on_metadata():
    names = set(Base.metadata.tables.keys())
    assert "sparring_sessions" in names
    assert "sparring_moves" in names
    assert "sparring_model_predictions" in names


def test_sparring_move_unique_session_ply():
    constraints = {c.name for c in SparringMove.__table__.constraints if c.name}
    assert "uq_sparring_moves_session_ply" in constraints


def test_sparring_session_default_status():
    status_col = SparringSession.__table__.c.status
    assert status_col.default.arg == SESSION_STATUS_CREATED


def test_sparring_move_prediction_fk():
    targets = {fk.target_fullname for fk in SparringMove.__table__.foreign_keys}
    assert "sparring_model_predictions.id" in targets
    assert "sparring_sessions.id" in targets


def test_sparring_prediction_required_fields():
    cols = SparringModelPrediction.__table__.c
    assert cols.rating_inputs.nullable is False
    assert cols.chosen_move.nullable is False
    assert cols.model_name.nullable is False
