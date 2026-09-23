"""Tests for F07-010 — IRREVERSIBLE_DECISION (sacrifice, major exchange, pawn commit)."""

from __future__ import annotations

import sys
from pathlib import Path

import chess

COURSE_ROOT = Path(__file__).resolve().parents[2] / "docs" / "ai_chess_coach_course"
if str(COURSE_ROOT) not in sys.path:
    sys.path.insert(0, str(COURSE_ROOT))

from analysis.criticality import RELEVANT_MIN, criticality_from_triggers
from analysis.engine_triggers import (
    IRREVERSIBLE_DECISION,
    irreversible_decision_tags,
    irreversible_decision_trigger,
)
from analysis.position_extractor import import_game_from_file


def test_development_knight_is_not_irreversible():
    trigger = irreversible_decision_trigger(chess.Board().fen(), "g1f3")
    assert trigger.fired is False
    assert trigger.code == IRREVERSIBLE_DECISION


def test_sample_game4_f5_commits_pawn():
    game = import_game_from_file(COURSE_ROOT / "data" / "games" / "sample_game4.pgn")
    f5 = next(p for p in game.plies if p.san == "f5")
    trigger = irreversible_decision_trigger(f5.fen_before, f5.uci)
    assert trigger.fired is True
    tags = irreversible_decision_tags(f5.fen_before, f5.uci)
    assert "IRREVERSIBLE_PAWN" in tags


def test_major_capture_fires():
    fen = "4k3/8/8/8/q7/8/8/R3K3 w - - 0 1"
    trigger = irreversible_decision_trigger(fen, "a1a4")
    assert trigger.fired is True
    assert "MAJOR_CAPTURE" in trigger.detail
    score, reasons = criticality_from_triggers([trigger])
    assert score == RELEVANT_MIN
    assert reasons[0].type == IRREVERSIBLE_DECISION


def test_bishop_sacrifice_tag():
    fen = "5k2/8/8/8/8/5B2/8/4K3 w - - 0 1"
    trigger = irreversible_decision_trigger(fen, "f3c6")
    assert trigger.fired is False
    fen2 = "5k2/8/2p5/8/8/5B2/8/4K3 w - - 0 1"
    trigger2 = irreversible_decision_trigger(fen2, "f3c6")
    assert trigger2.fired is True
    assert "MATERIAL_SACRIFICE" in trigger2.detail


def test_scholar_nf6_is_quiet():
    game = import_game_from_file(COURSE_ROOT / "data" / "games" / "f07_002_white.pgn")
    nf6 = next(p for p in game.plies if p.san == "Nf6")
    trigger = irreversible_decision_trigger(nf6.fen_before, nf6.uci)
    assert trigger.fired is False
