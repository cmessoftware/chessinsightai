"""LOG-FEAT-04: coach account roles (admin | user) for user-management module."""

from __future__ import annotations

from typing import Iterable, List, Union

from fastapi import HTTPException, status

from models.schemas import BaseRole

CoachRoleInput = Union[BaseRole, str]

COACH_ACCOUNT_ROLES = frozenset({BaseRole.ADMIN, BaseRole.USER})


def coerce_base_role(role: CoachRoleInput) -> BaseRole | None:
    if isinstance(role, BaseRole):
        return role
    try:
        return BaseRole(str(role))
    except ValueError:
        return None


def user_has_admin_role(roles: Iterable[CoachRoleInput] | None) -> bool:
    for role in roles or []:
        parsed = coerce_base_role(role)
        if parsed == BaseRole.ADMIN:
            return True
    return False


def role_values_for_db(roles: Iterable[CoachRoleInput]) -> List[str]:
    out: List[str] = []
    for role in roles:
        parsed = coerce_base_role(role)
        if parsed is not None:
            out.append(parsed.value)
    return out


def normalize_coach_account_roles(roles: List[BaseRole]) -> List[str]:
    """
    Admin user-management allows exactly one role: admin or user.
    """
    if not roles:
        return [BaseRole.USER.value]
    if len(roles) != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe asignarse un único rol: admin o user",
        )
    role = roles[0]
    if role not in COACH_ACCOUNT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Roles permitidos: admin, user",
        )
    return [role.value]
