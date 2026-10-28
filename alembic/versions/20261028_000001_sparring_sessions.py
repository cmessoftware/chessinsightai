"""SPAR-02: sparring session, move, and model prediction tables

Revision ID: 20261028_000001
Revises: 20261019_000001
Create Date: 2026-10-28
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261028_000001"
down_revision: Union[str, None] = "20261019_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sparring_sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("initial_fen", sa.String(length=120), nullable=False),
        sa.Column("prior_moves", sa.JSON(), nullable=False),
        sa.Column("history_complete", sa.Boolean(), nullable=False),
        sa.Column("human_color", sa.String(length=5), nullable=False),
        sa.Column("mode", sa.String(length=32), nullable=False),
        sa.Column("time_control", sa.JSON(), nullable=True),
        sa.Column("model_config_snapshot", sa.JSON(), nullable=False),
        sa.Column("plan_version_id", sa.String(length=36), nullable=True),
        sa.Column("exercise_version_id", sa.String(length=36), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("result", sa.String(length=16), nullable=True),
        sa.Column("termination_reason", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_sparring_sessions_owner_user_id"),
        "sparring_sessions",
        ["owner_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_sparring_sessions_status"),
        "sparring_sessions",
        ["status"],
        unique=False,
    )

    op.create_table(
        "sparring_model_predictions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("session_id", sa.String(length=36), nullable=False),
        sa.Column("model_name", sa.String(length=64), nullable=False),
        sa.Column("model_version", sa.String(length=64), nullable=True),
        sa.Column("rating_inputs", sa.JSON(), nullable=False),
        sa.Column("policy", sa.JSON(), nullable=True),
        sa.Column("policy_coverage", sa.Float(), nullable=True),
        sa.Column("sampling", sa.JSON(), nullable=True),
        sa.Column("chosen_move", sa.String(length=12), nullable=False),
        sa.Column("latency_ms", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(
            ["session_id"], ["sparring_sessions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_sparring_model_predictions_session_id"),
        "sparring_model_predictions",
        ["session_id"],
        unique=False,
    )

    op.create_table(
        "sparring_moves",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("session_id", sa.String(length=36), nullable=False),
        sa.Column("ply", sa.Integer(), nullable=False),
        sa.Column("uci", sa.String(length=12), nullable=False),
        sa.Column("actor", sa.String(length=16), nullable=False),
        sa.Column("resulting_fen", sa.String(length=120), nullable=False),
        sa.Column("elapsed_ms", sa.Integer(), nullable=True),
        sa.Column("clock_state", sa.JSON(), nullable=True),
        sa.Column("request_id", sa.String(length=64), nullable=True),
        sa.Column("prediction_id", sa.String(length=36), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["prediction_id"],
            ["sparring_model_predictions.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["session_id"], ["sparring_sessions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", "ply", name="uq_sparring_moves_session_ply"),
    )
    op.create_index(
        op.f("ix_sparring_moves_session_id"),
        "sparring_moves",
        ["session_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_sparring_moves_request_id"),
        "sparring_moves",
        ["request_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_sparring_moves_prediction_id"),
        "sparring_moves",
        ["prediction_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_sparring_moves_prediction_id"), table_name="sparring_moves")
    op.drop_index(op.f("ix_sparring_moves_request_id"), table_name="sparring_moves")
    op.drop_index(op.f("ix_sparring_moves_session_id"), table_name="sparring_moves")
    op.drop_table("sparring_moves")
    op.drop_index(
        op.f("ix_sparring_model_predictions_session_id"),
        table_name="sparring_model_predictions",
    )
    op.drop_table("sparring_model_predictions")
    op.drop_index(op.f("ix_sparring_sessions_status"), table_name="sparring_sessions")
    op.drop_index(
        op.f("ix_sparring_sessions_owner_user_id"), table_name="sparring_sessions"
    )
    op.drop_table("sparring_sessions")
