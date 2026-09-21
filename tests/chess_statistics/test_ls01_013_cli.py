"""Tests for LS01-013 — CLI sync / analyze / export (no live API)."""

from __future__ import annotations

import csv
import logging
import sys
from pathlib import Path

import chess
import chess.engine
import pytest

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from chess_statistics.cli import build_parser, run  # noqa: E402
from chess_statistics.db import StatisticsRepository, connect, init_schema  # noqa: E402
from chess_statistics.evals import (  # noqa: E402
    FUENTE_LICHESS,
    FUENTE_STOCKFISH_LOCAL,
    StockfishAnalysisService,
    StockfishConfig,
)
from chess_statistics.service import GameStatisticsService  # noqa: E402

FIXTURE_TWO = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_two_games.ndjson"
FIXTURE_DRAW = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_draw.ndjson"
USER = "cmess4401"


class FakeEngine:
    def __init__(self) -> None:
        self.calls = 0
        self.id = {"name": "Stockfish Test 16"}

    def configure(self, options: dict) -> None:
        return None

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
        StockfishConfig(depth=8, threads=1, hash_mb=8),
        engine_factory=lambda _cfg: engine,
    )


def _repo(path: Path) -> StatisticsRepository:
    conn = connect(path)
    init_schema(conn)
    return StatisticsRepository(conn)


def test_help_lists_sync_analyze_export():
    root = build_parser()
    text = root.format_help()
    assert "sync" in text
    assert "analyze" in text
    assert "export" in text
    command = next(action for action in root._actions if getattr(action, "dest", None) == "command")
    sync_text = command.choices["sync"].format_help()
    analyze_text = command.choices["analyze"].format_help()
    export_text = command.choices["export"].format_help()
    assert "--max-games" in sync_text
    assert "--perf-type" in sync_text
    assert "--force-stockfish" in sync_text
    assert "--download-only" in sync_text
    assert "--from-ndjson" in sync_text
    assert "--from-pgn" in sync_text
    assert "--source" in sync_text
    assert "--only-missing" in analyze_text
    assert "--lichess-id" in analyze_text
    assert "--output" in export_text
    assert "--last-n" in export_text


def test_dry_run_fixture_does_not_insert(tmp_path: Path):
    db = tmp_path / "ls.sqlite"
    code = run(
        [
            "sync",
            "--username",
            USER,
            "--from-ndjson",
            str(FIXTURE_TWO),
            "--database",
            str(db),
            "--download-only",
            "--dry-run",
            "--max-games",
            "2",
            "--perf-type",
            "rapid",
        ]
    )
    assert code == 0
    repo = _repo(db)
    assert repo.list_games() == []


def test_sync_fixture_is_incremental(tmp_path: Path):
    db = tmp_path / "ls.sqlite"
    args = [
        "sync",
        "--username",
        USER,
        "--from-ndjson",
        str(FIXTURE_TWO),
        "--database",
        str(db),
        "--max-games",
        "2",
        "--perf-type",
        "rapid",
    ]
    assert run(args) == 0
    repo = StatisticsRepository(connect(db))
    first = repo.list_games(usuario=USER)
    assert len(first) == 2
    assert first[0]["lichess_id"] in {"tOsxrK57", "ApzutTLl"}
    assert first[0]["fuente_evaluacion"] == FUENTE_LICHESS
    assert run(args) == 0
    second = repo.list_games(usuario=USER)
    assert len(second) == 2
    assert len(repo.list_evals(first[0]["game_id"])) == len(repo.list_evals(second[0]["game_id"]))


def test_analyze_only_missing_uses_local_engine(tmp_path: Path):
    db = tmp_path / "ls.sqlite"
    assert (
        run(
            [
                "sync",
                "--username",
                USER,
                "--from-ndjson",
                str(FIXTURE_DRAW),
                "--database",
                str(db),
                "--download-only",
            ]
        )
        == 0
    )
    repo = StatisticsRepository(connect(db))
    rows = repo.list_games(usuario=USER, only_missing=True)
    assert len(rows) == 1
    engine = FakeEngine()
    report = GameStatisticsService(repo, stockfish_service=_service(engine)).analyze(
        USER, only_missing=True
    )
    assert report.local_analyzed == 1
    assert report.errors == 0
    stored = repo.get_game(rows[0]["game_id"])
    assert stored is not None
    assert stored["fuente_evaluacion"] == FUENTE_STOCKFISH_LOCAL
    assert engine.calls > 0


def test_export_cli_writes_sheet(tmp_path: Path):
    db = tmp_path / "ls.sqlite"
    xlsx = tmp_path / "out.xlsx"
    assert (
        run(
            [
                "sync",
                "--username",
                USER,
                "--from-ndjson",
                str(FIXTURE_TWO),
                "--database",
                str(db),
                "--max-games",
                "1",
            ]
        )
        == 0
    )
    assert (
        run(
            [
                "export",
                "--username",
                USER,
                "--database",
                str(db),
                "--output",
                str(xlsx),
            ]
        )
        == 0
    )
    assert xlsx.is_file()
    assert xlsx.with_suffix(".csv").is_file()


def test_export_cli_last_n(tmp_path: Path):
    db = tmp_path / "ls.sqlite"
    csv_path = tmp_path / "n.csv"
    assert (
        run(
            [
                "sync",
                "--username",
                USER,
                "--from-ndjson",
                str(FIXTURE_TWO),
                "--database",
                str(db),
            ]
        )
        == 0
    )
    assert (
        run(
            [
                "export",
                "--username",
                USER,
                "--database",
                str(db),
                "--output",
                str(csv_path),
                "--last-n",
                "1",
                "--perf-type",
                "rapid",
            ]
        )
        == 0
    )
    with csv_path.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.reader(handle))
    assert len(rows) == 2
    assert rows[1][1] == "https://lichess.org/tOsxrK57"


def test_token_value_is_not_logged(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture):
    monkeypatch.setenv("LICHESS_TOKEN", "super-secret-token-xyz")
    monkeypatch.setenv("LICHESS_API_TOKEN", "super-secret-api-token-xyz")
    caplog.set_level(logging.DEBUG)
    run(
        [
            "sync",
            "--username",
            USER,
            "--from-ndjson",
            str(FIXTURE_TWO),
            "--database",
            str(tmp_path / "ls.sqlite"),
            "--download-only",
            "--dry-run",
        ]
    )
    assert "super-secret-token-xyz" not in caplog.text
    assert "super-secret-api-token-xyz" not in caplog.text
    assert "Bearer" not in caplog.text
