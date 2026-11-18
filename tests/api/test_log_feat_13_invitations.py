"""LOG-FEAT-13 — an admin invites an email, and only that person can create an account."""

from __future__ import annotations

import sys
from datetime import datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import String, create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.types import TypeDecorator

ROOT = Path(__file__).resolve().parents[2]
SRC_API = ROOT / "src" / "api"
if str(SRC_API) not in sys.path:
    sys.path.insert(0, str(SRC_API))

from models.database_models import (  # noqa: E402
    User,
    UserGroup,
    UserGroupMember,
    UserGroupRole,
    UserInvitation,
)
from services.group_service import GroupNotFound, create_group  # noqa: E402
from services.invitation_service import (  # noqa: E402
    InvitationError,
    InvitationNotFound,
    accept_invitation,
    create_invitation,
    preview_invitation,
)


class _RoleList(TypeDecorator):
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if isinstance(value, list):
            return ",".join(value)
        return value

    def process_result_value(self, value, dialect):
        if not value:
            return []
        if isinstance(value, list):
            return value
        return [part for part in str(value).split(",") if part]


@pytest.fixture
def db():
    column = User.__table__.c.roles
    original = column.type
    column.type = _RoleList()
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE users ("
                "id INTEGER PRIMARY KEY, username VARCHAR(50), email VARCHAR(100), "
                "password_hash VARCHAR(255), roles VARCHAR(50), is_active BOOLEAN, "
                "created_at DATETIME, last_login DATETIME, profile_data TEXT)"
            )
        )
        conn.execute(
            text("INSERT INTO users (id, username, email, is_active) VALUES (1, 'ana', 'ana@x.com', 1)")
        )
    UserGroup.__table__.create(engine)
    UserGroupMember.__table__.create(engine)
    UserGroupRole.__table__.create(engine)
    UserInvitation.__table__.create(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        column.type = original


def test_invites_an_email_and_rejects_one_that_already_has_an_account(db):
    club = create_group(db, "Club")
    created = create_invitation(db, "  Nuevo@X.com ", group_id=club["id"], invited_by=1)
    assert created["email"] == "nuevo@x.com"
    assert created["group_name"] == "Club"
    assert created["token"]

    with pytest.raises(InvitationError):
        create_invitation(db, "ana@x.com", group_id=None, invited_by=1)
    with pytest.raises(GroupNotFound):
        create_invitation(db, "otro@x.com", group_id=999, invited_by=1)


def test_accept_creates_the_user_in_the_group_and_closes_the_link(db):
    club = create_group(db, "Club")
    created = create_invitation(db, "nuevo@x.com", group_id=club["id"], invited_by=1)
    user = accept_invitation(db, created["token"], "nuevo_1", "hashed-password")
    assert user.email == "nuevo@x.com"
    assert user.roles == ["user"]
    member = db.query(UserGroupMember).filter(UserGroupMember.user_id == user.id).one()
    assert member.group_id == club["id"]

    with pytest.raises(InvitationNotFound):
        preview_invitation(db, created["token"])
    with pytest.raises(InvitationError):
        create_invitation(db, "nuevo@x.com", group_id=None, invited_by=1)


def test_expired_or_unknown_token_does_not_create_an_account(db):
    created = create_invitation(db, "nuevo@x.com", group_id=None, invited_by=1)
    row = db.query(UserInvitation).filter(UserInvitation.token == created["token"]).one()
    row.expires_at = datetime.utcnow() - timedelta(days=1)
    db.commit()

    with pytest.raises(InvitationError):
        accept_invitation(db, created["token"], "nuevo", "hashed")
    with pytest.raises(InvitationNotFound):
        accept_invitation(db, "no-existe", "nuevo", "hashed")
    assert db.query(User).filter(User.email == "nuevo@x.com").first() is None
