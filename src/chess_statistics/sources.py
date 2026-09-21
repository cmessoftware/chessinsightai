"""Game-source identifiers for chess_statistics."""

from __future__ import annotations

SOURCE_LICHESS = "lichess"
SOURCE_CHESSCOM = "chess.com"
SOURCE_PGN = "pgn"
SOURCES = (SOURCE_LICHESS, SOURCE_CHESSCOM, SOURCE_PGN)

_PERF_ALIASES = {
    "correspondence": "daily",
    "daily": "daily",
    "lightning": "bullet",
}


def uses_lichess_cloud(source: str) -> bool:
    return source == SOURCE_LICHESS


def normalize_perf_type(value: str | None) -> str:
    text = (value or "").strip().lower()
    if not text:
        return ""
    return _PERF_ALIASES.get(text, text)
