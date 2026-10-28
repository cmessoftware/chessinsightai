"""Presets de nivel rival (arch §4, SPAR-03)."""

from __future__ import annotations

from typing import Literal

SparringChallengePreset = Literal["consolidation", "balanced", "challenge"]

PRESET_ELO_OFFSET: dict[SparringChallengePreset, int] = {
    "consolidation": -100,
    "balanced": 0,
    "challenge": 100,
}

# Maia-3 5M rango documentado en OpenSpec (ajustable por red).
DEFAULT_MAIA3_RATING_MIN = 1000
DEFAULT_MAIA3_RATING_MAX = 1900


def apply_level_preset(
    requested_elo: int,
    preset: SparringChallengePreset,
    *,
    rating_min: int = DEFAULT_MAIA3_RATING_MIN,
    rating_max: int = DEFAULT_MAIA3_RATING_MAX,
) -> tuple[int, bool]:
    """Devuelve (elo_efectivo, fue_clampeado)."""
    target = requested_elo + PRESET_ELO_OFFSET[preset]
    clamped = max(rating_min, min(rating_max, target))
    return clamped, clamped != target


def bot_uci_ratings(*, human_elo: int, bot_elo: int) -> tuple[int, int]:
    """(SelfElo, OppoElo) para el motor rival (Maia juega el bando opuesto al alumno)."""
    return bot_elo, human_elo
