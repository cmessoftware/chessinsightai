"""F07-006+ — engine-side critical-position triggers (not human E1–E11)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import chess

from analysis.engine_eval import EvaluationLoss, NormalizedPlyEval, ply_evaluation_loss
from analysis.multipv import MultiPVResult, analyze_multipv

EngineTriggerCode = Literal[
    "EVALUATION_DROP",
    "ONLY_MOVE",
    "POSITION_TRANSFORMATION",
    "IMMEDIATE_THREAT",
    "IRREVERSIBLE_DECISION",
]

EVALUATION_DROP: EngineTriggerCode = "EVALUATION_DROP"
ONLY_MOVE: EngineTriggerCode = "ONLY_MOVE"
POSITION_TRANSFORMATION: EngineTriggerCode = "POSITION_TRANSFORMATION"
IMMEDIATE_THREAT: EngineTriggerCode = "IMMEDIATE_THREAT"
IRREVERSIBLE_DECISION: EngineTriggerCode = "IRREVERSIBLE_DECISION"
DEFAULT_EVALUATION_DROP_CP = 150
DEFAULT_ONLY_MOVE_GAP_CP = 150
ONLY_MOVE_SOLE_LEGAL_GAP = 100_000


@dataclass(frozen=True)
class EngineTrigger:
    """One engine trigger decision (F07-006+)."""

    code: EngineTriggerCode
    fired: bool
    eval_loss: int
    threshold_cp: int
    detail: str = ""


def evaluation_drop_trigger(
    loss: EvaluationLoss | int,
    *,
    threshold_cp: int = DEFAULT_EVALUATION_DROP_CP,
) -> EngineTrigger:
    """Fire ``EVALUATION_DROP`` when player-POV ``eval_loss`` meets the threshold."""
    eval_loss = loss.eval_loss if isinstance(loss, EvaluationLoss) else int(loss)
    if threshold_cp < 0:
        raise ValueError("threshold_cp must be >= 0")
    return EngineTrigger(
        code=EVALUATION_DROP,
        fired=eval_loss >= threshold_cp,
        eval_loss=eval_loss,
        threshold_cp=threshold_cp,
    )


def ply_evaluation_drop(
    ply_eval: NormalizedPlyEval,
    *,
    threshold_cp: int = DEFAULT_EVALUATION_DROP_CP,
    mate_cp: int = 100_000,
) -> EngineTrigger:
    """F07-005 loss + F07-006 trigger for a player-normalized ply."""
    return evaluation_drop_trigger(
        ply_evaluation_loss(ply_eval, mate_cp=mate_cp),
        threshold_cp=threshold_cp,
    )


def only_move_trigger(
    result: MultiPVResult,
    *,
    gap_cp: int = DEFAULT_ONLY_MOVE_GAP_CP,
    fen: str | None = None,
) -> EngineTrigger:
    """Fire ``ONLY_MOVE`` when there is one legal move or one sufficient MultiPV line.

    Sufficient means PV1 is at least ``gap_cp`` better than PV2 (player POV).
    """
    if gap_cp < 0:
        raise ValueError("gap_cp must be >= 0")
    board = chess.Board(fen or result.fen)
    legal = board.legal_moves.count()
    if legal == 1:
        return EngineTrigger(
            code=ONLY_MOVE,
            fired=True,
            eval_loss=ONLY_MOVE_SOLE_LEGAL_GAP,
            threshold_cp=gap_cp,
        )
    if len(result.lines) < 2:
        fired = len(result.lines) == 1
        return EngineTrigger(
            code=ONLY_MOVE,
            fired=fired,
            eval_loss=ONLY_MOVE_SOLE_LEGAL_GAP if fired else 0,
            threshold_cp=gap_cp,
        )
    gap = max(
        0,
        int(
            result.lines[0].player_score.as_cp_units()
            - result.lines[1].player_score.as_cp_units()
        ),
    )
    return EngineTrigger(
        code=ONLY_MOVE,
        fired=gap >= gap_cp,
        eval_loss=gap,
        threshold_cp=gap_cp,
    )


def ply_only_move(
    fen: str,
    *,
    engine=None,
    depth: int = 12,
    multipv: int = 3,
    player_color=None,
    gap_cp: int = DEFAULT_ONLY_MOVE_GAP_CP,
    multipv_result: MultiPVResult | None = None,
) -> EngineTrigger:
    """F07-007 on a FEN (runs MultiPV unless ``multipv_result`` is provided)."""
    result = multipv_result or analyze_multipv(
        fen,
        engine=engine,
        depth=depth,
        multipv=multipv,
        player_color=player_color,
    )
    return only_move_trigger(result, gap_cp=gap_cp, fen=fen)


def _pawn_attacks_enemy_pawns(board: chess.Board, square: int, color: chess.Color) -> set[int]:
    hits: set[int] = set()
    for target in board.attacks(square):
        piece = board.piece_at(target)
        if piece and piece.piece_type == chess.PAWN and piece.color != color:
            hits.add(target)
    return hits


def _is_pawn_break(before: chess.Board, move: chess.Move) -> bool:
    piece = before.piece_at(move.from_square)
    if piece is None or piece.piece_type != chess.PAWN:
        return False
    if before.is_capture(move) or before.is_en_passant(move):
        return True
    prior = _pawn_attacks_enemy_pawns(before, move.from_square, piece.color)
    after = before.copy()
    after.push(move)
    later = _pawn_attacks_enemy_pawns(after, move.to_square, piece.color)
    return bool(later - prior)


def _king_shield_pawns(board: chess.Board, color: chess.Color) -> int:
    king = board.king(color)
    if king is None:
        return 0
    file = chess.square_file(king)
    rank = chess.square_rank(king)
    direction = 1 if color == chess.WHITE else -1
    count = 0
    for delta_file in (-1, 0, 1):
        col = file + delta_file
        if not 0 <= col <= 7:
            continue
        for dist in (1, 2):
            row = rank + direction * dist
            if not 0 <= row <= 7:
                continue
            occupant = board.piece_at(chess.square(col, row))
            if occupant and occupant.piece_type == chess.PAWN and occupant.color == color:
                count += 1
    return count


def _opposite_wings(board: chess.Board) -> bool:
    white_king = board.king(chess.WHITE)
    black_king = board.king(chess.BLACK)
    if white_king is None or black_king is None:
        return False
    return abs(chess.square_file(white_king) - chess.square_file(black_king)) >= 4


def _king_exposure_tags(before: chess.Board, move: chess.Move, after: chess.Board) -> list[str]:
    tags: list[str] = []
    for color in (chess.WHITE, chess.BLACK):
        home = chess.E1 if color == chess.WHITE else chess.E8
        if before.king(color) == home:
            continue
        if _king_shield_pawns(after, color) < _king_shield_pawns(before, color):
            tags.append("SHIELD_DROP")
            break
    if before.is_castling(move) and _opposite_wings(after):
        tags.append("OPPOSITE_CASTLING")
    piece = before.piece_at(move.from_square)
    if piece and piece.piece_type == chess.KING and not before.is_castling(move):
        tags.append("KING_WALK")
    return tags


def position_transformation_tags(fen_before: str, move_uci: str) -> tuple[str, ...]:
    """Observable character-change tags for one ply (F07-008)."""
    board = chess.Board(fen_before)
    move = chess.Move.from_uci(move_uci)
    if move not in board.legal_moves:
        raise ValueError(f"Illegal move {move_uci} in {fen_before}")
    after = board.copy()
    after.push(move)
    tags: list[str] = []
    if _is_pawn_break(board, move):
        tags.append("PAWN_BREAK")
    tags.extend(_king_exposure_tags(board, move, after))
    return tuple(tags)


def position_transformation_trigger(
    fen_before: str,
    move_uci: str,
) -> EngineTrigger:
    """Fire ``POSITION_TRANSFORMATION`` on a pawn break or king exposure."""
    tags = position_transformation_tags(fen_before, move_uci)
    return EngineTrigger(
        code=POSITION_TRANSFORMATION,
        fired=bool(tags),
        eval_loss=1 if tags else 0,
        threshold_cp=1,
        detail=",".join(tags),
    )


def _color_from_side(side_to_move: str | chess.Color) -> chess.Color:
    if isinstance(side_to_move, chess.Color):
        return side_to_move
    return chess.WHITE if str(side_to_move).casefold() == "white" else chess.BLACK


def _board_if_opponent_to_move(board: chess.Board) -> chess.Board:
    parts = board.fen().split()
    parts[1] = "b" if board.turn == chess.WHITE else "w"
    return chess.Board(" ".join(parts))


def _opponent_forcing_check_if_pass(board: chess.Board, player: chess.Color) -> bool:
    """True if opponent could give check were it their turn (pass-move proxy)."""
    if board.turn != player or board.is_check():
        return False
    opp_board = _board_if_opponent_to_move(board)
    for move in opp_board.legal_moves:
        opp_board.push(move)
        if opp_board.is_check():
            opp_board.pop()
            return True
        opp_board.pop()
    return False


def immediate_threat_tags(
    fen: str,
    player_color: chess.Color | str,
    *,
    hanging_min_value: int = 3,
    fullmove_number: int | None = None,
    forcing_check_after_fullmove: int = 10,
) -> tuple[str, ...]:
    """Board threats the player must address before deciding (F07-009)."""
    player = _color_from_side(player_color)
    board = chess.Board(fen)
    if board.turn != player:
        return ()

    tags: list[str] = []
    if board.is_check():
        tags.append("IN_CHECK")

    from coaching.diagnosis.board_utils import attacked_undefended

    hanging = attacked_undefended(board, player, min_value=hanging_min_value)
    for square, piece in hanging[:3]:
        name = chess.piece_name(piece.piece_type)
        tags.append(f"HANGING_{name.upper()}_{chess.square_name(square)}")

    if fullmove_number is None or fullmove_number > forcing_check_after_fullmove:
        if _opponent_forcing_check_if_pass(board, player):
            tags.append("FORCING_CHECK")

    return tuple(tags)


def immediate_threat_trigger(
    fen: str,
    player_color: chess.Color | str,
    *,
    hanging_min_value: int = 3,
    fullmove_number: int | None = None,
) -> EngineTrigger:
    """Fire ``IMMEDIATE_THREAT`` on check, hanging material, or forcing check."""
    tags = immediate_threat_tags(
        fen,
        player_color,
        hanging_min_value=hanging_min_value,
        fullmove_number=fullmove_number,
    )
    return EngineTrigger(
        code=IMMEDIATE_THREAT,
        fired=bool(tags),
        eval_loss=len(tags),
        threshold_cp=1,
        detail=",".join(tags),
    )


def ply_immediate_threat(
    fen_before: str,
    *,
    player_color: chess.Color | str,
    fullmove_number: int | None = None,
) -> EngineTrigger:
    """F07-009 at ``fen_before`` (player to move)."""
    return immediate_threat_trigger(
        fen_before, player_color, fullmove_number=fullmove_number
    )


def _captured_piece(board: chess.Board, move: chess.Move) -> chess.Piece | None:
    if board.is_en_passant(move):
        return chess.Piece(chess.PAWN, not board.turn)
    return board.piece_at(move.to_square)


def irreversible_decision_tags(
    fen_before: str,
    move_uci: str,
    *,
    fullmove_number: int | None = None,
    opening_fullmove_cap: int = 10,
) -> tuple[str, ...]:
    """Commitment signals for the played move (F07-010)."""
    board = chess.Board(fen_before)
    move = chess.Move.from_uci(move_uci)
    if move not in board.legal_moves:
        raise ValueError(f"Illegal move {move_uci} in {fen_before}")

    from coaching.diagnosis.board_utils import PIECE_VALUES

    mover = board.piece_at(move.from_square)
    if mover is None:
        return ()

    tags: list[str] = []
    captured = _captured_piece(board, move)

    if board.is_capture(move) and captured is not None:
        cap_value = PIECE_VALUES.get(captured.piece_type, 0)
        mover_value = PIECE_VALUES.get(mover.piece_type, 0)
        if cap_value >= 5:
            tags.append("MAJOR_CAPTURE")
        if captured.piece_type == chess.QUEEN:
            tags.append("QUEEN_EXCHANGE")
        if mover_value >= 3 and cap_value <= 1:
            tags.append("MATERIAL_SACRIFICE")

    if mover.piece_type == chess.PAWN:
        to_rank = chess.square_rank(move.to_square)
        from_rank = chess.square_rank(move.from_square)
        if move.promotion:
            tags.append("PROMOTION")
        elif abs(to_rank - from_rank) == 2:
            if fullmove_number is None or fullmove_number > opening_fullmove_cap:
                tags.append("PAWN_DOUBLE_STEP")
        elif mover.color == chess.WHITE and to_rank >= 4:
            tags.append("IRREVERSIBLE_PAWN")
        elif mover.color == chess.BLACK and to_rank <= 3:
            tags.append("IRREVERSIBLE_PAWN")

    return tuple(dict.fromkeys(tags))


def irreversible_decision_trigger(
    fen_before: str,
    move_uci: str,
    *,
    fullmove_number: int | None = None,
) -> EngineTrigger:
    """Fire ``IRREVERSIBLE_DECISION`` on sac, major exchange, or deep pawn push."""
    tags = irreversible_decision_tags(
        fen_before, move_uci, fullmove_number=fullmove_number
    )
    return EngineTrigger(
        code=IRREVERSIBLE_DECISION,
        fired=bool(tags),
        eval_loss=len(tags),
        threshold_cp=1,
        detail=",".join(tags),
    )


def ply_irreversible_decision(
    fen_before: str,
    uci: str,
    *,
    fullmove_number: int | None = None,
) -> EngineTrigger:
    """F07-010 for one player ply."""
    return irreversible_decision_trigger(
        fen_before, uci, fullmove_number=fullmove_number
    )
