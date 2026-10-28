"""Module 07 MVP — ingest, jobs, decision review API."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from pydantic import field_validator
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.module07_models import (
    CLIENT_CLASSIFICATION_RULES_VERSION,
    CLIENT_CLASSIFICATION_SOURCE,
    DEFAULT_STOCKFISH_DEPTH,
    DEFAULT_STOCKFISH_MULTIPV,
)
from modules.game_import.game_description import (
    format_coach_game_description,
    format_time_control_display,
)
from modules.module07.ingest import parse_games_from_pgn_text
from modules.module07.lichess_coach_import import (
    DEFAULT_BATCH_SIZE,
    LichessImportCursor,
    fetch_lichess_batch,
)
from modules.module07.chesscom_coach_import import (
    ChessComImportCursor,
    fetch_chesscom_batch,
)
from modules.module07.chesscom_settings import (
    get_chesscom_import_settings,
    upsert_chesscom_import_settings,
)
from modules.module07.lichess_settings import (
    get_lichess_import_settings,
    lichess_api_token_for_user,
    upsert_lichess_import_settings,
)
from modules.module07.repository import (
    create_analysis_job,
    create_games_from_ingest,
    display_title_from_game,
    get_decision,
    get_game,
    get_job,
    list_decisions_for_game,
    count_games,
    list_coach_corpus_types,
    list_games,
    list_jobs,
    list_ply_annotations_for_game,
    replace_ply_annotations_for_game,
    delete_coach_game,
    delete_coach_games,
    update_coach_game_display_title,
    update_coach_game_result,
)
from modules.module07.pov_bulk import (
    apply_bulk_pov,
    bulk_pov_status,
    rollback_bulk_pov,
)
from modules.module07.worker import run_analysis_job
from modules.game_import.coach_catalog import (
    coach_catalog_health,
    remove_coach_games_with_missing_master,
    sync_coach_library_to_master_games,
)
from modules.game_import.master_games import master_game_id_from_pgn
from modules.game_import.metadata import resolve_corpus_type
from modules.module07.coach_game_list_filters import CoachGameListFilters

router = APIRouter(prefix="/api/v1/module07", tags=["module07"])


def _owner_id(request: Request) -> int:
    user = getattr(request.state, "user", None) or {}
    uid = user.get("user_id")
    if uid is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return int(uid)


class IngestBody(BaseModel):
    pgn_text: str = Field(..., min_length=1)
    player_username: Optional[str] = Field(
        default=None,
        description="Optional on ingest; required when enqueueing analysis (see POST /jobs).",
    )
    corpus_type: str = Field(default="personal")
    source: str = Field(default="pgn_upload", max_length=32)
    max_games: Optional[int] = Field(
        default=1,
        ge=1,
        description="Cap games imported from a multi-game PGN (Coach UI sends 100; default 1).",
    )

    @field_validator("player_username")
    @classmethod
    def strip_player_username(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class JobCreateBody(BaseModel):
    game_ids: list[str] = Field(..., min_length=1)
    player_username: str = Field(
        ...,
        min_length=1,
        description="Chess handle (PGN White/Black) for POV during analysis.",
    )
    stockfish_depth: int = Field(default=DEFAULT_STOCKFISH_DEPTH, ge=1, le=40)
    stockfish_multipv: int = Field(default=DEFAULT_STOCKFISH_MULTIPV, ge=1, le=10)

    @field_validator("player_username")
    @classmethod
    def strip_job_player(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("player_username cannot be blank")
        return stripped


def _game_json(
    row: Any,
    *,
    is_new: bool | None = None,
    include_pgn: bool = False,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": row.id,
        "content_game_id": row.content_game_id,
        "white_player": row.white_player,
        "black_player": row.black_player,
        "player_username": row.player_username,
        "player_color": row.player_color,
        "result": row.result,
        "corpus_type": row.corpus_type,
        "speed_class": row.speed_class,
        "time_control": getattr(row, "time_control", None),
        "time_control_display": format_time_control_display(
            getattr(row, "time_control", None),
            speed_class=row.speed_class,
        ),
        "display_title": display_title_from_game(row),
        "description": format_coach_game_description(
            white_player=row.white_player,
            black_player=row.black_player,
            player_username=row.player_username,
            speed_class=row.speed_class,
            time_control=getattr(row, "time_control", None),
            display_title=display_title_from_game(row),
        ),
        "source": row.source,
        "catalog_source": getattr(row, "catalog_source", None) or row.source,
        "white_elo": getattr(row, "white_elo", None),
        "black_elo": getattr(row, "black_elo", None),
        "eco": getattr(row, "eco", None),
        "opening": getattr(row, "opening", None),
        "date_played": getattr(row, "date_played", None),
        "analysis_job_id": row.analysis_job_id,
        "analysis_job_status": (
            row.analysis_job.status if getattr(row, "analysis_job", None) else None
        ),
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "last_imported_at": (
            row.last_imported_at.isoformat()
            if getattr(row, "last_imported_at", None)
            else None
        ),
        "client_analyzed_at": (
            row.client_analyzed_at.isoformat()
            if getattr(row, "client_analyzed_at", None)
            else None
        ),
        "client_analysis_ply_count": int(
            getattr(row, "client_analysis_ply_count", 0) or 0
        ),
        "client_main_line_signature": getattr(
            row, "client_main_line_signature", None
        ),
        "client_analyzed": bool(
            getattr(row, "client_analysis_ply_count", 0)
            and getattr(row, "client_analyzed_at", None)
        ),
        "master_game_id": getattr(row, "master_game_id", None)
        or (
            master_game_id_from_pgn(row.pgn) if getattr(row, "pgn", None) else None
        ),
    }
    if is_new is not None:
        payload["is_new"] = is_new
    if include_pgn:
        payload["pgn"] = row.pgn
    return payload


def _user_roles(request: Request) -> list[str]:
    user = getattr(request.state, "user", None) or {}
    return list(user.get("roles") or [])


def _resolved_corpus(request: Request, requested: str) -> str:
    try:
        return resolve_corpus_type(requested, _user_roles(request))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


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


PLY_ANNOTATION_PAYLOAD_SCHEMA_VERSION = 1


class PlyAnnotationItemBody(BaseModel):
    path_key: str = Field(..., min_length=1, max_length=64)
    ply: int = Field(..., ge=0)
    fen_before: str = Field(..., min_length=1, max_length=120)
    played_uci: Optional[str] = Field(default=None, max_length=12)
    payload: dict[str, Any] = Field(...)


class PlyAnnotationsPutBody(BaseModel):
    main_line_signature: str = Field(..., min_length=1, max_length=512)
    rules_version: int = Field(default=CLIENT_CLASSIFICATION_RULES_VERSION, ge=1)
    stockfish_depth: int = Field(default=DEFAULT_STOCKFISH_DEPTH, ge=1, le=40)
    stockfish_multipv: int = Field(default=DEFAULT_STOCKFISH_MULTIPV, ge=1, le=10)
    source: str = Field(default=CLIENT_CLASSIFICATION_SOURCE, max_length=32)
    items: list[PlyAnnotationItemBody] = Field(default_factory=list)


def _annotation_json(row: Any) -> dict[str, Any]:
    return {
        "path_key": row.path_key,
        "ply": row.ply,
        "fen_before": row.fen_before,
        "played_uci": row.played_uci,
        "payload": row.payload,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _annotations_response(rows: list[Any]) -> dict[str, Any]:
    if not rows:
        return {
            "schema_version": PLY_ANNOTATION_PAYLOAD_SCHEMA_VERSION,
            "main_line_signature": None,
            "rules_version": CLIENT_CLASSIFICATION_RULES_VERSION,
            "stockfish_depth": DEFAULT_STOCKFISH_DEPTH,
            "stockfish_multipv": DEFAULT_STOCKFISH_MULTIPV,
            "source": CLIENT_CLASSIFICATION_SOURCE,
            "annotations": [],
        }
    head = rows[0]
    return {
        "schema_version": PLY_ANNOTATION_PAYLOAD_SCHEMA_VERSION,
        "main_line_signature": head.main_line_signature,
        "rules_version": head.rules_version,
        "stockfish_depth": head.stockfish_depth,
        "stockfish_multipv": head.stockfish_multipv,
        "source": head.source,
        "annotations": [_annotation_json(r) for r in rows],
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
    user = getattr(request.state, "user", {}) or {}
    imported_by = (user.get("username") or "").strip() or str(owner)
    try:
        parse_result = parse_games_from_pgn_text(
            body.pgn_text,
            player_username=body.player_username,
            max_games=body.max_games,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    parsed = list(parse_result.games)
    corpus = _resolved_corpus(request, body.corpus_type)
    rows, is_new_flags = create_games_from_ingest(
        db,
        owner_user_id=owner,
        parsed_games=parsed,
        corpus_type=corpus,
        source=(body.source or "pgn_upload")[:32],
        imported_by=imported_by,
    )
    total_in_pgn = parse_result.total_games_in_pgn
    imported_count = len(rows)
    return {
        "games": [
            _game_json(r, is_new=flag) for r, flag in zip(rows, is_new_flags, strict=True)
        ],
        "count": imported_count,
        "new_count": sum(1 for f in is_new_flags if f),
        "pgn_total_games": total_in_pgn,
        "pgn_games_ignored": max(0, total_in_pgn - imported_count),
    }


@router.get("/coach-catalog/health")
def get_coach_catalog_health(request: Request, db: Session = Depends(get_db)):
    """GC-3: integridad ``coach_games`` ↔ ``games`` (huérfanos / PGN vacío)."""
    owner = _owner_id(request)
    return coach_catalog_health(db, owner_user_id=owner)


@router.post("/coach-catalog/repair")
def repair_coach_catalog(request: Request, db: Session = Depends(get_db)):
    """
    GC-3: elimina filas Coach sin maestro y re-sincroniza metadata en ``games``.
    Partidas con PGN vacío en maestro: re-importar PGN en Coach.
    """
    owner = _owner_id(request)
    removed = remove_coach_games_with_missing_master(db, owner_user_id=owner)
    synced = sync_coach_library_to_master_games(db, owner_user_id=owner)
    health = coach_catalog_health(db, owner_user_id=owner)
    return {
        "removed_orphan_coach_rows": removed,
        "master_rows_synced": synced,
        "health": health,
    }


@router.get("/games/corpus-types")
def get_coach_corpus_types(request: Request, db: Session = Depends(get_db)):
    """Distinct ``coach_games.corpus_type`` for Fuente filter (FEAT-064)."""
    owner = _owner_id(request)
    return {"corpus_types": list_coach_corpus_types(db, owner)}


@router.get("/games")
def get_games(
    request: Request,
    db: Session = Depends(get_db),
    corpus_type: Optional[str] = Query(None, description="Single corpus_type (Fuente)."),
    corpus_types: Optional[list[str]] = Query(
        None, description="Multi corpus_type; repeat param or comma-separated."
    ),
    source: Optional[str] = Query(None, description="Deprecated alias of corpus_type."),
    sources: Optional[list[str]] = Query(
        None, description="Deprecated alias of corpus_types."
    ),
    white_player: Optional[str] = Query(None),
    black_player: Optional[str] = Query(None),
    eco: Optional[str] = Query(None),
    opening: Optional[str] = Query(None),
    opening_eco_or: bool = Query(
        False,
        description="When eco and opening are both set, match either column (FEAT-065).",
    ),
    date_from: Optional[str] = Query(None, description="YYYY-MM-DD or YYYY.MM.DD"),
    date_to: Optional[str] = Query(None),
    result: Optional[list[str]] = Query(None, alias="result"),
    results: Optional[list[str]] = Query(None),
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    owner = _owner_id(request)
    expanded_corpus: list[str] = []
    if corpus_types:
        for item in corpus_types:
            expanded_corpus.extend(
                part.strip() for part in str(item).split(",") if part.strip()
            )
    expanded_sources: list[str] = []
    if sources:
        for item in sources:
            expanded_sources.extend(
                part.strip() for part in str(item).split(",") if part.strip()
            )
    filters = CoachGameListFilters.from_query(
        corpus_types=expanded_corpus or None,
        corpus_type=corpus_type,
        sources=expanded_sources or None,
        source=source,
        white_player=white_player,
        black_player=black_player,
        eco=eco,
        opening=opening,
        opening_eco_or=opening_eco_or,
        date_from=date_from,
        date_to=date_to,
        result=result,
        results=results,
        limit=limit,
        offset=offset,
    )
    rows = list_games(db, owner, filters=filters)
    if filters.has_any() or filters.limit is not None:
        total = count_games(db, owner, filters=filters)
    else:
        total = len(rows)
    payload: dict[str, Any] = {
        "games": [_game_json(r) for r in rows],
        "total": total,
        "offset": filters.offset,
    }
    if filters.limit is not None:
        payload["limit"] = filters.limit
    return payload


class BulkDeleteGamesBody(BaseModel):
    game_ids: list[str] = Field(..., min_length=1)


@router.delete("/games/{game_id}")
def delete_game_by_id(
    game_id: str, request: Request, db: Session = Depends(get_db)
):
    owner = _owner_id(request)
    try:
        ok = delete_coach_game(db, game_id, owner)
    except ValueError as exc:
        if str(exc) == "cannot_delete_while_job_active":
            raise HTTPException(
                status_code=409,
                detail="No se puede borrar mientras el job Stockfish está pendiente o en ejecución.",
            ) from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not ok:
        raise HTTPException(status_code=404, detail="Game not found")
    return {"deleted": game_id}


@router.post("/games/bulk-delete")
def bulk_delete_games(
    body: BulkDeleteGamesBody,
    request: Request,
    db: Session = Depends(get_db),
):
    owner = _owner_id(request)
    return delete_coach_games(db, body.game_ids, owner)


class GameDisplayPatchBody(BaseModel):
    display_title: Optional[str] = Field(default=None, max_length=200)
    result: Optional[str] = None

    @field_validator("display_title")
    @classmethod
    def strip_display_title(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        text = value.strip()
        if not text:
            raise ValueError("display_title cannot be blank")
        return text


@router.patch("/games/{game_id}")
def patch_game_by_id(
    game_id: str,
    body: GameDisplayPatchBody,
    request: Request,
    db: Session = Depends(get_db),
):
    owner = _owner_id(request)
    if body.display_title is None and body.result is None:
        raise HTTPException(status_code=400, detail="Nada para actualizar")
    try:
        row = None
        if body.display_title is not None:
            row = update_coach_game_display_title(
                db, game_id, owner, body.display_title
            )
        if body.result is not None:
            row = update_coach_game_result(db, game_id, owner, body.result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if row is None:
        raise HTTPException(status_code=404, detail="Game not found")
    return _game_json(row, include_pgn=False)


@router.get("/games/{game_id}")
def get_game_by_id(
    game_id: str, request: Request, db: Session = Depends(get_db)
):
    owner = _owner_id(request)
    row = get_game(db, game_id, owner)
    if row is None:
        raise HTTPException(status_code=404, detail="Game not found")
    return _game_json(row, include_pgn=True)


@router.get("/games/{game_id}/decisions")
def get_game_decisions(
    game_id: str, request: Request, db: Session = Depends(get_db)
):
    owner = _owner_id(request)
    if get_game(db, game_id, owner) is None:
        raise HTTPException(status_code=404, detail="Game not found")
    rows = list_decisions_for_game(db, game_id, owner)
    return {"decisions": [_decision_json(r) for r in rows]}


@router.get("/games/{game_id}/annotations")
def get_game_annotations(
    game_id: str, request: Request, db: Session = Depends(get_db)
):
    owner = _owner_id(request)
    if get_game(db, game_id, owner) is None:
        raise HTTPException(status_code=404, detail="Game not found")
    rows = list_ply_annotations_for_game(db, game_id, owner)
    return _annotations_response(rows)


@router.put("/games/{game_id}/annotations")
def put_game_annotations(
    game_id: str,
    body: PlyAnnotationsPutBody,
    request: Request,
    db: Session = Depends(get_db),
):
    owner = _owner_id(request)
    if body.rules_version != CLIENT_CLASSIFICATION_RULES_VERSION:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported rules_version (supported: {CLIENT_CLASSIFICATION_RULES_VERSION})",
        )
    try:
        rows = replace_ply_annotations_for_game(
            db,
            game_id=game_id,
            owner_user_id=owner,
            main_line_signature=body.main_line_signature.strip(),
            rules_version=body.rules_version,
            stockfish_depth=body.stockfish_depth,
            stockfish_multipv=body.stockfish_multipv,
            source=(body.source or CLIENT_CLASSIFICATION_SOURCE)[:32],
            items=[item.model_dump() for item in body.items],
        )
    except LookupError:
        raise HTTPException(status_code=404, detail="Game not found") from None
    return _annotations_response(rows)


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
    try:
        job = create_analysis_job(
            db,
            owner_user_id=owner,
            game_ids=body.game_ids,
            player_username=body.player_username,
            depth=body.stockfish_depth,
            multipv=body.stockfish_multipv,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
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
    """Parse PGN, persist games, enqueue analysis (requires player_username on body)."""
    owner = _owner_id(request)
    if not body.player_username:
        raise HTTPException(
            status_code=400,
            detail="player_username is required for ingest-and-analyze",
        )
    try:
        parse_result = parse_games_from_pgn_text(
            body.pgn_text,
            player_username=body.player_username,
            max_games=body.max_games,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    parsed = list(parse_result.games)
    corpus = _resolved_corpus(request, body.corpus_type)
    rows, _is_new = create_games_from_ingest(
        db,
        owner_user_id=owner,
        parsed_games=parsed,
        corpus_type=corpus,
        source=(body.source or "pgn_upload")[:32],
    )
    try:
        job = create_analysis_job(
            db,
            owner_user_id=owner,
            game_ids=[r.id for r in rows],
            player_username=body.player_username,
            depth=stockfish_depth,
            multipv=stockfish_multipv,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    background_tasks.add_task(run_analysis_job, job.id, owner)
    total_in_pgn = parse_result.total_games_in_pgn
    imported_count = len(rows)
    return {
        "games": [_game_json(r) for r in rows],
        "job": _job_json(job),
        "pgn_total_games": total_in_pgn,
        "pgn_games_ignored": max(0, total_in_pgn - imported_count),
    }


class LichessImportSettingsBody(BaseModel):
    lichess_username: Optional[str] = None
    since_date: Optional[str] = Field(default=None, description="YYYY-MM-DD")
    until_date: Optional[str] = Field(default=None, description="YYYY-MM-DD")
    perf_types: Optional[list[str]] = None
    batch_size: Optional[int] = Field(default=None, ge=1, le=500)
    player_alias: Optional[str] = None
    api_token: Optional[str] = Field(
        default=None,
        description="Optional Lichess personal API token (stored per user, never logged).",
    )
    clear_api_token: bool = False
    reset_cursor: bool = False


class LichessImportRunBody(BaseModel):
    corpus_type: str = Field(default="personal")
    resume: bool = True
    reset_cursor: bool = False


@router.get("/lichess-import/settings")
def get_lichess_settings(request: Request, db: Session = Depends(get_db)):
    owner = _owner_id(request)
    return get_lichess_import_settings(db, owner)


@router.put("/lichess-import/settings")
def put_lichess_settings(
    body: LichessImportSettingsBody,
    request: Request,
    db: Session = Depends(get_db),
):
    owner = _owner_id(request)
    user = getattr(request.state, "user", {}) or {}
    payload = body.model_dump(exclude_unset=True)
    payload["app_login_username"] = (user.get("username") or "").strip() or str(owner)
    if body.reset_cursor:
        payload["last_cursor"] = None
    return upsert_lichess_import_settings(db, owner, payload)


@router.post("/lichess-import/run")
def run_lichess_import(
    body: LichessImportRunBody,
    request: Request,
    db: Session = Depends(get_db),
):
    owner = _owner_id(request)
    user = getattr(request.state, "user", {}) or {}
    imported_by = (user.get("username") or "").strip() or str(owner)
    settings = get_lichess_import_settings(db, owner)
    if not (settings.get("lichess_username") or "").strip():
        raise HTTPException(status_code=400, detail="Configurá el usuario de Lichess.")

    cursor_raw = settings.get("last_cursor")
    if body.reset_cursor or not body.resume:
        cursor = LichessImportCursor()
    else:
        cursor = LichessImportCursor.from_json(cursor_raw)

    token = lichess_api_token_for_user(db, owner)
    batch_size = int(settings.get("batch_size") or DEFAULT_BATCH_SIZE)

    try:
        batch = fetch_lichess_batch(
            lichess_username=settings["lichess_username"],
            since=settings.get("since_date"),
            until=settings.get("until_date"),
            perf_types=settings.get("perf_types"),
            batch_size=batch_size,
            cursor=cursor,
            api_token=token,
            player_alias=settings.get("player_alias"),
            app_login_username=imported_by,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    upsert_lichess_import_settings(
        db,
        owner,
        {"last_cursor": batch.cursor.to_json()},
    )

    if not batch.parsed_games:
        return {
            "games": [],
            "count": 0,
            "new_count": 0,
            "perf_type": batch.perf_type,
            "fetched_from_lichess": 0,
            "cursor": batch.cursor.to_json(),
            "import_complete": batch.cursor.completed,
            "errors": list(batch.errors),
            "message": "Sin partidas nuevas en este lote (probá continuar o revisar fechas/ritmos).",
        }

    corpus = _resolved_corpus(request, body.corpus_type)
    provenance = [dict(p) for p in batch.provenance]
    rows, is_new_flags = create_games_from_ingest(
        db,
        owner_user_id=owner,
        parsed_games=list(batch.parsed_games),
        corpus_type=corpus,
        source="lichess",
        imported_by=imported_by,
        import_provenance=provenance,
    )
    imported_count = len(rows)
    return {
        "games": [
            _game_json(r, is_new=flag) for r, flag in zip(rows, is_new_flags, strict=True)
        ],
        "count": imported_count,
        "new_count": sum(1 for f in is_new_flags if f),
        "perf_type": batch.perf_type,
        "fetched_from_lichess": batch.fetched_from_lichess,
        "cursor": batch.cursor.to_json(),
        "import_complete": batch.cursor.completed,
        "errors": list(batch.errors),
    }


class ChesscomImportSettingsBody(BaseModel):
    chesscom_username: Optional[str] = None
    since_date: Optional[str] = Field(default=None, description="YYYY-MM-DD")
    until_date: Optional[str] = Field(default=None, description="YYYY-MM-DD")
    perf_types: Optional[list[str]] = None
    batch_size: Optional[int] = Field(default=None, ge=1, le=500)
    player_alias: Optional[str] = None
    reset_cursor: bool = False


class ChesscomImportRunBody(BaseModel):
    corpus_type: str = Field(default="personal")
    resume: bool = True
    reset_cursor: bool = False


@router.get("/chesscom-import/settings")
def get_chesscom_settings(request: Request, db: Session = Depends(get_db)):
    owner = _owner_id(request)
    try:
        return get_chesscom_import_settings(db, owner)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Base de datos no disponible o migraciones pendientes: {e}",
        ) from e


@router.put("/chesscom-import/settings")
def put_chesscom_settings(
    body: ChesscomImportSettingsBody,
    request: Request,
    db: Session = Depends(get_db),
):
    owner = _owner_id(request)
    payload = body.model_dump(exclude_unset=True)
    if body.reset_cursor:
        payload["last_cursor"] = None
    return upsert_chesscom_import_settings(db, owner, payload)


@router.post("/chesscom-import/run")
def run_chesscom_import(
    body: ChesscomImportRunBody,
    request: Request,
    db: Session = Depends(get_db),
):
    owner = _owner_id(request)
    user = getattr(request.state, "user", {}) or {}
    imported_by = (user.get("username") or "").strip() or str(owner)
    settings = get_chesscom_import_settings(db, owner)
    if not (settings.get("chesscom_username") or "").strip():
        raise HTTPException(status_code=400, detail="Configurá el usuario de Chess.com.")

    cursor_raw = settings.get("last_cursor")
    if body.reset_cursor or not body.resume:
        cursor = ChessComImportCursor()
    else:
        cursor = ChessComImportCursor.from_json(cursor_raw)

    batch_size = int(settings.get("batch_size") or DEFAULT_BATCH_SIZE)

    try:
        batch = fetch_chesscom_batch(
            chesscom_username=settings["chesscom_username"],
            since=settings.get("since_date"),
            until=settings.get("until_date"),
            perf_types=settings.get("perf_types"),
            batch_size=batch_size,
            cursor=cursor,
            player_alias=settings.get("player_alias"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    upsert_chesscom_import_settings(
        db,
        owner,
        {"last_cursor": batch.cursor.to_json()},
    )

    if not batch.parsed_games:
        return {
            "games": [],
            "count": 0,
            "new_count": 0,
            "perf_type": batch.perf_type,
            "fetched_from_chesscom": 0,
            "cursor": batch.cursor.to_json(),
            "import_complete": batch.cursor.completed,
            "errors": list(batch.errors),
            "message": "Sin partidas nuevas en este lote (probá continuar o revisar fechas/ritmos).",
        }

    corpus = _resolved_corpus(request, body.corpus_type)
    provenance = [dict(p) for p in batch.provenance]
    rows, is_new_flags = create_games_from_ingest(
        db,
        owner_user_id=owner,
        parsed_games=list(batch.parsed_games),
        corpus_type=corpus,
        source="chess.com",
        imported_by=imported_by,
        import_provenance=provenance,
    )
    imported_count = len(rows)
    return {
        "games": [
            _game_json(r, is_new=flag) for r, flag in zip(rows, is_new_flags, strict=True)
        ],
        "count": imported_count,
        "new_count": sum(1 for f in is_new_flags if f),
        "perf_type": batch.perf_type,
        "fetched_from_chesscom": batch.fetched_from_chesscom,
        "cursor": batch.cursor.to_json(),
        "import_complete": batch.cursor.completed,
        "errors": list(batch.errors),
    }


class PovBulkApplyBody(BaseModel):
    source_username: str = Field(..., min_length=1)
    target_username: str = Field(..., min_length=1)

    @field_validator("source_username", "target_username")
    @classmethod
    def strip_pov_bulk_names(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("username cannot be blank")
        return stripped


def _pov_bulk_json(result: Any) -> dict[str, Any]:
    return {
        "updated": result.updated,
        "skipped": result.skipped,
        "rollback_available_count": result.rollback_available,
    }


@router.get("/pov-bulk/status")
def get_pov_bulk_status(request: Request, db: Session = Depends(get_db)):
    owner = _owner_id(request)
    return bulk_pov_status(db, owner)


@router.post("/pov-bulk/apply")
def post_pov_bulk_apply(
    body: PovBulkApplyBody,
    request: Request,
    db: Session = Depends(get_db),
):
    owner = _owner_id(request)
    try:
        result = apply_bulk_pov(
            db,
            owner_user_id=owner,
            source_username=body.source_username,
            target_username=body.target_username,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    payload = _pov_bulk_json(result)
    payload["status"] = bulk_pov_status(db, owner)
    return payload


@router.post("/pov-bulk/rollback")
def post_pov_bulk_rollback(request: Request, db: Session = Depends(get_db)):
    owner = _owner_id(request)
    result = rollback_bulk_pov(db, owner_user_id=owner)
    payload = _pov_bulk_json(result)
    payload["status"] = bulk_pov_status(db, owner)
    return payload
