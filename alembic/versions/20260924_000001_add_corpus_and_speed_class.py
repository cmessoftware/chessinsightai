"""add corpus_type and speed_class to games and module07_games

Revision ID: 20260924_000001
Revises: 20260923_000001
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260924_000001"
down_revision: Union[str, None] = "20260923_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "games",
        sa.Column(
            "corpus_type",
            sa.String(length=32),
            nullable=False,
            server_default="personal",
        ),
    )
    op.add_column(
        "games",
        sa.Column(
            "speed_class",
            sa.String(length=32),
            nullable=False,
            server_default="unknown",
        ),
    )
    op.create_index("ix_games_corpus_type", "games", ["corpus_type"], unique=False)
    op.create_index("ix_games_speed_class", "games", ["speed_class"], unique=False)

    op.add_column(
        "module07_games",
        sa.Column(
            "corpus_type",
            sa.String(length=32),
            nullable=False,
            server_default="personal",
        ),
    )
    op.add_column(
        "module07_games",
        sa.Column(
            "speed_class",
            sa.String(length=32),
            nullable=False,
            server_default="unknown",
        ),
    )
    op.create_index(
        "ix_module07_games_corpus_type", "module07_games", ["corpus_type"], unique=False
    )
    op.create_index(
        "ix_module07_games_speed_class", "module07_games", ["speed_class"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_module07_games_speed_class", table_name="module07_games")
    op.drop_index("ix_module07_games_corpus_type", table_name="module07_games")
    op.drop_column("module07_games", "speed_class")
    op.drop_column("module07_games", "corpus_type")
    op.drop_index("ix_games_speed_class", table_name="games")
    op.drop_index("ix_games_corpus_type", table_name="games")
    op.drop_column("games", "speed_class")
    op.drop_column("games", "corpus_type")
