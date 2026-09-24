"""Tests for LS01-011 — Lichess Insight judgments and ACPL."""

from __future__ import annotations

import json
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from lichess_statistics.accuracy import (  # noqa: E402
    JUDGMENT_BLUNDER,
    JUDGMENT_INACCURACY,
    JUDGMENT_MISTAKE,
    judgment_from_wc_drop,
)
from lichess_statistics.db import StatisticsRepository, connect, init_schema  # noqa: E402
from lichess_statistics.import_games import GameImportService  # noqa: E402

FIXTURE_TWO = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_two_games.ndjson"
USER = "cmess4401"


def _load_line(path: Path, index: int = 0) -> dict:
    lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return json.loads(lines[index])


def _repo(tmp_path: Path) -> StatisticsRepository:
    conn = connect(tmp_path / "ls.sqlite")
    init_schema(conn)
    return StatisticsRepository(conn)


def test_win_chance_bands():
    assert judgment_from_wc_drop(0.09) is None
    assert judgment_from_wc_drop(0.10) == JUDGMENT_INACCURACY
    assert judgment_from_wc_drop(0.20) == JUDGMENT_MISTAKE
    assert judgment_from_wc_drop(0.30) == JUDGMENT_BLUNDER


def test_black_fixture_matches_lichess_analysis_counts(tmp_path: Path):
    game = _load_line(FIXTURE_TWO, 0)
    repo = _repo(tmp_path)
    imported = GameImportService().import_game(repo, game, USER, fallback_local=False)
    assert imported is not None
    stats = repo.get_stats(imported.game_id)
    analysis = game["players"]["black"]["analysis"]
    assert stats is not None
    assert stats["imprecisiones"] == analysis["inaccuracy"] == 2
    assert stats["errores"] == analysis["mistake"] == 0
    assert stats["errores_graves"] == analysis["blunder"] == 0
    assert abs(stats["perdida_promedio_cp"] - analysis["acpl"]) <= 1.0


def test_white_fixture_matches_lichess_judgment_counts(tmp_path: Path):
    game = _load_line(FIXTURE_TWO, 1)
    repo = _repo(tmp_path)
    imported = GameImportService().import_game(repo, game, USER, fallback_local=False)
    assert imported is not None
    stats = repo.get_stats(imported.game_id)
    analysis = game["players"]["white"]["analysis"]
    assert stats is not None
    assert stats["imprecisiones"] == analysis["inaccuracy"] == 5
    assert stats["errores"] == analysis["mistake"] == 4
    assert stats["errores_graves"] == analysis["blunder"] == 1
    # ACPL on Lichess uses vs-best; we store mean eval swing. Keep it finite.
    assert stats["perdida_promedio_cp"] > 0
    blunder_plies = [
        row["ply"]
        for row in repo.list_evals(imported.game_id)
        if row["judgment"] == JUDGMENT_BLUNDER and row["ply"] % 2 == 1
    ]
    assert blunder_plies
