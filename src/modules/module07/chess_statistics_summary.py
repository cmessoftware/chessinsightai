"""FEAT-093 / EST-FEAT-04: one Coach game's statistics for the PGN panel.

Reads ``coach_game_statistics`` through the API session. Result and clock
come from ``games``. It does not open the course SQLite file.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import inspect
from sqlalchemy.orm import Session

from models.module07_models import CoachGame, CoachGameStatistics
from modules.module07.coach_game_statistics_repository import get_summary

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


def statistics_schema_available(db: Session) -> bool:
    """True when the Postgres statistics table is present. Does not create it."""
    bind = db.get_bind()
    return inspect(bind).has_table(CoachGameStatistics.__tablename__)


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


def summary_fields(record: dict[str, Any] | None) -> list[dict[str, str]]:
    if not record:
        return []
    fields: list[dict[str, str]] = []
    for key, label in _FIELDS:
        text = format_stat_value(key, record.get(key))
        if text is None:
            continue
        fields.append({"key": key, "label": label, "value": text})
    return fields


def lookup_chess_statistics(db: Session, coach_game: CoachGame) -> dict[str, Any]:
    """Same JSON as the panel already consumes: ``{available, found, fields}``."""
    if not statistics_schema_available(db):
        return {"available": False, "found": False, "fields": []}
    summary = get_summary(db, coach_game.id)
    if summary is None:
        return {"available": True, "found": False, "fields": []}
    return {
        "available": True,
        "found": True,
        "fields": summary_fields(_panel_record(coach_game, summary)),
    }


def _panel_record(coach_game: CoachGame, summary: CoachGameStatistics) -> dict[str, Any]:
    clock = coach_game.time_control or summary.speed_class
    return {
        "resultado": coach_game.result,
        "ritmo": clock,
        "rival": summary.opponent,
        "imprecisiones": summary.inaccuracies,
        "errores": summary.mistakes,
        "errores_graves": summary.blunders,
        "perdida_promedio_cp": summary.average_cp_loss,
        "precision_general": summary.accuracy,
        "precision_apertura": summary.opening_accuracy,
        "precision_medio_juego": summary.middlegame_accuracy,
        "precision_final": summary.endgame_accuracy,
        "ranking_inicial": summary.initial_rating,
        "ranking_final": summary.final_rating,
        "fuente_evaluacion": summary.evaluation_source,
    }
