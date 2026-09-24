"""Tests for F07-008 — POSITION_TRANSFORMATION (pawn break / king exposure)."""

from __future__ import annotations

import sys
from pathlib import Path

import chess

COURSE_ROOT = Path(__file__).resolve().parents[2] / "docs" / "ai_chess_coach_course"
if str(COURSE_ROOT) not in sys.path:
    sys.path.insert(0, str(COURSE_ROOT))

from analysis.criticality import RELEVANT_MIN, criticality_from_triggers
from analysis.engine_triggers import (
    POSITION_TRANSFORMATION,
    position_transformation_tags,
    position_transformation_trigger,
)
from analysis.position_extractor import import_game_from_file


def test_opening_e4_is_not_a_character_change():
    trigger = position_transformation_trigger(chess.Board().fen(), "e2e4")
    assert trigger.fired is False
    assert trigger.code == POSITION_TRANSFORMATION
    assert trigger.detail == ""


def test_sample_game4_f5_is_pawn_break():
    game = import_game_from_file(COURSE_ROOT / "data" / "games" / "sample_game4.pgn")
    f5 = next(p for p in game.plies if p.san == "f5")
    trigger = position_transformation_trigger(f5.fen_before, f5.uci)
    assert trigger.fired is True
    assert "PAWN_BREAK" in trigger.detail
    tags = position_transformation_tags(f5.fen_before, f5.uci)
    assert "PAWN_BREAK" in tags


def test_sample_game4_castling_long_is_opposite_wings():
    game = import_game_from_file(COURSE_ROOT / "data" / "games" / "sample_game4.pgn")
    castle = next(p for p in game.plies if p.san == "O-O-O")
    trigger = position_transformation_trigger(castle.fen_before, castle.uci)
    assert trigger.fired is True
    assert "OPPOSITE_CASTLING" in trigger.detail


def test_shield_drop_on_h_pawn_advance():
    fen = "6k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1"
    trigger = position_transformation_trigger(fen, "h2h4")
    assert trigger.fired is True
    assert "SHIELD_DROP" in trigger.detail
    score, reasons = criticality_from_triggers([trigger])
    assert score == RELEVANT_MIN
    assert reasons[0].type == POSITION_TRANSFORMATION


def test_scholar_nf6_is_not_a_transformation():
    game = import_game_from_file(COURSE_ROOT / "data" / "games" / "f07_002_white.pgn")
    nf6 = next(p for p in game.plies if p.san == "Nf6")
    trigger = position_transformation_trigger(nf6.fen_before, nf6.uci)
    assert trigger.fired is False


def test_assess_ply_criticality_includes_transformation_trigger():
    from analysis.criticality import assess_ply_criticality
    from analysis.engine_triggers import EVALUATION_DROP

    game = import_game_from_file(COURSE_ROOT / "data" / "games" / "sample_game4.pgn")
    f5 = next(p for p in game.plies if p.san == "f5")
    # Scripted flat eval so only transformation moves the score.
    class FlatEngine:
        id = {"name": "Flat"}

        def analyse(self, board, limit):
            from chess.engine import Cp, PovScore

            return {"score": PovScore(Cp(0), chess.WHITE)}

    from analysis.engine_eval import analyze_ply_for_player

    record = f5
    ply_eval = analyze_ply_for_player(
        record.fen_before,
        record.uci,
        record.side_to_move,
        engine=FlatEngine(),
        depth=4,
    )
    crit = assess_ply_criticality(record, ply_eval)
    codes = {t.code for t in crit.triggers if t.fired}
    assert POSITION_TRANSFORMATION in codes
    assert EVALUATION_DROP not in codes
    assert crit.score >= RELEVANT_MIN
