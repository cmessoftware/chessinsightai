"""Tests for LS01-018 — layer A report scoped by training track."""

from __future__ import annotations

import json
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from chess_statistics.aggregates import AggregateQueryService  # noqa: E402
from chess_statistics.cli import run  # noqa: E402
from chess_statistics.db import StatisticsRepository, connect, init_schema  # noqa: E402
from chess_statistics.import_games import COLOR_BLACK, COLOR_WHITE  # noqa: E402
from chess_statistics.training_track import TRACK_DAILY, TRACK_RAPID  # noqa: E402

USER = "cmess4401"


def _repo(tmp_path: Path) -> StatisticsRepository:
    conn = connect(tmp_path / "ls.sqlite")
    init_schema(conn)
    return StatisticsRepository(conn)


def _insert(
    repo: StatisticsRepository,
    game_id: str,
    *,
    perf: str,
    ritmo: str,
    fecha: str,
    color: str,
    apertura: str,
    precision_general: float | None,
    precision_apertura: float | None = None,
    precision_medio: float | None = None,
    precision_final: float | None = None,
    acpl: float | None = None,
) -> None:
    repo.insert_game(
        game_id,
        lichess_id=game_id[:8],
        fecha=fecha,
        usuario=USER,
        color=color,
        rival="opp",
        resultado="G",
        ritmo=ritmo,
        perf=perf,
        ranking_inicial=1600,
        ranking_final=1608,
        apertura=apertura,
    )
    repo.insert_stats(
        game_id,
        usuario=USER,
        precision_general=precision_general,
        precision_apertura=precision_apertura,
        precision_medio_juego=precision_medio,
        precision_final=precision_final,
        perdida_promedio_cp=acpl,
        imprecisiones=1 if precision_general is not None else None,
        errores=0 if precision_general is not None else None,
        errores_graves=0 if precision_general is not None else None,
    )


def _seed_mixed(repo: StatisticsRepository) -> None:
    _insert(
        repo,
        "rapid1",
        perf="rapid",
        ritmo="15+10",
        fecha="2026-03-01",
        color=COLOR_WHITE,
        apertura="Sicilian Defense",
        precision_general=80.0,
        precision_apertura=70.0,
        precision_medio=90.0,
        precision_final=85.0,
        acpl=20.0,
    )
    _insert(
        repo,
        "rapid2",
        perf="rapid",
        ritmo="10+0",
        fecha="2026-03-15",
        color=COLOR_BLACK,
        apertura="Sicilian Defense",
        precision_general=None,
        acpl=None,
    )
    _insert(
        repo,
        "blitz1",
        perf="blitz",
        ritmo="3+2",
        fecha="2026-03-10",
        color=COLOR_WHITE,
        apertura="French Defense",
        precision_general=50.0,
        precision_apertura=40.0,
        precision_medio=50.0,
        precision_final=60.0,
        acpl=80.0,
    )
    _insert(
        repo,
        "daily1",
        perf="daily",
        ritmo="1d",
        fecha="2026-03-20",
        color=COLOR_WHITE,
        apertura="Queen's Gambit",
        precision_general=90.0,
        precision_apertura=88.0,
        precision_medio=91.0,
        precision_final=92.0,
        acpl=10.0,
    )


def test_track_rapid_drops_blitz_and_keeps_phase_n(tmp_path: Path):
    repo = _repo(tmp_path)
    _seed_mixed(repo)
    report = AggregateQueryService(repo).report(USER, track="rapid")
    assert report["layer"] == "A"
    assert report["period"]["n_games"] == 2
    assert report["precision_general"]["n"] == 1
    assert report["precision_general"]["mean"] == 80.0
    assert "blitz" not in report["by_track"]
    assert list(report["by_track"]) == [TRACK_RAPID]
    assert report["by_track"][TRACK_RAPID]["period"]["n_games"] == 2
    assert report["by_phase"]["opening"]["n_games"] == 2
    assert report["by_phase"]["opening"]["precision"]["n"] == 1
    assert report["by_phase"]["opening"]["precision"]["mean"] == 70.0
    assert report["by_color"][COLOR_WHITE]["n_games"] == 1
    assert report["by_color"][COLOR_BLACK]["n_games"] == 1
    assert report["by_opening"]["Sicilian Defense"]["n_games"] == 2
    assert report["by_month"]["2026-03"]["n_games"] == 2
    ids = [row["lichess_id"] for row in report["rating_evolution"]]
    assert "blitz1"[:8] not in ids


def test_training_report_splits_by_track_without_blitz(tmp_path: Path, capsys):
    repo = _repo(tmp_path)
    _seed_mixed(repo)
    report = AggregateQueryService(repo).report(USER, training_only=True)
    assert report["period"]["n_games"] == 3
    assert set(report["by_track"]) == {TRACK_RAPID, TRACK_DAILY}
    assert report["by_track"][TRACK_DAILY]["period"]["n_games"] == 1
    assert report["by_track"][TRACK_RAPID]["precision_general"]["n"] == 1
    code = run(
        [
            "stats",
            "--username",
            USER,
            "--database",
            str(tmp_path / "ls.sqlite"),
            "--training",
        ]
    )
    assert code == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["layer"] == "A"
    assert "blitz" not in payload["by_track"]
    assert payload["by_track"][TRACK_RAPID]["by_phase"]["endgame"]["n_games"] == 2
