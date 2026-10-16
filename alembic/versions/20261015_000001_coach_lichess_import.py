"""FEAT-027: Lichess import settings + coach_games import_provenance

Revision ID: 20261015_000001
Revises: 20261010_000001
Create Date: 2026-10-15
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261015_000001"
down_revision: Union[str, None] = "20261010_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "coach_games",
        sa.Column("import_provenance", sa.JSON(), nullable=True),
    )
    op.create_table(
        "coach_lichess_import_settings",
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("lichess_username", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("since_date", sa.String(length=10), nullable=True),
        sa.Column("until_date", sa.String(length=10), nullable=True),
        sa.Column("perf_types", sa.JSON(), nullable=True),
        sa.Column("batch_size", sa.Integer(), nullable=False, server_default="200"),
        sa.Column("player_alias", sa.String(length=64), nullable=True),
        sa.Column("api_token", sa.Text(), nullable=True),
        sa.Column("last_cursor", sa.JSON(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("owner_user_id"),
    )


def downgrade() -> None:
    op.drop_table("coach_lichess_import_settings")
    op.drop_column("coach_games", "import_provenance")
