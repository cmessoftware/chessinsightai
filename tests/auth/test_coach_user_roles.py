"""LOG-FEAT-04: coach account role helpers."""

import pytest
from fastapi import HTTPException

from models.coach_user_roles import (
    normalize_coach_account_roles,
    user_has_admin_role,
)
from models.schemas import BaseRole


def test_user_has_admin_role_accepts_strings_and_enums():
    assert user_has_admin_role(["admin"])
    assert user_has_admin_role([BaseRole.ADMIN])
    assert not user_has_admin_role(["user"])
    assert not user_has_admin_role([BaseRole.USER])


def test_normalize_coach_account_roles_single_role():
    assert normalize_coach_account_roles([BaseRole.USER]) == ["user"]
    assert normalize_coach_account_roles([BaseRole.ADMIN]) == ["admin"]
    assert normalize_coach_account_roles([]) == ["user"]


def test_normalize_rejects_unknown_or_multiple():
    with pytest.raises(HTTPException):
        normalize_coach_account_roles([BaseRole.ADMIN, BaseRole.USER])
    with pytest.raises(HTTPException):
        normalize_coach_account_roles([BaseRole.BASIC_GAMER])
