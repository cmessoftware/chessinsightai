"""LS01-021 — tactical motifs and endgame material signatures from FEN geometry."""

from __future__ import annotations

import chess

from chess_statistics.phases import PHASE_ENDGAME, majors_and_minors

MOTIF_PIN = "pin"
MOTIF_FORK = "fork"

# Same cutoff as ``phase_from_piece_count`` middlegame vs endgame (<12 pieces total).
ENDGAME_MAX_PIECES = 12

_VALUABLE = {chess.KING, chess.QUEEN, chess.ROOK, chess.BISHOP, chess.KNIGHT}


def _board_from_fen(fen: str | None) -> chess.Board | None:
    text = str(fen or "").strip()
    if not text:
        return None
    try:
        return chess.Board(text)
    except ValueError:
        return None


def is_endgame_material(board: chess.Board) -> bool:
    """Reject crowded boards (e.g. 18 pieces) even if ply phase was tagged endgame."""
    return len(board.piece_map()) < ENDGAME_MAX_PIECES


def material_signature(board: chess.Board) -> str:
    """Tablebase-style label, e.g. ``KRPvsKR`` (white then black)."""

    def side(color: chess.Color) -> str:
        letters = []
        for piece_type, letter in (
            (chess.KING, "K"),
            (chess.QUEEN, "Q"),
            (chess.ROOK, "R"),
            (chess.BISHOP, "B"),
            (chess.KNIGHT, "N"),
            (chess.PAWN, "P"),
        ):
            count = len(board.pieces(piece_type, color))
            if count:
                letters.append(letter * count)
        return "".join(letters) or "K"

    return f"{side(chess.WHITE)}vs{side(chess.BLACK)}"


def endgame_signature_from_fen(fen: str | None, *, phase: str | None) -> str | None:
    if str(phase or "").lower() != PHASE_ENDGAME:
        return None
    board = _board_from_fen(fen)
    if board is None or not is_endgame_material(board):
        return None
    if majors_and_minors(board) > 6:
        return None
    return material_signature(board)


def _pin_motif(board: chess.Board) -> bool:
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if piece is None or piece.piece_type == chess.KING:
            continue
        if board.is_pinned(piece.color, square):
            return True
    return False


def _attacks_two_valuable(board: chess.Board, from_square: chess.Square, *, by_color: chess.Color) -> bool:
    hits = 0
    for target in board.attacks(from_square):
        victim = board.piece_at(target)
        if victim and victim.color != by_color and victim.piece_type in _VALUABLE:
            hits += 1
    return hits >= 2


def _fork_motif_for_color(board: chess.Board, color: chess.Color) -> bool:
    """Fork threat: double attack now or after one legal move by ``color``."""
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if piece and piece.color == color and _attacks_two_valuable(board, square, by_color=color):
            return True
    for move in board.legal_moves:
        if board.color_at(move.from_square) != color:
            continue
        board.push(move)
        if _attacks_two_valuable(board, move.to_square, by_color=color):
            board.pop()
            return True
        board.pop()
    return False


def tactical_motifs_from_fen(fen: str | None) -> list[str]:
    """Static motifs in the position (before the user's move)."""
    board = _board_from_fen(fen)
    if board is None:
        return []
    motifs: list[str] = []
    if _pin_motif(board):
        motifs.append(MOTIF_PIN)
    mover = board.turn
    if _fork_motif_for_color(board, mover):
        motifs.append(MOTIF_FORK)
    return motifs


def annotate_position_tags(
    fen: str | None,
    *,
    phase: str | None,
) -> dict[str, object]:
    motifs = tactical_motifs_from_fen(fen)
    signature = endgame_signature_from_fen(fen, phase=phase)
    return {
        "tactical_motifs": motifs,
        "endgame_signature": signature,
    }
