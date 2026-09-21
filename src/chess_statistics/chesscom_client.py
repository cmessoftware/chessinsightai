"""Chess.com public archives → NDJSON-shaped games (no Game Review evals)."""

from __future__ import annotations

import io
import logging
import re
from collections.abc import Iterator
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import chess.pgn
import requests

from chess_statistics.pgn_source import ndjson_from_pgn_game
from chess_statistics.sources import SOURCE_CHESSCOM, normalize_perf_type

logger = logging.getLogger(__name__)

ARCHIVES_URL = "https://api.chess.com/pub/player/{username}/games/archives"
USER_AGENT = (
    "ChessInsightAI-chess-statistics/0.1 "
    "(+https://github.com/cmessoftware/chessinsightai)"
)
_MONTH = re.compile(r"/games/(\d{4})/(\d{2})$")
_LIVE_ID = re.compile(r"/game/(?:live/)?(\d+)", re.I)


class ChessComClientError(RuntimeError):
    """HTTP error talking to Chess.com pub API."""


def _headers() -> dict[str, str]:
    return {"User-Agent": USER_AGENT, "Accept": "application/json"}


def _month_in_window(archive_url: str, since: str | None, until: str | None) -> bool:
    match = _MONTH.search(archive_url)
    if not match:
        return True
    stamp = f"{match.group(1)}-{match.group(2)}"
    if since and stamp < since[:7]:
        return False
    if until and stamp > until[:7]:
        return False
    return True


def _end_ms(game: dict[str, Any]) -> int | None:
    raw = game.get("end_time")
    try:
        return int(raw) * 1000
    except (TypeError, ValueError):
        return None


def _fecha_ok(ms: int | None, since: str | None, until: str | None) -> bool:
    if ms is None:
        return not since and not until
    fecha = datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
    if since and fecha < since:
        return False
    if until and fecha > until:
        return False
    return True


def _external_id(url: str) -> str | None:
    match = _LIVE_ID.search(url or "")
    return match.group(1) if match else None


def ndjson_from_chesscom_game(raw: dict[str, Any]) -> dict[str, Any] | None:
    pgn_text = str(raw.get("pgn") or "").strip()
    if not pgn_text:
        return None
    parsed = chess.pgn.read_game(io.StringIO(pgn_text))
    if parsed is None:
        return None
    payload = ndjson_from_pgn_game(parsed, pgn_text=pgn_text, require_lichess=False)
    if payload.get("_skip"):
        return None
    url = str(raw.get("url") or "").strip()
    time_class = str(raw.get("time_class") or payload.get("speed") or "").strip().lower()
    payload["id"] = None
    payload["source_platform"] = SOURCE_CHESSCOM
    payload["source_url"] = url or payload.get("source_url")
    payload["external_game_id"] = _external_id(url) or payload.get("external_game_id")
    payload["perf"] = time_class or payload.get("perf")
    payload["speed"] = time_class or payload.get("speed")
    created = _end_ms(raw)
    if created is not None:
        payload["createdAt"] = created
    white = raw.get("white") if isinstance(raw.get("white"), dict) else {}
    black = raw.get("black") if isinstance(raw.get("black"), dict) else {}
    players = payload.get("players") if isinstance(payload.get("players"), dict) else {}
    if white.get("username"):
        players["white"] = {"user": {"name": white.get("username")}, "rating": white.get("rating")}
    if black.get("username"):
        players["black"] = {"user": {"name": black.get("username")}, "rating": black.get("rating")}
    payload["players"] = players
    return payload


class ChessComClient:
    """Public monthly archives. Does not fetch Game Review / accuracy from Chess.com."""

    def __init__(self, *, session: requests.Session | None = None, timeout_s: float = 60.0) -> None:
        self._session = session or requests.Session()
        self.timeout_s = timeout_s

    def _get_json(self, url: str) -> dict[str, Any]:
        response = self._session.get(url, headers=_headers(), timeout=self.timeout_s)
        if response.status_code == 404:
            return {}
        if response.status_code != 200:
            raise ChessComClientError(f"Chess.com HTTP {response.status_code} for {url}")
        payload = response.json()
        return payload if isinstance(payload, dict) else {}

    def iter_user_games(
        self,
        username: str,
        *,
        since: str | None = None,
        until: str | None = None,
        perf_type: str | None = None,
        max_games: int | None = None,
    ) -> Iterator[dict[str, Any]]:
        user = quote(username.strip(), safe="")
        archives = self._get_json(ARCHIVES_URL.format(username=user)).get("archives") or []
        yielded = 0
        wanted = normalize_perf_type(perf_type)
        for archive_url in reversed(list(archives)):
            if not isinstance(archive_url, str):
                continue
            if not _month_in_window(archive_url, since, until):
                continue
            month = self._get_json(archive_url)
            games = month.get("games") or []
            for raw in reversed(list(games)):
                if not isinstance(raw, dict):
                    continue
                converted = ndjson_from_chesscom_game(raw)
                if converted is None:
                    continue
                if wanted and normalize_perf_type(str(converted.get("perf") or "")) != wanted:
                    continue
                if not _fecha_ok(_end_ms(raw), since, until):
                    continue
                yield converted
                yielded += 1
                if max_games is not None and yielded >= max_games:
                    return
