"""Resolve PostgreSQL URL for SQLAlchemy (local, Render, Neon CLI)."""

from __future__ import annotations

import os


def _normalize_postgres_url(url: str) -> str:
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://") :]
    return url


def resolve_postgres_url(*, default: str | None = None) -> str | None:
    """
    CHESS_TRAINER_DB_URL is the app convention (Render tutorial).
    Neon CLI writes DATABASE_URL (+ NEON_BRANCH) via `neon deploy`.
    When both exist, prefer Neon so local Docker URLs are not used accidentally.
    """
    database_url = os.environ.get("DATABASE_URL")
    chess_url = os.environ.get("CHESS_TRAINER_DB_URL")
    neon_branch = os.environ.get("NEON_BRANCH")

    if neon_branch and database_url:
        return _normalize_postgres_url(database_url)
    if chess_url:
        return _normalize_postgres_url(chess_url)
    if database_url:
        return _normalize_postgres_url(database_url)
    return default
