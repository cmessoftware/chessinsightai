"""Corpus and speed metadata for game import (UI-104 / 11_ui_improvements_roadmap)."""

from __future__ import annotations

CORPUS_TYPES = ("personal", "elite", "fide", "novice", "stockfish")
ADMIN_CORPUS_TYPES = frozenset({"elite", "fide", "novice", "stockfish"})
SPEED_CLASSES = (
    "unknown",
    "daily",
    "classical",
    "rapid",
    "blitz",
    "bullet",
)


def resolve_corpus_type(requested: str | None, roles: list[str]) -> str:
    """Non-admin users always get ``personal`` (locked decision 7.2)."""
    value = (requested or "personal").strip().lower()
    if value not in CORPUS_TYPES:
        raise ValueError(f"invalid corpus_type: {value!r}")
    if value == "personal":
        return "personal"
    if "admin" in roles and value in ADMIN_CORPUS_TYPES:
        return value
    raise ValueError(f"corpus_type {value!r} is admin-only")


def infer_speed_class_from_headers(headers: dict[str, str]) -> str:
    """Best-effort speed class from PGN headers (Lichess / Chess.com exports)."""
    event = (headers.get("Event") or "").lower()
    site = (headers.get("Site") or "").lower()
    for token, speed in (
        ("bullet", "bullet"),
        ("blitz", "blitz"),
        ("rapid", "rapid"),
        ("classical", "classical"),
        ("daily", "daily"),
        ("correspondence", "daily"),
    ):
        if token in event or token in site:
            return speed

    tc = (headers.get("TimeControl") or "").strip()
    if not tc or tc == "-":
        return "unknown"
    if tc.startswith("-"):
        return "daily"
    base = tc.split("+")[0].split("/")[0]
    try:
        seconds = int(base)
    except ValueError:
        return "unknown"
    if seconds >= 600:
        return "classical"
    if seconds >= 180:
        return "rapid"
    if seconds >= 60:
        return "blitz"
    return "bullet"
