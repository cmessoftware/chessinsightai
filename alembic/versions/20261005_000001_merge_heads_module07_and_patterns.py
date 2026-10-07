"""merge module07 last_imported_at and move_analyses heads

Revision ID: 20261005_000001
Revises: 20261004_000001, d65ac6f4b42a
Create Date: 2026-10-05
"""

from __future__ import annotations

from alembic import op

revision = "20261005_000001"
down_revision = ("20261004_000001", "d65ac6f4b42a")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
