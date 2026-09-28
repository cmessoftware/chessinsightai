"""Persistence helpers for Module 07 MVP tables."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.orm import Session, joinedload

from modules.module07.ingest import resolve_player_color
from models.module07_models import (
    DEFAULT_STOCKFISH_DEPTH,
    DEFAULT_STOCKFISH_MULTIPV,
    Module07AnalysisJob,
    Module07DecisionPoint,
    Module07Game,
)


def _new_id() -> str:
    return str(uuid.uuid4())


def create_games_from_ingest(
    db: Session,
    *,
    owner_user_id: int,
    parsed_games: list[Any],
    corpus_type: str = "personal",
    source: str = "pgn",
) -> list[Module07Game]:
    rows: list[Module07Game] = []
    for item in parsed_games:
        existing = (
            db.query(Module07Game)
            .filter(
                Module07Game.owner_user_id == owner_user_id,
                Module07Game.content_game_id == item.content_game_id,
            )
            .first()
        )
        if existing:
            rows.append(existing)
            continue
        row = Module07Game(
            id=_new_id(),
            owner_user_id=owner_user_id,
            content_game_id=item.content_game_id,
            pgn=item.pgn,
            white_player=item.white_player,
            black_player=item.black_player,
            player_username=item.player_username,
            player_color=item.player_color,
            result=item.result,
            source=source,
            corpus_type=corpus_type,
            speed_class=getattr(item, "speed_class", "unknown"),
        )
        db.add(row)
        rows.append(row)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows


def create_analysis_job(
    db: Session,
    *,
    owner_user_id: int,
    game_ids: list[str],
    player_username: str | None = None,
    depth: int = DEFAULT_STOCKFISH_DEPTH,
    multipv: int = DEFAULT_STOCKFISH_MULTIPV,
) -> Module07AnalysisJob:
    job = Module07AnalysisJob(
        id=_new_id(),
        owner_user_id=owner_user_id,
        status="pending",
        stockfish_depth=depth,
        stockfish_multipv=multipv,
    )
    db.add(job)
    db.flush()
    for gid in game_ids:
        game = (
            db.query(Module07Game)
            .filter(
                Module07Game.id == gid,
                Module07Game.owner_user_id == owner_user_id,
            )
            .first()
        )
        if game is None:
            continue
        pov = (player_username or game.player_username or "").strip()
        if not pov:
            raise ValueError(
                "player_username is required to analyze: chess handle as in PGN White/Black"
            )
        game.player_username = pov
        game.player_color = resolve_player_color(
            game.white_player, game.black_player, pov
        )
        game.analysis_job_id = job.id
    db.commit()
    db.refresh(job)
    return job


def set_job_status(
    db: Session,
    job: Module07AnalysisJob,
    status: str,
    *,
    error_message: str | None = None,
) -> None:
    job.status = status
    if error_message is not None:
        job.error_message = error_message
    db.commit()


def add_decision_point(
    db: Session,
    *,
    game_id: str,
    ply: int,
    fen_before: str,
    criticality: float | None,
    review_pack: dict[str, Any],
    mental_model: dict[str, Any] | None,
) -> Module07DecisionPoint:
    row = Module07DecisionPoint(
        id=_new_id(),
        game_id=game_id,
        ply=ply,
        fen_before=fen_before,
        criticality=criticality,
        review_pack=review_pack,
        mental_model=mental_model,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_jobs(db: Session, owner_user_id: int) -> list[Module07AnalysisJob]:
    return (
        db.query(Module07AnalysisJob)
        .options(joinedload(Module07AnalysisJob.games))
        .filter(Module07AnalysisJob.owner_user_id == owner_user_id)
        .order_by(Module07AnalysisJob.created_at.desc())
        .all()
    )


def get_job(db: Session, job_id: str, owner_user_id: int) -> Module07AnalysisJob | None:
    return (
        db.query(Module07AnalysisJob)
        .options(joinedload(Module07AnalysisJob.games))
        .filter(
            Module07AnalysisJob.id == job_id,
            Module07AnalysisJob.owner_user_id == owner_user_id,
        )
        .first()
    )


def list_games(db: Session, owner_user_id: int) -> list[Module07Game]:
    return (
        db.query(Module07Game)
        .options(joinedload(Module07Game.analysis_job))
        .filter(Module07Game.owner_user_id == owner_user_id)
        .order_by(Module07Game.created_at.desc())
        .all()
    )


def get_game(db: Session, game_id: str, owner_user_id: int) -> Module07Game | None:
    return (
        db.query(Module07Game)
        .filter(
            Module07Game.id == game_id,
            Module07Game.owner_user_id == owner_user_id,
        )
        .first()
    )


def list_decisions_for_game(
    db: Session, game_id: str, owner_user_id: int
) -> list[Module07DecisionPoint]:
    game = get_game(db, game_id, owner_user_id)
    if game is None:
        return []
    return (
        db.query(Module07DecisionPoint)
        .filter(Module07DecisionPoint.game_id == game_id)
        .order_by(Module07DecisionPoint.ply.asc())
        .all()
    )


def get_decision(
    db: Session, decision_id: str, owner_user_id: int
) -> Module07DecisionPoint | None:
    row = db.query(Module07DecisionPoint).filter(Module07DecisionPoint.id == decision_id).first()
    if row is None:
        return None
    game = get_game(db, row.game_id, owner_user_id)
    if game is None:
        return None
    return row
