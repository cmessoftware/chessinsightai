"""Coach bulk import from Lichess export API (NDJSON → module07 ingest)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from chess_statistics.client import LichessClient, LichessClientError
from chess_statistics.game_id import lichess_id_from_ndjson
from modules.module07.ingest import ParsedModule07Game, parse_games_from_pgn_text

LICHESS_PERF_TYPES: tuple[str, ...] = (
    "ultraBullet",
    "bullet",
    "blitz",
    "rapid",
    "classical",
    "correspondence",
)

DEFAULT_BATCH_SIZE = 200

_HEADER_PLAYER = re.compile(
    r"^(\[(White|Black)\s+\"([^\"]*)\"\])",
    re.MULTILINE,
)


def effective_player_alias(
    lichess_username: str,
    player_alias: str | None,
    *,
    reject_usernames: tuple[str, ...] = (),
) -> str | None:
    """POV alias only when explicit and distinct from Lichess handle and app login."""
    lichess = (lichess_username or "").strip()
    alias = (player_alias or "").strip()
    if not alias:
        return None
    if lichess and alias.casefold() == lichess.casefold():
        return None
    for rejected in reject_usernames:
        bad = (rejected or "").strip()
        if bad and alias.casefold() == bad.casefold():
            return None
    return alias


def replace_lichess_username_in_pgn(pgn: str, lichess_username: str, alias: str) -> str:
    """Replace the Lichess handle in White/Black headers only (rivals unchanged)."""
    source = (lichess_username or "").strip()
    target = (alias or "").strip()
    if not source or not target or source.casefold() == target.casefold():
        return pgn

    def repl(match: re.Match[str]) -> str:
        full, side, name = match.group(1), match.group(2), match.group(3)
        if name.strip().casefold() == source.casefold():
            return f'[{side} "{target}"]'
        return full

    return _HEADER_PLAYER.sub(repl, pgn)


def _speed_from_ndjson(game: dict[str, Any]) -> str:
    return str(game.get("speed") or game.get("perf") or "unknown").strip() or "unknown"


@dataclass(frozen=True)
class LichessImportCursor:
    perf_index: int = 0
    completed: bool = False

    def to_json(self) -> dict[str, Any]:
        return {"perf_index": self.perf_index, "completed": self.completed}

    @classmethod
    def from_json(cls, raw: dict[str, Any] | None) -> LichessImportCursor:
        if not raw:
            return cls()
        idx = int(raw.get("perf_index") or 0)
        return cls(
            perf_index=max(0, idx),
            completed=bool(raw.get("completed")),
        )


@dataclass(frozen=True)
class LichessBatchResult:
    parsed_games: tuple[ParsedModule07Game, ...]
    provenance: tuple[dict[str, Any], ...]
    perf_type: str | None
    fetched_from_lichess: int
    cursor: LichessImportCursor
    errors: tuple[str, ...]


def fetch_lichess_batch(
    *,
    lichess_username: str,
    since: str | None,
    until: str | None,
    perf_types: list[str] | None,
    batch_size: int,
    cursor: LichessImportCursor | None,
    api_token: str | None,
    player_alias: str | None,
    app_login_username: str | None = None,
) -> LichessBatchResult:
    """Download up to ``batch_size`` games for the current perf slice."""
    name = (lichess_username or "").strip()
    if not name:
        raise ValueError("lichess_username is required")
    if batch_size < 1 or batch_size > 500:
        raise ValueError("batch_size must be between 1 and 500")

    perf_list = [p for p in (perf_types or list(LICHESS_PERF_TYPES)) if p]
    if not perf_list:
        perf_list = list(LICHESS_PERF_TYPES)

    state = cursor or LichessImportCursor()
    if state.completed or state.perf_index >= len(perf_list):
        return LichessBatchResult(
            parsed_games=(),
            provenance=(),
            perf_type=None,
            fetched_from_lichess=0,
            cursor=LichessImportCursor(perf_index=len(perf_list), completed=True),
            errors=(),
        )

    perf = perf_list[state.perf_index]
    alias = effective_player_alias(
        name,
        player_alias,
        reject_usernames=(app_login_username or "",),
    )
    client = LichessClient(token=(api_token or "").strip() or None)

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
            clocks=True,
            evals=False,
            opening=True,
        ):
            pgn = str(game.get("pgn") or "").strip()
            if not pgn:
                errors.append("skipped game without PGN")
                continue
            lichess_id = lichess_id_from_ndjson(game)
            if alias:
                pgn = replace_lichess_username_in_pgn(pgn, name, alias)
            pgns.append(pgn)
            provenance.append(
                {
                    "lichess_id": lichess_id,
                    "lichess_username_original": name,
                    "player_alias": alias,
                    "perf_type": perf,
                    "speed_class": _speed_from_ndjson(game),
                }
            )
    except LichessClientError as exc:
        raise ValueError(f"Lichess API: {exc}") from exc

    if not pgns:
        next_index = state.perf_index + 1
        next_cursor = LichessImportCursor(
            perf_index=next_index,
            completed=next_index >= len(perf_list),
        )
        return LichessBatchResult(
            parsed_games=(),
            provenance=(),
            perf_type=perf,
            fetched_from_lichess=0,
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
    next_cursor = LichessImportCursor(
        perf_index=next_index,
        completed=next_index >= len(perf_list),
    )
    return LichessBatchResult(
        parsed_games=tuple(parsed),
        provenance=tuple(provenance),
        perf_type=perf,
        fetched_from_lichess=len(pgns),
        cursor=next_cursor,
        errors=tuple(errors),
    )
