"""FEAT-093: read one game's existing chess_statistics row."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from chess_statistics.db import StatisticsRepository, connect, sqlite_path_from_url
from chess_statistics.game_id import GameIdError, game_id_from_pgn_text

_REPO_ROOT = Path(__file__).resolve().parents[3]

_FIELDS: tuple[tuple[str, str], ...] = (
    ("resultado", "Resultado"),
    ("ritmo", "Ritmo"),
    ("rival", "Rival"),
    ("imprecisiones", "Imprecisiones"),
    ("errores", "Errores"),
    ("errores_graves", "Errores graves"),
    ("perdida_promedio_cp", "Pérdida prom. cp"),
    ("precision_general", "Precisión"),
    ("precision_apertura", "Precisión apertura"),
    ("precision_medio_juego", "Precisión mediojuego"),
    ("precision_final", "Precisión final"),
    ("ranking_inicial", "Ranking inicial"),
    ("ranking_final", "Ranking final"),
    ("fuente_evaluacion", "Fuente eval"),
)

_PRECISION = {
    "precision_general",
    "precision_apertura",
    "precision_medio_juego",
    "precision_final",
}


def resolve_statistics_db_path() -> Path | None:
    """Existing SQLite only. Never creates a database."""
    raw = os.environ.get("CHESS_STATISTICS_DB", "").strip()
    if raw:
        path = sqlite_path_from_url(raw)
        return path if path.is_file() else None
    for candidate in (
        _REPO_ROOT / "data" / "chess_statistics.sqlite",
        Path.cwd() / "data" / "chess_statistics.sqlite",
    ):
        if candidate.is_file():
            return candidate
    return None


def format_stat_value(key: str, value: Any) -> str | None:
    if value is None or value == "":
        return None
    if key in _PRECISION or key == "perdida_promedio_cp":
        try:
            number = float(value)
        except (TypeError, ValueError):
            return str(value)
        text = f"{number:.1f}"
        return f"{text}%" if key in _PRECISION else text
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def summary_fields(game: dict[str, Any] | None, stats: dict[str, Any] | None) -> list[dict[str, str]]:
    if not game:
        return []
    merged = {**game, **(stats or {})}
    fields: list[dict[str, str]] = []
    for key, label in _FIELDS:
        text = format_stat_value(key, merged.get(key))
        if text is None:
            continue
        fields.append({"key": key, "label": label, "value": text})
    return fields


def lookup_chess_statistics(pgn: str, *, database: Path | None = None) -> dict[str, Any]:
    path = resolve_statistics_db_path() if database is None else Path(database)
    if path is None or not path.is_file():
        return {"available": False, "found": False, "fields": []}
    try:
        stats_game_id = game_id_from_pgn_text(pgn or "")
    except GameIdError:
        return {"available": True, "found": False, "fields": []}
    conn = connect(path)
    try:
        repo = StatisticsRepository(conn)
        game = repo.get_game(stats_game_id)
        stats = repo.get_stats(stats_game_id) if game else None
        return {
            "available": True,
            "found": game is not None,
            "fields": summary_fields(game, stats),
        }
    finally:
        conn.close()
