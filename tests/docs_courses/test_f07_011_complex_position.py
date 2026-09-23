"""Tests for F07-011 — COMPLEX_POSITION (branching + MultiPV spread)."""

from __future__ import annotations

import sys
from pathlib import Path

import chess
from chess.engine import Cp, PovScore

COURSE_ROOT = Path(__file__).resolve().parents[2] / "docs" / "ai_chess_coach_course"
if str(COURSE_ROOT) not in sys.path:
    sys.path.insert(0, str(COURSE_ROOT))

from analysis.criticality import RELEVANT_MIN, criticality_from_triggers
from analysis.engine_triggers import (
    COMPLEX_POSITION,
    complex_position_trigger,
    ply_complex_position,
)
from analysis.multipv import analyze_multipv


class ScriptedMultiPV:
    def __init__(self, lines: list[dict]):
        self.lines = lines
        self.id = {"name": "ScriptedMultiPV"}

    def analyse(self, board: chess.Board, limit, multipv=1):
        count = max(1, int(multipv or 1))
        return self.lines[:count]


def _engine(*scores: int) -> ScriptedMultiPV:
    moves = ["e2e4", "d2d4", "g1f3", "b1c3", "f2f4"]
    rows: list[dict] = []
    for index, cp in enumerate(scores, start=1):
        uci = moves[index - 1]
        rows.append(
            {
                "multipv": index,
                "score": PovScore(Cp(cp), chess.WHITE),
                "pv": [chess.Move.from_uci(uci)],
            }
        )
    return ScriptedMultiPV(rows)


def test_quiet_opening_one_clear_best():
    start = chess.Board().fen()
    engine = _engine(120, 15, 5)
    mpv = analyze_multipv(start, engine=engine, depth=6, multipv=3)
    trigger = complex_position_trigger(start, mpv)
    assert trigger.fired is False
    assert trigger.code == COMPLEX_POSITION


def test_tight_multipv_is_complex():
    start = chess.Board().fen()
    engine = _engine(40, 38, 35)
    trigger = ply_complex_position(start, engine=engine, depth=6, multipv=3)
    assert trigger.fired is True
    assert "MULTIPV_TIGHT" in trigger.detail
    assert "MULTI_CANDIDATE" in trigger.detail
    score, reasons = criticality_from_triggers([trigger])
    assert score == RELEVANT_MIN
    assert reasons[0].type == COMPLEX_POSITION


def test_high_branching_without_multipv():
    board = chess.Board()
    legal = board.legal_moves.count()
    trigger = complex_position_trigger(board.fen(), None, min_branching=legal - 1)
    assert trigger.fired is True
    assert trigger.detail == f"HIGH_BRANCHING_{legal}"
