"""Module 07 product layer (ingest, jobs, API adapters)."""

from src.modules.module07.ingest import (
    ParsedModule07Game,
    parse_games_from_pgn_text,
    resolve_player_color,
)

__all__ = [
    "ParsedModule07Game",
    "parse_games_from_pgn_text",
    "resolve_player_color",
]
