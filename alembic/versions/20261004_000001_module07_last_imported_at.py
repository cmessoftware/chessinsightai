"""module07_games last_imported_at for import recency

Revision ID: 20261004_000001
Revises: 20260924_000002
Create Date: 2026-10-04
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20261004_000001"
down_revision = "20260924_000002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "module07_games",
        sa.Column(
            "last_imported_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.execute(
        sa.text("UPDATE module07_games SET last_imported_at = created_at")
    )


def downgrade() -> None:
    op.drop_column("module07_games", "last_imported_at")
