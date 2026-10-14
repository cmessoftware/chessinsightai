"""GC-3: biblioteca Coach (``coach_games``) ↔ catálogo maestro ``games``."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from modules.game_import.master_games import upsert_master_game_from_coach_item


def sync_coach_library_to_master_games(
    db: Session,
    *,
    owner_user_id: int | None = None,
) -> int:
    """
    Refresca filas ``games`` desde la biblioteca Coach (PGN canónico en maestro).
    Idempotente; útil tras migraciones GC-2 o imports legacy sin upsert.
    """
    from models.database_models import User
    from models.module07_models import CoachGame

    q = (
        db.query(CoachGame, User.username)
        .join(User, User.id == CoachGame.owner_user_id)
    )
    if owner_user_id is not None:
        q = q.filter(CoachGame.owner_user_id == owner_user_id)

    count = 0
    for game, username in q.all():
        master = game.master_game
        if master is None or not (master.pgn or "").strip():
            continue
        item = SimpleNamespace(
            pgn=master.pgn,
            white_player=master.white_player,
            black_player=master.black_player,
            result=master.result,
            speed_class=game.speed_class,
        )
        upsert_master_game_from_coach_item(
            db,
            item,
            imported_by=username or "unknown",
            corpus_type=game.corpus_type or "personal",
        )
        count += 1
    if count:
        db.commit()
    return count


def coach_catalog_health(
    db: Session,
    *,
    owner_user_id: int | None = None,
) -> dict[str, Any]:
    """
    Métricas de integridad Coach ↔ ``games``.
    ``missing_master`` debería ser 0 (FK); ``empty_master_pgn`` requiere re-import PGN.
    """
    owner_clause = ""
    params: dict[str, Any] = {}
    if owner_user_id is not None:
        owner_clause = " AND c.owner_user_id = :owner"
        params["owner"] = owner_user_id

    coach_total = db.execute(
        text(f"SELECT COUNT(*) FROM coach_games c WHERE 1=1{owner_clause}"),
        params,
    ).scalar_one()

    missing_master = db.execute(
        text(
            f"""
            SELECT COUNT(*)
            FROM coach_games c
            LEFT JOIN games g ON g.game_id = c.master_game_id
            WHERE g.game_id IS NULL{owner_clause}
            """
        ),
        params,
    ).scalar_one()

    empty_master_pgn = db.execute(
        text(
            f"""
            SELECT COUNT(*)
            FROM coach_games c
            INNER JOIN games g ON g.game_id = c.master_game_id
            WHERE (g.pgn IS NULL OR btrim(g.pgn) = ''){owner_clause}
            """
        ),
        params,
    ).scalar_one()

    return {
        "coach_games": int(coach_total or 0),
        "missing_master": int(missing_master or 0),
        "empty_master_pgn": int(empty_master_pgn or 0),
        "reimport_hint": (
            "Coach → Importar PGN: volvé a pegar el PGN de la partida afectada."
            if empty_master_pgn or missing_master
            else None
        ),
    }


def remove_coach_games_with_missing_master(
    db: Session,
    *,
    owner_user_id: int | None = None,
) -> int:
    """
    Elimina filas Coach huérfanas (sin fila en ``games``).
    Normalmente 0 gracias a FK; limpia datos inconsistentes pre-GC-2.
    """
    owner_clause = ""
    params: dict[str, Any] = {}
    if owner_user_id is not None:
        owner_clause = " AND c.owner_user_id = :owner"
        params["owner"] = owner_user_id

    result = db.execute(
        text(
            f"""
            DELETE FROM coach_games c
            WHERE NOT EXISTS (
                SELECT 1 FROM games g WHERE g.game_id = c.master_game_id
            ){owner_clause}
            """
        ),
        params,
    )
    deleted = result.rowcount or 0
    if deleted:
        db.commit()
    return deleted


# GC-1 alias (nombre histórico pre-GC-3).
backfill_master_games_from_module07 = sync_coach_library_to_master_games
