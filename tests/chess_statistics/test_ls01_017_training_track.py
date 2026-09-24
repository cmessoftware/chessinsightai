"""Tests for LS01-017 — training-track filter (rapid / classical / daily)."""

from __future__ import annotations

import json
import sys
from argparse import _SubParsersAction
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from chess_statistics.aggregates import AggregateQueryService  # noqa: E402
from chess_statistics.cli import build_parser, run  # noqa: E402
from chess_statistics.db import StatisticsRepository, connect, init_schema  # noqa: E402
from chess_statistics.export import rows_from_repository  # noqa: E402
from chess_statistics.import_games import COLOR_WHITE  # noqa: E402
from chess_statistics.training_track import (  # noqa: E402
    TRACK_CLASSICAL,
    TRACK_DAILY,
    TRACK_RAPID,
    filter_training_rows,
    training_track,
)

USER = "cmess4401"


def test_rapid_kept_blitz_clock_and_bullet_dropped_daily_kept():
    assert training_track(perf="rapid", ritmo="15+10") == TRACK_RAPID
    assert training_track(ritmo="15+10") == TRACK_RAPID
    assert training_track(ritmo="3+2") is None
    assert training_track(perf="blitz", ritmo="3+2") is None
    assert training_track(perf="bullet") is None
    assert training_track(perf="ultrabullet") is None
    assert training_track(perf="daily") == TRACK_DAILY
    assert training_track(perf="correspondence") == TRACK_DAILY
    assert training_track(ritmo="1d") == TRACK_DAILY
    assert training_track(perf="classical", ritmo="30+20") == TRACK_CLASSICAL
    assert training_track(ritmo="30+0") == TRACK_CLASSICAL


def test_filter_training_rows_labels_and_drops_blitz():
    rows = [
        {"game_id": "r", "perf": "rapid", "ritmo": "15+10", "fecha": "2026-01-01"},
        {"game_id": "b", "perf": "blitz", "ritmo": "3+2", "fecha": "2026-01-02"},
        {"game_id": "d", "perf": "daily", "ritmo": "1d", "fecha": "2026-01-03"},
        {"game_id": "u", "perf": "bullet", "ritmo": "1+0", "fecha": "2026-01-04"},
        {"game_id": "bot", "perf": "rapid", "ritmo": "10+0", "rival": "StockfishBOT", "fecha": "2026-01-05"},
    ]
    labeled = filter_training_rows(rows)
    assert [row["track"] for row in labeled] == [
        TRACK_RAPID,
        None,
        TRACK_DAILY,
        None,
        TRACK_RAPID,
    ]
    training = filter_training_rows(rows, training_only=True)
    assert [row["game_id"] for row in training] == ["r", "d"]
    rapid = filter_training_rows(rows, track="rapid")
    assert [row["game_id"] for row in rapid] == ["r"]


def _repo(tmp_path: Path) -> StatisticsRepository:
    conn = connect(tmp_path / "ls.sqlite")
    init_schema(conn)
    return StatisticsRepository(conn)


def _insert(repo: StatisticsRepository, game_id: str, *, perf: str, ritmo: str, fecha: str) -> None:
    repo.insert_game(
        game_id,
        lichess_id=game_id[:8],
        fecha=fecha,
        usuario=USER,
        color=COLOR_WHITE,
        rival="opp",
        resultado="G",
        ritmo=ritmo,
        perf=perf,
        ranking_inicial=1600,
        ranking_final=1608,
    )
    repo.insert_stats(game_id, usuario=USER, precision_general=70.0)


def test_stats_track_rapid_excludes_blitz_means_use_n(tmp_path: Path, capsys):
    repo = _repo(tmp_path)
    _insert(repo, "rapid1", perf="rapid", ritmo="15+10", fecha="2026-03-01")
    _insert(repo, "blitz1", perf="blitz", ritmo="3+2", fecha="2026-03-02")
    _insert(repo, "daily1", perf="daily", ritmo="1d", fecha="2026-03-03")
    report = AggregateQueryService(repo).report(USER, track="rapid")
    assert report["period"]["n_games"] == 1
    assert report["track"] == "rapid"
    assert report["rating_evolution"][0]["track"] == TRACK_RAPID
    code = run(
        [
            "stats",
            "--username",
            USER,
            "--database",
            str(tmp_path / "ls.sqlite"),
            "--track",
            "rapid",
        ]
    )
    assert code == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["period"]["n_games"] == 1
    stats_help = next(
        action.choices["stats"].format_help()
        for action in build_parser()._actions
        if isinstance(action, _SubParsersAction)
    )
    assert "--track" in stats_help


def test_export_training_drops_bullet(tmp_path: Path):
    repo = _repo(tmp_path)
    _insert(repo, "rapid1", perf="rapid", ritmo="10+0", fecha="2026-03-01")
    _insert(repo, "bullet1", perf="bullet", ritmo="1+0", fecha="2026-03-02")
    rows = rows_from_repository(repo, usuario=USER, training_only=True)
    assert len(rows) == 1
    assert rows[0]["Pista"] == TRACK_RAPID
