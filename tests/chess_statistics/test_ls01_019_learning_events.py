"""Tests for LS01-019 — layer B learning events (eval drop ≥150 cp)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from chess_statistics.accuracy import JUDGMENT_BLUNDER  # noqa: E402
from chess_statistics.aggregates import AggregateQueryService  # noqa: E402
from chess_statistics.db import StatisticsRepository, connect, init_schema  # noqa: E402
from chess_statistics.import_games import GameImportService  # noqa: E402
from chess_statistics.learning_events import (  # noqa: E402
    DEFAULT_EVALUATION_DROP_CP,
    collect_learning_events,
    learning_event_from_eval,
)

FIXTURE_TWO = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_two_games.ndjson"
USER = "cmess4401"


def _load_line(path: Path, index: int = 0) -> dict:
    lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return json.loads(lines[index])


def _repo(tmp_path: Path) -> StatisticsRepository:
    conn = connect(tmp_path / "ls.sqlite")
    init_schema(conn)
    return StatisticsRepository(conn)


def test_quiet_user_ply_does_not_emit_event():
    row = {
        "ply": 3,
        "fen": "startpos",
        "move_san": "Nf3",
        "cp_loss": 12,
        "judgment": None,
        "phase": "opening",
    }
    game = {"game_id": "g1", "color": "WHITE", "perf": "rapid", "ritmo": "15+10"}
    assert learning_event_from_eval(game, row) is None


def test_white_fixture_emits_drops_and_skips_quiet_plies(tmp_path: Path):
    game = _load_line(FIXTURE_TWO, 1)
    repo = _repo(tmp_path)
    imported = GameImportService().import_game(repo, game, USER, fallback_local=False)
    assert imported is not None
    stored = repo.get_game(imported.game_id)
    assert stored is not None
    events = collect_learning_events(repo, [stored])
    assert events
    for event in events:
        assert event["eval_loss_cp"] >= DEFAULT_EVALUATION_DROP_CP
        assert event["evaluation_drop"] is True
        assert event["fen_before"]
        assert event["move_san"]
        assert event["game_id"] == imported.game_id
        assert event["url"] == f"https://lichess.org/{stored['lichess_id']}"
    blunders = [e for e in events if e.get("judgment") == JUDGMENT_BLUNDER]
    assert blunders
    quiet = repo.list_evals(imported.game_id)[2]
    assert learning_event_from_eval(stored, quiet) is None


def test_stats_report_includes_layer_b(tmp_path: Path):
    game = _load_line(FIXTURE_TWO, 1)
    repo = _repo(tmp_path)
    GameImportService().import_game(repo, game, USER, fallback_local=False)
    report = AggregateQueryService(repo).report(USER, training_only=True)
    layer_b = report["learning_events"]
    assert layer_b["layer"] == "B"
    assert layer_b["drop_threshold_cp"] == DEFAULT_EVALUATION_DROP_CP
    assert layer_b["n_events"] == len(layer_b["events"])
    assert layer_b["n_events"] >= 3
