"""PostgreSQL persistence for sparring sessions (spec §4.3, SPAR-02)."""

from __future__ import annotations

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database_models import Base

SESSION_STATUS_CREATED = "created"
SESSION_STATUS_ACTIVE = "active"
SESSION_STATUS_PAUSED = "paused"
SESSION_STATUS_FINISHED = "finished"
SESSION_STATUS_CANCELLED = "cancelled"

MOVE_ACTOR_HUMAN = "human"
MOVE_ACTOR_BOT = "bot"


class SparringSession(Base):
    __tablename__ = "sparring_sessions"

    id = Column(String(36), primary_key=True)
    owner_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    initial_fen = Column(String(120), nullable=False)
    prior_moves = Column(JSON, nullable=False, default=list)
    history_complete = Column(Boolean, nullable=False, default=True)
    human_color = Column(String(5), nullable=False)
    mode = Column(String(32), nullable=False, default="normal")
    time_control = Column(JSON, nullable=True)
    model_config_snapshot = Column(JSON, nullable=False)
    plan_version_id = Column(String(36), nullable=True)
    exercise_version_id = Column(String(36), nullable=True)
    status = Column(String(32), nullable=False, default=SESSION_STATUS_CREATED, index=True)
    result = Column(String(16), nullable=True)
    termination_reason = Column(String(64), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)

    moves = relationship(
        "SparringMove",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="SparringMove.ply",
    )
    predictions = relationship(
        "SparringModelPrediction",
        back_populates="session",
        cascade="all, delete-orphan",
    )


class SparringModelPrediction(Base):
    __tablename__ = "sparring_model_predictions"

    id = Column(String(36), primary_key=True)
    session_id = Column(
        String(36),
        ForeignKey("sparring_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    model_name = Column(String(64), nullable=False)
    model_version = Column(String(64), nullable=True)
    rating_inputs = Column(JSON, nullable=False)
    policy = Column(JSON, nullable=True)
    policy_coverage = Column(Float, nullable=True)
    sampling = Column(JSON, nullable=True)
    chosen_move = Column(String(12), nullable=False)
    latency_ms = Column(Float, nullable=True)

    session = relationship("SparringSession", back_populates="predictions")
    move = relationship("SparringMove", back_populates="prediction", uselist=False)


class SparringMove(Base):
    __tablename__ = "sparring_moves"
    __table_args__ = (
        UniqueConstraint("session_id", "ply", name="uq_sparring_moves_session_ply"),
    )

    id = Column(String(36), primary_key=True)
    session_id = Column(
        String(36),
        ForeignKey("sparring_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ply = Column(Integer, nullable=False)
    uci = Column(String(12), nullable=False)
    actor = Column(String(16), nullable=False)
    resulting_fen = Column(String(120), nullable=False)
    elapsed_ms = Column(Integer, nullable=True)
    clock_state = Column(JSON, nullable=True)
    request_id = Column(String(64), nullable=True, index=True)
    prediction_id = Column(
        String(36),
        ForeignKey("sparring_model_predictions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    session = relationship("SparringSession", back_populates="moves")
    prediction = relationship(
        "SparringModelPrediction", back_populates="move", foreign_keys=[prediction_id]
    )
