"""Query helpers for Coach Partidas list (FEAT-063 / UI-G2)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Query

from models.database_models import Games
from models.module07_models import CoachGame


def wildcard_to_ilike_pattern(raw: str) -> str:
    """Turn user `*` wildcards into SQL ILIKE `%`; escape `%` and `_`."""
    text = (raw or "").strip()
    if not text:
        return ""
    out: list[str] = []
    for ch in text:
        if ch == "*":
            out.append("%")
        elif ch in ("%", "_"):
            out.append(f"\\{ch}")
        else:
            out.append(ch)
    return "".join(out)


def _normalize_date_key(raw: str | None) -> str | None:
    if not raw:
        return None
    text = str(raw).strip()
    if not text:
        return None
    return text.replace(".", "-").replace("/", "-")[:10]


@dataclass(frozen=True)
class CoachGameListFilters:
    corpus_types: tuple[str, ...] = ()
    white_player: str | None = None
    black_player: str | None = None
    eco: str | None = None
    opening: str | None = None
    date_from: str | None = None
    date_to: str | None = None
    results: tuple[str, ...] = ()
    opening_eco_or: bool = False
    limit: int | None = None
    offset: int = 0

    @classmethod
    def from_query(
        cls,
        *,
        corpus_types: list[str] | None = None,
        corpus_type: str | None = None,
        sources: list[str] | None = None,
        source: str | None = None,
        white_player: str | None = None,
        black_player: str | None = None,
        eco: str | None = None,
        opening: str | None = None,
        opening_eco_or: bool = False,
        date_from: str | None = None,
        date_to: str | None = None,
        result: list[str] | None = None,
        results: list[str] | None = None,
        limit: int | None = None,
        offset: int = 0,
    ) -> CoachGameListFilters:
        merged_corpus: list[str] = []
        if corpus_type and corpus_type.strip():
            merged_corpus.append(corpus_type.strip().lower())
        if corpus_types:
            merged_corpus.extend(
                s.strip().lower() for s in corpus_types if s and s.strip()
            )
        # FEAT-063 legacy query names (deprecated → corpus_type)
        if source and source.strip():
            merged_corpus.append(source.strip().lower())
        if sources:
            merged_corpus.extend(
                s.strip().lower() for s in sources if s and s.strip()
            )
        result_values = results if results is not None else result
        merged_results: list[str] = []
        if result_values:
            merged_results.extend(r.strip() for r in result_values if r and str(r).strip())
        return cls(
            corpus_types=tuple(dict.fromkeys(merged_corpus)),
            white_player=(white_player or "").strip() or None,
            black_player=(black_player or "").strip() or None,
            eco=(eco or "").strip() or None,
            opening=(opening or "").strip() or None,
            opening_eco_or=bool(opening_eco_or),
            date_from=_normalize_date_key(date_from),
            date_to=_normalize_date_key(date_to),
            results=tuple(dict.fromkeys(merged_results)),
            limit=limit,
            offset=max(0, int(offset or 0)),
        )

    def has_any(self) -> bool:
        return bool(
            self.corpus_types
            or self.white_player
            or self.black_player
            or self.eco
            or self.opening
            or self.date_from
            or self.date_to
            or self.results
        )


def apply_coach_game_list_filters(
    query: Query[Any],
    *,
    games_model: type[Games] = Games,
    coach_model: type[CoachGame] = CoachGame,
    filters: CoachGameListFilters,
) -> Query[Any]:
    g = games_model
    if filters.corpus_types:
        query = query.filter(coach_model.corpus_type.in_(list(filters.corpus_types)))

    white_pat = wildcard_to_ilike_pattern(filters.white_player or "")
    black_pat = wildcard_to_ilike_pattern(filters.black_player or "")
    if white_pat and black_pat:
        query = query.filter(
            or_(g.white_player.ilike(white_pat), g.black_player.ilike(black_pat))
        )
    elif white_pat:
        query = query.filter(g.white_player.ilike(white_pat))
    elif black_pat:
        query = query.filter(g.black_player.ilike(black_pat))

    eco_pat = wildcard_to_ilike_pattern(filters.eco or "")
    opening_pat = wildcard_to_ilike_pattern(filters.opening or "")
    if eco_pat and opening_pat and filters.opening_eco_or:
        query = query.filter(or_(g.eco.ilike(eco_pat), g.opening.ilike(opening_pat)))
    else:
        if eco_pat:
            query = query.filter(g.eco.ilike(eco_pat))
        if opening_pat:
            query = query.filter(g.opening.ilike(opening_pat))

    if filters.date_from:
        query = query.filter(g.date_played >= filters.date_from)
    if filters.date_to:
        query = query.filter(g.date_played <= filters.date_to)

    if filters.results:
        query = query.filter(g.result.in_(list(filters.results)))

    return query
