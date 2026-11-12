"""LOG-FEAT-06: create groups, move users, and store roles on the group."""

from __future__ import annotations

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from models.database_models import User, UserGroup, UserGroupMember, UserGroupRole

GROUP_ROLES = ("admin", "user")
MAX_NAME_LENGTH = 80


class GroupError(ValueError):
    """Invalid group name, role, or member list."""


class GroupNotFound(LookupError):
    """The group or user does not exist."""


def clean_group_name(name: str) -> str:
    cleaned = " ".join((name or "").split())
    if not cleaned:
        raise GroupError("El nombre del grupo es obligatorio.")
    if len(cleaned) > MAX_NAME_LENGTH:
        raise GroupError("El nombre del grupo es demasiado largo.")
    return cleaned


def normalize_group_roles(roles: list[str] | None) -> list[str]:
    chosen: list[str] = []
    for raw in roles or []:
        value = str(raw).strip()
        if value not in GROUP_ROLES:
            raise GroupError("Roles permitidos para el grupo: admin, user.")
        if value not in chosen:
            chosen.append(value)
    return chosen


def _get_group(db: Session, group_id: int) -> UserGroup:
    group = db.query(UserGroup).filter(UserGroup.id == group_id).first()
    if group is None:
        raise GroupNotFound("El grupo no existe.")
    return group


def _to_dict(db: Session, group: UserGroup) -> dict:
    roles = [
        row.role
        for row in db.query(UserGroupRole)
        .filter(UserGroupRole.group_id == group.id)
        .order_by(UserGroupRole.role.asc())
        .all()
    ]
    member_rows = (
        db.query(UserGroupMember.user_id)
        .filter(UserGroupMember.group_id == group.id)
        .all()
    )
    user_ids = [row[0] for row in member_rows]
    users_by_id = {}
    if user_ids:
        for user_id, username, email in (
            db.query(User.id, User.username, User.email).filter(User.id.in_(user_ids)).all()
        ):
            users_by_id[user_id] = {
                "id": user_id,
                "username": username,
                "email": email,
            }
    members = [users_by_id[user_id] for user_id in user_ids if user_id in users_by_id]
    members.sort(key=lambda item: item["username"].lower())
    return {
        "id": group.id,
        "name": group.name,
        "roles": roles,
        "members": members,
    }


def list_groups(db: Session) -> list[dict]:
    groups = db.query(UserGroup).order_by(UserGroup.name.asc()).all()
    return [_to_dict(db, group) for group in groups]


def groups_for_users(db: Session, user_ids: list[int]) -> dict[int, dict]:
    if not user_ids:
        return {}
    rows = (
        db.query(UserGroupMember.user_id, UserGroup.id, UserGroup.name)
        .join(UserGroup, UserGroup.id == UserGroupMember.group_id)
        .filter(UserGroupMember.user_id.in_(user_ids))
        .all()
    )
    return {
        user_id: {"group_id": group_id, "group_name": name}
        for user_id, group_id, name in rows
    }


def create_group(db: Session, name: str) -> dict:
    group = UserGroup(name=clean_group_name(name))
    db.add(group)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise GroupError("Ya existe un grupo con ese nombre.") from exc
    db.refresh(group)
    return _to_dict(db, group)


def update_group(
    db: Session,
    group_id: int,
    *,
    name: str | None = None,
    roles: list[str] | None = None,
) -> dict:
    group = _get_group(db, group_id)
    if name is not None:
        group.name = clean_group_name(name)
    if roles is not None:
        normalized = normalize_group_roles(roles)
        db.query(UserGroupRole).filter(UserGroupRole.group_id == group.id).delete(
            synchronize_session=False
        )
        for role in normalized:
            db.add(UserGroupRole(group_id=group.id, role=role))
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise GroupError("Ya existe un grupo con ese nombre.") from exc
    db.refresh(group)
    return _to_dict(db, group)


def delete_group(db: Session, group_id: int) -> None:
    group = _get_group(db, group_id)
    db.delete(group)
    db.commit()


def set_group_members(db: Session, group_id: int, user_ids: list[int]) -> dict:
    group = _get_group(db, group_id)
    unique_ids: list[int] = []
    for raw in user_ids:
        user_id = int(raw)
        if user_id not in unique_ids:
            unique_ids.append(user_id)
    if unique_ids:
        found = {
            row[0]
            for row in db.query(User.id).filter(User.id.in_(unique_ids)).all()
        }
        missing = [user_id for user_id in unique_ids if user_id not in found]
        if missing:
            raise GroupError("Hay usuarios que no existen.")
        db.query(UserGroupMember).filter(
            UserGroupMember.user_id.in_(unique_ids),
            UserGroupMember.group_id != group.id,
        ).delete(synchronize_session=False)
    db.query(UserGroupMember).filter(UserGroupMember.group_id == group.id).delete(
        synchronize_session=False
    )
    for user_id in unique_ids:
        db.add(UserGroupMember(group_id=group.id, user_id=user_id))
    db.commit()
    return _to_dict(db, group)


def assign_user_group(db: Session, user_id: int, group_id: int | None) -> None:
    user = db.query(User.id).filter(User.id == user_id).first()
    if user is None:
        raise GroupNotFound("Usuario no encontrado.")
    db.query(UserGroupMember).filter(UserGroupMember.user_id == user_id).delete(
        synchronize_session=False
    )
    if group_id is None:
        db.commit()
        return
    if db.query(UserGroup.id).filter(UserGroup.id == group_id).first() is None:
        db.rollback()
        raise GroupNotFound("El grupo no existe.")
    db.add(UserGroupMember(group_id=group_id, user_id=user_id))
    db.commit()
