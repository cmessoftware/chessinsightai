"""PostgreSQL persistence for Coach (GC-2: ``coach_games`` → ``games``)."""

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

from .database_models import Base, Games

DEFAULT_STOCKFISH_DEPTH = 12
DEFAULT_STOCKFISH_MULTIPV = 3

CLIENT_CLASSIFICATION_SOURCE = "client_wasm"
CLIENT_CLASSIFICATION_RULES_VERSION = 1


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
        "CoachGame",
        back_populates="analysis_job",
        cascade="all, delete-orphan",
    )


class CoachGame(Base):
    """Coach library row (GC-2): metadata + FK to master ``games`` for PGN/players."""

    __tablename__ = "coach_games"
    __table_args__ = (
        UniqueConstraint(
            "owner_user_id",
            "content_game_id",
            name="uq_coach_games_owner_content_id",
        ),
    )

    id = Column(String(36), primary_key=True)
    master_game_id = Column(
        String,
        ForeignKey("games.game_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
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
    player_username = Column(String(255), nullable=True)
    player_color = Column(String(5), nullable=True)
    source = Column(String(32), nullable=False, default="pgn")
    corpus_type = Column(String(32), nullable=False, default="personal", index=True)
    speed_class = Column(String(32), nullable=False, default="unknown", index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    last_imported_at = Column(DateTime, nullable=False, server_default=func.now())
    client_analyzed_at = Column(DateTime, nullable=True)
    client_analysis_ply_count = Column(Integer, nullable=False, default=0)
    client_main_line_signature = Column(String(512), nullable=True)
    import_provenance = Column(JSON, nullable=True)

    master_game = relationship(
        Games,
        foreign_keys=[master_game_id],
        lazy="joined",
    )
    analysis_job = relationship("Module07AnalysisJob", back_populates="games")
    decision_points = relationship(
        "Module07DecisionPoint",
        back_populates="game",
        cascade="all, delete-orphan",
    )
    ply_annotations = relationship(
        "Module07PlyAnnotation",
        back_populates="game",
        cascade="all, delete-orphan",
    )

    @property
    def pgn(self) -> str | None:
        return self.master_game.pgn if self.master_game else None

    @property
    def white_player(self) -> str:
        return (self.master_game.white_player if self.master_game else "") or ""

    @property
    def black_player(self) -> str:
        return (self.master_game.black_player if self.master_game else "") or ""

    @property
    def result(self) -> str | None:
        return self.master_game.result if self.master_game else None

    @property
    def time_control(self) -> str | None:
        if not self.master_game:
            return None
        return (self.master_game.time_control or "").strip() or None


# Backward-compatible alias (API package name module07 until GC-4).
Module07Game = CoachGame


class Module07DecisionPoint(Base):
    __tablename__ = "module07_decision_points"
    __table_args__ = (
        UniqueConstraint("game_id", "ply", name="uq_module07_decision_game_ply"),
    )

    id = Column(String(36), primary_key=True)
    game_id = Column(
        String(36),
        ForeignKey("coach_games.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ply = Column(Integer, nullable=False)
    fen_before = Column(String(120), nullable=False)
    criticality = Column(Float, nullable=True)
    review_pack = Column(JSON, nullable=False)
    mental_model = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    game = relationship("CoachGame", back_populates="decision_points")


class Module07PlyAnnotation(Base):
    __tablename__ = "module07_ply_annotations"
    __table_args__ = (
        UniqueConstraint(
            "game_id", "path_key", name="uq_module07_ply_ann_game_path"
        ),
    )

    id = Column(String(36), primary_key=True)
    game_id = Column(
        String(36),
        ForeignKey("coach_games.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    path_key = Column(String(64), nullable=False)
    ply = Column(Integer, nullable=False)
    fen_before = Column(String(120), nullable=False)
    played_uci = Column(String(12), nullable=True)
    main_line_signature = Column(String(512), nullable=False)
    rules_version = Column(Integer, nullable=False, default=CLIENT_CLASSIFICATION_RULES_VERSION)
    stockfish_depth = Column(Integer, nullable=False, default=DEFAULT_STOCKFISH_DEPTH)
    stockfish_multipv = Column(Integer, nullable=False, default=DEFAULT_STOCKFISH_MULTIPV)
    source = Column(String(32), nullable=False, default=CLIENT_CLASSIFICATION_SOURCE)
    payload = Column(JSON, nullable=False)
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    game = relationship("CoachGame", back_populates="ply_annotations")
