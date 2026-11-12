from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from datetime import date, datetime, timedelta
import os
from sqlalchemy.orm import Session
from typing import List, Optional

from models.schemas import (
    UserLogin,
    TokenResponse,
    UserResponse,
    UserRole,
    BaseRole,
    UserCreate,
    UserUpdate,
    UserRolesUpdate,
    UserPermissionsResponse,
    RoleMatrix,
    RoleInfo,
    ROLE_PERMISSIONS,
    CoachAccountRolesResponse,
    CoachAccountRoleInfo,
    GroupCreate,
    GroupMembersUpdate,
    GroupResponse,
    GroupUpdate,
)
from models.coach_user_roles import normalize_coach_account_roles
from services.auth_service import AuthService
from services.activity_log_service import ACTIVITY_EVENTS, list_activity, record_activity
from services.group_service import (
    GroupError,
    GroupNotFound,
    assign_user_group,
    create_group,
    delete_group,
    groups_for_users,
    list_groups,
    set_group_members,
    update_group,
)
from database import get_db

router = APIRouter()
security = HTTPBearer()

# Instancia del servicio de autenticación
auth_service = AuthService()


def _user_to_response(user, group=None) -> UserResponse:
    roles: List[BaseRole] = []
    for raw in user.roles or []:
        try:
            roles.append(BaseRole(raw))
        except ValueError:
            continue
    membership = group or {}
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        roles=roles,
        created_at=user.created_at,
        last_login=user.last_login,
        is_active=user.is_active,
        group_id=membership.get("group_id"),
        group_name=membership.get("group_name"),
    )


def _group_http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, GroupNotFound):
        return HTTPException(status_code=404, detail=str(exc))
    return HTTPException(status_code=400, detail=str(exc))


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Endpoint de autenticación con soporte para roles combinatorios

    Soporta autenticación por base de datos y sistema legacy
    """

    # Authenticate user (database first, then legacy)
    user_data = await auth_service.authenticate_user(
        credentials.username, credentials.password, db
    )

    if not user_data:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    # Prepare token data
    token_expires = datetime.utcnow() + timedelta(hours=24)
    roles_str = ",".join([role.value for role in user_data.get("roles", [])])

    token_data = {
        "sub": user_data["username"],
        "user_id": user_data["user_id"],
        "roles": roles_str,
        "exp": token_expires,
    }

    # Create access token
    access_token = auth_service.create_access_token(token_data)

    # Create session in database (if available)
    try:
        auth_service.create_user_session(
            db, user_data["user_id"], access_token, token_expires
        )
    except Exception:
        # Session creation failed, but continue with token
        pass

    record_activity(
        db,
        username=user_data["username"],
        event="login",
        user_id=user_data.get("user_id"),
    )

    # Create response with new role system
    user_response = UserResponse(
        id=user_data["user_id"],
        username=user_data["username"],
        email=user_data.get("email", "legacy@example.com"),
        roles=user_data.get("roles", []),
        created_at=datetime.utcnow(),  # For legacy users
        is_active=True,
    )

    return TokenResponse(access_token=access_token, user=user_response)


@router.post("/verify", response_model=UserPermissionsResponse)
async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Verificar si un token es válido y devolver información completa del usuario
    """
    user_data = auth_service.verify_token(credentials.credentials, db)

    if not user_data:
        raise HTTPException(status_code=401, detail="Token inválido")

    # Calculate user permissions
    user_permissions = list(
        auth_service.get_user_permissions(user_data.get("roles", []))
    )

    # Create user response
    user_response = UserResponse(
        id=user_data["user_id"],
        username=user_data["username"],
        email=user_data.get("email", "legacy@example.com"),
        roles=user_data.get("roles", []),
        created_at=datetime.utcnow(),  # For legacy users
        is_active=True,
    )

    # Role descriptions
    role_descriptions = {}
    for role in user_data.get("roles", []):
        # Handle both string and BaseRole enum types
        role_name = role.value if hasattr(role, 'value') else str(role)
        role_descriptions[role_name] = f"Role: {role_name.replace('_', ' ').title()}"

    return UserPermissionsResponse(
        user=user_response,
        permissions=user_permissions,
        role_descriptions=role_descriptions,
    )


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Cerrar sesión invalidando el token
    """
    user_data = auth_service.verify_token(credentials.credentials, db)
    success = auth_service.invalidate_user_session(db, credentials.credentials)
    if user_data:
        record_activity(
            db,
            username=user_data.get("username") or "",
            event="logout",
            user_id=user_data.get("user_id"),
        )

    return {"message": "Sesión cerrada exitosamente", "success": success}


@router.get("/roles/matrix", response_model=RoleMatrix)
async def get_roles_matrix():
    """
    Obtener la matriz completa de roles y permisos para administración
    """
    # First pass: collect all permissions from non-admin roles
    all_permissions = set()
    for role, permissions in ROLE_PERMISSIONS.items():
        if permissions != ["ALL"]:
            all_permissions.update(permissions)
    
    # Second pass: create role info list with admin having all permissions
    role_infos = []
    for role, permissions in ROLE_PERMISSIONS.items():
        role_infos.append(
            RoleInfo(
                name=role,
                description=f"Role: {role.value.replace('_', ' ').title()}",
                permissions=(
                    list(all_permissions) if permissions == ["ALL"] else permissions
                ),
            )
        )

    # Common role combinations
    role_combinations = {
        "Basic User": ["basic_gamer", "tactics_trainer"],
        "Chess Analyst": ["basic_gamer", "analysis_board", "stats_viewer"],
        "Content Creator": ["basic_gamer", "exercise_creator", "pgn_uploader"],
        "Data Scientist": ["eda_analyst", "stats_viewer", "analysis_board"],
        "Advanced User": [
            "basic_gamer",
            "analysis_board",
            "tactics_trainer",
            "stats_viewer",
        ],
        "Content Manager": ["exercise_creator", "pgn_uploader", "stats_viewer"],
    }

    return RoleMatrix(
        available_roles=role_infos,
        all_permissions=list(all_permissions),
        role_combinations=role_combinations,
    )


@router.get("/activity/events")
async def list_activity_events(
    current_user: dict = Depends(auth_service.get_current_admin_user()),
):
    """LOG-FEAT-09: event catalog for the admin activity page."""
    return {"events": [{"code": code, "label": label} for code, label in ACTIVITY_EVENTS]}


@router.get("/activity")
async def get_activity_log(
    username: Optional[str] = None,
    event: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_service.get_current_admin_user()),
):
    """LOG-FEAT-09: activity log. Admin only. Filters: user, dates, event."""
    try:
        items = list_activity(
            db,
            username=username,
            event=event,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"items": items}


@router.get("/admin/account-roles", response_model=CoachAccountRolesResponse)
async def get_coach_account_roles(
    current_user: dict = Depends(auth_service.get_current_admin_user()),
):
    """LOG-FEAT-04: roles disponibles en gestión de usuarios (solo admin)."""
    return CoachAccountRolesResponse(
        roles=[
            CoachAccountRoleInfo(
                name=BaseRole.ADMIN,
                description="Acceso completo, incluida gestión de usuarios",
            ),
            CoachAccountRoleInfo(
                name=BaseRole.USER,
                description="Usuario Coach estándar (partidas e importación personal)",
            ),
        ]
    )


@router.post("/users", response_model=UserResponse)
async def create_user(
    user_create: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_service.get_current_admin_user()),
):
    """
    Crear un nuevo usuario (solo admins)
    """
    try:
        db_roles = normalize_coach_account_roles(user_create.roles or [BaseRole.USER])
        payload = UserCreate(
            username=user_create.username,
            email=user_create.email,
            password=user_create.password,
            roles=[BaseRole(r) for r in db_roles],
            is_active=user_create.is_active,
        )
        user = await auth_service.create_user(db, payload)
        if user_create.group_id is not None:
            assign_user_group(db, user.id, user_create.group_id)
        group = groups_for_users(db, [user.id]).get(user.id)
        return _user_to_response(user, group)
    except GroupNotFound as e:
        raise _group_http_error(e) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_service.get_current_admin_user()),
):
    """
    Listar todos los usuarios (solo admins)
    """
    from models.database_models import User

    users = db.query(User).all()
    memberships = groups_for_users(db, [user.id for user in users])
    return [_user_to_response(user, memberships.get(user.id)) for user in users]


@router.put("/users/{user_id}/roles", response_model=UserResponse)
async def update_user_roles(
    user_id: int,
    payload: UserRolesUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_service.get_current_admin_user()),
):
    """
    Actualizar roles de un usuario (solo admins, LOG-FEAT-04: admin | user)
    """
    from models.database_models import User

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.roles = normalize_coach_account_roles(payload.roles)
    db.commit()
    db.refresh(user)

    group = groups_for_users(db, [user.id]).get(user.id)
    return _user_to_response(user, group)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def patch_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_service.get_current_admin_user()),
):
    """Actualizar email, activo, contraseña o rol (solo admins, LOG-FEAT-05)."""
    from models.database_models import User

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if body.email is not None:
        user.email = body.email
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.password is not None:
        user.password_hash = auth_service.get_password_hash(body.password)
    if body.roles is not None:
        user.roles = normalize_coach_account_roles(body.roles)

    db.commit()
    db.refresh(user)

    try:
        if body.clear_group:
            assign_user_group(db, user.id, None)
        elif body.group_id is not None:
            assign_user_group(db, user.id, body.group_id)
    except (GroupError, GroupNotFound) as exc:
        raise _group_http_error(exc) from exc

    group = groups_for_users(db, [user.id]).get(user.id)
    return _user_to_response(user, group)


@router.get("/groups", response_model=List[GroupResponse])
async def get_groups(
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_service.get_current_admin_user()),
):
    """LOG-FEAT-06: list groups with members and roles. Admin only."""
    return list_groups(db)


@router.post("/groups", response_model=GroupResponse)
async def post_group(
    body: GroupCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_service.get_current_admin_user()),
):
    """LOG-FEAT-06: create a group. Admin only."""
    try:
        return create_group(db, body.name)
    except GroupError as exc:
        raise _group_http_error(exc) from exc


@router.patch("/groups/{group_id}", response_model=GroupResponse)
async def patch_group(
    group_id: int,
    body: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_service.get_current_admin_user()),
):
    """LOG-FEAT-06: rename a group or replace its roles. Admin only."""
    try:
        return update_group(db, group_id, name=body.name, roles=body.roles)
    except (GroupError, GroupNotFound) as exc:
        raise _group_http_error(exc) from exc


@router.put("/groups/{group_id}/members", response_model=GroupResponse)
async def put_group_members(
    group_id: int,
    body: GroupMembersUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_service.get_current_admin_user()),
):
    """LOG-FEAT-06: replace the users in a group. A user leaves any other group."""
    try:
        return set_group_members(db, group_id, body.user_ids)
    except (GroupError, GroupNotFound) as exc:
        raise _group_http_error(exc) from exc


@router.delete("/groups/{group_id}")
async def remove_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_service.get_current_admin_user()),
):
    """LOG-FEAT-06: delete a group and its memberships. Admin only."""
    try:
        delete_group(db, group_id)
    except GroupNotFound as exc:
        raise _group_http_error(exc) from exc
    return {"ok": True}
