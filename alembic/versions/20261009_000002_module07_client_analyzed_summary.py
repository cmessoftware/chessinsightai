"""module07 games client analysis summary (list Partidas)

Revision ID: 20261009_000002
Revises: 20261009_000001
Create Date: 2026-10-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261009_000002"
down_revision: Union[str, None] = "20261009_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "module07_games",
        sa.Column("client_analyzed_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "module07_games",
        sa.Column(
            "client_analysis_ply_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "module07_games",
        sa.Column("client_main_line_signature", sa.String(length=512), nullable=True),
    )
    op.alter_column(
        "module07_games",
        "client_analysis_ply_count",
        server_default=None,
    )
    op.execute(
        """
        UPDATE module07_games AS g
        SET
            client_analysis_ply_count = sub.cnt,
            client_analyzed_at = sub.max_updated,
            client_main_line_signature = sub.sig
        FROM (
            SELECT
                game_id,
                COUNT(*) AS cnt,
                MAX(updated_at) AS max_updated,
                MAX(main_line_signature) AS sig
            FROM module07_ply_annotations
            GROUP BY game_id
        ) AS sub
        WHERE g.id = sub.game_id
        """
    )


def downgrade() -> None:
    op.drop_column("module07_games", "client_main_line_signature")
    op.drop_column("module07_games", "client_analysis_ply_count")
    op.drop_column("module07_games", "client_analyzed_at")
