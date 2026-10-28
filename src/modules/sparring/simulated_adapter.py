"""Proveedor simulado para tests y SPAR-12 smoke sin binario Maia."""

from __future__ import annotations

import time

from modules.sparring.board_utils import board_from_context
from modules.sparring.cache_key import build_maia_cache_key
from modules.sparring.types import (
    ModelCapabilities,
    MovePrediction,
    PositionContext,
    SamplingConfig,
)


class SimulatedHumanMoveModel:
    """Responde con la primera jugada legal (determinista)."""

    PROVIDER = "simulated"

    def capabilities(self) -> ModelCapabilities:
        return ModelCapabilities(
            model_name="SimulatedMaia",
            model_version="1",
            rating_min=800,
            rating_max=2400,
            history_support=True,
            full_policy_support=False,
            sampling_support=False,
        )

    def predict(
        self,
        position: PositionContext,
        *,
        self_rating: int,
        opponent_rating: int,
    ) -> MovePrediction:
        board = board_from_context(position)
        legal = sorted(board.legal_moves, key=lambda m: m.uci())
        chosen = legal[0].uci() if legal else None
        cache_key = build_maia_cache_key(
            provider=self.PROVIDER,
            model_version="1",
            fen=position.fen,
            uci_history=position.uci_history,
            self_rating=self_rating,
            opponent_rating=opponent_rating,
        )
        time.sleep(0)  # pragma: no cover
        return MovePrediction(
            chosen_move=chosen,
            policy=None,
            policy_coverage=None,
            latency_ms=0.0,
            cache_key=cache_key,
            model_name="SimulatedMaia",
            model_version="1",
            self_rating=self_rating,
            opponent_rating=opponent_rating,
        )

    def choose_move(
        self,
        prediction: MovePrediction,
        sampling: SamplingConfig,
        legal_moves: frozenset[str],
    ) -> str:
        if not prediction.chosen_move or prediction.chosen_move not in legal_moves:
            raise ValueError("simulated move not legal")
        return prediction.chosen_move
