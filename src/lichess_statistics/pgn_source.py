"""Convert a multi-game PGN file into NDJSON-shaped dicts for GameImportService."""

from __future__ import annotations

import io
import re
from collections.abc import Iterator
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import chess.pgn

_SITE_ID = re.compile(r"(?:lichess\.org|chess\.com/(?:game/live|live/game))/([A-Za-z0-9_-]+)", re.I)


def _header(game: chess.pgn.Game, name: str) -> str:
    return str(game.headers.get(name) or "").strip()


def _int_header(game: chess.pgn.Game, name: str) -> int | None:
    raw = _header(game, name)
    if not raw or raw in {"?", "-"}:
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def _player(name: str, rating: int | None, diff: int | None) -> dict[str, Any]:
    payload: dict[str, Any] = {"user": {"name": name}} if name else {}
    if rating is not None:
        payload["rating"] = rating
    if diff is not None:
        payload["ratingDiff"] = diff
    return payload


def _winner(result: str) -> str | None:
    if result == "1-0":
        return "white"
    if result == "0-1":
        return "black"
    if result in {"1/2-1/2", "½-½"}:
        return None
    return None


def _created_at_ms(game: chess.pgn.Game) -> int | None:
    date = _header(game, "UTCDate") or _header(game, "Date")
    time_txt = _header(game, "UTCTime") or "00:00:00"
    if not date or date.startswith("?"):
        return None
    date = date.replace(".", "-")
    try:
        dt = datetime.strptime(f"{date} {time_txt}", "%Y-%m-%d %H:%M:%S")
    except ValueError:
        try:
            dt = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            return None
    return int(dt.replace(tzinfo=timezone.utc).timestamp() * 1000)


def _clock(game: chess.pgn.Game) -> dict[str, int] | None:
    tc = _header(game, "TimeControl")
    if not tc or tc in {"-", "*"}:
        return None
    if "+" not in tc:
        initial = _safe_int(tc)
        if initial is None:
            return None
        return {"initial": initial, "increment": 0}
    left, _, right = tc.partition("+")
    initial = _safe_int(left)
    increment = _safe_int(right) or 0
    if initial is None:
        return None
    return {"initial": initial, "increment": increment}


def _safe_int(value: str) -> int | None:
    text = value.strip()
    if not text:
        return None
    try:
        return int(text)
    except ValueError:
        return None


def _speed_from_clock(clock: dict[str, int] | None, event: str) -> str | None:
    lowered = event.lower()
    for name in ("bullet", "blitz", "rapid", "classical", "correspondence"):
        if name in lowered:
            return name
    if not clock:
        return None
    initial = clock["initial"]
    increment = clock.get("increment") or 0
    estimated = initial + 40 * increment
    if estimated < 179:
        return "bullet"
    if estimated < 479:
        return "blitz"
    if estimated < 1500:
        return "rapid"
    return "classical"


def _external_id(game: chess.pgn.Game, pgn_text: str) -> str | None:
    for key in ("GameId", "LichessId"):
        raw = _header(game, key)
        if raw:
            return raw
    for key in ("Site", "Link"):
        raw = _header(game, key)
        match = _SITE_ID.search(raw)
        if match:
            return match.group(1)
        parsed = urlparse(raw)
        if parsed.path:
            tail = parsed.path.rstrip("/").split("/")[-1]
            if tail and re.fullmatch(r"[A-Za-z0-9_-]{6,}", tail):
                return tail
    match = _SITE_ID.search(pgn_text)
    return match.group(1) if match else None


def _moves_san(game: chess.pgn.Game) -> str:
    board = game.board()
    sans: list[str] = []
    for move in game.mainline_moves():
        sans.append(board.san(move))
        board.push(move)
    return " ".join(sans)


def _pgn_text(game: chess.pgn.Game) -> str:
    exporter = chess.pgn.StringExporter(headers=True, variations=False, comments=True)
    return game.accept(exporter).strip() + "\n"


def ndjson_from_pgn_game(game: chess.pgn.Game, pgn_text: str | None = None) -> dict[str, Any]:
    """One chess.pgn.Game → dict compatible with GameImportService."""
    pgn_text = (pgn_text or "").strip() or _pgn_text(game)
    clock = _clock(game)
    event = _header(game, "Event")
    speed = _speed_from_clock(clock, event)
    eco = _header(game, "ECO") or None
    opening = _header(game, "Opening") or None
    payload: dict[str, Any] = {
        "id": _external_id(game, pgn_text),
        "rated": "rated" in event.lower() if event else None,
        "variant": (_header(game, "Variant") or "standard").lower(),
        "speed": speed,
        "perf": speed,
        "createdAt": _created_at_ms(game),
        "status": "mate" if _header(game, "Termination").lower() == "normal" else "unknown",
        "winner": _winner(_header(game, "Result")),
        "players": {
            "white": _player(
                _header(game, "White"),
                _int_header(game, "WhiteElo"),
                _int_header(game, "WhiteRatingDiff"),
            ),
            "black": _player(
                _header(game, "Black"),
                _int_header(game, "BlackElo"),
                _int_header(game, "BlackRatingDiff"),
            ),
        },
        "moves": _moves_san(game),
        "pgn": pgn_text,
        "clock": clock,
        "source": "pgn",
    }
    if eco or opening:
        payload["opening"] = {"eco": eco, "name": opening}
    return payload


def iter_pgn_file(path: str | Path) -> Iterator[dict[str, Any]]:
    raw = Path(path).read_bytes()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")
    handle = io.StringIO(text)
    while True:
        start = handle.tell()
        parsed = chess.pgn.read_game(handle)
        if parsed is None:
            break
        chunk = text[start : handle.tell()].strip()
        yield ndjson_from_pgn_game(parsed, pgn_text=chunk)
