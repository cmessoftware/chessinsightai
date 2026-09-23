"""Tests for F07-021 — structured position assessment (10 MVP factors)."""

from __future__ import annotations

import sys
from pathlib import Path

import chess

COURSE_ROOT = Path(__file__).resolve().parents[2] / "docs" / "ai_chess_coach_course"
if str(COURSE_ROOT) not in sys.path:
    sys.path.insert(0, str(COURSE_ROOT))

from analysis.position_assessment import AssessmentFactor, assess_position


def test_startpos_has_all_ten_factors():
    result = assess_position(chess.Board().fen(), player_color="white")
    names = {f.factor for f in result.factors}
    assert names == set(AssessmentFactor)
    assert len(result.factors) == 10


def test_startpos_material_balanced():
    result = assess_position(chess.Board().fen(), player_color="white")
    material = next(f for f in result.factors if f.factor == AssessmentFactor.MATERIAL)
    assert material.advantage == "balanced"
    assert 0.45 <= material.player <= 0.55


def test_startpos_worst_piece_identified():
    result = assess_position(chess.Board().fen(), player_color="white")
    assert result.worst_piece is not None
    assert result.worst_piece.mobility >= 0


def test_engine_cp_blends_into_material():
    balanced = assess_position(chess.Board().fen(), player_color="white")
    winning = assess_position(chess.Board().fen(), player_color="white", engine_cp_player=600)
    b_mat = next(f for f in balanced.factors if f.factor == AssessmentFactor.MATERIAL)
    w_mat = next(f for f in winning.factors if f.factor == AssessmentFactor.MATERIAL)
    assert w_mat.player > b_mat.player


def test_to_dict_roundtrip_keys():
    result = assess_position(chess.Board().fen(), player_color="black")
    data = result.to_dict()
    assert "factors" in data
    assert "MATERIAL" in data["factors"]
    assert "KING_SAFETY" in data["factors"]
    assert data["player_color"] == "BLACK"
