"""LOG-FEAT-06 — groups, single membership, and roles on the group."""

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
from services.group_service import (  # noqa: E402
    GroupError,
    GroupNotFound,
    assign_user_group,
    create_group,
    delete_group,
    groups_for_users,
    set_group_members,
    update_group,
)


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR(50), email VARCHAR(100))"
            )
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


def test_creates_group_and_rejects_blank_or_duplicate_names(db):
    created = create_group(db, "  Club A  ")
    assert created["name"] == "Club A"
    assert created["members"] == []
    assert created["roles"] == []

    with pytest.raises(GroupError):
        create_group(db, "   ")
    with pytest.raises(GroupError):
        create_group(db, "Club A")


def test_stores_roles_and_moves_a_user_out_of_the_previous_group(db):
    club = create_group(db, "Club")
    advanced = create_group(db, "Avanzados")
    update_group(db, club["id"], roles=["user", "admin", "admin"])
    stored = update_group(db, club["id"], roles=["user", "admin"])
    assert stored["roles"] == ["admin", "user"]

    with pytest.raises(GroupError):
        update_group(db, club["id"], roles=["instructor"])

    set_group_members(db, club["id"], [1, 2])
    moved = set_group_members(db, advanced["id"], [1])
    assert [member["username"] for member in moved["members"]] == ["ana"]

    club_after = set_group_members(db, club["id"], [2])
    assert [member["username"] for member in club_after["members"]] == ["luis"]
    assert groups_for_users(db, [1, 2])[1]["group_name"] == "Avanzados"


def test_assign_and_clear_from_the_user_and_delete_group(db):
    club = create_group(db, "Club")
    assign_user_group(db, 1, club["id"])
    assert groups_for_users(db, [1])[1]["group_id"] == club["id"]

    assign_user_group(db, 1, None)
    assert groups_for_users(db, [1]) == {}

    with pytest.raises(GroupNotFound):
        assign_user_group(db, 1, 999)
    with pytest.raises(GroupError):
        set_group_members(db, club["id"], [99])

    delete_group(db, club["id"])
    with pytest.raises(GroupNotFound):
        update_group(db, club["id"], name="Otro")
