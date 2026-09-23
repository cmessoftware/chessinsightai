"""Tests for F07-009 — IMMEDIATE_THREAT (check, hanging material, mate-in-one)."""

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
    ply_immediate_threat,
)
from analysis.position_extractor import import_game_from_file

ONLY_MOVE_FEN = "6k1/5ppp/8/8/8/8/5PPP/R2r2K1 w - - 0 1"
HANGING_ROOK_FEN = "6k1/8/8/8/8/r7/8/R3K3 w - - 0 1"
FORCING_CHECK_FEN = "6k1/5ppp/8/8/7q/8/8/6K1 w - - 0 1"


def test_startpos_has_no_immediate_threat():
    trigger = immediate_threat_trigger(chess.Board().fen(), chess.WHITE)
    assert trigger.fired is False
    assert trigger.code == IMMEDIATE_THREAT


def test_back_rank_check_fires_in_check():
    trigger = immediate_threat_trigger(ONLY_MOVE_FEN, chess.WHITE)
    assert trigger.fired is True
    assert "IN_CHECK" in trigger.detail
    tags = immediate_threat_tags(ONLY_MOVE_FEN, chess.WHITE)
    assert "IN_CHECK" in tags


def test_hanging_rook_fires():
    trigger = immediate_threat_trigger(HANGING_ROOK_FEN, chess.WHITE)
    assert trigger.fired is True
    assert any(t.startswith("HANGING_") for t in trigger.detail.split(","))
    score, reasons = criticality_from_triggers([trigger])
    assert score == RELEVANT_MIN
    assert reasons[0].type == IMMEDIATE_THREAT


def test_forcing_check_if_pass():
    trigger = immediate_threat_trigger(FORCING_CHECK_FEN, chess.WHITE)
    assert trigger.fired is True
    assert "FORCING_CHECK" in trigger.detail


def test_scholar_opening_quiet_for_black():
    game = import_game_from_file(COURSE_ROOT / "data" / "games" / "f07_002_white.pgn")
    e5 = next(p for p in game.plies if p.san == "e5")
    trigger = ply_immediate_threat(e5.fen_before, player_color=e5.side_to_move)
    assert trigger.fired is False
