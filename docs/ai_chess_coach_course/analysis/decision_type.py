"""F07-020 — classify the decision required at a critical position (07.1 §9)."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

import chess

from analysis.candidate_purpose import CandidatePurpose
from analysis.comparison import PlayedVsCandidates
from analysis.criticality import PlyCriticality
from analysis.engine_triggers import (
    COMPLEX_POSITION,
    IMMEDIATE_THREAT,
    IRREVERSIBLE_DECISION,
    ONLY_MOVE,
    POSITION_TRANSFORMATION,
)

class DecisionType(str, Enum):
    """07 plan + 07.1 §9 decision requirement labels."""

    TACTICAL = "TACTICAL"
    STRATEGIC = "STRATEGIC"
    PROPHYLACTIC = "PROPHYLACTIC"
    DYNAMIC = "DYNAMIC"
    STATIC = "STATIC"
    DEFENSIVE = "DEFENSIVE"
    TECHNICAL = "TECHNICAL"
    PRACTICAL = "PRACTICAL"
    OPENING = "OPENING"
    ENDGAME = "ENDGAME"


@dataclass(frozen=True)
class PositionDecisionType:
    primary: DecisionType
    secondary: tuple[DecisionType, ...]
    confidence: float


def classify_position_decision_type(
    fen: str,
    *,
    comparison: PlayedVsCandidates | None = None,
    criticality: PlyCriticality | None = None,
    move_number: int | None = None,
) -> PositionDecisionType:
    """Heuristic primary (and secondary) decision type for one FEN."""
    board = chess.Board(fen)
    fullmove = board.fullmove_number
    mn = move_number if move_number is not None else fullmove
    secondaries: list[DecisionType] = []

    if _is_endgame(board):
        secondaries.append(DecisionType.ENDGAME)

    if board.is_check():
        return _result(DecisionType.DEFENSIVE, _add(secondaries, DecisionType.TACTICAL), 0.82)

    if _trigger_fired(criticality, IMMEDIATE_THREAT) or _trigger_fired(criticality, COMPLEX_POSITION):
        return _result(DecisionType.TACTICAL, _add(secondaries, DecisionType.DEFENSIVE), 0.78)

    if comparison and _is_tactical_comparison(comparison):
        return _result(DecisionType.TACTICAL, tuple(secondaries), 0.85)

    if _trigger_fired(criticality, ONLY_MOVE):
        return _result(DecisionType.DEFENSIVE, _add(secondaries, DecisionType.TACTICAL), 0.75)

    purposes = comparison.played_purposes if comparison else ()
    if CandidatePurpose.PREVENT_OPPONENT_PLAN in purposes:
        return _result(DecisionType.PROPHYLACTIC, _add(secondaries, DecisionType.STRATEGIC), 0.72)

    if _trigger_fired(criticality, POSITION_TRANSFORMATION) or (
        CandidatePurpose.EXECUTE_PAWN_BREAK in purposes
    ):
        return _result(DecisionType.DYNAMIC, _add(secondaries, DecisionType.STRATEGIC), 0.7)

    if comparison and _is_practical_decision(comparison):
        return _result(DecisionType.PRACTICAL, _add(secondaries, DecisionType.STRATEGIC), 0.65)

    if comparison and _is_technical_decision(comparison):
        return _result(DecisionType.TECHNICAL, _add(secondaries, DecisionType.STATIC), 0.68)

    if mn <= 12 and not _trigger_fired(criticality, IRREVERSIBLE_DECISION):
        return _result(DecisionType.OPENING, tuple(secondaries), 0.66)

    if _is_endgame(board):
        return _result(DecisionType.ENDGAME, _add(secondaries, DecisionType.TECHNICAL), 0.7)

    if purposes and all(
        p
        in (
            CandidatePurpose.IMPROVE_COORDINATION,
            CandidatePurpose.IMPROVE_WORST_PIECE,
            CandidatePurpose.COMPLETE_DEVELOPMENT,
        )
        for p in purposes
    ):
        return _result(DecisionType.STATIC, _add(secondaries, DecisionType.STRATEGIC), 0.6)

    return _result(DecisionType.STRATEGIC, tuple(secondaries), 0.55)


def _result(
    primary: DecisionType,
    secondary: tuple[DecisionType, ...],
    confidence: float,
) -> PositionDecisionType:
    sec = tuple(s for s in secondary if s != primary)
    return PositionDecisionType(primary=primary, secondary=sec, confidence=round(confidence, 2))


def _add(secondaries: list[DecisionType], value: DecisionType) -> tuple[DecisionType, ...]:
    if value not in secondaries:
        secondaries.append(value)
    return tuple(secondaries)


def _trigger_fired(criticality: PlyCriticality | None, code: str) -> bool:
    if criticality is None:
        return False
    return any(t.code == code and t.fired for t in criticality.triggers)


def _is_endgame(board: chess.Board) -> bool:
    queens = board.pieces(chess.QUEEN, chess.WHITE) | board.pieces(chess.QUEEN, chess.BLACK)
    if queens:
        return False
    return chess.popcount(board.occupied) <= 12


def _is_tactical_comparison(comparison: PlayedVsCandidates) -> bool:
    cons = comparison.played_consequence
    if cons.is_mate or cons.gives_check or cons.is_capture:
        return True
    if comparison.eval_gap_vs_best_cp >= 150:
        return True
    if comparison.played_candidate_type.value == "TACTICAL":
        return True
    return any(
        p in (CandidatePurpose.CREATE_THREAT, CandidatePurpose.WIN_MATERIAL, CandidatePurpose.ANSWER_THREAT)
        for p in comparison.played_purposes
    )


def _is_practical_decision(comparison: PlayedVsCandidates) -> bool:
    if len(comparison.diffs) < 2:
        return False
    gaps = sorted(abs(d.eval_gap_cp) for d in comparison.diffs if not d.same_move)
    if not gaps:
        return False
    return gaps[0] <= 25 and comparison.eval_gap_vs_best_cp <= 25


def _is_technical_decision(comparison: PlayedVsCandidates) -> bool:
    score = comparison.played.player_score.as_cp_units()
    if score < 400:
        return False
    cons = comparison.played_consequence
    return not cons.gives_check and not cons.is_mate
