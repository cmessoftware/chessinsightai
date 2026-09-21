"""PGN file as a Lichess-only game source for sync (no live API)."""

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

from chess_statistics.cli import run  # noqa: E402
from chess_statistics.db import StatisticsRepository, connect, init_schema  # noqa: E402
from chess_statistics.evals import FUENTE_STOCKFISH_LOCAL, StockfishAnalysisService, StockfishConfig  # noqa: E402
from chess_statistics.filters import (  # noqa: E402
    REASON_NOT_LICHESS,
    REASON_PGN_ERRORS,
    REASON_UNFINISHED,
    SKIP_KEY,
)
from chess_statistics.game_id import identity_from_ndjson  # noqa: E402
from chess_statistics.pgn_source import iter_pgn_file, ndjson_from_pgn_game  # noqa: E402
from chess_statistics.service import GameStatisticsService  # noqa: E402

FIXTURE_TWO = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_two_games.ndjson"
USER = "cmess4401"
MOVES = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 1-0"

CHESSCOM = f"""[Event "Live Chess"]
[Site "https://www.chess.com/game/live/999001"]
[Date "2026.01.02"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]
[TimeControl "600+0"]

{MOVES}
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


def _lichess_pgn(*, game_id: str, result: str = "1-0", extra_comment: str = "", event: str = "Rated Rapid game") -> str:
    comment = f" {{ {extra_comment} }}" if extra_comment else ""
    return f"""[Event "{event}"]
[Site "https://lichess.org/{game_id}"]
[Date "2026.09.15"]
[UTCDate "2026.09.15"]
[UTCTime "12:00:00"]
[White "cmess4401"]
[Black "Rival"]
[Result "{result}"]
[TimeControl "900+10"]
[WhiteElo "1500"]
[WhiteRatingDiff "+8"]
[BlackElo "1480"]

1. e4{comment} e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O {result}
"""


def test_iter_pgn_preserves_lichess_pgn_identity(tmp_path: Path):
    pgn_path = tmp_path / "two.pgn"
    pgn_path.write_text(_pgn_from_ndjson(FIXTURE_TWO), encoding="utf-8")
    ndjson_ids = []
    for line in FIXTURE_TWO.read_text(encoding="utf-8").splitlines():
        payload = json.loads(line)
        ndjson_ids.append(identity_from_ndjson(payload).game_id)
    converted = list(iter_pgn_file(pgn_path))
    assert len(converted) == 2
    assert SKIP_KEY not in converted[0]
    assert [identity_from_ndjson(game).game_id for game in converted] == ndjson_ids
    assert converted[0]["id"] in {"tOsxrK57", "ApzutTLl"}
    assert converted[0]["clock"]["initial"] == 900
    assert converted[0]["clock"]["increment"] == 10


def test_sync_from_pgn_skips_chesscom_and_games_without_user(tmp_path: Path):
    pgn_path = tmp_path / "mixed.pgn"
    pgn_path.write_text(_pgn_from_ndjson(FIXTURE_TWO) + "\n\n" + CHESSCOM, encoding="utf-8")
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


def test_chess_com_pgn_is_rejected():
    parsed = chess.pgn.read_game(StringIO(CHESSCOM))
    payload = ndjson_from_pgn_game(parsed)
    assert payload[SKIP_KEY] == REASON_NOT_LICHESS


def test_lichess_time_control_maps_to_ritmo():
    parsed = chess.pgn.read_game(StringIO(_lichess_pgn(game_id="abcdefgh", event="Rated Blitz game").replace("900+10", "480+2")))
    payload = ndjson_from_pgn_game(parsed)
    assert SKIP_KEY not in payload
    assert payload["clock"] == {"initial": 480, "increment": 2}
    assert payload["speed"] == "blitz"
    assert payload["id"] == "abcdefgh"


def test_unfinished_result_star_is_skipped():
    parsed = chess.pgn.read_game(StringIO(_lichess_pgn(game_id="unfin123", result="*")))
    payload = ndjson_from_pgn_game(parsed)
    assert payload[SKIP_KEY] == REASON_UNFINISHED


def test_illegal_san_is_skipped():
    raw = _lichess_pgn(game_id="badmoves1").replace("1. e4 e5", "1. e4 ha2")
    parsed = chess.pgn.read_game(StringIO(raw))
    payload = ndjson_from_pgn_game(parsed)
    assert payload[SKIP_KEY] == REASON_PGN_ERRORS


def test_duplicate_lichess_id_keeps_original_game_id(tmp_path: Path):
    first = _lichess_pgn(game_id="dupgame1")
    second = _lichess_pgn(game_id="dupgame1", extra_comment="clock 1:00")
    pgn_path = tmp_path / "dup.pgn"
    pgn_path.write_text(first + "\n\n" + second, encoding="utf-8")
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
    assert len(rows) == 1
    assert rows[0]["lichess_id"] == "dupgame1"
    first_id = identity_from_ndjson(list(iter_pgn_file(pgn_path))[0]).game_id
    assert rows[0]["game_id"] == first_id


def test_local_pgn_respects_since_until_and_perf_type(tmp_path: Path):
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
                "--until",
                "2026-01-01",
            ]
        )
        == 0
    )
    repo = StatisticsRepository(connect(db))
    assert repo.list_games(usuario=USER) == []

    db2 = tmp_path / "ls2.sqlite"
    assert (
        run(
            [
                "sync",
                "--username",
                USER,
                "--from-pgn",
                str(pgn_path),
                "--database",
                str(db2),
                "--download-only",
                "--perf-type",
                "blitz",
            ]
        )
        == 0
    )
    assert StatisticsRepository(connect(db2)).list_games(usuario=USER) == []

    db3 = tmp_path / "ls3.sqlite"
    assert (
        run(
            [
                "sync",
                "--username",
                USER,
                "--from-pgn",
                str(pgn_path),
                "--database",
                str(db3),
                "--download-only",
                "--since",
                "2026-09-01",
                "--until",
                "2026-09-30",
                "--perf-type",
                "rapid",
            ]
        )
        == 0
    )
    assert len(StatisticsRepository(connect(db3)).list_games(usuario=USER)) == 2


def test_no_rating_diff_leaves_ranking_final_null():
    pgn = _lichess_pgn(game_id="nordiff1").replace('[WhiteRatingDiff "+8"]\n', "")
    parsed = chess.pgn.read_game(StringIO(pgn))
    payload = ndjson_from_pgn_game(parsed)
    from chess_statistics.import_games import game_row_from_ndjson

    row = game_row_from_ndjson(payload, USER)
    assert row.ranking_inicial == 1500
    assert row.variacion_ranking is None
    assert row.ranking_final is None
