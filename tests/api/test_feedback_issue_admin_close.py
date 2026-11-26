"""FEAT-124 — admin or group-admin closes feedback issues."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

ROOT = Path(__file__).resolve().parents[2]
SRC_API = ROOT / "src" / "api"
if str(SRC_API) not in sys.path:
    sys.path.insert(0, str(SRC_API))

from models.database_models import UserGroup, UserGroupMember, UserGroupRole  # noqa: E402
from services.github_feedback import update_feedback_issue_state  # noqa: E402
from services.group_service import (  # noqa: E402
    can_manage_feedback_issues,
    create_group,
    set_group_members,
    update_group,
)


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(
            text("CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR(50), email VARCHAR(100))")
        )
        conn.execute(
            text(
                "INSERT INTO users (id, username, email) VALUES "
                "(1, 'ana', 'ana@x.com'), (2, 'luis', 'luis@x.com')"
            )
        )
    UserGroup.__table__.create(engine)
    UserGroupMember.__table__.create(engine)
    UserGroupRole.__table__.create(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_can_manage_feedback_account_admin():
    assert can_manage_feedback_issues(None, user_id=1, roles=["user", "admin"]) is True


def test_can_manage_feedback_group_admin_not_account_admin(db):
    group = create_group(db, "Equipo admin")
    update_group(db, group["id"], roles=["admin", "user"])
    set_group_members(db, group["id"], [1])
    assert can_manage_feedback_issues(db, user_id=1, roles=["user"]) is True
    assert can_manage_feedback_issues(db, user_id=2, roles=["user"]) is False


def test_update_feedback_issue_state_calls_patch():
    sent = {}

    def patcher(repo, token, number, state):
        sent.update({"repo": repo, "number": number, "state": state})
        return {
            "number": number,
            "title": "T",
            "state": state,
            "body": "**Usuario:** ana\n",
            "created_at": "t",
            "updated_at": "t",
        }

    out = update_feedback_issue_state("o/r", "tok", 9, "closed", patcher=patcher)
    assert sent == {"repo": "o/r", "number": 9, "state": "closed"}
    assert out["state"] == "closed"