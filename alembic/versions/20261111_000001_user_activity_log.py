"""LOG-FEAT-09: user activity log for admins.

Revision ID: 20261111_000001
Revises: 20261103_000001
Create Date: 2026-11-11
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261111_000001"
down_revision: Union[str, None] = "20261103_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_activity_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("event", sa.String(length=32), nullable=False),
        sa.Column(
            "occurred_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_user_activity_username", "user_activity_logs", ["username"])
    op.create_index("idx_user_activity_event", "user_activity_logs", ["event"])
    op.create_index("idx_user_activity_occurred_at", "user_activity_logs", ["occurred_at"])


def downgrade() -> None:
    op.drop_index("idx_user_activity_occurred_at", table_name="user_activity_logs")
    op.drop_index("idx_user_activity_event", table_name="user_activity_logs")
    op.drop_index("idx_user_activity_username", table_name="user_activity_logs")
    op.drop_table("user_activity_logs")
