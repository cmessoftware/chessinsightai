"""SPAR-03 — adaptador Maia / simulado y presets."""

from __future__ import annotations

import sys
from pathlib import Path

import chess
import chess.engine

SRC_DIR = Path(__file__).resolve().parents[2] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from modules.sparring.cache_key import build_maia_cache_key
from modules.sparring.level_presets import apply_level_preset, bot_uci_ratings
from modules.sparring.maia_adapter import MaiaHumanMoveModel
from modules.sparring.maia_settings import MaiaSettings
from modules.sparring.simulated_adapter import SimulatedHumanMoveModel
from modules.sparring.types import PositionContext, SamplingConfig


def test_cache_key_changes_with_history_not_only_fen():
    base = dict(
        provider="maia3",
        model_version="5m",
        fen=chess.STARTING_FEN,
        self_rating=1500,
        opponent_rating=1500,
    )
    k0 = build_maia_cache_key(uci_history=(), **base)
    k1 = build_maia_cache_key(uci_history=("e2e4",), **base)
    assert k0 != k1


def test_level_preset_offsets_and_clamp():
    elo, clamped = apply_level_preset(1500, "consolidation")
    assert elo == 1400 and clamped is False
    elo, clamped = apply_level_preset(1950, "challenge")
    assert elo == 1900 and clamped is True


def test_bot_uci_ratings():
    assert bot_uci_ratings(human_elo=1600, bot_elo=1500) == (1500, 1600)


def test_simulated_predict_first_legal_move():
    model = SimulatedHumanMoveModel()
    ctx = PositionContext(fen=chess.STARTING_FEN, uci_history=())
    pred = model.predict(ctx, self_rating=1500, opponent_rating=1500)
    expected = _first_legal_uci(chess.Board()).uci()
    assert pred.chosen_move == expected
    legal = frozenset(m.uci() for m in chess.Board().legal_moves)
    assert model.choose_move(pred, SamplingConfig(), legal) == expected


def _first_legal_uci(board: chess.Board) -> chess.Move:
    return sorted(board.legal_moves, key=lambda m: m.uci())[0]


class _FakeEngine:
    def configure(self, options):  # noqa: ANN001
        self.options = options

    def play(self, board, limit):  # noqa: ANN001
        move = _first_legal_uci(board)
        return chess.engine.PlayResult(move, None)

    def analyse(self, board, limit, multipv=1):  # noqa: ANN001
        move = _first_legal_uci(board)
        return [{"pv": [move], "score": chess.engine.PovScore(chess.engine.Cp(50), chess.WHITE)}]

    def quit(self):
        pass


def test_maia_adapter_with_fake_engine():
    settings = MaiaSettings(
        provider="maia3",
        maia3_cmd="fake",
        maia3_model="5m",
        maia3_python=None,
        maia3_module=None,
        default_elo=1500,
        device="cpu",
        use_uci_history=True,
        extra_args=(),
        move_timeout_sec=1.0,
        lc0_engine_path=None,
        lc0_weights_dir=None,
    )
    model = MaiaHumanMoveModel(settings, engine_opener=_FakeEngine)
    ctx = PositionContext(fen=chess.STARTING_FEN, uci_history=())
    pred = model.predict(ctx, self_rating=1500, opponent_rating=1600)
    expected = _first_legal_uci(chess.Board()).uci()
    assert pred.chosen_move == expected
    assert pred.cache_key
    assert pred.self_rating == 1500
    legal = frozenset(m.uci() for m in chess.Board().legal_moves)
    assert model.choose_move(pred, SamplingConfig(mode="best"), legal) == expected
