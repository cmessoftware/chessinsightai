"""LOG-FEAT-09: persist and query user activity. Admin reads it."""

from __future__ import annotations

import logging
from datetime import date, datetime, time, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from models.database_models import UserActivityLog

logger = logging.getLogger(__name__)

ACTIVITY_EVENTS = (
    ("login", "Login"),
    ("logout", "Logout"),
    ("import_games", "Importación de partidas"),
    ("statistics", "Solicitud de estadísticas"),
    ("deep_analysis", "Análisis profundo"),
)
EVENT_LABELS = dict(ACTIVITY_EVENTS)


def record_activity(
    db: Session,
    *,
    username: str,
    event: str,
    user_id: Optional[int] = None,
    occurred_at: Optional[datetime] = None,
) -> None:
    """Store one event. A failure here must not fail the user action."""
    name = (username or "").strip()
    if not name or event not in EVENT_LABELS:
        return
    try:
        uid = int(user_id) if user_id is not None else None
    except (TypeError, ValueError):
        uid = None
    try:
        db.add(
            UserActivityLog(
                user_id=uid,
                username=name[:50],
                event=event,
                occurred_at=occurred_at or datetime.utcnow(),
            )
        )
        db.commit()
    except Exception:
        logger.exception("No se pudo registrar actividad %s de %s", event, name)
        try:
            db.rollback()
        except Exception:
            logger.exception("No se pudo revertir el log de actividad")


def list_activity(
    db: Session,
    *,
    username: Optional[str] = None,
    event: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = 200,
) -> list[dict]:
    if event and event not in EVENT_LABELS:
        raise ValueError("Evento desconocido")
    query = db.query(UserActivityLog)
    if username and username.strip():
        query = query.filter(UserActivityLog.username == username.strip())
    if event:
        query = query.filter(UserActivityLog.event == event)
    if date_from is not None:
        query = query.filter(
            UserActivityLog.occurred_at >= datetime.combine(date_from, time.min)
        )
    if date_to is not None:
        query = query.filter(
            UserActivityLog.occurred_at
            < datetime.combine(date_to, time.min) + timedelta(days=1)
        )
    bounded = max(1, min(int(limit or 200), 500))
    rows = (
        query.order_by(UserActivityLog.occurred_at.desc(), UserActivityLog.id.desc())
        .limit(bounded)
        .all()
    )
    return [_serialize(row) for row in rows]


def _serialize(row: UserActivityLog) -> dict:
    occurred = row.occurred_at.isoformat() if row.occurred_at else None
    return {
        "id": row.id,
        "user_id": row.user_id,
        "username": row.username,
        "event": row.event,
        "event_label": EVENT_LABELS.get(row.event, row.event),
        "occurred_at": occurred,
    }
