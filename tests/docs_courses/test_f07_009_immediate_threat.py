"""Tests for F07-009 — IMMEDIATE_THREAT (check, mate-in-1, hanging N/B/R/Q)."""

from __future__ import annotations

import sys
from pathlib import Path

import chess

COURSE_ROOT = Path(__file__).resolve().parents[2] / "docs" / "ai_chess_coach_course"
if str(COURSE_ROOT) not in sys.path:
    sys.path.insert(0, str(COURSE_ROOT))

from analysis.criticality import RELEVANT_MIN, criticality_from_triggers
from analysis.engine_triggers import (
    IMMEDIATE_THREAT,
    immediate_threat_tags,
    immediate_threat_trigger,
)
from analysis.position_extractor import import_game_from_file

# White in check on the back rank (only Rxd1).
CHECK_FEN = "6k1/5ppp/8/8/8/8/5PPP/R2r2K1 w - - 0 1"
# Black queen hanging on a4, captured by Ra2.
HANGING_QUEEN_FEN = "4k3/8/8/8/q7/8/R7/4K3 b - - 0 1"
# e5 attacked by Nf3 and defended: not hanging minor/major.
QUIET_OPENING_FEN = "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2"


def test_startpos_is_not_an_immediate_threat():
    trigger = immediate_threat_trigger(chess.Board().fen())
    assert trigger.fired is False
    assert trigger.code == IMMEDIATE_THREAT
    assert trigger.detail == ""


def test_quiet_opening_pawn_tension_does_not_fire():
    trigger = immediate_threat_trigger(QUIET_OPENING_FEN)
    assert trigger.fired is False


def test_back_rank_check_fires():
    trigger = immediate_threat_trigger(CHECK_FEN)
    assert trigger.fired is True
    assert "CHECK" in trigger.detail
    tags = immediate_threat_tags(CHECK_FEN)
    assert "CHECK" in tags


def test_hanging_queen_fires():
    trigger = immediate_threat_trigger(HANGING_QUEEN_FEN)
    assert trigger.fired is True
    assert "HANGING_MATERIAL" in trigger.detail
    score, reasons = criticality_from_triggers([trigger])
    assert score == RELEVANT_MIN
    assert reasons[0].type == IMMEDIATE_THREAT


def test_scholar_before_nf6_is_mate_in_one():
    game = import_game_from_file(COURSE_ROOT / "data" / "games" / "f07_002_white.pgn")
    nf6 = next(p for p in game.plies if p.san == "Nf6")
    trigger = immediate_threat_trigger(nf6.fen_before)
    assert trigger.fired is True
    assert "MATE_IN_1" in trigger.detail
