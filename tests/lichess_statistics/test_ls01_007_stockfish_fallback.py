"""Tests for LS01-007 — local Stockfish fallback when cloud evals are incomplete."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import chess
import chess.engine
import pytest

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from lichess_statistics.db import StatisticsRepository, connect, init_schema  # noqa: E402
from lichess_statistics.evals import (  # noqa: E402
    FUENTE_LICHESS,
    FUENTE_STOCKFISH_LOCAL,
    StockfishAnalysisService,
    StockfishConfig,
    StockfishConfigError,
)
from lichess_statistics.import_games import GameImportService  # noqa: E402

FIXTURE_TWO = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_two_games.ndjson"
FIXTURE_DRAW = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_draw.ndjson"
USER = "cmess4401"
MISSING_BINARY = StockfishAnalysisService(StockfishConfig(path="__no_stockfish_binary__"))


def _load_line(path: Path, index: int = 0) -> dict:
    lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return json.loads(lines[index])


def _repo(tmp_path: Path) -> StatisticsRepository:
    conn = connect(tmp_path / "ls.sqlite")
    init_schema(conn)
    return StatisticsRepository(conn)


class FakeEngine:
    def __init__(self) -> None:
        self.calls = 0
        self.id = {"name": "Stockfish Test 16"}
        self.configured: dict | None = None

    def configure(self, options: dict) -> None:
        self.configured = options

    def analyse(self, board: chess.Board, limit: chess.engine.Limit) -> dict:
        self.calls += 1
        move = next(iter(board.legal_moves))
        return {
            "score": chess.engine.PovScore(chess.engine.Cp(self.calls), chess.WHITE),
            "pv": [move],
        }

    def quit(self) -> None:
        return None


def _service(engine: FakeEngine) -> StockfishAnalysisService:
    return StockfishAnalysisService(
        StockfishConfig(depth=12, threads=2, hash_mb=8),
        engine_factory=lambda _cfg: engine,
    )


def test_incomplete_cloud_is_analyzed_locally(tmp_path: Path):
    game = dict(_load_line(FIXTURE_TWO, 0))
    game["analysis"] = game["analysis"][:-1]
    engine = FakeEngine()
    repo = _repo(tmp_path)
    imported = GameImportService().import_game(
        repo, game, USER, stockfish_service=_service(engine)
    )
    assert imported is not None
    stored = repo.get_game(imported.game_id)
    assert stored is not None
    assert stored["fuente_evaluacion"] == FUENTE_STOCKFISH_LOCAL
    assert stored["version_stockfish"] == "Stockfish Test 16"
    assert stored["profundidad_stockfish"] == 12
    evals = repo.list_evals(imported.game_id)
    n_moves = len(game["moves"].split())
    assert len(evals) == n_moves
    assert engine.calls == n_moves + 1
    assert engine.configured == {"Threads": 2, "Hash": 8}
    assert evals[0]["evaluation_before_cp"] == 1
    assert evals[0]["evaluation_after_cp"] == 2
    assert evals[0]["best_move"]


def test_complete_cloud_game_is_not_reanalyzed(tmp_path: Path):
    game = _load_line(FIXTURE_TWO, 0)
    engine = FakeEngine()
    repo = _repo(tmp_path)
    imported = GameImportService().import_game(
        repo, game, USER, stockfish_service=_service(engine)
    )
    assert imported is not None
    stored = repo.get_game(imported.game_id)
    assert stored is not None
    assert stored["fuente_evaluacion"] == FUENTE_LICHESS
    assert engine.calls == 0
    assert repo.list_evals(imported.game_id)[0]["evaluation_after_cp"] == 18


def test_force_stockfish_replaces_complete_cloud(tmp_path: Path):
    game = _load_line(FIXTURE_TWO, 0)
    engine = FakeEngine()
    repo = _repo(tmp_path)
    imported = GameImportService().import_game(
        repo,
        game,
        USER,
        force_stockfish=True,
        stockfish_service=_service(engine),
    )
    assert imported is not None
    stored = repo.get_game(imported.game_id)
    assert stored is not None
    assert stored["fuente_evaluacion"] == FUENTE_STOCKFISH_LOCAL
    assert engine.calls == len(game["moves"].split()) + 1
    assert repo.list_evals(imported.game_id)[0]["evaluation_after_cp"] == 2


def test_draw_without_analysis_uses_local_engine(tmp_path: Path):
    game = _load_line(FIXTURE_DRAW, 0)
    engine = FakeEngine()
    repo = _repo(tmp_path)
    imported = GameImportService().import_game(
        repo, game, USER, stockfish_service=_service(engine)
    )
    assert imported is not None
    stored = repo.get_game(imported.game_id)
    assert stored is not None
    assert stored["fuente_evaluacion"] == FUENTE_STOCKFISH_LOCAL
    n_moves = len(game["moves"].split())
    assert len(repo.list_evals(imported.game_id)) == n_moves
    assert engine.calls == n_moves + 1


def test_missing_engine_skips_without_force(tmp_path: Path):
    game = dict(_load_line(FIXTURE_TWO, 0))
    game["analysis"] = []
    repo = _repo(tmp_path)
    imported = GameImportService().import_game(
        repo, game, USER, stockfish_service=MISSING_BINARY
    )
    assert imported is not None
    stored = repo.get_game(imported.game_id)
    assert stored is not None
    assert stored["fuente_evaluacion"] is None
    assert repo.list_evals(imported.game_id) == []


def test_force_stockfish_without_engine_raises(tmp_path: Path):
    game = dict(_load_line(FIXTURE_TWO, 0))
    game["analysis"] = []
    repo = _repo(tmp_path)
    with pytest.raises(StockfishConfigError):
        GameImportService().import_game(
            repo, game, USER, force_stockfish=True, stockfish_service=MISSING_BINARY
        )
