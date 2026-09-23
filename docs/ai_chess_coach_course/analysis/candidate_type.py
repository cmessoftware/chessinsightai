"""F07-017 — classify candidate moves (07-base candidate types)."""

from __future__ import annotations

from enum import Enum
from typing import Literal

import chess

from analysis.notation import parse_legal_move

CandidateTypeName = Literal[
    "TACTICAL",
    "DEFENSIVE",
    "BREAK",
    "IMPROVEMENT",
    "EXCHANGE",
    "PROPHYLAXIS",
]


class CandidateType(str, Enum):
    TACTICAL = "TACTICAL"
    DEFENSIVE = "DEFENSIVE"
    BREAK = "BREAK"
    IMPROVEMENT = "IMPROVEMENT"
    EXCHANGE = "EXCHANGE"
    PROPHYLAXIS = "PROPHYLAXIS"


def _is_pawn_break(board: chess.Board, move: chess.Move) -> bool:
    piece = board.piece_at(move.from_square)
    if piece is None or piece.piece_type != chess.PAWN:
        return False
    if board.is_capture(move) or board.is_en_passant(move):
        return True
    prior_attacks: set[int] = set()
    for target in board.attacks(move.from_square):
        victim = board.piece_at(target)
        if victim and victim.piece_type == chess.PAWN and victim.color != piece.color:
            prior_attacks.add(target)
    trial = board.copy()
    trial.push(move)
    later_attacks: set[int] = set()
    for target in trial.attacks(move.to_square):
        victim = trial.piece_at(target)
        if victim and victim.piece_type == chess.PAWN and victim.color != piece.color:
            later_attacks.add(target)
    return bool(later_attacks - prior_attacks)


def _creates_threat(board: chess.Board, move: chess.Move) -> bool:
    trial = board.copy()
    trial.push(move)
    opponent = not board.turn
    for square in chess.SQUARES:
        piece = trial.piece_at(square)
        if piece and piece.color == opponent and piece.piece_type != chess.KING:
            if trial.is_attacked_by(board.turn, square):
                return True
    return False


def _relieves_attack(board: chess.Board, move: chess.Move) -> bool:
    piece = board.piece_at(move.from_square)
    if piece is None:
        return False
    if not board.is_attacked_by(not board.turn, move.from_square):
        return False
    trial = board.copy()
    trial.push(move)
    return not trial.is_attacked_by(not board.turn, move.to_square)


def classify_candidate_type(fen: str, move_uci: str) -> CandidateType:
    """Heuristic 07-base candidate type for one legal move at ``fen``."""
    board = chess.Board(fen)
    move = parse_legal_move(fen, move_uci)

    if board.is_check():
        trial = board.copy()
        trial.push(move)
        if not trial.is_check():
            return CandidateType.DEFENSIVE

    if board.is_capture(move):
        captured = board.piece_at(move.to_square)
        if board.is_en_passant(move):
            return CandidateType.TACTICAL
        if captured and captured.piece_type in (chess.ROOK, chess.QUEEN):
            return CandidateType.EXCHANGE
        return CandidateType.TACTICAL

    if board.gives_check(move):
        return CandidateType.TACTICAL

    if _is_pawn_break(board, move):
        return CandidateType.BREAK

    if _relieves_attack(board, move):
        return CandidateType.DEFENSIVE

    if _creates_threat(board, move):
        return CandidateType.TACTICAL

    if _blocks_opponent_pressure(board, move):
        return CandidateType.PROPHYLAXIS

    return CandidateType.IMPROVEMENT


def _blocks_opponent_pressure(board: chess.Board, move: chess.Move) -> bool:
    """Quiet move that reduces opponent checks or attacks on our pieces."""
    before_checks = board.is_check()
    attacked_before = _count_attacked_pieces(board, board.turn)
    trial = board.copy()
    trial.push(move)
    if before_checks and not trial.is_check():
        return True
    attacked_after = _count_attacked_pieces(trial, board.turn)
    return attacked_after < attacked_before


def _count_attacked_pieces(board: chess.Board, color: chess.Color) -> int:
    count = 0
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if piece and piece.color == color and piece.piece_type != chess.KING:
            if board.is_attacked_by(not color, square):
                count += 1
    return count
