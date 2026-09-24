"""PostgreSQL persistence for Module 07 MVP (interim; unify with F08 later)."""

from __future__ import annotations

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.api.models.database_models import Base

DEFAULT_STOCKFISH_DEPTH = 12
DEFAULT_STOCKFISH_MULTIPV = 3


class Module07AnalysisJob(Base):
    __tablename__ = "module07_analysis_jobs"

    id = Column(String(36), primary_key=True)
    owner_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status = Column(String(32), nullable=False, default="pending", index=True)
    stockfish_depth = Column(Integer, nullable=False, default=DEFAULT_STOCKFISH_DEPTH)
    stockfish_multipv = Column(Integer, nullable=False, default=DEFAULT_STOCKFISH_MULTIPV)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)

    games = relationship(
        "Module07Game",
        back_populates="analysis_job",
        cascade="all, delete-orphan",
    )


class Module07Game(Base):
    __tablename__ = "module07_games"
    __table_args__ = (
        UniqueConstraint(
            "owner_user_id",
            "content_game_id",
            name="uq_module07_games_owner_content_id",
        ),
    )

    id = Column(String(36), primary_key=True)
    owner_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    analysis_job_id = Column(
        String(36),
        ForeignKey("module07_analysis_jobs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    content_game_id = Column(String(64), nullable=False, index=True)
    pgn = Column(Text, nullable=False)
    white_player = Column(String(255), nullable=False)
    black_player = Column(String(255), nullable=False)
    player_username = Column(String(255), nullable=False)
    player_color = Column(String(5), nullable=False)
    result = Column(String(16), nullable=True)
    source = Column(String(32), nullable=False, default="pgn")
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    analysis_job = relationship("Module07AnalysisJob", back_populates="games")
    decision_points = relationship(
        "Module07DecisionPoint",
        back_populates="game",
        cascade="all, delete-orphan",
    )


class Module07DecisionPoint(Base):
    __tablename__ = "module07_decision_points"
    __table_args__ = (
        UniqueConstraint("game_id", "ply", name="uq_module07_decision_game_ply"),
    )

    id = Column(String(36), primary_key=True)
    game_id = Column(
        String(36),
        ForeignKey("module07_games.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ply = Column(Integer, nullable=False)
    fen_before = Column(String(120), nullable=False)
    criticality = Column(Float, nullable=True)
    review_pack = Column(JSON, nullable=False)
    mental_model = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    game = relationship("Module07Game", back_populates="decision_points")
