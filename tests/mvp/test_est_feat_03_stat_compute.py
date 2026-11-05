"""EST-FEAT-03 — compute one Coach game into the Postgres statistics tables."""

from __future__ import annotations

import inspect
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
SRC_API = SRC / "api"
for path in (SRC, SRC_API):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from models.database_models import Games  # noqa: E402
from models.module07_models import (  # noqa: E402
    CoachGame,
    CoachGameStatisticEval,
    CoachGameStatistics,
)
from modules.module07.coach_game_statistics_compute import (  # noqa: E402
    EvalPly,
    compute_coach_game_statistics,
)
from modules.module07.coach_game_statistics_repository import (  # noqa: E402
    get_evals,
    get_summary,
)

EXPORT_PGN = """[Event "t"]
[White "Ada"]
[Black "Bob"]
[WhiteElo "1500"]
[WhiteRatingDiff "12"]

1. e4 { [%eval 0.30] } e5 { [%eval 0.25] } *
"""

BARE_PGN = """[Event "t"]
[White "Ada"]
[Black "Bob"]

1. e4 e5 *
"""


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    Games.__table__.create(engine)
    CoachGame.__table__.create(engine)
    CoachGameStatistics.__table__.create(engine)
    CoachGameStatisticEval.__table__.create(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def _seed(db, pgn: str, *, coach_id: str = "coach-1", color: str = "white") -> None:
    db.add(
        Games(
            game_id="master-1",
            pgn=pgn,
            white_player="Ada",
            black_player="Bob",
            corpus_type="personal",
            speed_class="blitz",
        )
    )
    db.add(
        CoachGame(
            id=coach_id,
            master_game_id="master-1",
            owner_user_id=1,
            content_game_id="content-1",
            player_username="ada",
            player_color=color,
            speed_class="blitz",
        )
    )
    db.commit()


def test_compute_module_does_not_open_course_sqlite_or_wasm_annotations():
    import modules.module07.coach_game_statistics_compute as compute

    source = inspect.getsource(compute)
    assert "sqlite3" not in source
    assert "chess_statistics.db" not in source
    assert "module07_ply_annotations" not in source
    assert "chess_statistics.sqlite" not in source


def test_export_evals_are_stored_without_stockfish(db):
    _seed(db, EXPORT_PGN)

    def _boom(_game):
        raise AssertionError("Stockfish must not run when the export already has evals")

    result = compute_coach_game_statistics(
        db, "coach-1", stockfish_service=SimpleNamespace(available=_boom, analyse_game=_boom)
    )
    assert result.stored is True
    assert result.evaluation_source == "lichess"
    assert result.ply_count == 2

    summary = get_summary(db, "coach-1")
    assert summary is not None
    assert summary.master_game_id == "master-1"
    assert summary.player_username == "ada"
    assert summary.player_color == "white"
    assert summary.opponent == "Bob"
    assert summary.speed_class == "blitz"
    assert summary.initial_rating == 1500
    assert summary.rating_change == 12
    assert summary.final_rating == 1512
    assert summary.evaluation_source == "lichess"
    assert summary.stockfish_depth is None
    assert summary.accuracy is not None
    assert summary.inaccuracies == 0
    assert summary.mistakes == 0
    assert summary.blunders == 0

    evals = get_evals(db, "coach-1")
    assert [(row.ply, row.move_san, row.played_by) for row in evals] == [
        (1, "e4", "white"),
        (2, "e5", "black"),
    ]
    assert evals[0].move_accuracy is not None
    assert evals[1].move_accuracy is None
    assert evals[0].phase == "opening"


def test_missing_export_evals_use_the_injected_engine(db):
    _seed(db, BARE_PGN)

    class Engine:
        def __init__(self):
            self.calls = 0
            self.config = SimpleNamespace(depth=8)
            self._engine_version = "Stockfish Test"

        def available(self):
            return True

        def analyse_game(self, game):
            self.calls += 1
            assert "1. e4 e5" in game["pgn"]
            return [
                EvalPly(
                    ply=1,
                    fen="start",
                    move_uci="e2e4",
                    move_san="e4",
                    evaluation_before_cp=20,
                    evaluation_after_cp=30,
                    mate_before=None,
                    mate_after=None,
                    best_move="e2e4",
                    cp_loss=-10,
                )
            ]

    engine = Engine()
    result = compute_coach_game_statistics(db, "coach-1", stockfish_service=engine)
    assert engine.calls == 1
    assert result.stored is True
    assert result.evaluation_source == "stockfish_local"
    summary = get_summary(db, "coach-1")
    assert summary.stockfish_version == "Stockfish Test"
    assert summary.stockfish_depth == 8
    assert get_evals(db, "coach-1")[0].best_move == "e2e4"


def test_unavailable_engine_leaves_the_tables_empty(db):
    _seed(db, BARE_PGN)
    engine = SimpleNamespace(
        available=lambda: False,
        analyse_game=lambda _game: (_ for _ in ()).throw(AssertionError("no analyse")),
    )
    result = compute_coach_game_statistics(db, "coach-1", stockfish_service=engine)
    assert result.stored is False
    assert result.reason == "no_engine"
    assert get_summary(db, "coach-1") is None


def test_missing_coach_game_is_not_stored(db):
    result = compute_coach_game_statistics(db, "missing", stockfish_service=None)
    assert result.stored is False
    assert result.reason == "missing_game"
