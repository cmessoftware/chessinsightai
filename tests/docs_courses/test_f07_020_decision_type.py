"""Tests for F07-020 — position decision type classification."""

from __future__ import annotations

import sys
from pathlib import Path

import chess
from chess.engine import Cp, PovScore

COURSE_ROOT = Path(__file__).resolve().parents[2] / "docs" / "ai_chess_coach_course"
if str(COURSE_ROOT) not in sys.path:
    sys.path.insert(0, str(COURSE_ROOT))

from analysis.comparison import compare_played_to_candidates
from analysis.decision_type import DecisionType, classify_position_decision_type
from analysis.position_extractor import import_game_from_file


class ScriptedPlayed:
    def __init__(self, lines: list[dict], independent: dict[str, PovScore] | None = None):
        self.lines = lines
        self.independent = independent or {}
        self.id = {"name": "ScriptedPlayed"}

    def analyse(self, board: chess.Board, limit, multipv=1, root_moves=None):
        if root_moves:
            move = root_moves[0]
            return {"score": self.independent[move.uci()], "pv": [move]}
        count = max(1, int(multipv or 1))
        return self.lines[:count]


def test_opening_start_position():
    fen = chess.Board().fen()
    result = classify_position_decision_type(fen, move_number=1)
    assert result.primary == DecisionType.OPENING


def test_defensive_when_in_check():
    fen = "4k3/8/8/8/4Q3/8/8/4K3 b - - 0 1"
    result = classify_position_decision_type(fen)
    assert result.primary == DecisionType.DEFENSIVE


def test_scholar_nf6_is_tactical():
    game = import_game_from_file(COURSE_ROOT / "data" / "games" / "f07_002_white.pgn")
    nf6 = next(p for p in game.plies if p.san == "Nf6")
    board = chess.Board(nf6.fen_before)
    g6 = chess.Move.from_uci("g7g6")
    others = [g6] + [m for m in board.legal_moves if m.uci() not in {nf6.uci, g6.uci()}]
    engine = ScriptedPlayed(
        [
            {"multipv": 1, "score": PovScore(Cp(-20), chess.WHITE), "pv": [others[0]]},
            {"multipv": 2, "score": PovScore(Cp(-200), chess.WHITE), "pv": [others[1]]},
        ],
        {nf6.uci: PovScore(Cp(900), chess.WHITE)},
    )
    vs = compare_played_to_candidates(
        nf6.fen_before, nf6.uci, engine=engine, depth=6, player_color="black"
    )
    result = classify_position_decision_type(
        nf6.fen_before, comparison=vs, move_number=nf6.move_number
    )
    assert result.primary == DecisionType.TACTICAL


def test_endgame_without_queens():
    fen = "8/8/8/8/8/4k3/4P3/4K3 w - - 0 1"
    result = classify_position_decision_type(fen, move_number=40)
    assert result.primary == DecisionType.ENDGAME
