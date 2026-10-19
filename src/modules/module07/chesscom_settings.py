"""Persistence for Coach Chess.com import settings (FEAT-028)."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from models.coach_chesscom_import_models import CoachChesscomImportSettings
from modules.module07.chesscom_coach_import import CHESSCOM_PERF_TYPES, DEFAULT_BATCH_SIZE


def get_chesscom_import_settings(db: Session, owner_user_id: int) -> dict[str, Any]:
    row = (
        db.query(CoachChesscomImportSettings)
        .filter(CoachChesscomImportSettings.owner_user_id == owner_user_id)
        .first()
    )
    if not row:
        return {
            "chesscom_username": "",
            "since_date": None,
            "until_date": None,
            "perf_types": list(CHESSCOM_PERF_TYPES),
            "batch_size": DEFAULT_BATCH_SIZE,
            "player_alias": None,
            "last_cursor": None,
        }
    perf = row.perf_types if row.perf_types else list(CHESSCOM_PERF_TYPES)
    return {
        "chesscom_username": row.chesscom_username or "",
        "since_date": row.since_date,
        "until_date": row.until_date,
        "perf_types": perf,
        "batch_size": row.batch_size or DEFAULT_BATCH_SIZE,
        "player_alias": row.player_alias,
        "last_cursor": row.last_cursor,
    }


def upsert_chesscom_import_settings(
    db: Session,
    owner_user_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    row = (
        db.query(CoachChesscomImportSettings)
        .filter(CoachChesscomImportSettings.owner_user_id == owner_user_id)
        .first()
    )
    if not row:
        row = CoachChesscomImportSettings(owner_user_id=owner_user_id)
        db.add(row)

    if "chesscom_username" in payload:
        row.chesscom_username = str(payload.get("chesscom_username") or "").strip()
    if "since_date" in payload:
        since = payload.get("since_date")
        row.since_date = str(since).strip() if since else None
    if "until_date" in payload:
        until = payload.get("until_date")
        row.until_date = str(until).strip() if until else None
    if "perf_types" in payload:
        perf = payload.get("perf_types")
        row.perf_types = list(perf) if perf else list(CHESSCOM_PERF_TYPES)
    if "batch_size" in payload:
        row.batch_size = int(payload.get("batch_size") or DEFAULT_BATCH_SIZE)
    if "player_alias" in payload:
        alias = payload.get("player_alias")
        row.player_alias = str(alias).strip() if alias else None
    if "last_cursor" in payload:
        row.last_cursor = payload.get("last_cursor")

    db.commit()
    db.refresh(row)
    return get_chesscom_import_settings(db, owner_user_id)
