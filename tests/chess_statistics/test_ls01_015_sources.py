"""--source lichess | chess.com | pgn (no live Chess.com HTTP)."""

from __future__ import annotations

import sys
from pathlib import Path

import chess
import chess.engine
import pytest

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from chess_statistics.chesscom_client import ndjson_from_chesscom_game  # noqa: E402
from chess_statistics.cli import run  # noqa: E402
from chess_statistics.db import StatisticsRepository, connect  # noqa: E402
from chess_statistics.evals import FUENTE_STOCKFISH_LOCAL, StockfishAnalysisService, StockfishConfig  # noqa: E402
from chess_statistics.export import export_row  # noqa: E402
from chess_statistics.filters import REASON_NOT_LICHESS, SKIP_KEY  # noqa: E402
from chess_statistics.pgn_source import ndjson_from_pgn_game  # noqa: E402
from chess_statistics.service import GameStatisticsService  # noqa: E402
from chess_statistics.sources import SOURCE_CHESSCOM  # noqa: E402

USER = "alice"
MOVES = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 1-0"
CHESSCOM_PGN = f"""[Event "Live Chess"]
[Site "https://www.chess.com/game/live/42424242"]
[Date "2026.03.01"]
[UTCDate "2026.03.01"]
[UTCTime "12:00:00"]
[White "alice"]
[Black "bob"]
[Result "1-0"]
[TimeControl "600+0"]
[WhiteElo "1500"]
[BlackElo "1400"]

{MOVES}
"""
CHESSCOM_RAW = {
    "url": "https://www.chess.com/game/live/42424242",
    "pgn": CHESSCOM_PGN,
    "time_control": "600+0",
    "time_class": "rapid",
    "end_time": 1740873600,
    "white": {"username": "alice", "rating": 1500},
    "black": {"username": "bob", "rating": 1400},
}


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


def test_source_pgn_requires_from_pgn(tmp_path: Path):
    with pytest.raises(SystemExit, match="requires --from-pgn"):
        run(
            [
                "sync",
                "--username",
                USER,
                "--source",
                "pgn",
                "--database",
                str(tmp_path / "ls.sqlite"),
            ]
        )


def test_source_pgn_imports_chesscom_and_uses_stockfish(tmp_path: Path):
    pgn_path = tmp_path / "cc.pgn"
    pgn_path.write_text(CHESSCOM_PGN, encoding="utf-8")
    db = tmp_path / "ls.sqlite"
    assert (
        run(
            [
                "sync",
                "--username",
                USER,
                "--source",
                "pgn",
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
    assert len(rows) == 1
    assert rows[0]["lichess_id"] in (None, "")
    assert rows[0]["source_platform"] == SOURCE_CHESSCOM
    assert "chess.com" in (rows[0]["source_url"] or "")
    engine = FakeEngine()
    report = GameStatisticsService(
        repo,
        stockfish_service=StockfishAnalysisService(
            StockfishConfig(depth=8, threads=1, hash_mb=8),
            engine_factory=lambda _cfg: engine,
        ),
    ).analyze(USER, only_missing=True)
    assert report.errors == 0
    assert report.local_analyzed == 1
    stored = repo.get_game(rows[0]["game_id"])
    assert stored is not None
    assert stored["fuente_evaluacion"] == FUENTE_STOCKFISH_LOCAL
    exported = export_row(repo.list_games_with_stats(usuario=USER)[0])
    assert "chess.com" in str(exported["Partida"])


def test_lichess_source_still_rejects_chesscom_pgn():
    import chess.pgn
    from io import StringIO

    parsed = chess.pgn.read_game(StringIO(CHESSCOM_PGN))
    payload = ndjson_from_pgn_game(parsed, require_lichess=True)
    assert payload[SKIP_KEY] == REASON_NOT_LICHESS


def test_chesscom_json_does_not_set_lichess_id():
    payload = ndjson_from_chesscom_game(CHESSCOM_RAW)
    assert payload is not None
    assert payload["id"] is None
    assert payload["source_platform"] == SOURCE_CHESSCOM
    assert payload["external_game_id"] == "42424242"


def test_chesscom_perf_type_filters_time_class():
    blitz = dict(CHESSCOM_RAW)
    blitz["time_class"] = "blitz"
    blitz["url"] = "https://www.chess.com/game/live/1"
    rapid = dict(CHESSCOM_RAW)

    class FakeResponse:
        def __init__(self, payload: dict) -> None:
            self.status_code = 200
            self._payload = payload

        def json(self) -> dict:
            return self._payload

    class FakeSession:
        def get(self, url: str, headers=None, timeout=None):
            if url.endswith("/archives"):
                return FakeResponse({"archives": ["https://api.chess.com/pub/player/alice/games/2026/03"]})
            return FakeResponse({"games": [blitz, rapid]})

    from chess_statistics.chesscom_client import ChessComClient

    games = list(
        ChessComClient(session=FakeSession()).iter_user_games(
            USER, perf_type="rapid"
        )
    )
    assert len(games) == 1
    assert games[0]["perf"] == "rapid"


def test_cli_source_chesscom_uses_injected_client(monkeypatch, tmp_path: Path):
    payload = ndjson_from_chesscom_game(CHESSCOM_RAW)

    class FakeClient:
        def iter_user_games(self, *args, **kwargs):
            yield payload

    monkeypatch.setattr("chess_statistics.cli.ChessComClient", FakeClient)
    db = tmp_path / "ls.sqlite"
    assert (
        run(
            [
                "sync",
                "--username",
                USER,
                "--source",
                "chess.com",
                "--database",
                str(db),
                "--download-only",
            ]
        )
        == 0
    )
    rows = StatisticsRepository(connect(db)).list_games(usuario=USER)
    assert len(rows) == 1
    assert rows[0]["source_platform"] == SOURCE_CHESSCOM
    assert rows[0]["ritmo"] == "10+0"
