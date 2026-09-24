"""Tests for F07-023 — static-dynamic evaluation."""

from __future__ import annotations

import sys
from pathlib import Path

import chess

COURSE_ROOT = Path(__file__).resolve().parents[2] / "docs" / "ai_chess_coach_course"
if str(COURSE_ROOT) not in sys.path:
    sys.path.insert(0, str(COURSE_ROOT))

from analysis.static_dynamic import PositionCharacter, evaluate_static_dynamic


def test_startpos_static_improvement_or_balanced():
    result = evaluate_static_dynamic(chess.Board().fen(), "white")
    assert result.position_character in (
        PositionCharacter.STATIC_IMPROVEMENT,
        PositionCharacter.BALANCED_FLEXIBLE,
    )
    assert result.static_outlook in ("balanced", "better", "worse")
    assert 0.0 <= result.urgency <= 1.0


def test_in_check_tactical_resolution():
    fen = "4k3/8/8/8/4Q3/8/8/4K3 b - - 0 1"
    result = evaluate_static_dynamic(fen, "black")
    assert result.position_character == PositionCharacter.TACTICAL_RESOLUTION
    assert result.requires_dynamic_action is True


def test_to_dict_has_required_keys():
    data = evaluate_static_dynamic(chess.Board().fen(), "white").to_dict()
    assert data["position_character"]
    assert data["static_outlook"] in ("better", "balanced", "worse")
    assert data["dynamic_resources"] in ("available", "limited", "none")
    assert "requires_dynamic_action" in data
