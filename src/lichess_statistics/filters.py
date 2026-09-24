"""LS01-002 — skip Lichess AI engines and games shorter than 10 plies."""

from __future__ import annotations

import io
from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Any, Iterable, Iterator

import chess.pgn

MIN_TOTAL_MOVES = 10
REASON_LICHESS_AI = "lichess_ai"
REASON_TOO_SHORT = "too_short"
REASON_NOT_LICHESS = "not_lichess"
REASON_PGN_ERRORS = "pgn_errors"
REASON_UNFINISHED = "unfinished"
REASON_INVALID_RESULT = "invalid_result"
REASON_INCOMPLETE_HEADERS = "incomplete_headers"
REASON_OUTSIDE_WINDOW = "outside_window"
REASON_PERF_TYPE = "perf_type"
SKIP_KEY = "_skip"

_FINISHED_RESULTS = {"1-0", "0-1", "1/2-1/2", "½-½"}
_UNFINISHED_STATUS = {"unfinished", "started", "aborted", "nostart"}


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


def _fecha_iso(game: dict[str, Any]) -> str | None:
    raw = game.get("createdAt")
    if isinstance(raw, bool) or raw is None:
        return None
    try:
        ms = int(raw)
    except (TypeError, ValueError):
        return None
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d")


def result_skip_reason(game: dict[str, Any]) -> str | None:
    """Skip unfinished / invalid results; Lichess NDJSON draws stay importable."""
    marked = game.get(SKIP_KEY)
    if marked:
        return str(marked)
    pgn_result = game.get("pgnResult")
    if pgn_result is not None:
        text = str(pgn_result).strip()
        if text in _FINISHED_RESULTS:
            return None
        if text in {"*", ""}:
            return REASON_UNFINISHED
        return REASON_INVALID_RESULT
    status = str(game.get("status") or "").lower()
    if status in _UNFINISHED_STATUS:
        return REASON_UNFINISHED
    return None


def filter_sync_window(
    game: dict[str, Any],
    *,
    since: str | None = None,
    until: str | None = None,
    perf_type: str | None = None,
) -> ImportFilterResult | None:
    """Return a skip result when local/API games fall outside CLI window filters."""
    if perf_type:
        wanted = perf_type.strip().lower()
        actual = str(game.get("perf") or game.get("speed") or "").strip().lower()
        if actual != wanted:
            return ImportFilterResult(keep=False, reason=REASON_PERF_TYPE, move_count=total_move_count(game))
    if since or until:
        fecha = _fecha_iso(game)
        if fecha is None or (since and fecha < since) or (until and fecha > until):
            return ImportFilterResult(
                keep=False,
                reason=REASON_OUTSIDE_WINDOW,
                move_count=total_move_count(game),
            )
    return None


def filter_import_game(game: dict[str, Any]) -> ImportFilterResult:
    """Decide whether an NDJSON game enters the statistics pipeline."""
    moves = total_move_count(game)
    skip = result_skip_reason(game)
    if skip:
        return ImportFilterResult(keep=False, reason=skip, move_count=moves)
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
