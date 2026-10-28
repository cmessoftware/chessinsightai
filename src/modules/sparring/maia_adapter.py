"""Adaptador Maia UCI servidor (SPAR-03)."""

from __future__ import annotations

import random
import time
from typing import Callable

import chess
import chess.engine

from modules.sparring.board_utils import board_from_context
from modules.sparring.cache_key import build_maia_cache_key
from modules.sparring.maia_settings import MaiaSettings, load_maia_settings
from modules.sparring.types import (
    ModelCapabilities,
    MovePrediction,
    PositionContext,
    SamplingConfig,
)

EngineOpener = Callable[[], chess.engine.SimpleEngine]

MAIA3_RATING_MIN = 1000
MAIA3_RATING_MAX = 1900
DEFAULT_MULTIPV = 5


class MaiaEngineError(RuntimeError):
    """Fallo de infra Maia (spec §3.1: pausar, no inventar jugada)."""


class IllegalBotMoveError(ValueError):
    pass


def _parse_policy_from_analyse(
    infos: list[chess.engine.InfoDict],
) -> tuple[dict[str, float] | None, float | None]:
    masses: dict[str, float] = {}
    for info in infos:
        pv = info.get("pv")
        if not pv:
            continue
        uci = pv[0].uci()
        score = info.get("score")
        if score is None:
            continue
        try:
            cp = score.white().score(mate_score=100000)
        except (AttributeError, TypeError):
            continue
        if cp is None:
            continue
        masses[uci] = max(masses.get(uci, float("-inf")), float(cp))
    if not masses:
        return None, None
    total = sum(max(v, 0.0) for v in masses.values())
    if total <= 0:
        return None, None
    policy = {uci: max(v, 0.0) / total for uci, v in masses.items()}
    coverage = min(1.0, sum(policy.values()))
    return policy, coverage


def _configure_maia_engine(
    engine: chess.engine.SimpleEngine,
    settings: MaiaSettings,
    self_rating: int,
    opponent_rating: int,
) -> None:
    options: dict[str, int | str] = {
        "Elo": self_rating,
        "SelfElo": self_rating,
        "OppoElo": opponent_rating,
    }
    if settings.provider == "lc0_maia2" and settings.lc0_weights_dir:
        options["WeightsPath"] = settings.lc0_weights_dir
    try:
        engine.configure(options)
    except chess.engine.EngineError as exc:
        raise MaiaEngineError(str(exc)) from exc


class MaiaHumanMoveModel:
    """HumanMoveModel sobre UCI Maia-3 o Lc0+Maia-2 (spec §3.1)."""

    def __init__(
        self,
        settings: MaiaSettings | None = None,
        *,
        engine_opener: EngineOpener | None = None,
    ) -> None:
        self._settings = settings or load_maia_settings()
        self._engine_opener = engine_opener

    def capabilities(self) -> ModelCapabilities:
        version = self._settings.maia3_model or self._settings.maia3_cmd
        return ModelCapabilities(
            model_name="Maia3" if self._settings.provider == "maia3" else "Maia2-Lc0",
            model_version=version,
            rating_min=MAIA3_RATING_MIN,
            rating_max=MAIA3_RATING_MAX,
            history_support=self._settings.use_uci_history,
            full_policy_support=self._settings.provider == "maia3",
            sampling_support=True,
        )

    def _open_engine(self) -> chess.engine.SimpleEngine:
        if self._engine_opener is not None:
            return self._engine_opener()
        argv = self._settings.build_uci_argv()
        try:
            return chess.engine.SimpleEngine.popen_uci(argv)
        except (chess.engine.EngineError, OSError) as exc:
            raise MaiaEngineError(str(exc)) from exc

    def predict(
        self,
        position: PositionContext,
        *,
        self_rating: int,
        opponent_rating: int,
    ) -> MovePrediction:
        board = board_from_context(position)
        cache_key = build_maia_cache_key(
            provider=self._settings.provider,
            model_version=self._settings.maia3_model,
            fen=position.fen,
            uci_history=position.uci_history,
            self_rating=self_rating,
            opponent_rating=opponent_rating,
        )
        caps = self.capabilities()
        started = time.perf_counter()
        engine = self._open_engine()
        try:
            _configure_maia_engine(
                engine, self._settings, self_rating, opponent_rating
            )
            limit = chess.engine.Limit(time=self._settings.move_timeout_sec)
            try:
                result = engine.play(board, limit)
            except chess.engine.EngineError as exc:
                raise MaiaEngineError(str(exc)) from exc

            policy: dict[str, float] | None = None
            coverage: float | None = None
            if caps.full_policy_support:
                try:
                    infos = engine.analyse(
                        board, chess.engine.Limit(nodes=1), multipv=DEFAULT_MULTIPV
                    )
                    if isinstance(infos, dict):
                        infos = [infos]
                    policy, coverage = _parse_policy_from_analyse(infos)
                except chess.engine.EngineError:
                    policy, coverage = None, None

            chosen = result.move.uci() if result.move else None
            latency_ms = (time.perf_counter() - started) * 1000.0
            return MovePrediction(
                chosen_move=chosen,
                policy=policy,
                policy_coverage=coverage,
                latency_ms=latency_ms,
                cache_key=cache_key,
                model_name=caps.model_name,
                model_version=caps.model_version,
                self_rating=self_rating,
                opponent_rating=opponent_rating,
            )
        finally:
            engine.quit()

    def choose_move(
        self,
        prediction: MovePrediction,
        sampling: SamplingConfig,
        legal_moves: frozenset[str],
    ) -> str:
        if sampling.mode == "best":
            move = prediction.chosen_move
        elif prediction.policy:
            rng = random.Random(sampling.seed)
            weighted = [
                (uci, mass)
                for uci, mass in prediction.policy.items()
                if uci in legal_moves
            ]
            if not weighted:
                move = prediction.chosen_move
            else:
                total = sum(m for _, m in weighted)
                pick = rng.uniform(0, total)
                acc = 0.0
                move = weighted[-1][0]
                for uci, mass in weighted:
                    acc += mass
                    if pick <= acc:
                        move = uci
                        break
        else:
            move = prediction.chosen_move

        if not move or move not in legal_moves:
            raise IllegalBotMoveError(
                f"model move {move!r} not legal among {sorted(legal_moves)!r}"
            )
        return move
