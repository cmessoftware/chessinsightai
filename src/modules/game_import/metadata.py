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
    "ultrabullet",
)

_SECONDS_PER_DAY = 86_400
# Lichess perf types from PGN base time (seconds per player; increment ignored).
# UltraBullet <30s; Bullet <3min; Blitz [3min, 8min); Rapid [8min, 25min); Classical ≥25min.
_LICHESS_ULTRA_MAX_SECONDS = 29
_LICHESS_BULLET_MAX_SECONDS = 179
_LICHESS_BLITZ_MAX_SECONDS = 479
_LICHESS_RAPID_MAX_SECONDS = 1499


def _lichess_speed_from_base_seconds(initial: int) -> str:
    if initial <= _LICHESS_ULTRA_MAX_SECONDS:
        return "ultrabullet"
    if initial <= _LICHESS_BULLET_MAX_SECONDS:
        return "bullet"
    if initial <= _LICHESS_BLITZ_MAX_SECONDS:
        return "blitz"
    if initial <= _LICHESS_RAPID_MAX_SECONDS:
        return "rapid"
    return "classical"


def parse_time_control_base_seconds(tc: str) -> int | None:
    """Initial thinking time in seconds from PGN ``TimeControl`` (ignores increment)."""
    raw = (tc or "").strip()
    if not raw or raw in {"-", "*"} or raw.startswith("-"):
        return None
    if "/" in raw:
        moves_part, _, period_part = raw.partition("/")
        period_base = period_part.split("+")[0]
        try:
            period = int(period_base.strip())
            moves = int(moves_part.strip())
        except ValueError:
            return None
        if period >= _SECONDS_PER_DAY and moves == 1:
            return None
        if period >= _SECONDS_PER_DAY:
            return None
    base = raw.split("+")[0].split("/")[0]
    try:
        return int(base.strip())
    except ValueError:
        return None


def infer_speed_class_from_time_control(tc: str | None) -> str | None:
    """Lichess-style speed from clock base time; ``None`` if missing or unparseable."""
    raw = (tc or "").strip()
    if not raw or raw in {"-", "*"}:
        return None
    if raw.startswith("-"):
        return "daily"
    if "/" in raw:
        _moves, _, period_part = raw.partition("/")
        period_base = period_part.split("+")[0]
        try:
            if int(period_base.strip()) >= _SECONDS_PER_DAY:
                return "daily"
        except ValueError:
            pass
    initial = parse_time_control_base_seconds(raw)
    if initial is None:
        return None
    return _lichess_speed_from_base_seconds(initial)


def resolve_display_speed_class(
    speed_class: str | None,
    time_control: str | None,
) -> str | None:
    """Prefer Lichess class from ``TimeControl``; fall back to stored ``speed_class``."""
    inferred = infer_speed_class_from_time_control(time_control)
    if inferred:
        return inferred
    key = (speed_class or "").strip().lower()
    if not key or key == "unknown":
        return None
    return key


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
    tc = (headers.get("TimeControl") or "").strip()
    from_clock = infer_speed_class_from_time_control(tc)
    if from_clock:
        return from_clock

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

    return "unknown"
