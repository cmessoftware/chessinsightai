"""Tests for F07-022 — opponent threat detection."""

from __future__ import annotations

import sys
from pathlib import Path

COURSE_ROOT = Path(__file__).resolve().parents[2] / "docs" / "ai_chess_coach_course"
if str(COURSE_ROOT) not in sys.path:
    sys.path.insert(0, str(COURSE_ROOT))

from analysis.opponent_threats import ThreatCode, detect_opponent_threats


def test_in_check_is_king_threat():
    fen = "4k3/8/8/8/4Q3/8/8/4K3 b - - 0 1"
    report = detect_opponent_threats(fen, "black")
    codes = {t.code for t in report.threats}
    assert ThreatCode.IN_CHECK in codes
    assert report.max_severity == "HIGH"


def test_hanging_rook_detected():
    fen = "4k3/8/8/8/8/8/4r3/4K2R w - - 0 1"
    report = detect_opponent_threats(fen, "white")
    codes = {t.code for t in report.threats}
    assert ThreatCode.HANGING_PIECE in codes or ThreatCode.CAPTURE_THREAT in codes


def test_engine_pv_check_adds_threat():
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    report = detect_opponent_threats(fen, "white", opponent_pv_san=("Qh5+",))
    assert any(t.code == ThreatCode.ENGINE_PV for t in report.threats)


def test_to_dict_shape():
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    data = detect_opponent_threats(fen, "white").to_dict()
    assert data["player_color"] == "WHITE"
    assert "threats" in data
    assert "max_severity" in data
