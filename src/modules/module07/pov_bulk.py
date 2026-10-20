"""FEAT-029 — bulk POV alias across Coach library (with rollback snapshot)."""

from __future__ import annotations

import io
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import chess.pgn
from sqlalchemy.orm import Session

from models.module07_models import CoachGame
from modules.module07.ingest import normalize_header_player, resolve_player_color
from modules.module07.lichess_coach_import import replace_lichess_username_in_pgn
from modules.module07.repository import _clear_client_analysis, list_games


def _players_from_pgn(pgn: str) -> tuple[str, str]:
    game = chess.pgn.read_game(io.StringIO(pgn or ""))
    if game is None:
        return "", ""
    headers = game.headers
    white = normalize_header_player(headers.get("White"), side_label="Blancas")
    black = normalize_header_player(headers.get("Black"), side_label="Negras")
    return white, black


def _name_in_game(white: str, black: str, name: str) -> bool:
    key = (name or "").strip().casefold()
    if not key:
        return False
    return key in (
        (white or "").strip().casefold(),
        (black or "").strip().casefold(),
    )


def _merge_provenance(game: CoachGame) -> dict[str, Any]:
    raw = game.import_provenance
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return dict(raw)
    return {}


@dataclass(frozen=True)
class BulkPovResult:
    updated: int
    skipped: int
    rollback_available: int


def bulk_pov_status(db: Session, owner_user_id: int) -> dict[str, Any]:
    games = list_games(db, owner_user_id)
    rollback_count = 0
    last_apply: dict[str, Any] | None = None
    for game in games:
        prov = _merge_provenance(game)
        if prov.get("pov_bulk_rollback"):
            rollback_count += 1
        snap = prov.get("pov_bulk_last")
        if isinstance(snap, dict) and snap.get("applied_at"):
            if last_apply is None or snap["applied_at"] > last_apply.get("applied_at", ""):
                last_apply = snap
    return {
        "rollback_available_count": rollback_count,
        "last_apply": last_apply,
    }


def apply_bulk_pov(
    db: Session,
    *,
    owner_user_id: int,
    source_username: str,
    target_username: str,
) -> BulkPovResult:
    source = (source_username or "").strip()
    target = (target_username or "").strip()
    if not source or not target:
        raise ValueError("source_username and target_username are required")
    if source.casefold() == target.casefold():
        raise ValueError("source and target must differ")

    updated = 0
    skipped = 0
    now = datetime.now(timezone.utc).isoformat()

    for game in list_games(db, owner_user_id):
        master = game.master_game
        pgn = (master.pgn if master else None) or game.pgn
        if not pgn or master is None:
            skipped += 1
            continue
        white, black = _players_from_pgn(pgn)
        if not _name_in_game(white, black, source):
            skipped += 1
            continue

        new_pgn = replace_lichess_username_in_pgn(pgn, source, target)
        if new_pgn == pgn:
            skipped += 1
            continue

        prov = _merge_provenance(game)
        if "pov_bulk_rollback" not in prov:
            prov["pov_bulk_rollback"] = {
                "pgn": pgn,
                "white_player": white,
                "black_player": black,
                "player_username": game.player_username,
                "player_color": game.player_color,
            }

        new_white, new_black = _players_from_pgn(new_pgn)
        master.pgn = new_pgn
        master.white_player = new_white
        master.black_player = new_black

        pov = (game.player_username or "").strip()
        if pov and pov.casefold() == source.casefold():
            game.player_username = target
            game.player_color = resolve_player_color(new_white, new_black, target)
        elif pov:
            try:
                game.player_color = resolve_player_color(new_white, new_black, pov)
            except ValueError:
                game.player_color = None

        prov["pov_bulk_last"] = {
            "source": source,
            "target": target,
            "applied_at": now,
        }
        game.import_provenance = prov
        _clear_client_analysis(db, game)
        updated += 1

    if updated:
        db.commit()
    status = bulk_pov_status(db, owner_user_id)
    return BulkPovResult(
        updated=updated,
        skipped=skipped,
        rollback_available=status["rollback_available_count"],
    )


def rollback_bulk_pov(db: Session, *, owner_user_id: int) -> BulkPovResult:
    restored = 0
    skipped = 0

    for game in list_games(db, owner_user_id):
        prov = _merge_provenance(game)
        snap = prov.get("pov_bulk_rollback")
        if not isinstance(snap, dict):
            skipped += 1
            continue
        master = game.master_game
        if master is None:
            skipped += 1
            continue

        pgn = str(snap.get("pgn") or "")
        if not pgn:
            skipped += 1
            continue

        master.pgn = pgn
        master.white_player = str(snap.get("white_player") or "")
        master.black_player = str(snap.get("black_player") or "")
        game.player_username = snap.get("player_username")
        game.player_color = snap.get("player_color")

        prov.pop("pov_bulk_rollback", None)
        prov.pop("pov_bulk_last", None)
        game.import_provenance = prov or None
        _clear_client_analysis(db, game)
        restored += 1

    if restored:
        db.commit()
    status = bulk_pov_status(db, owner_user_id)
    return BulkPovResult(
        updated=restored,
        skipped=skipped,
        rollback_available=status["rollback_available_count"],
    )
