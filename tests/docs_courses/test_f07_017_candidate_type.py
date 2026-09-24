"""Tests for F07-017 — candidate type classification."""

from __future__ import annotations

import sys
from pathlib import Path

COURSE_ROOT = Path(__file__).resolve().parents[2] / "docs" / "ai_chess_coach_course"
if str(COURSE_ROOT) not in sys.path:
    sys.path.insert(0, str(COURSE_ROOT))

from analysis.candidate_type import CandidateType, classify_candidate_type
from analysis.comparison import compare_played_to_candidates


def test_tactical_capture():
    fen = "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 3"
    assert classify_candidate_type(fen, "f3e5") == CandidateType.TACTICAL


def test_exchange_major_capture():
    fen = "4r1k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1"
    assert classify_candidate_type(fen, "e1e8") == CandidateType.EXCHANGE


def test_defensive_king_escape():
    fen = "4k3/8/8/8/4Q3/8/8/4K3 b - - 0 1"
    assert classify_candidate_type(fen, "e8d7") == CandidateType.DEFENSIVE


def test_break_pawn_lever():
    fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
    assert classify_candidate_type(fen, "d7d5") == CandidateType.BREAK


def test_improvement_quiet_development():
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    assert classify_candidate_type(fen, "g1f3") == CandidateType.IMPROVEMENT


def test_prophylaxis_reduces_opponent_pressure():
    fen = "2kr2nr/p2n1ppp/b1pp4/1p2p3/5NP1/1P1P4/P1P1PP1q/RN1QKB2 w - - 0 13"
    assert classify_candidate_type(fen, "f4g2") == CandidateType.PROPHYLAXIS


def test_comparison_exposes_candidate_type():
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
    assert result.played_candidate_type == CandidateType.IMPROVEMENT
    assert all(d.candidate_type is not None for d in result.diffs)
