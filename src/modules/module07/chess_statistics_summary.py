"""FEAT-093 / EST-FEAT-04: one Coach game's statistics for the PGN panel.

Reads ``coach_game_statistics`` through the API session. Result and clock
come from ``games``. It does not open the course SQLite file.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import inspect
from sqlalchemy.orm import Session

from models.module07_models import CoachGame, CoachGameStatisticEval, CoachGameStatistics
from modules.module07.coach_game_statistics_compute import metrics_for_color
from modules.module07.coach_game_statistics_repository import get_evals, get_summary

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

_COMPARE_FIELDS: tuple[tuple[str, str], ...] = (
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
)


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
    payload: dict[str, Any] = {
        "available": True,
        "found": True,
        "fields": summary_fields(_panel_record(coach_game, summary)),
    }
    comparison = _comparison(db, coach_game, summary)
    if comparison is not None:
        payload["comparison"] = comparison
    return payload


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


def _comparison(
    db: Session, coach_game: CoachGame, summary: CoachGameStatistics
) -> dict[str, Any] | None:
    """Both colors from the stored plies. The same bands as the summary."""
    if not inspect(db.get_bind()).has_table(CoachGameStatisticEval.__tablename__):
        return None
    evals = get_evals(db, coach_game.id)
    ply_cps, sans = _ply_series(evals)
    if not ply_cps:
        return None
    pgn = coach_game.pgn or ""
    white = metrics_for_color(ply_cps, sans, "white", pgn)
    black = metrics_for_color(ply_cps, sans, "black", pgn)
    rows: list[dict[str, str | None]] = []
    for key, label in _COMPARE_FIELDS:
        rows.append(
            {
                "key": key,
                "label": label,
                "white": format_stat_value(key, white.get(key)),
                "black": format_stat_value(key, black.get(key)),
            }
        )
    white_name = (coach_game.white_player or "").strip() or "Blancas"
    black_name = (coach_game.black_player or "").strip() or "Negras"
    return {
        "white_name": white_name,
        "black_name": black_name,
        "point_of_view": summary.player_color,
        "rows": rows,
    }


def _ply_series(evals: list[CoachGameStatisticEval]) -> tuple[list[int | None], list[str]]:
    if not evals:
        return [], []
    by_ply = {row.ply: row for row in evals}
    last = max(by_ply)
    cps: list[int | None] = []
    sans: list[str] = []
    for ply in range(1, last + 1):
        row = by_ply.get(ply)
        cps.append(None if row is None else row.evaluation_after_cp)
        sans.append("" if row is None or not row.move_san else row.move_san)
    return cps, sans
