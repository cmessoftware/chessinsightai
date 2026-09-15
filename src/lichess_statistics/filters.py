"""LS01-002 — skip Lichess AI engines and games shorter than 10 plies."""

from __future__ import annotations

import io
from dataclasses import dataclass
from typing import Any, Iterable, Iterator

import chess.pgn

MIN_TOTAL_MOVES = 10
REASON_LICHESS_AI = "lichess_ai"
REASON_TOO_SHORT = "too_short"


@dataclass(frozen=True)
class ImportFilterResult:
    keep: bool
    reason: str
    move_count: int


def total_move_count(game: dict[str, Any]) -> int:
    """Ply count (SAN tokens in ``moves``, else mainline of ``pgn``)."""
    moves = str(game.get("moves") or "").strip()
    if moves:
        return len(moves.split())
    pgn_text = str(game.get("pgn") or "").strip()
    if not pgn_text:
        return 0
    parsed = chess.pgn.read_game(io.StringIO(pgn_text))
    if parsed is None:
        return 0
    return sum(1 for _ in parsed.mainline_moves())


def is_lichess_ai_game(game: dict[str, Any]) -> bool:
    """True if White or Black is a Lichess built-in AI (not a titled BOT account)."""
    players = game.get("players") or {}
    if not isinstance(players, dict):
        return False
    for side in ("white", "black"):
        player = players.get(side) or {}
        if not isinstance(player, dict):
            continue
        if player.get("aiLevel") is not None:
            return True
        user = player.get("user") or {}
        if not isinstance(user, dict):
            continue
        name = str(user.get("name") or "")
        if name.lower().startswith("lichess ai"):
            return True
    return False


def filter_import_game(game: dict[str, Any]) -> ImportFilterResult:
    """Decide whether an NDJSON game enters the statistics pipeline."""
    moves = total_move_count(game)
    if is_lichess_ai_game(game):
        return ImportFilterResult(keep=False, reason=REASON_LICHESS_AI, move_count=moves)
    if moves < MIN_TOTAL_MOVES:
        return ImportFilterResult(keep=False, reason=REASON_TOO_SHORT, move_count=moves)
    return ImportFilterResult(keep=True, reason="", move_count=moves)


def iter_importable_games(
    games: Iterable[dict[str, Any]],
) -> Iterator[tuple[dict[str, Any], ImportFilterResult]]:
    """Yield ``(game, decision)`` for every input; caller logs skips."""
    for game in games:
        yield game, filter_import_game(game)
