"""Coach bulk import from Chess.com public archives API."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from chess_statistics.chesscom_client import ChessComClient, ChessComClientError
from modules.module07.ingest import ParsedModule07Game, parse_games_from_pgn_text
from modules.module07.lichess_coach_import import (
    DEFAULT_BATCH_SIZE,
    LichessImportCursor,
    replace_lichess_username_in_pgn,
)

CHESSCOM_PERF_TYPES: tuple[str, ...] = (
    "bullet",
    "blitz",
    "rapid",
    "daily",
)

ChessComImportCursor = LichessImportCursor


def _speed_from_ndjson(game: dict[str, Any]) -> str:
    return str(game.get("speed") or game.get("perf") or "unknown").strip() or "unknown"


@dataclass(frozen=True)
class ChessComBatchResult:
    parsed_games: tuple[ParsedModule07Game, ...]
    provenance: tuple[dict[str, Any], ...]
    perf_type: str | None
    fetched_from_chesscom: int
    cursor: ChessComImportCursor
    errors: tuple[str, ...]


def fetch_chesscom_batch(
    *,
    chesscom_username: str,
    since: str | None,
    until: str | None,
    perf_types: list[str] | None,
    batch_size: int,
    cursor: ChessComImportCursor | None,
    player_alias: str | None,
) -> ChessComBatchResult:
    """Download up to ``batch_size`` games for the current time-class slice."""
    name = (chesscom_username or "").strip()
    if not name:
        raise ValueError("chesscom_username is required")
    if batch_size < 1 or batch_size > 500:
        raise ValueError("batch_size must be between 1 and 500")

    perf_list = [p for p in (perf_types or list(CHESSCOM_PERF_TYPES)) if p]
    if not perf_list:
        perf_list = list(CHESSCOM_PERF_TYPES)

    state = cursor or ChessComImportCursor()
    if state.completed or state.perf_index >= len(perf_list):
        return ChessComBatchResult(
            parsed_games=(),
            provenance=(),
            perf_type=None,
            fetched_from_chesscom=0,
            cursor=ChessComImportCursor(perf_index=len(perf_list), completed=True),
            errors=(),
        )

    perf = perf_list[state.perf_index]
    alias = (player_alias or "").strip() or None
    client = ChessComClient()

    pgns: list[str] = []
    provenance: list[dict[str, Any]] = []
    errors: list[str] = []

    try:
        for game in client.iter_user_games(
            name,
            since=since,
            until=until,
            perf_type=perf,
            max_games=batch_size,
        ):
            pgn = str(game.get("pgn") or "").strip()
            if not pgn:
                errors.append("skipped game without PGN")
                continue
            chesscom_id = game.get("external_game_id") or game.get("id")
            if alias:
                pgn = replace_lichess_username_in_pgn(pgn, name, alias)
            pgns.append(pgn)
            provenance.append(
                {
                    "chesscom_id": chesscom_id,
                    "chesscom_username_original": name,
                    "player_alias": alias,
                    "perf_type": perf,
                    "speed_class": _speed_from_ndjson(game),
                }
            )
    except ChessComClientError as exc:
        raise ValueError(f"Chess.com API: {exc}") from exc

    if not pgns:
        next_index = state.perf_index + 1
        next_cursor = ChessComImportCursor(
            perf_index=next_index,
            completed=next_index >= len(perf_list),
        )
        return ChessComBatchResult(
            parsed_games=(),
            provenance=(),
            perf_type=perf,
            fetched_from_chesscom=0,
            cursor=next_cursor,
            errors=tuple(errors),
        )

    combined = "\n\n".join(pgns)
    pov = alias or name
    parse_result = parse_games_from_pgn_text(
        combined,
        player_username=pov,
        max_games=batch_size,
    )
    parsed = list(parse_result.games)
    if len(parsed) != len(provenance):
        provenance = provenance[: len(parsed)]

    next_index = state.perf_index + 1
    next_cursor = ChessComImportCursor(
        perf_index=next_index,
        completed=next_index >= len(perf_list),
    )
    return ChessComBatchResult(
        parsed_games=tuple(parsed),
        provenance=tuple(provenance),
        perf_type=perf,
        fetched_from_chesscom=len(pgns),
        cursor=next_cursor,
        errors=tuple(errors),
    )
