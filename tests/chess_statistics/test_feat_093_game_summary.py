"""FEAT-093: one game's chess_statistics row for the PGN panel."""

from __future__ import annotations

import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from chess_statistics.db import StatisticsRepository, connect, init_schema  # noqa: E402
from chess_statistics.game_id import game_id_from_pgn_text  # noqa: E402
from modules.module07.chess_statistics_summary import lookup_chess_statistics  # noqa: E402

PGN = """[Event "Test"]
[Site "https://lichess.org/abcdefgh"]
[Date "2026.01.01"]
[White "A"]
[Black "B"]
[Result "1-0"]

1. e4 e5 1-0
"""


def test_lookup_returns_precision_when_the_game_was_processed(tmp_path: Path):
    db_path = tmp_path / "chess_statistics.sqlite"
    conn = connect(db_path)
    init_schema(conn)
    repo = StatisticsRepository(conn)
    game_id = game_id_from_pgn_text(PGN)
    repo.insert_game(
        game_id,
        fecha="2026-01-01",
        usuario="A",
        color="white",
        rival="B",
        resultado="G",
        ritmo="15+10",
        ranking_inicial=1500,
        ranking_final=1512,
        fuente_evaluacion="stockfish",
    )
    repo.insert_stats(
        game_id,
        usuario="A",
        imprecisiones=3,
        errores=1,
        errores_graves=0,
        perdida_promedio_cp=18.2,
        precision_general=81.25,
        precision_apertura=90,
        precision_medio_juego=70,
        precision_final=80,
    )
    conn.close()

    payload = lookup_chess_statistics(PGN, database=db_path)
    by_key = {row["key"]: row["value"] for row in payload["fields"]}
    assert payload["available"] is True
    assert payload["found"] is True
    assert by_key["precision_general"] == "81.2%"
    assert by_key["errores_graves"] == "0"
    assert by_key["rival"] == "B"
    assert by_key["perdida_promedio_cp"] == "18.2"


def test_lookup_reports_missing_database(tmp_path: Path):
    payload = lookup_chess_statistics(PGN, database=tmp_path / "missing.sqlite")
    assert payload == {"available": False, "found": False, "fields": []}


def test_lookup_reports_unknown_game(tmp_path: Path):
    db_path = tmp_path / "chess_statistics.sqlite"
    conn = connect(db_path)
    init_schema(conn)
    conn.close()
    payload = lookup_chess_statistics(PGN, database=db_path)
    assert payload["available"] is True
    assert payload["found"] is False
    assert payload["fields"] == []
