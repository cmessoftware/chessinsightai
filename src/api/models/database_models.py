from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Text,
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    ARRAY,
    UniqueConstraint,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    roles = Column(ARRAY(String(50)), nullable=False, default=[])
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    last_login = Column(DateTime, nullable=True)
    profile_data = Column(JSON, nullable=True)

    # Relationships
    sessions = relationship(
        "UserSession", back_populates="user", cascade="all, delete-orphan"
    )


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_jti = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="sessions")


class UserGroup(Base):
    """LOG-FEAT-06: named group of coach users."""

    __tablename__ = "user_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), unique=True, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    members = relationship(
        "UserGroupMember", back_populates="group", cascade="all, delete-orphan"
    )
    group_roles = relationship(
        "UserGroupRole", back_populates="group", cascade="all, delete-orphan"
    )


class UserGroupMember(Base):
    """A user belongs to at most one group."""

    __tablename__ = "user_group_members"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(
        Integer, ForeignKey("user_groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    group = relationship("UserGroup", back_populates="members")


class UserGroupRole(Base):
    """Roles stored on the group (admin and/or user). They do not replace the account role."""

    __tablename__ = "user_group_roles"
    __table_args__ = (UniqueConstraint("group_id", "role", name="uq_user_group_role"),)

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(
        Integer, ForeignKey("user_groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role = Column(String(50), nullable=False)
    group = relationship("UserGroup", back_populates="group_roles")


class UserActivityLog(Base):
    """LOG-FEAT-09: login, logout, import, statistics and deep analysis."""

    __tablename__ = "user_activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    username = Column(String(50), nullable=False, index=True)
    event = Column(String(32), nullable=False, index=True)
    occurred_at = Column(DateTime, nullable=False, index=True, server_default=func.now())


class Games(Base):
    __tablename__ = "games"

    game_id = Column(String, primary_key=True)
    pgn = Column(Text)
    source = Column(String)
    white_player = Column(String)
    black_player = Column(String)
    white_elo = Column(String)
    black_elo = Column(String)
    result = Column(String)
    time_control = Column(String)
    opening = Column(String)
    eco = Column(String)
    date_played = Column(String)
    created_at = Column(String)
    import_batch_id = Column(String)
    source_filename = Column(String)
    imported_by = Column(String, index=True)
    corpus_type = Column(String(32), nullable=False, default="personal", index=True)
    speed_class = Column(String(32), nullable=False, default="unknown", index=True)


class Features(Base):
    __tablename__ = "features"

    game_id = Column(String, primary_key=True)
    move_number = Column(Integer, primary_key=True)
    player_color = Column(Integer, primary_key=True)

    fen = Column(String)
    move_san = Column(String)
    move_uci = Column(String)
    error_label = Column(String)
    material_balance = Column(Float)
    material_total = Column(Float)
    num_pieces = Column(Integer)
    branching_factor = Column(Integer)
    self_mobility = Column(Integer)
    opponent_mobility = Column(Integer)
    phase = Column(String)
    has_castling_rights = Column(Integer)
    move_number_global = Column(Integer)
    is_repetition = Column(Integer)
    is_low_mobility = Column(Integer)
    is_center_controlled = Column(Integer)
    is_pawn_endgame = Column(Integer)
    tags = Column(JSON)
    score_diff = Column(Float)
    num_moves = Column(Integer)
    is_stockfish_test = Column(Boolean, default=False)


class TacticalExercises(Base):
    __tablename__ = "tactical_exercises"

    id = Column(String, primary_key=True)
    fen = Column(String, nullable=False)
    move = Column(String, nullable=False)
    uci = Column(String, nullable=False)
    tags = Column(String, nullable=False)
    source_game_id = Column(String)


# Register Module 07 MVP tables on the same metadata (Alembic autogenerate / migrations).
from . import module07_models as _module07_models  # noqa: E402, F401
from . import coach_lichess_import_models as _coach_lichess_import_models  # noqa: E402, F401
from . import coach_chesscom_import_models as _coach_chesscom_import_models  # noqa: E402, F401
