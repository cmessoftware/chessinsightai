"""Contratos HumanMoveModel (spec §3.1, SPAR-03)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

SamplingMode = Literal["best", "sample"]


@dataclass(frozen=True)
class PositionContext:
    """Posición antes del turno del bot; historial UCI desde ``fen``."""

    fen: str
    uci_history: tuple[str, ...]
    history_complete: bool = True


@dataclass(frozen=True)
class ModelCapabilities:
    model_name: str
    model_version: str | None
    rating_min: int
    rating_max: int
    history_support: bool
    full_policy_support: bool
    sampling_support: bool


@dataclass(frozen=True)
class SamplingConfig:
    mode: SamplingMode = "best"
    seed: int | None = None


@dataclass(frozen=True)
class MovePrediction:
    chosen_move: str | None
    policy: dict[str, float] | None
    policy_coverage: float | None
    latency_ms: float
    cache_key: str
    model_name: str
    model_version: str | None
    self_rating: int
    opponent_rating: int
