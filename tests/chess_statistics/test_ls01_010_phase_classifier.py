"""Tests for LS01-010 — opening / middlegame / endgame + phase accuracies."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import chess

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from chess_statistics.accuracy import force_as_cp, game_accuracy_percent  # noqa: E402
from chess_statistics.db import StatisticsRepository, connect, init_schema  # noqa: E402
from chess_statistics.evals import analysis_entries  # noqa: E402
from chess_statistics.import_games import GameImportService  # noqa: E402
from chess_statistics.phases import (  # noqa: E402
    PHASE_ENDGAME,
    PHASE_MIDDLEGAME,
    PHASE_OPENING,
    SOURCE_NDJSON,
    SOURCE_PIECE_COUNT,
    boards_from_sans,
    classify_game,
    division_from_divider,
    division_from_ndjson,
    phase_from_piece_count,
)

FIXTURE_TWO = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_two_games.ndjson"
FIXTURE_DRAW = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_draw.ndjson"
USER = "cmess4401"


def _load_line(path: Path, index: int = 0) -> dict:
    lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return json.loads(lines[index])


def _repo(tmp_path: Path) -> StatisticsRepository:
    conn = connect(tmp_path / "ls.sqlite")
    init_schema(conn)
    return StatisticsRepository(conn)


def test_ndjson_division_preferred_on_real_draw():
    game = _load_line(FIXTURE_DRAW, 0)
    div = division_from_ndjson(game)
    assert div is not None
    assert div.source == SOURCE_NDJSON
    assert div.middle == 19
    assert div.end == 38
    assert div.phase_of(1) == PHASE_OPENING
    assert div.phase_of(19) == PHASE_MIDDLEGAME
    assert div.phase_of(38) == PHASE_ENDGAME


def test_divider_matches_lichess_export_on_draw_fixture():
    game = _load_line(FIXTURE_DRAW, 0)
    sans = game["moves"].split()
    computed = division_from_divider(boards_from_sans(sans))
    exported = division_from_ndjson(game)
    assert exported is not None
    assert computed.middle == exported.middle
    assert computed.end == exported.end


def test_piece_count_fallback_matches_features_generator():
    start = chess.Board()
    assert phase_from_piece_count(start) == PHASE_OPENING
    assert classify_game(ply_count=10).source == SOURCE_PIECE_COUNT


def test_import_labels_phases_and_phase_accuracies(tmp_path: Path):
    game = _load_line(FIXTURE_TWO, 0)
    repo = _repo(tmp_path)
    imported = GameImportService().import_game(repo, game, USER, fallback_local=False)
    assert imported is not None
    evals = repo.list_evals(imported.game_id)
    phases = {row["phase"] for row in evals}
    assert PHASE_OPENING in phases
    assert phases <= {PHASE_OPENING, PHASE_MIDDLEGAME, PHASE_ENDGAME}
    stats = repo.get_stats(imported.game_id)
    assert stats is not None
    overall = stats["precision_general"]
    phase_vals = [
        stats["precision_apertura"],
        stats["precision_medio_juego"],
        stats["precision_final"],
    ]
    present = [value for value in phase_vals if value is not None]
    assert present
    if len(present) == 3:
        assert abs(overall - sum(present) / 3) > 0.01
    cps = [force_as_cp(e.get("eval"), e.get("mate")) for e in analysis_entries(game)]
    assert abs(overall - game_accuracy_percent(cps, "BLACK")) < 1e-9
