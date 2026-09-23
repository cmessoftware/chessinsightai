"""add module07 tables for MVP decision review persistence

Revision ID: 20260923_000001
Revises: 20260228_000004
Create Date: 2026-09-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260923_000001"
down_revision: Union[str, None] = "20260228_000004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "module07_analysis_jobs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("stockfish_depth", sa.Integer(), nullable=False),
        sa.Column("stockfish_multipv", sa.Integer(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["owner_user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_module07_analysis_jobs_owner_user_id"),
        "module07_analysis_jobs",
        ["owner_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_module07_analysis_jobs_status"),
        "module07_analysis_jobs",
        ["status"],
        unique=False,
    )

    op.create_table(
        "module07_games",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("analysis_job_id", sa.String(length=36), nullable=True),
        sa.Column("content_game_id", sa.String(length=64), nullable=False),
        sa.Column("pgn", sa.Text(), nullable=False),
        sa.Column("white_player", sa.String(length=255), nullable=False),
        sa.Column("black_player", sa.String(length=255), nullable=False),
        sa.Column("player_username", sa.String(length=255), nullable=False),
        sa.Column("player_color", sa.String(length=5), nullable=False),
        sa.Column("result", sa.String(length=16), nullable=True),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["analysis_job_id"],
            ["module07_analysis_jobs.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["owner_user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "owner_user_id",
            "content_game_id",
            name="uq_module07_games_owner_content_id",
        ),
    )
    op.create_index(
        op.f("ix_module07_games_analysis_job_id"),
        "module07_games",
        ["analysis_job_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_module07_games_content_game_id"),
        "module07_games",
        ["content_game_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_module07_games_owner_user_id"),
        "module07_games",
        ["owner_user_id"],
        unique=False,
    )

    op.create_table(
        "module07_decision_points",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("game_id", sa.String(length=36), nullable=False),
        sa.Column("ply", sa.Integer(), nullable=False),
        sa.Column("fen_before", sa.String(length=120), nullable=False),
        sa.Column("criticality", sa.Float(), nullable=True),
        sa.Column("review_pack", sa.JSON(), nullable=False),
        sa.Column("mental_model", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["game_id"], ["module07_games.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("game_id", "ply", name="uq_module07_decision_game_ply"),
    )
    op.create_index(
        op.f("ix_module07_decision_points_game_id"),
        "module07_decision_points",
        ["game_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_module07_decision_points_game_id"),
        table_name="module07_decision_points",
    )
    op.drop_table("module07_decision_points")
    op.drop_index(op.f("ix_module07_games_owner_user_id"), table_name="module07_games")
    op.drop_index(
        op.f("ix_module07_games_content_game_id"), table_name="module07_games"
    )
    op.drop_index(
        op.f("ix_module07_games_analysis_job_id"), table_name="module07_games"
    )
    op.drop_table("module07_games")
    op.drop_index(
        op.f("ix_module07_analysis_jobs_status"), table_name="module07_analysis_jobs"
    )
    op.drop_index(
        op.f("ix_module07_analysis_jobs_owner_user_id"),
        table_name="module07_analysis_jobs",
    )
    op.drop_table("module07_analysis_jobs")
