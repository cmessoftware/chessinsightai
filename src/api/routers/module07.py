"""Module 07 MVP — ingest, jobs, decision review API."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.module07_models import (
    DEFAULT_STOCKFISH_DEPTH,
    DEFAULT_STOCKFISH_MULTIPV,
)
from modules.module07.ingest import parse_games_from_pgn_text
from modules.module07.repository import (
    create_analysis_job,
    create_games_from_ingest,
    get_decision,
    get_game,
    get_job,
    list_decisions_for_game,
    list_games,
    list_jobs,
)
from modules.module07.worker import run_analysis_job

router = APIRouter(prefix="/api/v1/module07", tags=["module07"])


def _owner_id(request: Request) -> int:
    user = getattr(request.state, "user", None) or {}
    uid = user.get("user_id")
    if uid is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return int(uid)


class IngestBody(BaseModel):
    pgn_text: str = Field(..., min_length=1)
    player_username: str = Field(..., min_length=1)


class JobCreateBody(BaseModel):
    game_ids: list[str] = Field(..., min_length=1)
    stockfish_depth: int = Field(default=DEFAULT_STOCKFISH_DEPTH, ge=1, le=40)
    stockfish_multipv: int = Field(default=DEFAULT_STOCKFISH_MULTIPV, ge=1, le=10)


def _game_json(row: Any) -> dict[str, Any]:
    return {
        "id": row.id,
        "content_game_id": row.content_game_id,
        "white_player": row.white_player,
        "black_player": row.black_player,
        "player_username": row.player_username,
        "player_color": row.player_color,
        "result": row.result,
        "analysis_job_id": row.analysis_job_id,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _job_json(row: Any) -> dict[str, Any]:
    return {
        "id": row.id,
        "status": row.status,
        "stockfish_depth": row.stockfish_depth,
        "stockfish_multipv": row.stockfish_multipv,
        "error_message": row.error_message,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "started_at": row.started_at.isoformat() if row.started_at else None,
        "finished_at": row.finished_at.isoformat() if row.finished_at else None,
        "game_ids": [g.id for g in row.games],
    }


def _decision_json(row: Any) -> dict[str, Any]:
    return {
        "id": row.id,
        "game_id": row.game_id,
        "ply": row.ply,
        "fen_before": row.fen_before,
        "criticality": row.criticality,
        "review_pack": row.review_pack,
        "mental_model": row.mental_model,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.post("/ingest")
def ingest_pgn(
    body: IngestBody,
    request: Request,
    db: Session = Depends(get_db),
):
    owner = _owner_id(request)
    try:
        parsed = parse_games_from_pgn_text(
            body.pgn_text, player_username=body.player_username
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    rows = create_games_from_ingest(db, owner_user_id=owner, parsed_games=parsed)
    return {
        "games": [_game_json(r) for r in rows],
        "count": len(rows),
    }


@router.get("/games")
def get_games(request: Request, db: Session = Depends(get_db)):
    owner = _owner_id(request)
    return {"games": [_game_json(r) for r in list_games(db, owner)]}


@router.get("/games/{game_id}/decisions")
def get_game_decisions(
    game_id: str, request: Request, db: Session = Depends(get_db)
):
    owner = _owner_id(request)
    if get_game(db, game_id, owner) is None:
        raise HTTPException(status_code=404, detail="Game not found")
    rows = list_decisions_for_game(db, game_id, owner)
    return {"decisions": [_decision_json(r) for r in rows]}


@router.get("/decisions/{decision_id}")
def get_decision_detail(
    decision_id: str, request: Request, db: Session = Depends(get_db)
):
    owner = _owner_id(request)
    row = get_decision(db, decision_id, owner)
    if row is None:
        raise HTTPException(status_code=404, detail="Decision not found")
    return _decision_json(row)


@router.get("/jobs")
def get_jobs(request: Request, db: Session = Depends(get_db)):
    owner = _owner_id(request)
    return {"jobs": [_job_json(j) for j in list_jobs(db, owner)]}


@router.get("/jobs/{job_id}")
def get_job_detail(job_id: str, request: Request, db: Session = Depends(get_db)):
    owner = _owner_id(request)
    job = get_job(db, job_id, owner)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_json(job)


@router.post("/jobs")
def create_job(
    body: JobCreateBody,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    owner = _owner_id(request)
    for gid in body.game_ids:
        if get_game(db, gid, owner) is None:
            raise HTTPException(status_code=400, detail=f"Unknown game_id: {gid}")
    job = create_analysis_job(
        db,
        owner_user_id=owner,
        game_ids=body.game_ids,
        depth=body.stockfish_depth,
        multipv=body.stockfish_multipv,
    )
    background_tasks.add_task(run_analysis_job, job.id, owner)
    return _job_json(job)


@router.post("/ingest-and-analyze")
def ingest_and_analyze(
    body: IngestBody,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    stockfish_depth: int = DEFAULT_STOCKFISH_DEPTH,
    stockfish_multipv: int = DEFAULT_STOCKFISH_MULTIPV,
):
    """Single-shot MVP: parse PGN, persist games, enqueue analysis."""
    owner = _owner_id(request)
    try:
        parsed = parse_games_from_pgn_text(
            body.pgn_text, player_username=body.player_username
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    rows = create_games_from_ingest(db, owner_user_id=owner, parsed_games=parsed)
    job = create_analysis_job(
        db,
        owner_user_id=owner,
        game_ids=[r.id for r in rows],
        depth=stockfish_depth,
        multipv=stockfish_multipv,
    )
    background_tasks.add_task(run_analysis_job, job.id, owner)
    return {
        "games": [_game_json(r) for r in rows],
        "job": _job_json(job),
    }
