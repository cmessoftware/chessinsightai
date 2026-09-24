"""LS01-017 — training tracks: rapid, classical, daily (no blitz/bullet)."""

from __future__ import annotations

import re
from typing import Any, Iterable

from chess_statistics.sources import normalize_perf_type

TRACK_RAPID = "rapid"
TRACK_CLASSICAL = "classical"
TRACK_DAILY = "daily"
TRAINING_TRACKS = (TRACK_RAPID, TRACK_CLASSICAL, TRACK_DAILY)

# Lichess estimated duration: initial + 40 * increment (seconds).
_BULLET_MAX_S = 179  # < 3 minutes
_BLITZ_MAX_S = 479  # < 8 minutes
_RAPID_MAX_S = 1499  # < 25 minutes

_EXCLUDED_PERF = frozenset({"bullet", "blitz", "ultrabullet", "lightning"})
_DAILY_PERF = frozenset({"daily", "correspondence"})
_CLOCK = re.compile(r"^(\d+)\+(\d+)$")
_DAYS = re.compile(r"^(\d+)\s*d(ays?)?$", re.I)


def parse_clock_label(ritmo: str | None) -> tuple[int, int] | None:
    """Parse ``15+10`` / ``3+2`` as minutes+increment → (initial_seconds, increment)."""
    text = (ritmo or "").strip()
    match = _CLOCK.match(text)
    if not match:
        return None
    minutes = int(match.group(1))
    increment = int(match.group(2))
    return minutes * 60, increment


def estimated_duration_seconds(initial_seconds: int, increment: int) -> int:
    return max(0, initial_seconds) + 40 * max(0, increment)


def _track_from_duration(seconds: int) -> str | None:
    if seconds <= _BULLET_MAX_S:
        return None
    if seconds <= _BLITZ_MAX_S:
        return None
    if seconds <= _RAPID_MAX_S:
        return TRACK_RAPID
    return TRACK_CLASSICAL


def _track_from_perf(perf: str | None) -> str | None:
    mapped = normalize_perf_type(perf)
    if not mapped:
        return None
    if mapped in _EXCLUDED_PERF:
        return None
    if mapped == TRACK_RAPID:
        return TRACK_RAPID
    if mapped == TRACK_CLASSICAL:
        return TRACK_CLASSICAL
    if mapped in _DAILY_PERF:
        return TRACK_DAILY
    return None


def training_track(
    *,
    perf: str | None = None,
    ritmo: str | None = None,
    speed: str | None = None,
) -> str | None:
    """Return rapid/classical/daily, or None for blitz, bullet, and unknown speeds."""
    from_perf = _track_from_perf(perf or speed)
    if from_perf is not None:
        return from_perf
    excluded = normalize_perf_type(perf or speed)
    if excluded in _EXCLUDED_PERF:
        return None
    label = (ritmo or "").strip()
    if _DAYS.match(label) or label.lower() in {"correspondence", "daily"}:
        return TRACK_DAILY
    clock = parse_clock_label(label)
    if clock is not None:
        return _track_from_duration(estimated_duration_seconds(*clock))
    return _track_from_perf(label)


def is_training_bot_rival(row: dict[str, Any]) -> bool:
    title = str(row.get("rival_title") or row.get("title") or "").strip().upper()
    if title == "BOT":
        return True
    name = str(row.get("rival") or "").strip()
    if name.lower().endswith("bot") or name.lower().startswith("lichess ai"):
        return True
    return False


def annotate_training_track(row: dict[str, Any]) -> dict[str, Any]:
    out = dict(row)
    out["track"] = training_track(
        perf=str(row.get("perf") or "") or None,
        ritmo=str(row.get("ritmo") or "") or None,
        speed=str(row.get("speed") or "") or None,
    )
    return out


def filter_training_rows(
    rows: Iterable[dict[str, Any]],
    *,
    track: str | None = None,
    training_only: bool = False,
) -> list[dict[str, Any]]:
    """Label every row; optionally keep one track or all training tracks.

    Does not change ingest. Blitz/bullet stay in SQLite.
    """
    wanted = normalize_perf_type(track) if track else ""
    if wanted and wanted not in TRAINING_TRACKS:
        raise ValueError(f"track must be one of {TRAINING_TRACKS}, got {track!r}")
    training_only = training_only or bool(wanted)
    out: list[dict[str, Any]] = []
    for row in rows:
        labeled = annotate_training_track(row)
        current = labeled.get("track")
        if training_only and current is None:
            continue
        if wanted and current != wanted:
            continue
        if training_only and is_training_bot_rival(labeled):
            continue
        out.append(labeled)
    return out
