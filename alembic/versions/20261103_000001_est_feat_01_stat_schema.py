"""EST-FEAT-01: coach chess_statistics tables in Postgres.

Revision ID: 20261103_000001
Revises: 20261101_000001
Create Date: 2026-11-03

One summary row per coach game. Ply rows keep the judgment detail.
The PGN stays on ``games``.
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261103_000001"
down_revision: Union[str, None] = "20261101_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "coach_game_statistics",
        sa.Column("coach_game_id", sa.String(length=36), nullable=False),
        sa.Column("master_game_id", sa.String(), nullable=False),
        sa.Column("player_username", sa.String(length=255), nullable=True),
        sa.Column("player_color", sa.String(length=5), nullable=True),
        sa.Column("opponent", sa.String(length=255), nullable=True),
        sa.Column("speed_class", sa.String(length=32), nullable=True),
        sa.Column("initial_rating", sa.Integer(), nullable=True),
        sa.Column("rating_change", sa.Integer(), nullable=True),
        sa.Column("final_rating", sa.Integer(), nullable=True),
        sa.Column("inaccuracies", sa.Integer(), nullable=True),
        sa.Column("mistakes", sa.Integer(), nullable=True),
        sa.Column("blunders", sa.Integer(), nullable=True),
        sa.Column("average_cp_loss", sa.Float(), nullable=True),
        sa.Column("accuracy", sa.Float(), nullable=True),
        sa.Column("opening_accuracy", sa.Float(), nullable=True),
        sa.Column("middlegame_accuracy", sa.Float(), nullable=True),
        sa.Column("endgame_accuracy", sa.Float(), nullable=True),
        sa.Column("evaluation_source", sa.String(length=64), nullable=True),
        sa.Column("stockfish_version", sa.String(length=64), nullable=True),
        sa.Column("stockfish_depth", sa.Integer(), nullable=True),
        sa.Column("analyzed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["coach_game_id"],
            ["coach_games.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["master_game_id"],
            ["games.game_id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("coach_game_id"),
    )
    op.create_index(
        "ix_coach_game_statistics_master_game_id",
        "coach_game_statistics",
        ["master_game_id"],
        unique=False,
    )
    op.create_table(
        "coach_game_statistic_evals",
        sa.Column("coach_game_id", sa.String(length=36), nullable=False),
        sa.Column("ply", sa.Integer(), nullable=False),
        sa.Column("fen", sa.String(length=120), nullable=True),
        sa.Column("move_uci", sa.String(length=16), nullable=True),
        sa.Column("move_san", sa.String(length=32), nullable=True),
        sa.Column("evaluation_before_cp", sa.Integer(), nullable=True),
        sa.Column("evaluation_after_cp", sa.Integer(), nullable=True),
        sa.Column("best_move", sa.String(length=16), nullable=True),
        sa.Column("cp_loss", sa.Integer(), nullable=True),
        sa.Column("win_probability_before", sa.Float(), nullable=True),
        sa.Column("win_probability_after", sa.Float(), nullable=True),
        sa.Column("move_accuracy", sa.Float(), nullable=True),
        sa.Column("judgment", sa.String(length=32), nullable=True),
        sa.Column("phase", sa.String(length=32), nullable=True),
        sa.Column("played_by", sa.String(length=5), nullable=True),
        sa.CheckConstraint(
            "played_by IS NULL OR played_by IN ('white', 'black')",
            name="ck_coach_game_statistic_evals_played_by",
        ),
        sa.ForeignKeyConstraint(
            ["coach_game_id"],
            ["coach_games.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("coach_game_id", "ply"),
    )


def downgrade() -> None:
    op.drop_table("coach_game_statistic_evals")
    op.drop_index(
        "ix_coach_game_statistics_master_game_id",
        table_name="coach_game_statistics",
    )
    op.drop_table("coach_game_statistics")
