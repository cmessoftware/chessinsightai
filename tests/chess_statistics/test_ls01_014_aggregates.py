"""Tests for LS01-014 — aggregate queries with n and period."""

from __future__ import annotations

import json
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from chess_statistics.aggregates import AggregateQueryService  # noqa: E402
from chess_statistics.cli import build_parser, run  # noqa: E402
from chess_statistics.db import StatisticsRepository, connect, init_schema  # noqa: E402
from chess_statistics.import_games import COLOR_BLACK, COLOR_WHITE  # noqa: E402

USER = "cmess4401"


def _repo(tmp_path: Path) -> StatisticsRepository:
    conn = connect(tmp_path / "ls.sqlite")
    init_schema(conn)
    return StatisticsRepository(conn)


def _seed(repo: StatisticsRepository) -> None:
    """Five games: one real Lichess id; one row without precision so means use n < n_games."""
    rows = [
        {
            "game_id": "g1",
            "lichess_id": "tOsxrK57",
            "fecha": "2026-01-10",
            "color": COLOR_BLACK,
            "resultado": "G",
            "apertura": "Sicilian Defense",
            "ranking_inicial": 1640,
            "ranking_final": 1648,
            "precision_general": 70.0,
            "precision_apertura": 80.0,
            "precision_medio_juego": 60.0,
            "precision_final": 50.0,
            "perdida_promedio_cp": 20.0,
            "imprecisiones": 2,
            "errores": 1,
            "errores_graves": 0,
        },
        {
            "game_id": "g2",
            "lichess_id": "ApzutTLl",
            "fecha": "2026-01-20",
            "color": COLOR_WHITE,
            "resultado": "P",
            "apertura": "Sicilian Defense",
            "ranking_inicial": 1648,
            "ranking_final": 1641,
            "precision_general": 80.0,
            "precision_apertura": 70.0,
            "precision_medio_juego": 90.0,
            "precision_final": 80.0,
            "perdida_promedio_cp": 30.0,
            "imprecisiones": 1,
            "errores": 0,
            "errores_graves": 0,
        },
        {
            "game_id": "g3",
            "lichess_id": "5bJcGi3M",
            "fecha": "2026-02-05",
            "color": COLOR_WHITE,
            "resultado": "T",
            "apertura": "Queen's Gambit",
            "ranking_inicial": 1641,
            "ranking_final": 1641,
            "precision_general": 90.0,
            "precision_apertura": 90.0,
            "precision_medio_juego": 85.0,
            "precision_final": 95.0,
            "perdida_promedio_cp": 10.0,
            "imprecisiones": 0,
            "errores": 0,
            "errores_graves": 0,
        },
        {
            "game_id": "g4",
            "lichess_id": "aaaa1111",
            "fecha": "2026-02-15",
            "color": COLOR_BLACK,
            "resultado": "G",
            "apertura": "Queen's Gambit",
            "ranking_inicial": 1641,
            "ranking_final": 1650,
            "precision_general": 60.0,
            "precision_apertura": 50.0,
            "precision_medio_juego": 55.0,
            "precision_final": 70.0,
            "perdida_promedio_cp": 40.0,
            "imprecisiones": 3,
            "errores": 2,
            "errores_graves": 1,
        },
        {
            "game_id": "g5",
            "lichess_id": "bbbb2222",
            "fecha": "2026-02-28",
            "color": COLOR_WHITE,
            "resultado": "P",
            "apertura": "French Defense",
            "ranking_inicial": 1650,
            "ranking_final": 1642,
            "precision_general": None,
            "precision_apertura": None,
            "precision_medio_juego": None,
            "precision_final": None,
            "perdida_promedio_cp": None,
            "imprecisiones": None,
            "errores": None,
            "errores_graves": None,
        },
    ]
    for row in rows:
        repo.insert_game(
            row["game_id"],
            lichess_id=row["lichess_id"],
            fecha=row["fecha"],
            usuario=USER,
            color=row["color"],
            rival="opp",
            resultado=row["resultado"],
            ritmo="rapid",
            ranking_inicial=row["ranking_inicial"],
            ranking_final=row["ranking_final"],
            apertura=row["apertura"],
        )
        repo.insert_stats(
            row["game_id"],
            usuario=USER,
            imprecisiones=row["imprecisiones"],
            errores=row["errores"],
            errores_graves=row["errores_graves"],
            perdida_promedio_cp=row["perdida_promedio_cp"],
            precision_general=row["precision_general"],
            precision_apertura=row["precision_apertura"],
            precision_medio_juego=row["precision_medio_juego"],
            precision_final=row["precision_final"],
        )


def test_means_include_n_and_period_for_five_games(tmp_path: Path):
    repo = _repo(tmp_path)
    _seed(repo)
    report = AggregateQueryService(repo).report(USER)
    assert report["period"]["n_games"] == 5
    assert report["period"]["since"] == "2026-01-10"
    assert report["period"]["until"] == "2026-02-28"
    assert report["precision_general"]["n"] == 4
    assert report["precision_general"]["mean"] == 75.0
    assert report["perdida_promedio_cp"]["mean"] == 25.0
    assert report["perdida_promedio_cp"]["n"] == 4
    assert report["precision_apertura"]["mean"] == 72.5
    assert report["results"]["G"] == 2
    assert report["results"]["T"] == 1
    assert report["results"]["P"] == 2
    assert report["by_color"][COLOR_WHITE]["n_games"] == 3
    assert report["by_color"][COLOR_BLACK]["n_games"] == 2
    assert report["by_opening"]["Sicilian Defense"]["n_games"] == 2
    assert report["by_month"]["2026-01"]["n_games"] == 2
    assert report["by_month"]["2026-02"]["n_games"] == 3
    assert [row["lichess_id"] for row in report["rating_evolution"]] == [
        "tOsxrK57",
        "ApzutTLl",
        "5bJcGi3M",
        "aaaa1111",
        "bbbb2222",
    ]
    assert report["judgments"]["totals"]["errores_graves"] == 1


def test_last_n_and_period_compare(tmp_path: Path):
    repo = _repo(tmp_path)
    _seed(repo)
    queries = AggregateQueryService(repo)
    last = queries.report(USER, last_n=2)
    assert last["period"]["n_games"] == 2
    assert last["period"]["since"] == "2026-02-15"
    assert [row["lichess_id"] for row in last["rating_evolution"]] == ["aaaa1111", "bbbb2222"]
    compared = queries.compare_periods(
        USER,
        period_a=("2026-01-01", "2026-01-31"),
        period_b=("2026-02-01", "2026-02-28"),
    )
    assert compared["period_a"]["period"]["n_games"] == 2
    assert compared["period_b"]["period"]["n_games"] == 3
    assert compared["period_a"]["precision_general"]["n"] == 2
    assert compared["period_b"]["precision_general"]["n"] == 2


def test_stats_cli_prints_json(tmp_path: Path, capsys):
    repo = _repo(tmp_path)
    _seed(repo)
    code = run(
        [
            "stats",
            "--username",
            USER,
            "--database",
            str(tmp_path / "ls.sqlite"),
            "--perf-type",
            "rapid",
            "--last-n",
            "5",
        ]
    )
    assert code == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["period"]["n_games"] == 5
    help_text = build_parser().format_help()
    assert "stats" in help_text
