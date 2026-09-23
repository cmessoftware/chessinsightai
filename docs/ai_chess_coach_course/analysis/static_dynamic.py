"""F07-023 — static vs dynamic position character (07.1 §8)."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import TYPE_CHECKING, Any, Literal

import chess

from analysis.candidate_purpose import CandidatePurpose
from analysis.game_models import PlayerColor, parse_player_color
from analysis.opponent_threats import OpponentThreatReport, ThreatCode, detect_opponent_threats
from analysis.position_assessment import PositionAssessment, AssessmentFactor, assess_position

from analysis.criticality import PlyCriticality

if TYPE_CHECKING:
    from analysis.comparison import PlayedVsCandidates

StaticOutlook = Literal["better", "balanced", "worse"]
DynamicResources = Literal["available", "limited", "none"]


class PositionCharacter(str, Enum):
    TACTICAL_RESOLUTION = "TACTICAL_RESOLUTION"
    DYNAMIC_ACTION_REQUIRED = "DYNAMIC_ACTION_REQUIRED"
    STATIC_IMPROVEMENT = "STATIC_IMPROVEMENT"
    DEFENSIVE_URGENCY = "DEFENSIVE_URGENCY"
    PROPHYLACTIC_DECISION = "PROPHYLACTIC_DECISION"
    TECHNICAL_CONVERSION = "TECHNICAL_CONVERSION"
    TRANSITION_DECISION = "TRANSITION_DECISION"
    BALANCED_FLEXIBLE = "BALANCED_FLEXIBLE"


@dataclass(frozen=True)
class StaticDynamicEvaluation:
    position_character: PositionCharacter
    static_outlook: StaticOutlook
    dynamic_resources: DynamicResources
    requires_dynamic_action: bool
    urgency: float
    reasons: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "position_character": self.position_character.value,
            "static_outlook": self.static_outlook,
            "dynamic_resources": self.dynamic_resources,
            "requires_dynamic_action": self.requires_dynamic_action,
            "urgency": round(self.urgency, 2),
            "reasons": list(self.reasons),
        }


def evaluate_static_dynamic(
    fen: str,
    player_color: PlayerColor | str,
    *,
    comparison: PlayedVsCandidates | None = None,
    assessment: PositionAssessment | None = None,
    opponent_threats: OpponentThreatReport | None = None,
    criticality: PlyCriticality | None = None,
    engine_cp_player: int | None = None,
) -> StaticDynamicEvaluation:
    """Classify whether the player should act dynamically or improve statically."""
    board = chess.Board(fen)
    color = (
        player_color
        if player_color in ("white", "black")
        else parse_player_color(player_color)
    )
    player = chess.WHITE if color == "white" else chess.BLACK

    asm = assessment or assess_position(
        fen, player_color=color, engine_cp_player=engine_cp_player
    )
    threats = opponent_threats or detect_opponent_threats(fen, color)

    static_outlook = _static_outlook(asm)
    dynamic_resources = _dynamic_resources(asm, comparison)
    urgency = _urgency(board, player, threats, comparison, criticality)
    reasons: list[str] = []

    if board.turn == player and board.is_check():
        reasons.append("player_in_check")
        return _finish(
            PositionCharacter.TACTICAL_RESOLUTION,
            static_outlook,
            dynamic_resources,
            urgency,
            True,
            reasons,
        )

    if threats.max_severity == "HIGH" and any(
        t.code in (ThreatCode.IN_CHECK, ThreatCode.MATE_IN_ONE, ThreatCode.CHECK_THREAT)
        for t in threats.threats
    ):
        reasons.append("opponent_threat_severity_high")
        reasons.append("king_pressure")
        return _finish(
            PositionCharacter.DEFENSIVE_URGENCY,
            static_outlook,
            dynamic_resources,
            max(urgency, 0.75),
            True,
            reasons,
        )

    if comparison and _is_tactical_comparison(comparison):
        reasons.append("forcing_tactical_difference")
        return _finish(
            PositionCharacter.TACTICAL_RESOLUTION,
            static_outlook,
            dynamic_resources,
            max(urgency, 0.7),
            True,
            reasons,
        )

    if _has_pawn_break(comparison) or _trigger_position_change(criticality):
        reasons.append("pawn_break_or_transformation")
        reasons.append("opponent_can_consolidate")
        return _finish(
            PositionCharacter.DYNAMIC_ACTION_REQUIRED,
            static_outlook,
            dynamic_resources,
            max(urgency, 0.65),
            True,
            reasons,
        )

    if (
        static_outlook == "worse"
        and dynamic_resources == "available"
        and _initiative_player(asm) >= 0.55
    ):
        reasons.extend(
            [
                "inferior_long_term_structure",
                "temporary_piece_activity",
            ]
        )
        return _finish(
            PositionCharacter.DYNAMIC_ACTION_REQUIRED,
            static_outlook,
            dynamic_resources,
            max(urgency, 0.6),
            True,
            reasons,
        )

    if threats.max_severity in ("MEDIUM", "HIGH") and _prophylactic_signal(comparison):
        reasons.append("opponent_plan_must_be_addressed")
        return _finish(
            PositionCharacter.PROPHYLACTIC_DECISION,
            static_outlook,
            dynamic_resources,
            max(urgency, 0.55),
            dynamic_resources != "none",
            reasons,
        )

    if engine_cp_player is not None and engine_cp_player >= 400 and urgency < 0.45:
        reasons.append("stable_advantage")
        return _finish(
            PositionCharacter.TECHNICAL_CONVERSION,
            static_outlook,
            dynamic_resources,
            urgency,
            False,
            reasons,
        )

    if (
        threats.max_severity == "LOW"
        and urgency < 0.4
        and _worst_piece_can_improve(asm)
    ):
        reasons.append("worst_piece_can_be_improved")
        reasons.append("no_immediate_tactics")
        return _finish(
            PositionCharacter.STATIC_IMPROVEMENT,
            static_outlook,
            dynamic_resources,
            urgency,
            False,
            reasons,
        )

    if _is_endgame_transition(board):
        reasons.append("endgame_transition")
        return _finish(
            PositionCharacter.TRANSITION_DECISION,
            static_outlook,
            dynamic_resources,
            urgency,
            dynamic_resources == "available",
            reasons,
        )

    reasons.append("no_dominant_urgency_signal")
    return _finish(
        PositionCharacter.BALANCED_FLEXIBLE,
        static_outlook,
        dynamic_resources,
        urgency,
        dynamic_resources == "available" and static_outlook == "worse",
        reasons,
    )


def _finish(
    character: PositionCharacter,
    static_outlook: StaticOutlook,
    dynamic_resources: DynamicResources,
    urgency: float,
    requires_dynamic: bool,
    reasons: list[str],
) -> StaticDynamicEvaluation:
    return StaticDynamicEvaluation(
        position_character=character,
        static_outlook=static_outlook,
        dynamic_resources=dynamic_resources,
        requires_dynamic_action=requires_dynamic,
        urgency=min(1.0, max(0.0, urgency)),
        reasons=tuple(reasons),
    )


def _factor(asm: PositionAssessment, factor: AssessmentFactor) -> float:
    for row in asm.factors:
        if row.factor == factor:
            return row.player
    return 0.5


def _static_outlook(asm: PositionAssessment) -> StaticOutlook:
    material = _factor(asm, AssessmentFactor.MATERIAL)
    structure = _factor(asm, AssessmentFactor.PAWN_STRUCTURE)
    score = (material + structure) / 2.0
    if score >= 0.58:
        return "better"
    if score <= 0.42:
        return "worse"
    return "balanced"


def _initiative_player(asm: PositionAssessment) -> float:
    return _factor(asm, AssessmentFactor.INITIATIVE)


def _dynamic_resources(
    asm: PositionAssessment,
    comparison: PlayedVsCandidates | None,
) -> DynamicResources:
    init = _initiative_player(asm)
    activity = _factor(asm, AssessmentFactor.PIECE_ACTIVITY)
    if _has_pawn_break(comparison) or init >= 0.62 or activity >= 0.58:
        return "available"
    if init >= 0.48 or activity >= 0.45:
        return "limited"
    return "none"


def _urgency(
    board: chess.Board,
    player: chess.Color,
    threats: OpponentThreatReport,
    comparison: PlayedVsCandidates | None,
    criticality: PlyCriticality | None,
) -> float:
    level = {"LOW": 0.25, "MEDIUM": 0.5, "HIGH": 0.75}[threats.max_severity]
    if board.turn == player and board.is_check():
        level = max(level, 0.9)
    if comparison and comparison.eval_gap_vs_best_cp >= 150:
        level = max(level, 0.7)
    if criticality and criticality.critical:
        level = max(level, 0.6)
    return level


def _worst_piece_can_improve(asm: PositionAssessment) -> bool:
    wp = _factor(asm, AssessmentFactor.WORST_PIECE)
    return wp <= 0.55 or (asm.worst_piece is not None and asm.worst_piece.mobility <= 3)


def _has_pawn_break(comparison: PlayedVsCandidates | None) -> bool:
    if comparison is None:
        return False
    return CandidatePurpose.EXECUTE_PAWN_BREAK in comparison.played_purposes or any(
        CandidatePurpose.EXECUTE_PAWN_BREAK in d.purposes for d in comparison.diffs
    )


def _prophylactic_signal(comparison: PlayedVsCandidates | None) -> bool:
    if comparison is None:
        return False
    return CandidatePurpose.PREVENT_OPPONENT_PLAN in comparison.played_purposes


def _trigger_position_change(criticality: PlyCriticality | None) -> bool:
    if criticality is None:
        return False
    return any(t.code == "POSITION_TRANSFORMATION" and t.fired for t in criticality.triggers)


def _is_tactical_comparison(comparison: PlayedVsCandidates) -> bool:
    cons = comparison.played_consequence
    if cons.is_mate or cons.gives_check or cons.is_capture:
        return True
    if comparison.eval_gap_vs_best_cp >= 150:
        return True
    return comparison.played_candidate_type.value == "TACTICAL"


def _is_endgame_transition(board: chess.Board) -> bool:
    queens = board.pieces(chess.QUEEN, chess.WHITE) | board.pieces(chess.QUEEN, chess.BLACK)
    return not queens and chess.popcount(board.occupied) <= 14
