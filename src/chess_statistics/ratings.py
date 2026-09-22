"""Post-game rating when PGN lacks RatingDiff (typical Chess.com export)."""

from __future__ import annotations

from typing import Any

from chess_statistics.db import StatisticsRepository


def infer_ranking_final_chain(games: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Use next game's ``ranking_inicial`` as this game's ``ranking_final`` (same ``perf``)."""
    if not games:
        return games
    ordered = sorted(
        games,
        key=lambda row: (
            str(row.get("fecha") or ""),
            str(row.get("lichess_id") or ""),
            str(row.get("game_id") or ""),
        ),
    )
    out: list[dict[str, Any]] = []
    for index, row in enumerate(ordered):
        enriched = dict(row)
        if enriched.get("ranking_final") is not None:
            out.append(enriched)
            continue
        if index + 1 >= len(ordered):
            out.append(enriched)
            continue
        nxt = ordered[index + 1]
        inicial = enriched.get("ranking_inicial")
        next_inicial = nxt.get("ranking_inicial")
        if inicial is None or next_inicial is None:
            out.append(enriched)
            continue
        perf_a = str(enriched.get("perf") or enriched.get("ritmo") or "")
        perf_b = str(nxt.get("perf") or nxt.get("ritmo") or "")
        if perf_a and perf_b and perf_a != perf_b:
            out.append(enriched)
            continue
        enriched["ranking_final"] = next_inicial
        out.append(enriched)
    return out


def backfill_ranking_final_in_db(repo: StatisticsRepository, usuario: str) -> int:
    """Persist inferred ``ranking_final`` for games that only have pre-game Elo."""
    games = repo.list_games(usuario=usuario)
    enriched = infer_ranking_final_chain([dict(row) for row in games])
    updated = 0
    by_id = {str(row["game_id"]): row for row in enriched}
    for game in games:
        gid = str(game["game_id"])
        row = by_id.get(gid)
        if not row:
            continue
        final = row.get("ranking_final")
        if final is None or game.get("ranking_final") == final:
            continue
        repo.update_game_fields(gid, ranking_final=int(final))
        updated += 1
    return updated
