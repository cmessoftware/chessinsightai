"""module07_games player fields nullable until analysis

Revision ID: 20260924_000002
Revises: 20260924_000001
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260924_000002"
down_revision: Union[str, None] = "20260924_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "module07_games",
        "player_username",
        existing_type=sa.String(length=255),
        nullable=True,
    )
    op.alter_column(
        "module07_games",
        "player_color",
        existing_type=sa.String(length=5),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "module07_games",
        "player_color",
        existing_type=sa.String(length=5),
        nullable=False,
    )
    op.alter_column(
        "module07_games",
        "player_username",
        existing_type=sa.String(length=255),
        nullable=False,
    )
