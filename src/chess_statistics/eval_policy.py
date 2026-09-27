"""LS01-023 — default evaluation source for cross-platform comparability."""

from __future__ import annotations

from chess_statistics.sources import SOURCE_LICHESS


def sync_force_stockfish(*, source: str, use_lichess_cloud: bool) -> bool:
    """Default: local Stockfish for all sources; opt-in Lichess cloud on lichess sync."""
    if use_lichess_cloud and source == SOURCE_LICHESS:
        return False
    return True


def analyze_force_stockfish(*, use_lichess_cloud: bool) -> bool:
    """Analyze replays PGN from SQLite only — always local unless explicitly cloud (unused)."""
    return not use_lichess_cloud
