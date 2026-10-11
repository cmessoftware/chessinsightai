"""module07 ply annotations (client WASM classification persistence)

Revision ID: 20261009_000001
Revises: 20261005_000001
Create Date: 2026-10-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261009_000001"
down_revision: Union[str, None] = "20261005_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "module07_ply_annotations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("game_id", sa.String(length=36), nullable=False),
        sa.Column("path_key", sa.String(length=64), nullable=False),
        sa.Column("ply", sa.Integer(), nullable=False),
        sa.Column("fen_before", sa.String(length=120), nullable=False),
        sa.Column("played_uci", sa.String(length=12), nullable=True),
        sa.Column("main_line_signature", sa.String(length=512), nullable=False),
        sa.Column("rules_version", sa.Integer(), nullable=False),
        sa.Column("stockfish_depth", sa.Integer(), nullable=False),
        sa.Column("stockfish_multipv", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["game_id"], ["module07_games.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "game_id", "path_key", name="uq_module07_ply_ann_game_path"
        ),
    )
    op.create_index(
        op.f("ix_module07_ply_annotations_game_id"),
        "module07_ply_annotations",
        ["game_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_module07_ply_annotations_game_id"),
        table_name="module07_ply_annotations",
    )
    op.drop_table("module07_ply_annotations")
