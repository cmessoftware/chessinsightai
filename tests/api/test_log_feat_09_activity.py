"""LOG-FEAT-09 — user activity log filters."""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path(__file__).resolve().parents[2]
SRC_API = ROOT / "src" / "api"
if str(SRC_API) not in sys.path:
    sys.path.insert(0, str(SRC_API))

from models.database_models import UserActivityLog  # noqa: E402
from services.activity_log_service import list_activity, record_activity  # noqa: E402


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    UserActivityLog.__table__.create(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_records_and_filters_by_user_event_and_dates(db):
    record_activity(
        db,
        username="ana",
        event="login",
        user_id=1,
        occurred_at=datetime(2026, 11, 10, 12, 0, 0),
    )
    record_activity(
        db,
        username="ana",
        event="import_games",
        user_id=1,
        occurred_at=datetime(2026, 11, 11, 8, 30, 0),
    )
    record_activity(
        db,
        username="luis",
        event="deep_analysis",
        user_id=2,
        occurred_at=datetime(2026, 11, 11, 9, 0, 0),
    )

    ana = list_activity(db, username="ana")
    assert [row["event"] for row in ana] == ["import_games", "login"]
    assert ana[0]["event_label"] == "Importación de partidas"
    assert ana[0]["username"] == "ana"

    deep = list_activity(db, event="deep_analysis")
    assert [row["username"] for row in deep] == ["luis"]

    day = list_activity(
        db,
        date_from=datetime(2026, 11, 11).date(),
        date_to=datetime(2026, 11, 11).date(),
    )
    assert {row["event"] for row in day} == {"import_games", "deep_analysis"}


def test_unknown_event_is_rejected_and_blank_user_is_ignored(db):
    record_activity(db, username="  ", event="login")
    record_activity(db, username="ana", event="not-an-event")
    assert list_activity(db) == []
    with pytest.raises(ValueError):
        list_activity(db, event="not-an-event")
