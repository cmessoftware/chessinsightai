"""FEAT-087: boolean manual analysis flag on coach_games

Revision ID: 20261101_000001
Revises: 20261019_000001
Create Date: 2026-11-01
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261101_000001"
down_revision: Union[str, None] = "20261019_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "coach_games",
        sa.Column(
            "manual_analysis",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("coach_games", "manual_analysis")
