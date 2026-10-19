"""Persistence for Coach Lichess import settings (FEAT-027)."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from models.coach_lichess_import_models import CoachLichessImportSettings
from modules.module07.lichess_coach_import import DEFAULT_BATCH_SIZE, LICHESS_PERF_TYPES


def _mask_token(token: str | None) -> dict[str, Any]:
    raw = (token or "").strip()
    if not raw:
        return {"has_api_token": False, "api_token_hint": None}
    tail = raw[-4:] if len(raw) >= 4 else raw
    return {"has_api_token": True, "api_token_hint": f"…{tail}"}


def get_lichess_import_settings(db: Session, owner_user_id: int) -> dict[str, Any]:
    row = (
        db.query(CoachLichessImportSettings)
        .filter(CoachLichessImportSettings.owner_user_id == owner_user_id)
        .first()
    )
    if not row:
        return {
            "lichess_username": "",
            "since_date": None,
            "until_date": None,
            "perf_types": list(LICHESS_PERF_TYPES),
            "batch_size": DEFAULT_BATCH_SIZE,
            "player_alias": None,
            "last_cursor": None,
            **_mask_token(None),
        }
    perf = row.perf_types if row.perf_types else list(LICHESS_PERF_TYPES)
    return {
        "lichess_username": row.lichess_username or "",
        "since_date": row.since_date,
        "until_date": row.until_date,
        "perf_types": perf,
        "batch_size": row.batch_size or DEFAULT_BATCH_SIZE,
        "player_alias": row.player_alias,
        "last_cursor": row.last_cursor,
        **_mask_token(row.api_token),
    }


def upsert_lichess_import_settings(
    db: Session,
    owner_user_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    row = (
        db.query(CoachLichessImportSettings)
        .filter(CoachLichessImportSettings.owner_user_id == owner_user_id)
        .first()
    )
    if not row:
        row = CoachLichessImportSettings(owner_user_id=owner_user_id)
        db.add(row)

    if "lichess_username" in payload:
        row.lichess_username = str(payload.get("lichess_username") or "").strip()
    if "since_date" in payload:
        since = payload.get("since_date")
        row.since_date = str(since).strip() if since else None
    if "until_date" in payload:
        until = payload.get("until_date")
        row.until_date = str(until).strip() if until else None
    if "perf_types" in payload:
        perf = payload.get("perf_types")
        row.perf_types = list(perf) if perf else list(LICHESS_PERF_TYPES)
    if "batch_size" in payload:
        row.batch_size = int(payload.get("batch_size") or DEFAULT_BATCH_SIZE)
    if "player_alias" in payload:
        alias = payload.get("player_alias")
        row.player_alias = str(alias).strip() if alias else None
        reject = str(payload.get("app_login_username") or "").strip()
        lichess = (row.lichess_username or "").strip()
        alias_val = (row.player_alias or "").strip()
        if alias_val and (
            (lichess and alias_val.casefold() == lichess.casefold())
            or (reject and alias_val.casefold() == reject.casefold())
        ):
            row.player_alias = None
    if payload.get("clear_api_token"):
        row.api_token = None
    elif "api_token" in payload:
        token = str(payload.get("api_token") or "").strip()
        if token:
            row.api_token = token
    if "last_cursor" in payload:
        row.last_cursor = payload.get("last_cursor")

    db.commit()
    db.refresh(row)
    return get_lichess_import_settings(db, owner_user_id)


def lichess_api_token_for_user(db: Session, owner_user_id: int) -> str | None:
    row = (
        db.query(CoachLichessImportSettings)
        .filter(CoachLichessImportSettings.owner_user_id == owner_user_id)
        .first()
    )
    if not row or not row.api_token:
        return None
    return str(row.api_token).strip() or None
