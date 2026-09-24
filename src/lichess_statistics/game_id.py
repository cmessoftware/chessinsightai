"""LS01-003 — project game_id (SHA256 of PGN), same as product ingest."""

from __future__ import annotations

import io
from dataclasses import dataclass
from typing import Any

import chess.pgn

from modules.pgn_utils import get_game_id as product_game_id


class GameIdError(ValueError):
    """PGN missing or not hashable."""


@dataclass(frozen=True)
class GameIdentity:
    game_id: str
    lichess_id: str | None


def game_id_from_pgn_text(pgn_text: str) -> str:
    """SHA256 of the PGN mainline with headers (same as ``pgn_utils.get_game_id``)."""
    text = (pgn_text or "").strip()
    if not text:
        raise GameIdError("PGN text is empty")
    parsed = chess.pgn.read_game(io.StringIO(text))
    if parsed is None:
        raise GameIdError("Could not parse PGN")
    game_id = product_game_id(parsed)
    if not game_id:
        raise GameIdError("Could not compute game_id")
    return game_id


def lichess_id_from_ndjson(game: dict[str, Any]) -> str | None:
    raw = game.get("id")
    if raw is None:
        return None
    text = str(raw).strip()
    return text or None


def identity_from_ndjson(game: dict[str, Any]) -> GameIdentity:
    """Primary key is project SHA256; Lichess ``id`` is metadata only."""
    pgn = str(game.get("pgn") or "")
    return GameIdentity(
        game_id=game_id_from_pgn_text(pgn),
        lichess_id=lichess_id_from_ndjson(game),
    )
