"""F07-021 — structured position assessment (07.1 §7, MVP §25)."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Literal

import chess

from analysis.game_models import PlayerColor, parse_player_color

Advantage = Literal["player", "opponent", "balanced"]

_PIECE_CP = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 0,
}
_CENTER = {chess.E4, chess.E5, chess.D4, chess.D5}
_EXTENDED_CENTER = _CENTER | {chess.C3, chess.C4, chess.C5, chess.C6, chess.D3, chess.D6, chess.E3, chess.E6, chess.F3, chess.F4, chess.F5, chess.F6}


class AssessmentFactor(str, Enum):
    MATERIAL = "MATERIAL"
    KING_SAFETY = "KING_SAFETY"
    DEVELOPMENT = "DEVELOPMENT"
    SPACE = "SPACE"
    CENTER_CONTROL = "CENTER_CONTROL"
    PAWN_STRUCTURE = "PAWN_STRUCTURE"
    PIECE_ACTIVITY = "PIECE_ACTIVITY"
    PIECE_COORDINATION = "PIECE_COORDINATION"
    INITIATIVE = "INITIATIVE"
    WORST_PIECE = "WORST_PIECE"


@dataclass(frozen=True)
class FactorReading:
    factor: AssessmentFactor
    player: float
    opponent: float
    advantage: Advantage
    evidence: tuple[str, ...]


@dataclass(frozen=True)
class WorstPiece:
    side: PlayerColor
    square: str
    san: str
    mobility: int
    reason: str


@dataclass(frozen=True)
class PositionAssessment:
    fen: str
    player_color: PlayerColor
    factors: tuple[FactorReading, ...]
    worst_piece: WorstPiece | None

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "fen": self.fen,
            "player_color": self.player_color.upper(),
            "factors": {
                row.factor.value: {
                    "player": round(row.player, 3),
                    "opponent": round(row.opponent, 3),
                    "advantage": row.advantage,
                    "evidence": list(row.evidence),
                }
                for row in self.factors
            },
        }
        if self.worst_piece is not None:
            wp = self.worst_piece
            out["worst_piece"] = {
                "side": wp.side.upper(),
                "square": wp.square,
                "san": wp.san,
                "mobility": wp.mobility,
                "reason": wp.reason,
            }
        return out


def assess_position(
    fen: str,
    *,
    player_color: PlayerColor | str = "white",
    engine_cp_player: int | None = None,
) -> PositionAssessment:
    """Compute ten MVP positional factors from FEN (heuristic, no LLM)."""
    board = chess.Board(fen)
    color = (
        player_color
        if player_color in ("white", "black")
        else parse_player_color(player_color)
    )
    player = chess.WHITE if color == "white" else chess.BLACK
    opponent = not player

    material = _material_factor(board, player, engine_cp_player)
    king = _king_safety_factor(board, player, opponent)
    development = _development_factor(board, player, opponent)
    space = _space_factor(board, player, opponent)
    center = _center_control_factor(board, player, opponent)
    pawns = _pawn_structure_factor(board, player, opponent)
    activity = _piece_activity_factor(board, player, opponent)
    coordination = _coordination_factor(board, player, opponent)
    initiative = _initiative_factor(board, player, opponent)
    worst, worst_reading = _worst_piece_factor(board, player)

    factors = (
        material,
        king,
        development,
        space,
        center,
        pawns,
        activity,
        coordination,
        initiative,
        worst_reading,
    )
    return PositionAssessment(
        fen=board.fen(),
        player_color=color,
        factors=factors,
        worst_piece=worst,
    )


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _advantage(player: float, opponent: float, *, margin: float = 0.08) -> Advantage:
    if player - opponent >= margin:
        return "player"
    if opponent - player >= margin:
        return "opponent"
    return "balanced"


def _reading(
    factor: AssessmentFactor,
    player: float,
    opponent: float,
    *evidence: str,
) -> FactorReading:
    return FactorReading(
        factor=factor,
        player=_clamp01(player),
        opponent=_clamp01(opponent),
        advantage=_advantage(player, opponent),
        evidence=evidence,
    )


def _material_cp(board: chess.Board, color: chess.Color) -> int:
    total = 0
    for piece in board.piece_map().values():
        if piece.color == color:
            total += _PIECE_CP[piece.piece_type]
    return total


def _material_factor(
    board: chess.Board,
    player: chess.Color,
    engine_cp_player: int | None,
) -> FactorReading:
    diff = _material_cp(board, player) - _material_cp(board, not player)
    if engine_cp_player is not None:
        diff = int(round((diff + engine_cp_player) / 2))
    score = _clamp01(0.5 + diff / 1200.0)
    return _reading(
        AssessmentFactor.MATERIAL,
        score,
        1.0 - score,
        f"material_balance_cp={diff}",
    )


def _king_zone(board: chess.Board, color: chess.Color) -> set[chess.Square]:
    king_sq = board.king(color)
    if king_sq is None:
        return set()
    zone: set[chess.Square] = {king_sq}
    for delta in (-9, -8, -7, -1, 1, 7, 8, 9):
        sq = king_sq + delta
        if 0 <= sq < 64 and chess.square_distance(king_sq, sq) <= 2:
            zone.add(sq)
    return zone


def _king_safety_factor(
    board: chess.Board,
    player: chess.Color,
    opponent: chess.Color,
) -> FactorReading:
    def safety(color: chess.Color) -> float:
        zone = _king_zone(board, color)
        if not zone:
            return 0.5
        attacks = sum(
            1
            for sq in zone
            if board.is_attacked_by(not color, sq)
        )
        castled = board.has_kingside_castling_rights(color) or board.has_queenside_castling_rights(color)
        base = 0.85 - min(0.5, attacks * 0.08)
        if not castled and board.fullmove_number > 8:
            base -= 0.08
        return _clamp01(base)

    p = safety(player)
    o = safety(opponent)
    return _reading(
        AssessmentFactor.KING_SAFETY,
        p,
        o,
        "king_zone_attacks",
        "castling_rights",
    )


def _development_factor(
    board: chess.Board,
    player: chess.Color,
    opponent: chess.Color,
) -> FactorReading:
    def dev(color: chess.Color) -> float:
        home_rank = 0 if color == chess.WHITE else 7
        off_rank = 0
        total = 0
        for sq, piece in board.piece_map().items():
            if piece.color != color or piece.piece_type in (chess.PAWN, chess.KING):
                continue
            total += 1
            if chess.square_rank(sq) != home_rank:
                off_rank += 1
        if total == 0:
            return 0.5
        return off_rank / total

    return _reading(
        AssessmentFactor.DEVELOPMENT,
        dev(player),
        dev(opponent),
        "pieces_off_back_rank",
    )


def _space_factor(
    board: chess.Board,
    player: chess.Color,
    opponent: chess.Color,
) -> FactorReading:
    def space(color: chess.Color) -> float:
        ranks = range(4, 8) if color == chess.WHITE else range(0, 4)
        count = 0
        for sq in chess.SquareSet(chess.BB_ALL):
            if chess.square_rank(sq) in ranks:
                piece = board.piece_at(sq)
                if piece and piece.color == color and piece.piece_type == chess.PAWN:
                    count += 1
                elif board.is_attacked_by(color, sq):
                    count += 1
        return _clamp01(count / 24.0)

    return _reading(AssessmentFactor.SPACE, space(player), space(opponent), "pawn_and_controlled_squares")


def _center_control_factor(
    board: chess.Board,
    player: chess.Color,
    opponent: chess.Color,
) -> FactorReading:
    def control(color: chess.Color) -> float:
        score = 0.0
        for sq in _EXTENDED_CENTER:
            if board.is_attacked_by(color, sq):
                score += 0.5
            piece = board.piece_at(sq)
            if piece and piece.color == color:
                score += 1.0 if sq in _CENTER else 0.5
        return _clamp01(score / 8.0)

    return _reading(
        AssessmentFactor.CENTER_CONTROL,
        control(player),
        control(opponent),
        "center_and_extended_center",
    )


def _pawn_structure_factor(
    board: chess.Board,
    player: chess.Color,
    opponent: chess.Color,
) -> FactorReading:
    def structure(color: chess.Color) -> float:
        pawns = board.pieces(chess.PAWN, color)
        if not pawns:
            return 0.5
        penalty = 0
        files_with_pawn: dict[int, int] = {}
        for sq in chess.SquareSet(pawns):
            f = chess.square_file(sq)
            files_with_pawn[f] = files_with_pawn.get(f, 0) + 1
        for count in files_with_pawn.values():
            if count > 1:
                penalty += 1
        for sq in chess.SquareSet(pawns):
            f = chess.square_file(sq)
            if files_with_pawn.get(f, 0) == 1:
                neighbors = False
                for adj in (f - 1, f + 1):
                    if 0 <= adj <= 7 and files_with_pawn.get(adj, 0) > 0:
                        neighbors = True
                if not neighbors:
                    penalty += 1
        return _clamp01(1.0 - penalty / 6.0)

    return _reading(
        AssessmentFactor.PAWN_STRUCTURE,
        structure(player),
        structure(opponent),
        "doubled_and_isolated_pawns",
    )


def _mobility(board: chess.Board, color: chess.Color) -> int:
    count = 0
    for sq, piece in board.piece_map().items():
        if piece.color != color or piece.piece_type in (chess.PAWN, chess.KING):
            continue
        count += len(board.attacks(sq))
    return count


def _piece_activity_factor(
    board: chess.Board,
    player: chess.Color,
    opponent: chess.Color,
) -> FactorReading:
    p = _mobility(board, player)
    o = _mobility(board, opponent)
    total = max(1, p + o)
    return _reading(
        AssessmentFactor.PIECE_ACTIVITY,
        p / total,
        o / total,
        f"player_mobility={p}",
        f"opponent_mobility={o}",
    )


def _coordination_factor(
    board: chess.Board,
    player: chess.Color,
    opponent: chess.Color,
) -> FactorReading:
    def coord(color: chess.Color) -> float:
        links = 0
        rooks = list(chess.SquareSet(board.pieces(chess.ROOK, color)))
        for i, sq in enumerate(rooks):
            for other in rooks[i + 1 :]:
                if chess.square_rank(sq) == chess.square_rank(other) or chess.square_file(sq) == chess.square_file(other):
                    links += 1
        defended = 0
        for sq, piece in board.piece_map().items():
            if piece.color != color or piece.piece_type == chess.KING:
                continue
            if board.is_attacked_by(color, sq):
                defended += 1
        return _clamp01(0.4 + links * 0.15 + defended * 0.02)

    return _reading(
        AssessmentFactor.PIECE_COORDINATION,
        coord(player),
        coord(opponent),
        "rook_alignment_and_defended_pieces",
    )


def _initiative_factor(
    board: chess.Board,
    player: chess.Color,
    opponent: chess.Color,
) -> FactorReading:
    def init(color: chess.Color) -> float:
        score = 0.35
        if board.turn == color:
            score += 0.15
        if board.is_check() and board.turn != color:
            score += 0.25
        threats = 0
        for sq in chess.SQUARES:
            piece = board.piece_at(sq)
            if piece and piece.color != color and piece.piece_type != chess.KING:
                if board.is_attacked_by(color, sq):
                    threats += 1
        score += min(0.35, threats * 0.04)
        return _clamp01(score)

    return _reading(
        AssessmentFactor.INITIATIVE,
        init(player),
        init(opponent),
        "side_to_move",
        "threats_to_enemy_pieces",
    )


def _worst_piece_factor(
    board: chess.Board,
    player: chess.Color,
) -> tuple[WorstPiece | None, FactorReading]:
    color = player
    worst_sq: chess.Square | None = None
    worst_mob = 10_000
    for sq, piece in board.piece_map().items():
        if piece.color != color or piece.piece_type in (chess.PAWN, chess.KING):
            continue
        mob = len(board.attacks(sq))
        if mob < worst_mob:
            worst_mob = mob
            worst_sq = sq
    if worst_sq is None:
        reading = _reading(
            AssessmentFactor.WORST_PIECE,
            0.5,
            0.5,
            "no_minor_or_major_pieces",
        )
        return None, reading
    piece = board.piece_at(worst_sq)
    name = chess.piece_symbol(piece.piece_type).upper() if piece else "?"
    square = chess.square_name(worst_sq)
    wp = WorstPiece(
        side="white" if color == chess.WHITE else "black",
        square=square,
        san=f"{name}{square[0]}{square[1]}",
        mobility=worst_mob,
        reason="lowest_mobility_among_pieces",
    )
    score = _clamp01(0.25 + worst_mob / 20.0)
    reading = _reading(
        AssessmentFactor.WORST_PIECE,
        score,
        1.0 - score,
        f"worst_mobility={worst_mob}",
        f"square={square}",
    )
    return wp, reading
