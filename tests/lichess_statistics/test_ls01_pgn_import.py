"""PGN file as a game source for sync (no live API)."""

from __future__ import annotations

import json
import sys
from io import StringIO
from pathlib import Path

import chess
import chess.engine
import pytest

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from lichess_statistics.cli import run  # noqa: E402
from lichess_statistics.db import StatisticsRepository, connect, init_schema  # noqa: E402
from lichess_statistics.evals import FUENTE_STOCKFISH_LOCAL, StockfishAnalysisService, StockfishConfig  # noqa: E402
from lichess_statistics.game_id import identity_from_ndjson  # noqa: E402
from lichess_statistics.pgn_source import iter_pgn_file, ndjson_from_pgn_game  # noqa: E402
from lichess_statistics.service import GameStatisticsService  # noqa: E402

FIXTURE_TWO = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_two_games.ndjson"
USER = "cmess4401"

OTHER_GAME = """[Event "Live Chess"]
[Site "https://www.chess.com/game/live/999001"]
[Date "2026.01.02"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]
[TimeControl "600+0"]
[ECO "C20"]
[Opening "King's Pawn"]
[Termination "Alice won by resignation"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 1-0
"""


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


def _pgn_from_ndjson(path: Path) -> str:
    chunks: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        payload = json.loads(line)
        chunks.append(str(payload["pgn"]).strip())
    return "\n\n".join(chunks) + "\n"


def test_iter_pgn_preserves_lichess_pgn_identity(tmp_path: Path):
    pgn_path = tmp_path / "two.pgn"
    pgn_path.write_text(_pgn_from_ndjson(FIXTURE_TWO), encoding="utf-8")
    ndjson_ids = []
    for line in FIXTURE_TWO.read_text(encoding="utf-8").splitlines():
        payload = json.loads(line)
        ndjson_ids.append(identity_from_ndjson(payload).game_id)
    converted = list(iter_pgn_file(pgn_path))
    assert len(converted) == 2
    assert [identity_from_ndjson(game).game_id for game in converted] == ndjson_ids
    assert converted[0]["id"] in {"tOsxrK57", "ApzutTLl"}
    assert converted[0]["clock"]["initial"] == 900
    assert converted[0]["clock"]["increment"] == 10


def test_sync_from_pgn_skips_games_without_user(tmp_path: Path):
    pgn_path = tmp_path / "mixed.pgn"
    pgn_path.write_text(_pgn_from_ndjson(FIXTURE_TWO) + "\n\n" + OTHER_GAME, encoding="utf-8")
    db = tmp_path / "ls.sqlite"
    assert (
        run(
            [
                "sync",
                "--username",
                USER,
                "--from-pgn",
                str(pgn_path),
                "--database",
                str(db),
                "--download-only",
            ]
        )
        == 0
    )
    repo = StatisticsRepository(connect(db))
    rows = repo.list_games(usuario=USER)
    assert len(rows) == 2
    assert {row["lichess_id"] for row in rows} == {"tOsxrK57", "ApzutTLl"}
    assert all(row["ritmo"] == "15+10" for row in rows)


def test_sync_rejects_ndjson_and_pgn_together(tmp_path: Path):
    with pytest.raises(SystemExit, match="--from-ndjson or --from-pgn"):
        run(
            [
                "sync",
                "--username",
                USER,
                "--from-ndjson",
                str(FIXTURE_TWO),
                "--from-pgn",
                str(tmp_path / "x.pgn"),
                "--database",
                str(tmp_path / "ls.sqlite"),
            ]
        )


def test_pgn_import_analyzes_with_local_engine(tmp_path: Path):
    pgn_path = tmp_path / "two.pgn"
    pgn_path.write_text(_pgn_from_ndjson(FIXTURE_TWO), encoding="utf-8")
    db = tmp_path / "ls.sqlite"
    assert (
        run(
            [
                "sync",
                "--username",
                USER,
                "--from-pgn",
                str(pgn_path),
                "--database",
                str(db),
                "--download-only",
            ]
        )
        == 0
    )
    conn = connect(db)
    init_schema(conn)
    repo = StatisticsRepository(conn)
    engine = FakeEngine()
    service = GameStatisticsService(
        repo,
        stockfish_service=StockfishAnalysisService(
            StockfishConfig(depth=8, threads=1, hash_mb=8),
            engine_factory=lambda _cfg: engine,
        ),
    )
    report = service.analyze(USER, only_missing=True)
    assert report.errors == 0
    assert report.local_analyzed == 2
    rows = repo.list_games(usuario=USER)
    assert all(row["fuente_evaluacion"] == FUENTE_STOCKFISH_LOCAL for row in rows)
    for row in rows:
        stats = repo.get_stats(row["game_id"])
        assert stats is not None
        assert stats["precision_general"] is not None


def test_chess_com_time_control_maps_to_ritmo():
    parsed = chess.pgn.read_game(
        StringIO(
            """[Event "Live Chess"]
[Site "https://www.chess.com/game/live/42424242"]
[Date "2026.03.01"]
[White "cmess4401"]
[Black "Rival"]
[Result "1-0"]
[UTCDate "2026.03.01"]
[UTCTime "12:00:00"]
[TimeControl "480+2"]
[WhiteElo "1500"]
[BlackElo "1480"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 1-0
"""
        )
    )
    payload = ndjson_from_pgn_game(parsed)
    assert payload["clock"] == {"initial": 480, "increment": 2}
    assert payload["speed"] == "rapid"
    assert payload["id"] == "42424242"
