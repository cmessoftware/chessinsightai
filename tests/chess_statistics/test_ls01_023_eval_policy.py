"""LS01-023 — unified Stockfish-first CLI policy."""

from __future__ import annotations

import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from chess_statistics.eval_policy import analyze_force_stockfish, sync_force_stockfish  # noqa: E402
from chess_statistics.sources import SOURCE_CHESSCOM, SOURCE_LICHESS, SOURCE_PGN  # noqa: E402


def test_sync_defaults_to_local_stockfish_for_lichess():
    assert sync_force_stockfish(source=SOURCE_LICHESS, use_lichess_cloud=False) is True


def test_sync_lichess_cloud_opt_in():
    assert sync_force_stockfish(source=SOURCE_LICHESS, use_lichess_cloud=True) is False


def test_sync_non_lichess_always_local():
    assert sync_force_stockfish(source=SOURCE_CHESSCOM, use_lichess_cloud=True) is True
    assert sync_force_stockfish(source=SOURCE_PGN, use_lichess_cloud=False) is True


def test_analyze_defaults_to_local():
    assert analyze_force_stockfish(use_lichess_cloud=False) is True


def test_sync_cli_defaults_to_local_stockfish_on_cloud_fixture(tmp_path: Path):
    import json

    from chess_statistics.cli import run  # noqa: E402
    from chess_statistics.db import StatisticsRepository, connect, init_schema  # noqa: E402
    from chess_statistics.evals import FUENTE_STOCKFISH_LOCAL  # noqa: E402

    fixture = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_two_games.ndjson"
    db = tmp_path / "ls.sqlite"
    code = run(
        [
            "sync",
            "--username",
            "cmess4401",
            "--from-ndjson",
            str(fixture),
            "--database",
            str(db),
            "--max-games",
            "1",
            "--download-only",
        ]
    )
    assert code == 0
    # Without Stockfish in env, analyze step may skip; inject via direct import + fake engine in unit tests.
    lines = [line for line in fixture.read_text(encoding="utf-8").splitlines() if line.strip()]
    game = json.loads(lines[0])
    from chess_statistics.import_games import GameImportService  # noqa: E402

    conn = connect(db)
    init_schema(conn)
    repo = StatisticsRepository(conn)
    engine_calls = {"n": 0}

    class _FakeEngine:
        id = {"name": "Stockfish Test 16"}

        def configure(self, _options: dict) -> None:
            return None

        def analyse(self, board, limit):  # noqa: ANN001
            import chess
            import chess.engine

            engine_calls["n"] += 1
            move = next(iter(board.legal_moves))
            return {
                "score": chess.engine.PovScore(chess.engine.Cp(engine_calls["n"]), chess.WHITE),
                "pv": [move],
            }

        def quit(self) -> None:
            return None

    from chess_statistics.evals import StockfishAnalysisService, StockfishConfig  # noqa: E402

    sf = StockfishAnalysisService(
        StockfishConfig(depth=8),
        engine_factory=lambda _cfg: _FakeEngine(),
    )
    imported = GameImportService().import_game(
        repo, game, "cmess4401", force_stockfish=True, stockfish_service=sf
    )
    assert imported is not None
    stored = repo.get_game(imported.game_id)
    assert stored is not None
    assert stored["fuente_evaluacion"] == FUENTE_STOCKFISH_LOCAL
    assert engine_calls["n"] > 0
