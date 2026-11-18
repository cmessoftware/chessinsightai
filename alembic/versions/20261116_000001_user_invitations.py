"""LOG-FEAT-13: invitations by email.

Revision ID: 20261116_000001
Revises: 20261112_000001
Create Date: 2026-11-16
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261116_000001"
down_revision: Union[str, None] = "20261112_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_invitations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=100), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=True),
        sa.Column("token", sa.String(length=128), nullable=False),
        sa.Column("invited_by", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("accepted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["group_id"], ["user_groups.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["invited_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index("ix_user_invitations_id", "user_invitations", ["id"])
    op.create_index("ix_user_invitations_email", "user_invitations", ["email"])
    op.create_index("ix_user_invitations_group_id", "user_invitations", ["group_id"])
    op.create_index("ix_user_invitations_token", "user_invitations", ["token"])


def downgrade() -> None:
    op.drop_index("ix_user_invitations_token", table_name="user_invitations")
    op.drop_index("ix_user_invitations_group_id", table_name="user_invitations")
    op.drop_index("ix_user_invitations_email", table_name="user_invitations")
    op.drop_index("ix_user_invitations_id", table_name="user_invitations")
    op.drop_table("user_invitations")
