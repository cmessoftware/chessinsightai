"""LOG-FEAT-06: groups, one membership per user, and roles on the group.

Revision ID: 20261112_000001
Revises: 20261111_000001
Create Date: 2026-11-12
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261112_000001"
down_revision: Union[str, None] = "20261111_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_groups",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_user_groups_id", "user_groups", ["id"])
    op.create_table(
        "user_group_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["user_groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_user_group_members_group_id", "user_group_members", ["group_id"])
    op.create_index("ix_user_group_members_user_id", "user_group_members", ["user_id"])
    op.create_table(
        "user_group_roles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["user_groups.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("group_id", "role", name="uq_user_group_role"),
    )
    op.create_index("ix_user_group_roles_group_id", "user_group_roles", ["group_id"])


def downgrade() -> None:
    op.drop_index("ix_user_group_roles_group_id", table_name="user_group_roles")
    op.drop_table("user_group_roles")
    op.drop_index("ix_user_group_members_user_id", table_name="user_group_members")
    op.drop_index("ix_user_group_members_group_id", table_name="user_group_members")
    op.drop_table("user_group_members")
    op.drop_index("ix_user_groups_id", table_name="user_groups")
    op.drop_table("user_groups")
