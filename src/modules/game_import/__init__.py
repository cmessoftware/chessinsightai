"""Shared game import metadata (corpus type, speed class)."""

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
    "SPEED_CLASSES",
    "infer_speed_class_from_headers",
    "resolve_corpus_type",
]
