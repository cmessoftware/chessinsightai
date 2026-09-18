"""Tests for LS01-005 — per-game metadata (G/T/P, ratings, ECO)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from lichess_statistics.db import StatisticsRepository, connect, init_schema  # noqa: E402
from lichess_statistics.import_games import (  # noqa: E402
    COLOR_BLACK,
    COLOR_WHITE,
    RESULT_DRAW,
    RESULT_LOSS,
    RESULT_WIN,
    GameImportService,
    format_clock_label,
    game_row_from_ndjson,
    ranking_final,
    ritmo_from_ndjson,
)

FIXTURE_TWO = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_two_games.ndjson"
FIXTURE_DRAW = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_draw.ndjson"
USER = "cmess4401"


def _load_line(path: Path, index: int = 0) -> dict:
    lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return json.loads(lines[index])


def test_time_control_labels_use_minutes_plus_increment():
    assert format_clock_label(600, 0) == "10+0"
    assert format_clock_label(480, 2) == "8+2"
    assert format_clock_label(900, 10) == "15+10"
    assert ritmo_from_ndjson({"clock": {"initial": 600, "increment": 0}}) == "10+0"


def test_ranking_final_is_inicial_plus_variacion():
    assert ranking_final(1640, 8) == 1648
    assert ranking_final(1647, -7) == 1640
    assert ranking_final(1611, None) == 1611
    assert ranking_final(None, 4) is None


def test_win_as_black_from_real_rapid():
    game = _load_line(FIXTURE_TWO, 0)
    row = game_row_from_ndjson(game, USER)
    assert game["id"] == "tOsxrK57"
    assert row.lichess_id == "tOsxrK57"
    assert row.usuario == USER
    assert row.color == COLOR_BLACK
    assert row.rival == "Robertqwe"
    assert row.resultado == RESULT_WIN
    assert row.ritmo == "15+10"
    assert row.perf == "rapid"
    assert row.fecha == "2026-09-15"
    assert row.ranking_inicial == 1640
    assert row.variacion_ranking == 8
    assert row.ranking_final == 1648
    assert row.eco == "B00"
    assert row.apertura == "Pirc Defense"
    assert row.cantidad_jugadas == len(game["moves"].split())
    assert row.duracion_segundos == (game["lastMoveAt"] - game["createdAt"]) // 1000
    assert row.pgn and "[Site \"https://lichess.org/tOsxrK57\"]" in row.pgn
    assert row.game_id != row.lichess_id


def test_loss_as_white_from_real_rapid():
    game = _load_line(FIXTURE_TWO, 1)
    row = game_row_from_ndjson(game, USER)
    assert game["id"] == "ApzutTLl"
    assert row.color == COLOR_WHITE
    assert row.rival == "Kun-jr"
    assert row.resultado == RESULT_LOSS
    assert row.ranking_inicial == 1647
    assert row.variacion_ranking == -7
    assert row.ranking_final == 1640
    assert row.eco == "B12"
    assert "Caro-Kann" in (row.apertura or "")


def test_draw_as_white_from_real_rapid():
    game = _load_line(FIXTURE_DRAW, 0)
    row = game_row_from_ndjson(game, USER)
    assert game["id"] == "5bJcGi3M"
    assert row.color == COLOR_WHITE
    assert row.rival == "Mike_Magic"
    assert row.resultado == RESULT_DRAW
    assert row.ranking_inicial == 1611
    assert row.variacion_ranking == 4
    assert row.ranking_final == 1615
    assert row.eco == "B01"
    assert row.ritmo == "8+2"
    assert row.perf == "rapid"
    assert row.pgn and "1/2-1/2" in row.pgn


def test_import_service_writes_row_and_skips_duplicate(tmp_path: Path):
    conn = connect(tmp_path / "ls.sqlite")
    init_schema(conn)
    repo = StatisticsRepository(conn)
    service = GameImportService()
    game = _load_line(FIXTURE_TWO, 0)
    first = service.import_game(repo, game, USER)
    second = service.import_game(repo, game, USER)
    assert first is not None and first.inserted is True
    assert second is not None and second.inserted is False
    stored = repo.get_game(first.game_id)
    assert stored is not None
    assert stored["resultado"] == RESULT_WIN
    assert stored["ranking_final"] == stored["ranking_inicial"] + stored["variacion_ranking"]
    assert stored["color"] == COLOR_BLACK
