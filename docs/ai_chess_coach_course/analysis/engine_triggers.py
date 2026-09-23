"""F07-006+ — engine-side critical-position triggers (not human E1–E11)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import chess

from analysis.engine_eval import EvaluationLoss, NormalizedPlyEval, ply_evaluation_loss
from analysis.multipv import MultiPVResult, analyze_multipv

EngineTriggerCode = Literal["EVALUATION_DROP", "ONLY_MOVE", "POSITION_TRANSFORMATION"]

EVALUATION_DROP: EngineTriggerCode = "EVALUATION_DROP"
ONLY_MOVE: EngineTriggerCode = "ONLY_MOVE"
POSITION_TRANSFORMATION: EngineTriggerCode = "POSITION_TRANSFORMATION"
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


<<<<<<< Updated upstream
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
=======
_CENTRAL_FILES = frozenset({chess.C, chess.D, chess.E, chess.F})


def _player_color_from_ply(side_to_move: str | chess.Color) -> chess.Color:
    if isinstance(side_to_move, chess.Color):
        return side_to_move
    return chess.WHITE if str(side_to_move).casefold() == "white" else chess.BLACK


def position_transformation_evidence(
    fen_before: str,
    uci: str,
    player_color: chess.Color | str,
) -> tuple[str, ...]:
    """Structural / king-character signals for F07-008 (board evidence only)."""
    player = _player_color_from_ply(player_color)
    board = chess.Board(fen_before)
    if board.turn != player:
        return ()
    try:
        move = chess.Move.from_uci(uci)
    except ValueError:
        return ()
    if move not in board.legal_moves:
        return ()

    before_king_attacked = _king_attacked(board, player)
    piece = board.piece_at(move.from_square)
    if piece is None:
        return ()
    captured = board.piece_at(move.to_square)
    after_board = board.copy()
    after_board.push(move)
    after_king_attacked = _king_attacked(after_board, player)

    evidence: list[str] = []

    if piece.piece_type == chess.PAWN:
        if captured is not None and captured.piece_type == chess.PAWN:
            evidence.append(
                f"pawn exchange on {chess.square_name(move.to_square)}"
            )
        to_file = chess.square_file(move.to_square)
        to_rank = chess.square_rank(move.to_square)
        if to_file in _CENTRAL_FILES:
            if player == chess.WHITE and to_rank >= chess.RANK_4:
                evidence.append(f"central pawn advance to {chess.square_name(move.to_square)}")
            if player == chess.BLACK and to_rank <= chess.RANK_5:
                evidence.append(f"central pawn advance to {chess.square_name(move.to_square)}")

    if piece.piece_type == chess.KING:
        to_file = chess.square_file(move.to_square)
        if to_file in (chess.D, chess.E):
            evidence.append(
                f"king moved to central square {chess.square_name(move.to_square)}"
            )

    if not before_king_attacked and after_king_attacked:
        king_sq = after_board.king(player)
        sq_name = chess.square_name(king_sq) if king_sq is not None else "?"
        evidence.append(f"king on {sq_name} is newly attacked")

    if piece.piece_type == chess.KING:
        if (
            board.has_kingside_castling_rights(player)
            and not after_board.has_kingside_castling_rights(player)
        ) or (
            board.has_queenside_castling_rights(player)
            and not after_board.has_queenside_castling_rights(player)
        ):
            evidence.append("castling rights lost on king move")

    return tuple(dict.fromkeys(evidence))


def _king_attacked(board: chess.Board, player: chess.Color) -> bool:
    king_sq = board.king(player)
    if king_sq is None:
        return False
    return board.is_attacked_by(not player, king_sq)
>>>>>>> Stashed changes


def position_transformation_trigger(
    fen_before: str,
<<<<<<< Updated upstream
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
=======
    uci: str,
    player_color: chess.Color | str,
) -> EngineTrigger:
    """Fire ``POSITION_TRANSFORMATION`` when pawn break or king exposure signals exist."""
    evidence = position_transformation_evidence(fen_before, uci, player_color)
    fired = bool(evidence)
    detail = "; ".join(evidence) if evidence else ""
    return EngineTrigger(
        code=POSITION_TRANSFORMATION,
        fired=fired,
        eval_loss=len(evidence),
        threshold_cp=1,
        detail=detail,
    )


def ply_position_transformation(
    fen_before: str,
    uci: str,
    *,
    player_color: chess.Color | str,
) -> EngineTrigger:
    """F07-008 on one player ply (``fen_before`` + played ``uci``)."""
    return position_transformation_trigger(fen_before, uci, player_color)
>>>>>>> Stashed changes
