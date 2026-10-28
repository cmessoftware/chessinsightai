"""Persistence helpers for Module 07 MVP tables."""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import flag_modified

from modules.game_import.master_games import (
    _header_fields,
    upsert_master_game_from_coach_item,
)
from modules.game_import.metadata import infer_speed_class_from_time_control
from modules.module07.ingest import (
    parse_allowed_result,
    parse_games_from_pgn_text,
    resolve_player_color,
    rewrite_pgn_result,
)
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
from modules.module07.coach_game_list_filters import (
    CoachGameListFilters,
    apply_coach_game_list_filters,
)

_TITLE_VS = re.compile(r"^(.+?)\s+vs\s+(.+)$", re.IGNORECASE)


def display_title_from_game(game: CoachGame) -> str:
    prov = game.import_provenance if isinstance(game.import_provenance, dict) else {}
    custom = str(prov.get("display_title") or "").strip()
    if custom:
        return custom
    white = (game.white_player or "").strip() or "Blancas"
    black = (game.black_player or "").strip() or "Negras"
    return f"{white} vs {black}"


def _default_display_title(item: Any) -> str:
    white = (getattr(item, "white_player", None) or "").strip() or "Blancas"
    black = (getattr(item, "black_player", None) or "").strip() or "Negras"
    return f"{white} vs {black}"


def _merge_provenance(
    item: Any,
    prov: dict[str, Any] | None,
    *,
    keep_title: str | None = None,
) -> dict[str, Any]:
    data = dict(prov or {})
    if keep_title and not str(data.get("display_title") or "").strip():
        data["display_title"] = keep_title
    if not str(data.get("display_title") or "").strip():
        data["display_title"] = _default_display_title(item)
    return data


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
    import_provenance: list[dict[str, Any] | None] | None = None,
) -> tuple[list[CoachGame], list[bool]]:
    rows: list[CoachGame] = []
    is_new_flags: list[bool] = []
    now = datetime.now(timezone.utc)
    catalog_user = (imported_by or "").strip() or str(owner_user_id)
    for index, item in enumerate(parsed_games):
        prov = (
            import_provenance[index]
            if import_provenance and index < len(import_provenance)
            else None
        )
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
        speed = getattr(item, "speed_class", "unknown")
        if prov and prov.get("speed_class"):
            speed = str(prov["speed_class"])
        tc = _header_fields(item.pgn).get("time_control")
        from_clock = infer_speed_class_from_time_control(tc)
        if from_clock:
            speed = from_clock
        keep_title = None
        if existing and isinstance(existing.import_provenance, dict):
            keep_title = str(existing.import_provenance.get("display_title") or "").strip() or None
        merged_prov = _merge_provenance(item, prov, keep_title=keep_title)
        if existing:
            existing.master_game_id = master_id
            existing.last_imported_at = now
            existing.speed_class = speed
            existing.import_provenance = merged_prov
            flag_modified(existing, "import_provenance")
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
            speed_class=speed,
            last_imported_at=now,
            import_provenance=merged_prov,
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


def list_games(
    db: Session,
    owner_user_id: int,
    *,
    filters: CoachGameListFilters | None = None,
) -> list[CoachGame]:
    query = (
        db.query(CoachGame)
        .join(Games, CoachGame.master_game_id == Games.game_id)
        .options(
            joinedload(CoachGame.analysis_job),
            joinedload(CoachGame.master_game),
        )
        .filter(CoachGame.owner_user_id == owner_user_id)
    )
    if filters is not None and filters.has_any():
        query = apply_coach_game_list_filters(query, filters=filters)
    query = query.order_by(
        CoachGame.last_imported_at.desc(), CoachGame.created_at.desc()
    )
    if filters is not None and filters.limit is not None:
        query = query.offset(filters.offset).limit(filters.limit)
    return query.all()


def count_games(
    db: Session,
    owner_user_id: int,
    *,
    filters: CoachGameListFilters | None = None,
) -> int:
    query = (
        db.query(CoachGame)
        .join(Games, CoachGame.master_game_id == Games.game_id)
        .filter(CoachGame.owner_user_id == owner_user_id)
    )
    if filters is not None and filters.has_any():
        query = apply_coach_game_list_filters(query, filters=filters)
    return int(query.count())


def list_coach_corpus_types(db: Session, owner_user_id: int) -> list[str]:
    """Distinct ``coach_games.corpus_type`` for advanced filter Fuente (FEAT-064)."""
    rows = (
        db.query(CoachGame.corpus_type)
        .filter(CoachGame.owner_user_id == owner_user_id)
        .distinct()
        .all()
    )
    values = sorted({(r[0] or "").strip().lower() for r in rows if (r[0] or "").strip()})
    return values


def get_game(db: Session, game_id: str, owner_user_id: int) -> CoachGame | None:
    return (
        db.query(CoachGame)
        .options(
            joinedload(CoachGame.analysis_job),
            joinedload(CoachGame.master_game),
        )
        .filter(
            CoachGame.id == game_id,
            CoachGame.owner_user_id == owner_user_id,
        )
        .first()
    )


def update_coach_game_display_title(
    db: Session,
    game_id: str,
    owner_user_id: int,
    display_title: str,
) -> CoachGame | None:
    game = get_game(db, game_id, owner_user_id)
    if game is None:
        return None
    title = (display_title or "").strip()
    if not title:
        raise ValueError("display_title cannot be blank")
    if len(title) > 200:
        raise ValueError("display_title is too long")
    prov = dict(game.import_provenance or {})
    prov["display_title"] = title
    game.import_provenance = prov
    flag_modified(game, "import_provenance")
    match = _TITLE_VS.match(title)
    if match and game.master_game is not None:
        game.master_game.white_player = match.group(1).strip()[:255]
        game.master_game.black_player = match.group(2).strip()[:255]
    db.commit()
    db.refresh(game)
    return game


STUDY_PGN_MAX_CHARS = 400_000


def update_coach_game_study_pgn(
    db: Session,
    game_id: str,
    owner_user_id: int,
    pgn_text: str,
) -> CoachGame | None:
    """Persist full study PGN (main line + RAV) on the master catalog row."""
    game = get_game(db, game_id, owner_user_id)
    if game is None:
        return None
    text = (pgn_text or "").strip()
    if not text:
        raise ValueError("pgn_text cannot be blank")
    if len(text) > STUDY_PGN_MAX_CHARS:
        raise ValueError("pgn_text too large")
    parsed = parse_games_from_pgn_text(text, max_games=1)
    if not parsed.games:
        raise ValueError("invalid_pgn")
    if parsed.total_games_in_pgn > 1:
        raise ValueError("single_game_only")
    item = parsed.games[0]
    master = game.master_game
    if master is None:
        raise ValueError("game has no master row")
    master.pgn = item.pgn
    if item.result:
        master.result = parse_allowed_result(item.result)
    db.commit()
    db.refresh(game)
    return game


def update_coach_game_result(
    db: Session,
    game_id: str,
    owner_user_id: int,
    result: str,
) -> CoachGame | None:
    game = get_game(db, game_id, owner_user_id)
    if game is None:
        return None
    normalized = parse_allowed_result(result)
    master = game.master_game
    if master is None:
        raise ValueError("game has no master row")
    master.result = normalized
    if master.pgn:
        master.pgn = rewrite_pgn_result(master.pgn, normalized)
    db.commit()
    db.refresh(game)
    return game


def delete_coach_game(db: Session, game_id: str, owner_user_id: int) -> bool:
    """Remove one Coach library row (decisions + ply annotations cascade)."""
    game = get_game(db, game_id, owner_user_id)
    if game is None:
        return False
    job = game.analysis_job
    if job is not None and job.status in ("pending", "running"):
        raise ValueError("cannot_delete_while_job_active")
    db.delete(game)
    db.commit()
    return True


def delete_coach_games(
    db: Session, game_ids: list[str], owner_user_id: int
) -> dict[str, Any]:
    deleted: list[str] = []
    blocked: list[str] = []
    missing: list[str] = []
    for gid in game_ids:
        game = get_game(db, gid, owner_user_id)
        if game is None:
            missing.append(gid)
            continue
        job = game.analysis_job
        if job is not None and job.status in ("pending", "running"):
            blocked.append(gid)
            continue
        db.delete(game)
        deleted.append(gid)
    if deleted:
        db.commit()
    return {"deleted": deleted, "blocked": blocked, "missing": missing}


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
