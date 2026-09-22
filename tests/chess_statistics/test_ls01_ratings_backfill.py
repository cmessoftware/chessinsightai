"""Chess.com-style Elo chain: next game's pre-rating as ranking_final."""

from __future__ import annotations

import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from chess_statistics.db import StatisticsRepository, connect, init_schema  # noqa: E402
from chess_statistics.import_games import COLOR_WHITE  # noqa: E402
from chess_statistics.ratings import (  # noqa: E402
    backfill_ranking_final_in_db,
    infer_ranking_final_chain,
)


def _repo(tmp_path: Path) -> StatisticsRepository:
    conn = connect(tmp_path / "ls.sqlite")
    init_schema(conn)
    return StatisticsRepository(conn)


def test_infer_ranking_final_from_next_game():
    games = [
        {"game_id": "a", "fecha": "2026-07-01", "ranking_inicial": 1600, "ranking_final": None, "perf": "rapid"},
        {"game_id": "b", "fecha": "2026-07-02", "ranking_inicial": 1612, "ranking_final": None, "perf": "rapid"},
    ]
    out = infer_ranking_final_chain(games)
    assert out[0]["ranking_final"] == 1612
    assert out[1]["ranking_final"] is None


def test_backfill_persists(tmp_path: Path):
    repo = _repo(tmp_path)
    repo.insert_game("g1", usuario="u", fecha="2026-07-01", color=COLOR_WHITE, perf="rapid", ranking_inicial=1600)
    repo.insert_game("g2", usuario="u", fecha="2026-07-02", color=COLOR_WHITE, perf="rapid", ranking_inicial=1608)
    assert backfill_ranking_final_in_db(repo, "u") == 1
    assert repo.get_game("g1")["ranking_final"] == 1608
