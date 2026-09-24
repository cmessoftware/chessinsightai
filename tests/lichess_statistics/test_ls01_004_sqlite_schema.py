"""Tests for LS01-004 — tool SQLite schema and unique game_id."""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from lichess_statistics.db import (  # noqa: E402
    DEFAULT_DB_PATH,
    StatisticsRepository,
    connect,
    init_schema,
    sqlite_path_from_url,
)
from lichess_statistics.game_id import identity_from_ndjson  # noqa: E402

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_two_games.ndjson"


def _repo(tmp_path: Path) -> tuple[sqlite3.Connection, StatisticsRepository]:
    conn = connect(tmp_path / "lichess_statistics.sqlite")
    init_schema(conn)
    return conn, StatisticsRepository(conn)


def test_schema_creates_games_evals_stats(tmp_path: Path):
    conn, _ = _repo(tmp_path)
    names = {
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }
    assert {"games", "evals", "stats"}.issubset(names)


def test_second_insert_same_game_id_is_noop(tmp_path: Path):
    line = FIXTURE.read_text(encoding="utf-8").splitlines()[0]
    game = json.loads(line)
    identity = identity_from_ndjson(game)
    conn, repo = _repo(tmp_path)

    first = repo.insert_game(
        identity.game_id,
        lichess_id=identity.lichess_id,
        pgn=game["pgn"],
        usuario="cmess4401",
    )
    second = repo.insert_game(
        identity.game_id,
        lichess_id="should-not-overwrite",
        pgn="[Event \"other\"]\n\n1. d4 1-0",
        usuario="otheruser",
    )

    assert first.inserted is True
    assert second.inserted is False
    row = repo.get_game(identity.game_id)
    assert row is not None
    assert row["lichess_id"] == identity.lichess_id
    assert row["usuario"] == "cmess4401"
    assert row["pgn"] == game["pgn"]
    count = conn.execute("SELECT COUNT(*) FROM games").fetchone()[0]
    assert count == 1


def test_same_lichess_id_different_pgn_reuses_stored_game_id(tmp_path: Path):
    conn, repo = _repo(tmp_path)
    first = repo.insert_game("hash-aaaa", lichess_id="sameLichess", pgn="pgn-a", usuario="cmess4401")
    second = repo.insert_game("hash-bbbb", lichess_id="sameLichess", pgn="pgn-b", usuario="other")
    assert first.inserted is True
    assert second.inserted is False
    assert second.game_id == "hash-aaaa"
    assert repo.get_game("hash-bbbb") is None
    assert conn.execute("SELECT COUNT(*) FROM games").fetchone()[0] == 1


def test_two_fixture_games_insert_as_two_rows(tmp_path: Path):
    _, repo = _repo(tmp_path)
    ids: list[str] = []
    for line in FIXTURE.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        game = json.loads(line)
        identity = identity_from_ndjson(game)
        ids.append(identity.game_id)
        assert repo.insert_game(identity.game_id, lichess_id=identity.lichess_id).inserted
    assert len(ids) == 2
    assert ids[0] != ids[1]


def test_evals_and_stats_unique_on_game_id(tmp_path: Path):
    identity = identity_from_ndjson(
        json.loads(FIXTURE.read_text(encoding="utf-8").splitlines()[0])
    )
    conn, repo = _repo(tmp_path)
    repo.insert_game(identity.game_id)

    assert repo.insert_eval(identity.game_id, 1, move_san="e4") is True
    assert repo.insert_eval(identity.game_id, 1, move_san="d4") is False
    assert repo.insert_stats(identity.game_id, precision_general=70.0) is True
    assert repo.insert_stats(identity.game_id, precision_general=1.0) is False

    eval_san = conn.execute(
        "SELECT move_san FROM evals WHERE game_id = ? AND ply = 1",
        (identity.game_id,),
    ).fetchone()[0]
    precision = conn.execute(
        "SELECT precision_general FROM stats WHERE game_id = ?",
        (identity.game_id,),
    ).fetchone()[0]
    assert eval_san == "e4"
    assert precision == 70.0


def test_sqlite_url_and_default_path():
    assert sqlite_path_from_url("sqlite:///data/lichess_statistics.sqlite") == Path(
        "data/lichess_statistics.sqlite"
    )
    assert sqlite_path_from_url("sqlite:///C:/tmp/lichess_statistics.sqlite") == Path(
        "C:/tmp/lichess_statistics.sqlite"
    )
    assert DEFAULT_DB_PATH == Path("data") / "lichess_statistics.sqlite"
