"""Convert a Lichess multi-game PGN export into NDJSON-shaped dicts."""

from __future__ import annotations

import io
import re
from collections.abc import Iterator
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import chess.pgn

from lichess_statistics.filters import (
    REASON_INCOMPLETE_HEADERS,
    REASON_INVALID_RESULT,
    REASON_NOT_LICHESS,
    REASON_PGN_ERRORS,
    REASON_UNFINISHED,
)

_LICHESS_GAME = re.compile(
    r"lichess\.org/(?:embed/)?([A-Za-z0-9]{8,12})",
    re.I,
)
_FINISHED = {"1-0", "0-1", "1/2-1/2", "½-½"}
SKIP_KEY = "_skip"


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


def _combined_text(game: chess.pgn.Game, pgn_text: str) -> str:
    parts = [
        _header(game, "Site"),
        _header(game, "Link"),
        _header(game, "GameId"),
        _header(game, "LichessId"),
        pgn_text,
    ]
    return " ".join(part for part in parts if part)


def is_lichess_export(game: chess.pgn.Game, pgn_text: str) -> bool:
    blob = _combined_text(game, pgn_text).lower()
    if "chess.com" in blob:
        return False
    if _header(game, "GameId") or _header(game, "LichessId"):
        return True
    return "lichess.org" in blob


def lichess_id_from_pgn(game: chess.pgn.Game, pgn_text: str) -> str | None:
    for key in ("GameId", "LichessId"):
        raw = _header(game, key)
        if raw:
            return raw
    match = _LICHESS_GAME.search(_combined_text(game, pgn_text))
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


def _skip_payload(reason: str, game: chess.pgn.Game, pgn_text: str) -> dict[str, Any]:
    return {
        SKIP_KEY: reason,
        "id": lichess_id_from_pgn(game, pgn_text),
        "pgn": pgn_text,
        "source": "pgn",
    }


def _result_skip(result: str) -> str | None:
    if result in _FINISHED:
        return None
    if result in {"*", ""}:
        return REASON_UNFINISHED
    return REASON_INVALID_RESULT


def ndjson_from_pgn_game(game: chess.pgn.Game, pgn_text: str | None = None) -> dict[str, Any]:
    """One chess.pgn.Game → dict compatible with GameImportService, or a skip record."""
    pgn_text = (pgn_text or "").strip() or _pgn_text(game)
    try:
        list(game.mainline_moves())
    except ValueError:
        return _skip_payload(REASON_PGN_ERRORS, game, pgn_text)
    if getattr(game, "errors", None):
        return _skip_payload(REASON_PGN_ERRORS, game, pgn_text)
    if not is_lichess_export(game, pgn_text):
        return _skip_payload(REASON_NOT_LICHESS, game, pgn_text)
    white = _header(game, "White")
    black = _header(game, "Black")
    if not white or not black:
        return _skip_payload(REASON_INCOMPLETE_HEADERS, game, pgn_text)
    result = _header(game, "Result")
    result_reason = _result_skip(result)
    if result_reason:
        return _skip_payload(result_reason, game, pgn_text)

    clock = _clock(game)
    event = _header(game, "Event")
    speed = _speed_from_clock(clock, event)
    eco = _header(game, "ECO") or None
    opening = _header(game, "Opening") or None
    payload: dict[str, Any] = {
        "id": lichess_id_from_pgn(game, pgn_text),
        "rated": "rated" in event.lower() if event else None,
        "variant": (_header(game, "Variant") or "standard").lower(),
        "speed": speed,
        "perf": speed,
        "createdAt": _created_at_ms(game),
        "status": "draw" if result in {"1/2-1/2", "½-½"} else "finished",
        "winner": _winner(result),
        "pgnResult": result,
        "players": {
            "white": _player(
                white,
                _int_header(game, "WhiteElo"),
                _int_header(game, "WhiteRatingDiff"),
            ),
            "black": _player(
                black,
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
    if text.lstrip().startswith("version https://git-lfs.github.com"):
        raise ValueError(f"{path} looks like a Git LFS pointer, not a PGN export")
    handle = io.StringIO(text)
    while True:
        start = handle.tell()
        parsed = chess.pgn.read_game(handle)
        if parsed is None:
            break
        chunk = text[start : handle.tell()].strip()
        yield ndjson_from_pgn_game(parsed, pgn_text=chunk)
