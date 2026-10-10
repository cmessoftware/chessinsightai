"""Master catalog ``games`` upsert (GC-1: Coach import → source ANALYSIS)."""

from __future__ import annotations

import hashlib
import io
from datetime import datetime, timezone
from typing import Any

import chess.pgn
from sqlalchemy import text
from sqlalchemy.orm import Session

# Coach / análisis liviano — filtrable en Navegador de Partidas
SOURCE_ANALYSIS = "ANALYSIS"

_UPSERT_GAMES = text(
    """
    INSERT INTO games (
        game_id, pgn, source, white_player, black_player, white_elo, black_elo,
        result, eco, opening, date_played, time_control, imported_by,
        corpus_type, speed_class, created_at
    ) VALUES (
        :game_id, :pgn, :source, :white_player, :black_player, :white_elo, :black_elo,
        :result, :eco, :opening, :date_played, :time_control, :imported_by,
        :corpus_type, :speed_class, :created_at
    )
    ON CONFLICT (game_id) DO UPDATE SET
        pgn = EXCLUDED.pgn,
        white_player = EXCLUDED.white_player,
        black_player = EXCLUDED.black_player,
        white_elo = EXCLUDED.white_elo,
        black_elo = EXCLUDED.black_elo,
        result = EXCLUDED.result,
        eco = EXCLUDED.eco,
        opening = EXCLUDED.opening,
        date_played = EXCLUDED.date_played,
        time_control = EXCLUDED.time_control,
        speed_class = EXCLUDED.speed_class,
        source = CASE
            WHEN games.source IS NULL OR btrim(games.source) = '' OR games.source = 'ANALYSIS'
            THEN EXCLUDED.source
            ELSE games.source
        END,
        imported_by = CASE
            WHEN games.source IS NULL OR btrim(games.source) = '' OR games.source = 'ANALYSIS'
            THEN EXCLUDED.imported_by
            ELSE games.imported_by
        END,
        corpus_type = CASE
            WHEN games.source IS NULL OR btrim(games.source) = '' OR games.source = 'ANALYSIS'
            THEN EXCLUDED.corpus_type
            ELSE games.corpus_type
        END
    """
)


def master_game_id_from_pgn(pgn_text: str) -> str:
    """Stable id aligned with legacy ``get_game_id`` / module07 ``content_game_id`` (SHA-256)."""
    game = chess.pgn.read_game(io.StringIO(pgn_text or ""))
    if game is None:
        return hashlib.sha256((pgn_text or "").encode("utf-8")).hexdigest()
    exporter = chess.pgn.StringExporter(headers=True, variations=False, comments=False)
    canonical = game.accept(exporter)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _header_fields(pgn_text: str) -> dict[str, str | None]:
    game = chess.pgn.read_game(io.StringIO(pgn_text or ""))
    if game is None:
        return {}
    h = game.headers
    return {
        "white_elo": (h.get("WhiteElo") or "").strip() or None,
        "black_elo": (h.get("BlackElo") or "").strip() or None,
        "eco": (h.get("ECO") or "").strip() or None,
        "opening": (h.get("Opening") or "").strip() or None,
        "date_played": (h.get("Date") or "").strip() or None,
        "time_control": (h.get("TimeControl") or "").strip() or None,
    }


def upsert_master_game_from_coach_item(
    db: Session,
    item: Any,
    *,
    imported_by: str,
    corpus_type: str,
) -> tuple[str, bool]:
    """
    Upsert one row in ``games`` for a parsed Coach ingest item.
    Returns (master_game_id, is_new_master_row).
    """
    game_id = master_game_id_from_pgn(item.pgn)
    headers = _header_fields(item.pgn)
    speed = getattr(item, "speed_class", None) or "unknown"
    imported = (imported_by or "").strip() or "unknown"

    existed = db.execute(
        text("SELECT 1 FROM games WHERE game_id = :gid"),
        {"gid": game_id},
    ).first()

    now = datetime.now(timezone.utc).isoformat()
    params = {
        "game_id": game_id,
        "pgn": item.pgn,
        "source": SOURCE_ANALYSIS,
        "white_player": item.white_player,
        "black_player": item.black_player,
        "white_elo": headers.get("white_elo"),
        "black_elo": headers.get("black_elo"),
        "result": item.result,
        "eco": headers.get("eco"),
        "opening": headers.get("opening"),
        "date_played": headers.get("date_played"),
        "time_control": headers.get("time_control"),
        "imported_by": imported,
        "corpus_type": corpus_type,
        "speed_class": speed,
        "created_at": now,
    }
    db.execute(_UPSERT_GAMES, params)
    return game_id, existed is None


def coach_master_game_ids_for_catalog(
    db: Session,
    *,
    owner_user_id: int | None = None,
) -> list[str]:
    """Master ``game_id`` values for partidas present in la biblioteca Coach."""
    from models.module07_models import CoachGame

    q = db.query(CoachGame.master_game_id)
    if owner_user_id is not None:
        q = q.filter(CoachGame.owner_user_id == owner_user_id)
    return [gid for (gid,) in q.distinct().all() if gid]


def repair_gc1_md5_analysis_duplicates(db: Session) -> int:
    """
    Elimina filas duplicadas del bug GC-1 (``game_id`` MD5 de 32 chars + source ANALYSIS).
    Idempotente; no toca filas sha256 del catálogo legacy.
    """
    result = db.execute(
        text(
            """
            DELETE FROM games
            WHERE source = :src AND char_length(game_id) = 32
            """
        ),
        {"src": SOURCE_ANALYSIS},
    )
    deleted = result.rowcount or 0
    if deleted:
        db.commit()
    return deleted
