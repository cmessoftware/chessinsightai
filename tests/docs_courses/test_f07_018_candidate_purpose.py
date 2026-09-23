"""Tests for F07-018 — structured candidate purposes (07.1 §10.4)."""

from __future__ import annotations

import sys
from pathlib import Path

COURSE_ROOT = Path(__file__).resolve().parents[2] / "docs" / "ai_chess_coach_course"
if str(COURSE_ROOT) not in sys.path:
    sys.path.insert(0, str(COURSE_ROOT))

from analysis.candidate_purpose import CandidatePurpose, classify_candidate_purposes
from analysis.comparison import compare_played_to_candidates


def test_answer_threat_when_escaping_check():
    fen = "4k3/8/8/8/4Q3/8/8/4K3 b - - 0 1"
    purposes = classify_candidate_purposes(fen, "e8d7")
    assert CandidatePurpose.ANSWER_THREAT in purposes
    assert CandidatePurpose.IMPROVE_KING_SAFETY in purposes


def test_win_material_on_capture():
    fen = "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 3"
    purposes = classify_candidate_purposes(fen, "f3e5")
    assert CandidatePurpose.WIN_MATERIAL in purposes


def test_development_on_knight_move():
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    purposes = classify_candidate_purposes(fen, "g1f3")
    assert CandidatePurpose.COMPLETE_DEVELOPMENT in purposes


def test_pawn_break_purpose():
    fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
    purposes = classify_candidate_purposes(fen, "d7d5")
    assert CandidatePurpose.EXECUTE_PAWN_BREAK in purposes


def test_comparison_includes_purposes():
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

    class MinimalEngine:
        id = {"name": "Minimal"}

        def analyse(self, board, limit, multipv=1, root_moves=None):
            import chess
            from chess.engine import Cp, PovScore

            e4 = chess.Move.from_uci("e2e4")
            if root_moves:
                return {"score": PovScore(Cp(30), chess.WHITE), "pv": [root_moves[0]]}
            return [{"multipv": 1, "score": PovScore(Cp(40), chess.WHITE), "pv": [e4]}]

    result = compare_played_to_candidates(fen, "g1f3", engine=MinimalEngine(), depth=6)
    assert len(result.played_purposes) >= 1
    assert all(len(d.purposes) >= 1 for d in result.diffs)
