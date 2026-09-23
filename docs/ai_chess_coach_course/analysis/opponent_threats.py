"""F07-022 — opponent threats to king, material, and structure (07.1 MVP §25)."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Literal

import chess

from analysis.game_models import PlayerColor, parse_player_color
from coaching.diagnosis.board_utils import PIECE_VALUES, attacked_undefended

ThreatCategory = Literal["KING", "MATERIAL", "STRUCTURE"]
ThreatSeverity = Literal["LOW", "MEDIUM", "HIGH"]


class ThreatCode(str, Enum):
    IN_CHECK = "IN_CHECK"
    MATE_IN_ONE = "MATE_IN_ONE"
    CHECK_THREAT = "CHECK_THREAT"
    HANGING_PIECE = "HANGING_PIECE"
    CAPTURE_THREAT = "CAPTURE_THREAT"
    PAWN_BREAK = "PAWN_BREAK"
    OPEN_LINE = "OPEN_LINE"
    ENGINE_PV = "ENGINE_PV"


@dataclass(frozen=True)
class OpponentThreat:
    category: ThreatCategory
    code: ThreatCode
    severity: ThreatSeverity
    square: str | None
    san_hint: str | None
    detail: str


@dataclass(frozen=True)
class OpponentThreatReport:
    fen: str
    player_color: PlayerColor
    threats: tuple[OpponentThreat, ...]
    max_severity: ThreatSeverity

    def to_dict(self) -> dict[str, Any]:
        return {
            "fen": self.fen,
            "player_color": self.player_color.upper(),
            "max_severity": self.max_severity,
            "threats": [
                {
                    "category": t.category,
                    "code": t.code.value,
                    "severity": t.severity,
                    "square": t.square,
                    "san_hint": t.san_hint,
                    "detail": t.detail,
                }
                for t in self.threats
            ],
        }


def detect_opponent_threats(
    fen: str,
    player_color: PlayerColor | str,
    *,
    opponent_pv_san: tuple[str, ...] = (),
    fullmove_number: int | None = None,
    hanging_min_value: int = 3,
) -> OpponentThreatReport:
    """List threats the opponent poses to the analyzed player at ``fen``."""
    board = chess.Board(fen)
    color = (
        player_color
        if player_color in ("white", "black")
        else parse_player_color(player_color)
    )
    player = chess.WHITE if color == "white" else chess.BLACK
    opponent = not player

    threats: list[OpponentThreat] = []
    if board.turn == player and board.is_check():
        threats.append(
            OpponentThreat(
                category="KING",
                code=ThreatCode.IN_CHECK,
                severity="HIGH",
                square=chess.square_name(board.king(player) or chess.E1),
                san_hint=None,
                detail="Player king is in check.",
            )
        )

    for sq, piece in attacked_undefended(board, player, min_value=hanging_min_value):
        sev: ThreatSeverity = "HIGH" if PIECE_VALUES.get(piece.piece_type, 0) >= 5 else "MEDIUM"
        threats.append(
            OpponentThreat(
                category="MATERIAL",
                code=ThreatCode.HANGING_PIECE,
                severity=sev,
                square=chess.square_name(sq),
                san_hint=None,
                detail=f"Undefended {chess.piece_name(piece.piece_type)} on {chess.square_name(sq)}.",
            )
        )

    opp_board = _board_if_opponent_to_move(board)
    seen: set[tuple[str, str | None]] = set()
    for move in opp_board.legal_moves:
        capture = opp_board.is_capture(move)
        piece_before = opp_board.piece_at(move.to_square)
        san_hint = opp_board.san(move)
        pawn_break = _is_pawn_break_threat(opp_board, move, player)
        opp_board.push(move)
        if opp_board.is_checkmate():
            _add_unique(
                threats,
                seen,
                OpponentThreat(
                    category="KING",
                    code=ThreatCode.MATE_IN_ONE,
                    severity="HIGH",
                    square=chess.square_name(move.to_square),
                    san_hint=san_hint,
                    detail="Opponent has a mating move.",
                ),
            )
        elif opp_board.is_check():
            _add_unique(
                threats,
                seen,
                OpponentThreat(
                    category="KING",
                    code=ThreatCode.CHECK_THREAT,
                    severity="HIGH",
                    square=chess.square_name(move.to_square),
                    san_hint=san_hint,
                    detail="Opponent can give check.",
                ),
            )
        elif capture and piece_before and piece_before.color == player:
            val = PIECE_VALUES.get(piece_before.piece_type, 1)
            sev = "HIGH" if val >= 5 else "MEDIUM" if val >= 3 else "LOW"
            _add_unique(
                threats,
                seen,
                OpponentThreat(
                    category="MATERIAL",
                    code=ThreatCode.CAPTURE_THREAT,
                    severity=sev,
                    square=chess.square_name(move.to_square),
                    san_hint=san_hint,
                    detail=f"Opponent can capture on {chess.square_name(move.to_square)}.",
                ),
            )
        elif pawn_break:
            _add_unique(
                threats,
                seen,
                OpponentThreat(
                    category="STRUCTURE",
                    code=ThreatCode.PAWN_BREAK,
                    severity="MEDIUM",
                    square=chess.square_name(move.to_square),
                    san_hint=san_hint,
                    detail="Pawn lever changes pawn structure.",
                ),
            )
        opp_board.pop()

    if opponent_pv_san:
        first = opponent_pv_san[0]
        if "+" in first or "#" in first:
            threats.append(
                OpponentThreat(
                    category="KING",
                    code=ThreatCode.ENGINE_PV,
                    severity="HIGH",
                    square=None,
                    san_hint=first,
                    detail="Engine PV starts with a check.",
                )
            )
        elif "x" in first:
            threats.append(
                OpponentThreat(
                    category="MATERIAL",
                    code=ThreatCode.ENGINE_PV,
                    severity="MEDIUM",
                    square=None,
                    san_hint=first,
                    detail="Engine PV starts with a capture.",
                )
            )

    max_sev = _max_severity(threats)
    return OpponentThreatReport(
        fen=board.fen(),
        player_color=color,
        threats=tuple(threats),
        max_severity=max_sev,
    )


def _add_unique(
    threats: list[OpponentThreat],
    seen: set[tuple[str, str | None]],
    threat: OpponentThreat,
) -> None:
    key = (threat.code.value, threat.square)
    if key in seen:
        return
    seen.add(key)
    threats.append(threat)


def _max_severity(threats: list[OpponentThreat]) -> ThreatSeverity:
    order = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
    if not threats:
        return "LOW"
    return max((t.severity for t in threats), key=lambda s: order[s])


def _board_if_opponent_to_move(board: chess.Board) -> chess.Board:
    parts = board.fen().split()
    parts[1] = "b" if board.turn == chess.WHITE else "w"
    return chess.Board(" ".join(parts))


def _is_pawn_break_threat(
    board: chess.Board,
    move: chess.Move,
    player: chess.Color,
) -> bool:
    piece = board.piece_at(move.from_square)
    if piece is None or piece.piece_type != chess.PAWN:
        return False
    if board.is_capture(move):
        return True
    for target in board.attacks(move.to_square):
        victim = board.piece_at(target)
        if victim and victim.piece_type == chess.PAWN and victim.color == player:
            return True
    return False
