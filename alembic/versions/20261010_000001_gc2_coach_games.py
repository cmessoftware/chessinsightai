"""GC-2: coach_games FK to games; retire module07_games

Revision ID: 20261010_000001
Revises: 20261009_000002
Create Date: 2026-10-10

"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
for path in (str(SRC), str(SRC / "api")):
    if path not in sys.path:
        sys.path.insert(0, path)

from modules.game_import.master_games import (  # noqa: E402
    upsert_master_game_from_coach_item,
    master_game_id_from_pgn,
)
from types import SimpleNamespace  # noqa: E402

revision: str = "20261010_000001"
down_revision: Union[str, None] = "20261009_000002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "coach_games",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("master_game_id", sa.String(), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("analysis_job_id", sa.String(length=36), nullable=True),
        sa.Column("content_game_id", sa.String(length=64), nullable=False),
        sa.Column("player_username", sa.String(length=255), nullable=True),
        sa.Column("player_color", sa.String(length=5), nullable=True),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("corpus_type", sa.String(length=32), nullable=False),
        sa.Column("speed_class", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "last_imported_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("client_analyzed_at", sa.DateTime(), nullable=True),
        sa.Column("client_analysis_ply_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("client_main_line_signature", sa.String(length=512), nullable=True),
        sa.ForeignKeyConstraint(
            ["master_game_id"], ["games.game_id"], ondelete="CASCADE"
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
            name="uq_coach_games_owner_content_id",
        ),
    )
    op.create_index(
        op.f("ix_coach_games_master_game_id"),
        "coach_games",
        ["master_game_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_coach_games_owner_user_id"),
        "coach_games",
        ["owner_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_coach_games_analysis_job_id"),
        "coach_games",
        ["analysis_job_id"],
        unique=False,
    )
    op.create_index(
        "ix_coach_games_corpus_type",
        "coach_games",
        ["corpus_type"],
        unique=False,
    )
    op.create_index(
        "ix_coach_games_speed_class",
        "coach_games",
        ["speed_class"],
        unique=False,
    )

    bind = op.get_bind()
    legacy = bind.execute(
        sa.text(
            """
            SELECT
                m.id, m.owner_user_id, m.analysis_job_id, m.content_game_id,
                m.pgn, m.white_player, m.black_player, m.player_username,
                m.player_color, m.result, m.source, m.corpus_type, m.speed_class,
                m.created_at, m.last_imported_at,
                m.client_analyzed_at, m.client_analysis_ply_count,
                m.client_main_line_signature,
                u.username AS imported_by
            FROM module07_games AS m
            JOIN users AS u ON u.id = m.owner_user_id
            """
        )
    ).mappings()

    session = sa.orm.Session(bind=bind)
    try:
        for row in legacy:
            item = SimpleNamespace(
                pgn=row["pgn"],
                white_player=row["white_player"],
                black_player=row["black_player"],
                result=row["result"],
                speed_class=row["speed_class"] or "unknown",
            )
            upsert_master_game_from_coach_item(
                session,
                item,
                imported_by=row["imported_by"] or "unknown",
                corpus_type=row["corpus_type"] or "personal",
            )
            master_id = master_game_id_from_pgn(row["pgn"])
            session.execute(
                sa.text(
                    """
                    INSERT INTO coach_games (
                        id, master_game_id, owner_user_id, analysis_job_id,
                        content_game_id, player_username, player_color, source,
                        corpus_type, speed_class, created_at, last_imported_at,
                        client_analyzed_at, client_analysis_ply_count,
                        client_main_line_signature
                    ) VALUES (
                        :id, :master_game_id, :owner_user_id, :analysis_job_id,
                        :content_game_id, :player_username, :player_color, :source,
                        :corpus_type, :speed_class, :created_at, :last_imported_at,
                        :client_analyzed_at, :client_analysis_ply_count,
                        :client_main_line_signature
                    )
                    """
                ),
                {
                    "id": row["id"],
                    "master_game_id": master_id,
                    "owner_user_id": row["owner_user_id"],
                    "analysis_job_id": row["analysis_job_id"],
                    "content_game_id": row["content_game_id"],
                    "player_username": row["player_username"],
                    "player_color": row["player_color"],
                    "source": row["source"],
                    "corpus_type": row["corpus_type"],
                    "speed_class": row["speed_class"],
                    "created_at": row["created_at"],
                    "last_imported_at": row["last_imported_at"],
                    "client_analyzed_at": row["client_analyzed_at"],
                    "client_analysis_ply_count": row["client_analysis_ply_count"] or 0,
                    "client_main_line_signature": row["client_main_line_signature"],
                },
            )
        session.commit()
    finally:
        session.close()

    op.drop_constraint(
        "module07_decision_points_game_id_fkey",
        "module07_decision_points",
        type_="foreignkey",
    )
    op.drop_constraint(
        "module07_ply_annotations_game_id_fkey",
        "module07_ply_annotations",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "module07_decision_points_coach_game_id_fkey",
        "module07_decision_points",
        "coach_games",
        ["game_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "module07_ply_annotations_coach_game_id_fkey",
        "module07_ply_annotations",
        "coach_games",
        ["game_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_index(op.f("ix_module07_games_analysis_job_id"), table_name="module07_games")
    op.drop_index(op.f("ix_module07_games_content_game_id"), table_name="module07_games")
    op.drop_index(op.f("ix_module07_games_owner_user_id"), table_name="module07_games")
    op.drop_index("ix_module07_games_corpus_type", table_name="module07_games")
    op.drop_index("ix_module07_games_speed_class", table_name="module07_games")
    op.drop_table("module07_games")


def downgrade() -> None:
    op.create_table(
        "module07_games",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("analysis_job_id", sa.String(length=36), nullable=True),
        sa.Column("content_game_id", sa.String(length=64), nullable=False),
        sa.Column("pgn", sa.Text(), nullable=False),
        sa.Column("white_player", sa.String(length=255), nullable=False),
        sa.Column("black_player", sa.String(length=255), nullable=False),
        sa.Column("player_username", sa.String(length=255), nullable=True),
        sa.Column("player_color", sa.String(length=5), nullable=True),
        sa.Column("result", sa.String(length=16), nullable=True),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("corpus_type", sa.String(length=32), nullable=False),
        sa.Column("speed_class", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "last_imported_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("client_analyzed_at", sa.DateTime(), nullable=True),
        sa.Column("client_analysis_ply_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("client_main_line_signature", sa.String(length=512), nullable=True),
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
    op.execute(
        """
        INSERT INTO module07_games (
            id, owner_user_id, analysis_job_id, content_game_id, pgn,
            white_player, black_player, player_username, player_color, result,
            source, corpus_type, speed_class, created_at, last_imported_at,
            client_analyzed_at, client_analysis_ply_count, client_main_line_signature
        )
        SELECT
            c.id, c.owner_user_id, c.analysis_job_id, c.content_game_id, g.pgn,
            g.white_player, g.black_player, c.player_username, c.player_color, g.result,
            c.source, c.corpus_type, c.speed_class, c.created_at, c.last_imported_at,
            c.client_analyzed_at, c.client_analysis_ply_count, c.client_main_line_signature
        FROM coach_games AS c
        JOIN games AS g ON g.game_id = c.master_game_id
        """
    )

    op.drop_constraint(
        "module07_ply_annotations_coach_game_id_fkey",
        "module07_ply_annotations",
        type_="foreignkey",
    )
    op.drop_constraint(
        "module07_decision_points_coach_game_id_fkey",
        "module07_decision_points",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "module07_ply_annotations_game_id_fkey",
        "module07_ply_annotations",
        "module07_games",
        ["game_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "module07_decision_points_game_id_fkey",
        "module07_decision_points",
        "module07_games",
        ["game_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_index("ix_coach_games_speed_class", table_name="coach_games")
    op.drop_index("ix_coach_games_corpus_type", table_name="coach_games")
    op.drop_index(op.f("ix_coach_games_analysis_job_id"), table_name="coach_games")
    op.drop_index(op.f("ix_coach_games_owner_user_id"), table_name="coach_games")
    op.drop_index(op.f("ix_coach_games_master_game_id"), table_name="coach_games")
    op.drop_table("coach_games")
