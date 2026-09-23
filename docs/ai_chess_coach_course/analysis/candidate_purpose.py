"""F07-018 — structured chess objectives per candidate move (07.1 §10.4)."""

from __future__ import annotations

from enum import Enum

import chess

from analysis.notation import parse_legal_move


class CandidatePurpose(str, Enum):
    CREATE_THREAT = "CREATE_THREAT"
    ANSWER_THREAT = "ANSWER_THREAT"
    IMPROVE_WORST_PIECE = "IMPROVE_WORST_PIECE"
    COMPLETE_DEVELOPMENT = "COMPLETE_DEVELOPMENT"
    GAIN_SPACE = "GAIN_SPACE"
    OPEN_FILE = "OPEN_FILE"
    CONTROL_FILE = "CONTROL_FILE"
    OPEN_DIAGONAL = "OPEN_DIAGONAL"
    CONTROL_DIAGONAL = "CONTROL_DIAGONAL"
    CREATE_OUTPOST = "CREATE_OUTPOST"
    OCCUPY_OUTPOST = "OCCUPY_OUTPOST"
    PREPARE_PAWN_BREAK = "PREPARE_PAWN_BREAK"
    EXECUTE_PAWN_BREAK = "EXECUTE_PAWN_BREAK"
    CHANGE_PAWN_STRUCTURE = "CHANGE_PAWN_STRUCTURE"
    SIMPLIFY = "SIMPLIFY"
    AVOID_EXCHANGE = "AVOID_EXCHANGE"
    ACTIVATE_KING = "ACTIVATE_KING"
    IMPROVE_KING_SAFETY = "IMPROVE_KING_SAFETY"
    REDUCE_OPPONENT_ACTIVITY = "REDUCE_OPPONENT_ACTIVITY"
    MAINTAIN_INITIATIVE = "MAINTAIN_INITIATIVE"
    CREATE_COUNTERPLAY = "CREATE_COUNTERPLAY"
    WIN_MATERIAL = "WIN_MATERIAL"
    SACRIFICE_FOR_ACTIVITY = "SACRIFICE_FOR_ACTIVITY"
    TRANSITION_TO_ENDGAME = "TRANSITION_TO_ENDGAME"
    PREVENT_OPPONENT_PLAN = "PREVENT_OPPONENT_PLAN"
    CREATE_SECOND_WEAKNESS = "CREATE_SECOND_WEAKNESS"
    FIX_WEAKNESS = "FIX_WEAKNESS"
    ATTACK_WEAKNESS = "ATTACK_WEAKNESS"
    IMPROVE_COORDINATION = "IMPROVE_COORDINATION"


def classify_candidate_purposes(
    fen: str,
    move_uci: str,
    *,
    pv_san: tuple[str, ...] = (),
) -> tuple[CandidatePurpose, ...]:
    """Return one or more purposes for a legal move (primary first)."""
    board = chess.Board(fen)
    move = parse_legal_move(fen, move_uci)
    purposes: list[CandidatePurpose] = []

    if board.is_check():
        trial = board.copy()
        trial.push(move)
        if not trial.is_check():
            purposes.extend(
                [CandidatePurpose.ANSWER_THREAT, CandidatePurpose.IMPROVE_KING_SAFETY]
            )

    if board.is_capture(move):
        captured = board.piece_at(move.to_square)
        if board.is_en_passant(move):
            purposes.append(CandidatePurpose.WIN_MATERIAL)
        elif captured and captured.piece_type in (chess.ROOK, chess.QUEEN):
            purposes.extend([CandidatePurpose.WIN_MATERIAL, CandidatePurpose.SIMPLIFY])
        else:
            purposes.append(CandidatePurpose.WIN_MATERIAL)

    if board.gives_check(move):
        purposes.append(CandidatePurpose.CREATE_THREAT)

    if board.is_castling(move):
        purposes.extend(
            [CandidatePurpose.IMPROVE_KING_SAFETY, CandidatePurpose.COMPLETE_DEVELOPMENT]
        )

    if _is_pawn_break(board, move):
        purposes.append(CandidatePurpose.EXECUTE_PAWN_BREAK)

    if _develops_piece(board, move):
        purposes.append(CandidatePurpose.COMPLETE_DEVELOPMENT)

    if _rook_opens_or_controls_file(board, move):
        purposes.append(CandidatePurpose.CONTROL_FILE)

    if _reduces_opponent_pressure(board, move):
        purposes.append(CandidatePurpose.PREVENT_OPPONENT_PLAN)

    if _creates_threat(board, move):
        purposes.append(CandidatePurpose.CREATE_THREAT)

    if _improves_worst_piece(board, move):
        purposes.append(CandidatePurpose.IMPROVE_WORST_PIECE)

    if _pawn_gain_space(board, move):
        purposes.append(CandidatePurpose.GAIN_SPACE)

    if not purposes:
        purposes.append(CandidatePurpose.IMPROVE_COORDINATION)

    return _dedupe_preserve_order(purposes)


def purposes_differ(
    played: tuple[CandidatePurpose, ...],
    candidate: tuple[CandidatePurpose, ...],
) -> bool:
    return set(played) != set(candidate)


def _dedupe_preserve_order(items: list[CandidatePurpose]) -> tuple[CandidatePurpose, ...]:
    seen: set[CandidatePurpose] = set()
    out: list[CandidatePurpose] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            out.append(item)
    return tuple(out)


def _is_pawn_break(board: chess.Board, move: chess.Move) -> bool:
    piece = board.piece_at(move.from_square)
    if piece is None or piece.piece_type != chess.PAWN:
        return False
    if board.is_capture(move) or board.is_en_passant(move):
        return True
    prior: set[int] = set()
    for target in board.attacks(move.from_square):
        victim = board.piece_at(target)
        if victim and victim.piece_type == chess.PAWN and victim.color != piece.color:
            prior.add(target)
    trial = board.copy()
    trial.push(move)
    later: set[int] = set()
    for target in trial.attacks(move.to_square):
        victim = trial.piece_at(target)
        if victim and victim.piece_type == chess.PAWN and victim.color != piece.color:
            later.add(target)
    return bool(later - prior)


def _develops_piece(board: chess.Board, move: chess.Move) -> bool:
    piece = board.piece_at(move.from_square)
    if piece is None or piece.piece_type not in (chess.KNIGHT, chess.BISHOP):
        return False
    from_rank = chess.square_rank(move.from_square)
    home = 0 if board.turn == chess.WHITE else 7
    return from_rank == home and not board.is_capture(move)


def _rook_opens_or_controls_file(board: chess.Board, move: chess.Move) -> bool:
    piece = board.piece_at(move.from_square)
    if piece is None or piece.piece_type != chess.ROOK:
        return False
    file_idx = chess.square_file(move.to_square)
    trial = board.copy()
    trial.push(move)
    for sq in chess.SquareSet(chess.BB_FILES[file_idx]):
        p = trial.piece_at(sq)
        if p and p.piece_type == chess.PAWN:
            return False
    return True


def _reduces_opponent_pressure(board: chess.Board, move: chess.Move) -> bool:
    before = _count_attacked_pieces(board, board.turn)
    trial = board.copy()
    trial.push(move)
    after = _count_attacked_pieces(trial, board.turn)
    return after < before


def _count_attacked_pieces(board: chess.Board, color: chess.Color) -> int:
    count = 0
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if piece and piece.color == color and piece.piece_type != chess.KING:
            if board.is_attacked_by(not color, square):
                count += 1
    return count


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


def _improves_worst_piece(board: chess.Board, move: chess.Move) -> bool:
    piece = board.piece_at(move.from_square)
    return (
        piece is not None
        and piece.piece_type in (chess.KNIGHT, chess.BISHOP, chess.ROOK)
        and not board.is_capture(move)
        and not board.gives_check(move)
    )


def _pawn_gain_space(board: chess.Board, move: chess.Move) -> bool:
    piece = board.piece_at(move.from_square)
    if piece is None or piece.piece_type != chess.PAWN or board.is_capture(move):
        return False
    advance = move.to_square - move.from_square
    return abs(advance) in (8, 16) and not _is_pawn_break(board, move)
