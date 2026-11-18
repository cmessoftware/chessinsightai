"""LOG-FEAT-13: the admin invites an email. That person opens the link and chooses a password."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from models.database_models import User, UserGroup, UserGroupMember, UserInvitation
from services.group_service import GroupNotFound

INVITE_DAYS = 14


class InvitationError(ValueError):
    """The email, username, or invitation cannot be used."""


class InvitationNotFound(LookupError):
    """No invitation matches the token."""


def clean_email(email: str) -> str:
    value = (email or "").strip().lower()
    if "@" not in value or value.startswith("@") or value.endswith("@") or " " in value:
        raise InvitationError("El email no es válido.")
    if len(value) > 100:
        raise InvitationError("El email es demasiado largo.")
    return value


def clean_username(username: str) -> str:
    value = (username or "").strip()
    body = value.replace("_", "").replace("-", "")
    if not value or not body.isalnum():
        raise InvitationError("El usuario solo puede tener letras, números, _ o -.")
    if len(value) > 50:
        raise InvitationError("El usuario es demasiado largo.")
    return value


def _group_name(db: Session, group_id: int | None) -> str | None:
    if group_id is None:
        return None
    row = db.query(UserGroup.name).filter(UserGroup.id == group_id).first()
    return row[0] if row else None


def _to_dict(db: Session, invitation: UserInvitation) -> dict:
    return {
        "id": invitation.id,
        "email": invitation.email,
        "group_id": invitation.group_id,
        "group_name": _group_name(db, invitation.group_id),
        "token": invitation.token,
        "expires_at": invitation.expires_at,
    }


def create_invitation(
    db: Session,
    email: str,
    *,
    group_id: int | None,
    invited_by: int | None,
    now: datetime | None = None,
) -> dict:
    """Create or refresh a pending invitation. An email that already has an account is rejected."""
    cleaned = clean_email(email)
    moment = now or datetime.utcnow()
    if db.query(User.id).filter(User.email == cleaned).first() is not None:
        raise InvitationError("Ese email ya tiene cuenta.")
    if group_id is not None and db.query(UserGroup.id).filter(UserGroup.id == group_id).first() is None:
        raise GroupNotFound("El grupo no existe.")
    pending = (
        db.query(UserInvitation)
        .filter(UserInvitation.email == cleaned, UserInvitation.accepted_at.is_(None))
        .first()
    )
    expires = moment + timedelta(days=INVITE_DAYS)
    token = secrets.token_urlsafe(32)
    if pending is None:
        pending = UserInvitation(
            email=cleaned,
            group_id=group_id,
            token=token,
            invited_by=invited_by,
            created_at=moment,
            expires_at=expires,
        )
        db.add(pending)
    else:
        pending.group_id = group_id
        pending.token = token
        pending.invited_by = invited_by
        pending.expires_at = expires
    db.commit()
    db.refresh(pending)
    return _to_dict(db, pending)


def list_invitations(db: Session) -> list[dict]:
    rows = (
        db.query(UserInvitation)
        .filter(UserInvitation.accepted_at.is_(None))
        .order_by(UserInvitation.created_at.desc())
        .all()
    )
    return [_to_dict(db, row) for row in rows]


def revoke_invitation(db: Session, invitation_id: int) -> None:
    row = db.query(UserInvitation).filter(UserInvitation.id == invitation_id).first()
    if row is None or row.accepted_at is not None:
        raise InvitationNotFound("La invitación no existe.")
    db.delete(row)
    db.commit()


def preview_invitation(db: Session, token: str, *, now: datetime | None = None) -> dict:
    invitation = _open_invitation(db, token, now=now)
    return {
        "email": invitation.email,
        "group_name": _group_name(db, invitation.group_id),
        "expires_at": invitation.expires_at,
    }


def accept_invitation(
    db: Session,
    token: str,
    username: str,
    password_hash: str,
    *,
    now: datetime | None = None,
) -> User:
    """Create the account for an open invitation and mark it accepted."""
    moment = now or datetime.utcnow()
    invitation = _open_invitation(db, token, now=moment)
    chosen = clean_username(username)
    taken = (
        db.query(User.id)
        .filter((User.username == chosen) | (User.email == invitation.email))
        .first()
    )
    if taken is not None:
        raise InvitationError("Ese usuario o email ya tiene cuenta.")
    user = User(
        username=chosen,
        email=invitation.email,
        password_hash=password_hash,
        roles=["user"],
        is_active=True,
        created_at=moment,
    )
    db.add(user)
    db.flush()
    if invitation.group_id is not None and _group_name(db, invitation.group_id) is not None:
        db.add(UserGroupMember(group_id=invitation.group_id, user_id=user.id))
    invitation.accepted_at = moment
    db.commit()
    db.refresh(user)
    return user


def _open_invitation(db: Session, token: str, *, now: datetime | None) -> UserInvitation:
    moment = now or datetime.utcnow()
    invitation = db.query(UserInvitation).filter(UserInvitation.token == token).first()
    if invitation is None or invitation.accepted_at is not None:
        raise InvitationNotFound("La invitación no existe.")
    if invitation.expires_at < moment:
        raise InvitationError("La invitación está vencida.")
    return invitation
