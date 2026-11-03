"""Standalone Lichess statistics tool (LS01). Independent of ACC and Module 07.

Public names load on first use. Importing a submodule (the Coach API only needs
``db`` and ``game_id``) must not import the Lichess HTTP client.
"""

from __future__ import annotations

import importlib
from typing import Any

__all__ = [
    "AggregateQueryService",
    "ExcelStatisticsExporter",
    "FUENTE_LICHESS",
    "FUENTE_STOCKFISH_LOCAL",
    "GameDivision",
    "GameIdentity",
    "GameImportService",
    "GameStatisticsService",
    "ImportFilterResult",
    "LichessClient",
    "LichessClientError",
    "StatisticsRepository",
    "classify_game",
    "connect",
    "filter_import_game",
    "game_row_from_ndjson",
    "game_accuracy_percent",
    "identity_from_ndjson",
    "init_schema",
    "persist_cloud_evals",
    "persist_evals",
    "persist_judgments",
    "SHEET_NAME",
    "win_percent_from_cp",
    "win_percent_user_pov",
]

_EXPORTS: dict[str, tuple[str, str]] = {
    "AggregateQueryService": ("chess_statistics.aggregates", "AggregateQueryService"),
    "ExcelStatisticsExporter": ("chess_statistics.export", "ExcelStatisticsExporter"),
    "FUENTE_LICHESS": ("chess_statistics.evals", "FUENTE_LICHESS"),
    "FUENTE_STOCKFISH_LOCAL": ("chess_statistics.evals", "FUENTE_STOCKFISH_LOCAL"),
    "GameDivision": ("chess_statistics.phases", "GameDivision"),
    "GameIdentity": ("chess_statistics.game_id", "GameIdentity"),
    "GameImportService": ("chess_statistics.import_games", "GameImportService"),
    "GameStatisticsService": ("chess_statistics.service", "GameStatisticsService"),
    "ImportFilterResult": ("chess_statistics.filters", "ImportFilterResult"),
    "LichessClient": ("chess_statistics.client", "LichessClient"),
    "LichessClientError": ("chess_statistics.client", "LichessClientError"),
    "StatisticsRepository": ("chess_statistics.db", "StatisticsRepository"),
    "classify_game": ("chess_statistics.phases", "classify_game"),
    "connect": ("chess_statistics.db", "connect"),
    "filter_import_game": ("chess_statistics.filters", "filter_import_game"),
    "game_row_from_ndjson": ("chess_statistics.import_games", "game_row_from_ndjson"),
    "game_accuracy_percent": ("chess_statistics.accuracy", "game_accuracy_percent"),
    "identity_from_ndjson": ("chess_statistics.game_id", "identity_from_ndjson"),
    "init_schema": ("chess_statistics.db", "init_schema"),
    "persist_cloud_evals": ("chess_statistics.evals", "persist_cloud_evals"),
    "persist_evals": ("chess_statistics.evals", "persist_evals"),
    "persist_judgments": ("chess_statistics.accuracy", "persist_judgments"),
    "SHEET_NAME": ("chess_statistics.export", "SHEET_NAME"),
    "win_percent_from_cp": ("chess_statistics.accuracy", "win_percent_from_cp"),
    "win_percent_user_pov": ("chess_statistics.accuracy", "win_percent_user_pov"),
}


def __getattr__(name: str) -> Any:
    target = _EXPORTS.get(name)
    if target is None:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    module_name, attr = target
    value = getattr(importlib.import_module(module_name), attr)
    globals()[name] = value
    return value
