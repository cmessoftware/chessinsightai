"""Per-user Lichess bulk import settings for Coach (FEAT-027)."""

from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.sql import func

from .database_models import Base


class CoachLichessImportSettings(Base):
    __tablename__ = "coach_lichess_import_settings"

    owner_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    lichess_username = Column(String(64), nullable=False, default="")
    since_date = Column(String(10), nullable=True)
    until_date = Column(String(10), nullable=True)
    perf_types = Column(JSON, nullable=True)
    batch_size = Column(Integer, nullable=False, default=200)
    player_alias = Column(String(64), nullable=True)
    api_token = Column(Text, nullable=True)
    last_cursor = Column(JSON, nullable=True)
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
