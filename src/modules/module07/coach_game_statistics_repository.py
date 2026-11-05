"""Postgres read/write for one Coach game's chess statistics (EST-FEAT-02).

Uses the API SQLAlchemy session. It does not open the course SQLite file.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from models.module07_models import CoachGameStatisticEval, CoachGameStatistics

_SUMMARY_FIELDS = frozenset(
    column.name
    for column in CoachGameStatistics.__table__.columns
    if column.name != "coach_game_id"
)
_EVAL_FIELDS = frozenset(
    column.name
    for column in CoachGameStatisticEval.__table__.columns
    if column.name != "coach_game_id"
)
_PLAYED_BY = frozenset({None, "white", "black"})


def get_summary(db: Session, coach_game_id: str) -> CoachGameStatistics | None:
    """Return the summary row for a Coach game, or None when it has not been stored."""
    key = _require_coach_game_id(coach_game_id)
    return (
        db.query(CoachGameStatistics)
        .filter(CoachGameStatistics.coach_game_id == key)
        .one_or_none()
    )


def replace_summary(
    db: Session, coach_game_id: str, values: dict[str, Any]
) -> CoachGameStatistics:
    """Replace the summary. Omitted metric columns become NULL. ``master_game_id`` is required."""
    key = _require_coach_game_id(coach_game_id)
    payload = _pick(values, _SUMMARY_FIELDS, label="summary")
    master_game_id = str(payload.get("master_game_id") or "").strip()
    if not master_game_id:
        raise ValueError("master_game_id is required")
    payload["master_game_id"] = master_game_id

    row = get_summary(db, key)
    if row is None:
        row = CoachGameStatistics(coach_game_id=key)
        db.add(row)
    for name in _SUMMARY_FIELDS:
        setattr(row, name, payload.get(name))
    db.commit()
    db.refresh(row)
    return row


def get_evals(db: Session, coach_game_id: str) -> list[CoachGameStatisticEval]:
    """Return evaluated plies for a Coach game, ordered by ply."""
    key = _require_coach_game_id(coach_game_id)
    return (
        db.query(CoachGameStatisticEval)
        .filter(CoachGameStatisticEval.coach_game_id == key)
        .order_by(CoachGameStatisticEval.ply)
        .all()
    )


def replace_evals(
    db: Session, coach_game_id: str, evals: list[dict[str, Any]]
) -> list[CoachGameStatisticEval]:
    """Replace every ply row of a Coach game. An empty list clears them."""
    key = _require_coach_game_id(coach_game_id)
    rows: list[CoachGameStatisticEval] = []
    seen: set[int] = set()
    for item in evals:
        payload = _pick(item, _EVAL_FIELDS, label="eval")
        if "ply" not in item or item.get("ply") is None:
            raise ValueError("ply is required")
        ply = int(item["ply"])
        if ply in seen:
            raise ValueError(f"duplicate ply {ply}")
        seen.add(ply)
        played_by = payload.get("played_by")
        if played_by == "":
            played_by = None
        if played_by not in _PLAYED_BY:
            raise ValueError("played_by must be white or black")
        payload["played_by"] = played_by
        payload["ply"] = ply
        row = CoachGameStatisticEval(coach_game_id=key)
        for name in _EVAL_FIELDS:
            setattr(row, name, payload.get(name))
        rows.append(row)

    db.query(CoachGameStatisticEval).filter(
        CoachGameStatisticEval.coach_game_id == key
    ).delete(synchronize_session=False)
    db.add_all(rows)
    db.commit()
    return get_evals(db, key)


def _require_coach_game_id(coach_game_id: str) -> str:
    key = (coach_game_id or "").strip()
    if not key:
        raise ValueError("coach_game_id is required")
    return key


def _pick(values: dict[str, Any], allowed: frozenset[str], *, label: str) -> dict[str, Any]:
    unknown = sorted(set(values) - allowed)
    if unknown:
        raise ValueError(f"unknown {label} fields: {', '.join(unknown)}")
    return dict(values)
