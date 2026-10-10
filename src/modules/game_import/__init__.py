"""Shared game import metadata (corpus type, speed class)."""

from modules.game_import.coach_catalog import (
    coach_catalog_health,
    sync_coach_library_to_master_games,
)
from modules.game_import.master_games import (
    SOURCE_ANALYSIS,
    master_game_id_from_pgn,
    upsert_master_game_from_coach_item,
)
from modules.game_import.metadata import (
    ADMIN_CORPUS_TYPES,
    CORPUS_TYPES,
    SPEED_CLASSES,
    infer_speed_class_from_headers,
    resolve_corpus_type,
)

__all__ = [
    "ADMIN_CORPUS_TYPES",
    "CORPUS_TYPES",
    "SOURCE_ANALYSIS",
    "SPEED_CLASSES",
    "coach_catalog_health",
    "infer_speed_class_from_headers",
    "master_game_id_from_pgn",
    "resolve_corpus_type",
    "sync_coach_library_to_master_games",
    "upsert_master_game_from_coach_item",
]
