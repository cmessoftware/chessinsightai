"""Persistence helpers for Module 07 MVP tables."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from modules.game_import.master_games import upsert_master_game_from_coach_item
from modules.module07.ingest import resolve_player_color
from models.database_models import Games
from models.module07_models import (
    CoachGame,
    DEFAULT_STOCKFISH_DEPTH,
    DEFAULT_STOCKFISH_MULTIPV,
    Module07AnalysisJob,
    Module07DecisionPoint,
    Module07PlyAnnotation,
)
from modules.game_import.master_games import master_game_id_from_pgn


def _new_id() -> str:
    return str(uuid.uuid4())


def _clear_client_analysis(db: Session, game: CoachGame) -> None:
    db.query(Module07PlyAnnotation).filter(
        Module07PlyAnnotation.game_id == game.id
    ).delete(synchronize_session=False)
    game.client_analyzed_at = None
    game.client_analysis_ply_count = 0
    game.client_main_line_signature = None


def create_games_from_ingest(
    db: Session,
    *,
    owner_user_id: int,
    parsed_games: list[Any],
    corpus_type: str = "personal",
    source: str = "pgn",
    imported_by: str | None = None,
) -> tuple[list[CoachGame], list[bool]]:
    rows: list[CoachGame] = []
    is_new_flags: list[bool] = []
    now = datetime.now(timezone.utc)
    catalog_user = (imported_by or "").strip() or str(owner_user_id)
    for item in parsed_games:
        master_id = master_game_id_from_pgn(item.pgn)
        prior_master = (
            db.query(Games).filter(Games.game_id == master_id).first()
        )
        prior_pgn = prior_master.pgn if prior_master else None
        upsert_master_game_from_coach_item(
            db,
            item,
            imported_by=catalog_user,
            corpus_type=corpus_type,
        )
        pgn_changed = prior_pgn is not None and prior_pgn != item.pgn
        existing = (
            db.query(CoachGame)
            .filter(
                CoachGame.owner_user_id == owner_user_id,
                CoachGame.content_game_id == item.content_game_id,
            )
            .first()
        )
        if existing:
            existing.master_game_id = master_id
            existing.last_imported_at = now
            existing.speed_class = getattr(item, "speed_class", existing.speed_class)
            if pgn_changed:
                _clear_client_analysis(db, existing)
            rows.append(existing)
            is_new_flags.append(False)
            continue
        row = CoachGame(
            id=_new_id(),
            master_game_id=master_id,
            owner_user_id=owner_user_id,
            content_game_id=item.content_game_id,
            player_username=item.player_username,
            player_color=item.player_color,
            source=source,
            corpus_type=corpus_type,
            speed_class=getattr(item, "speed_class", "unknown"),
            last_imported_at=now,
        )
        db.add(row)
        rows.append(row)
        is_new_flags.append(True)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows, is_new_flags


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
            db.query(CoachGame)
            .filter(
                CoachGame.id == gid,
                CoachGame.owner_user_id == owner_user_id,
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


def list_games(db: Session, owner_user_id: int) -> list[CoachGame]:
    return (
        db.query(CoachGame)
        .options(joinedload(CoachGame.analysis_job))
        .filter(CoachGame.owner_user_id == owner_user_id)
        .order_by(CoachGame.last_imported_at.desc(), CoachGame.created_at.desc())
        .all()
    )


def get_game(db: Session, game_id: str, owner_user_id: int) -> CoachGame | None:
    return (
        db.query(CoachGame)
        .filter(
            CoachGame.id == game_id,
            CoachGame.owner_user_id == owner_user_id,
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


def list_ply_annotations_for_game(
    db: Session, game_id: str, owner_user_id: int
) -> list[Module07PlyAnnotation]:
    if get_game(db, game_id, owner_user_id) is None:
        return []
    return (
        db.query(Module07PlyAnnotation)
        .filter(Module07PlyAnnotation.game_id == game_id)
        .order_by(Module07PlyAnnotation.ply.asc())
        .all()
    )


def replace_ply_annotations_for_game(
    db: Session,
    *,
    game_id: str,
    owner_user_id: int,
    main_line_signature: str,
    rules_version: int,
    stockfish_depth: int,
    stockfish_multipv: int,
    source: str,
    items: list[dict[str, Any]],
) -> list[Module07PlyAnnotation]:
    game = get_game(db, game_id, owner_user_id)
    if game is None:
        raise LookupError("game_not_found")

    db.query(Module07PlyAnnotation).filter(
        Module07PlyAnnotation.game_id == game_id
    ).delete(synchronize_session=False)

    now = datetime.now(timezone.utc)
    rows: list[Module07PlyAnnotation] = []
    for item in items:
        row = Module07PlyAnnotation(
            id=_new_id(),
            game_id=game_id,
            path_key=item["path_key"],
            ply=int(item["ply"]),
            fen_before=item["fen_before"],
            played_uci=item.get("played_uci"),
            main_line_signature=main_line_signature,
            rules_version=rules_version,
            stockfish_depth=stockfish_depth,
            stockfish_multipv=stockfish_multipv,
            source=source,
            payload=item["payload"],
            updated_at=now,
        )
        db.add(row)
        rows.append(row)

    if items:
        game.client_analyzed_at = now
        game.client_analysis_ply_count = len(rows)
        game.client_main_line_signature = main_line_signature
    else:
        game.client_analyzed_at = None
        game.client_analysis_ply_count = 0
        game.client_main_line_signature = None

    db.commit()
    for row in rows:
        db.refresh(row)
    db.refresh(game)
    return rows
