"""PGN Mentor player slugs (ZIP filenames without extension) for PGM corpus import."""

from __future__ import annotations

import json
from enum import Enum
from pathlib import Path
from typing import Any, Iterable


class PgnMentorPlayerSlug(str, Enum):
    """Curated PGM corpus (26 GMs). Values match ``{slug}.zip`` under ``fide_processed``."""

    ALEKHINE = "Alekhine"
    ANAND = "Anand"
    CAPABLANCA = "Capablanca"
    CARLSEN = "Carlsen"
    CARUANA = "Caruana"
    EUWE = "Euwe"
    FISCHER = "Fischer"
    KARPOV = "Karpov"
    KASPAROV = "Kasparov"
    LARSEN = "Larsen"
    LASKER = "Lasker"
    MORPHY = "Morphy"
    NIMZOWITSCH = "Nimzowitsch"
    PANNO = "Panno"
    PETROSIAN = "Petrosian"
    PHILIDOR = "Philidor"
    POLGAR_J = "PolgarJ"
    NAJDORF = "Najdorf"
    QUINTEROS = "Quinteros"
    RETI = "Reti"
    SHIROV = "Shirov"
    SHORT = "Short"
    STEIN = "Stein"
    TAL = "Tal"
    TARRASCH = "Tarrasch"
    TOPALOV = "Topalov"


DEFAULT_CURATED_SLUGS: tuple[str, ...] = tuple(s.value for s in PgnMentorPlayerSlug)

DEFAULT_ROSTER_JSON = (
    Path(__file__).resolve().parents[3]
    / "docs"
    / "ai_chess_coach"
    / "roadmap"
    / "designs"
    / "pgm-mentor-curated-roster.json"
)


def load_roster_config(path: Path | None = None) -> dict[str, Any]:
    p = path or DEFAULT_ROSTER_JSON
    data = json.loads(p.read_text(encoding="utf-8"))
    return data


def roster_players(path: Path | None = None) -> list[dict[str, Any]]:
    """Each row: slug, display, optional max_games."""
    return list(load_roster_config(path).get("players") or [])


def resolve_slugs(
    *,
    players: Iterable[str] | None = None,
    use_enum_defaults: bool = True,
) -> list[str]:
    if players is not None:
        out: list[str] = []
        valid = {s.value for s in PgnMentorPlayerSlug}
        for raw in players:
            slug = raw.strip()
            if not slug:
                continue
            if slug not in valid:
                raise ValueError(f"Unknown PGN Mentor slug: {slug!r} (not in PgnMentorPlayerSlug)")
            out.append(slug)
        return out
    if use_enum_defaults:
        return list(DEFAULT_CURATED_SLUGS)
    return [row["slug"] for row in roster_players()]