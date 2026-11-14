"""RPT-FEAT-10: calculate missing precision off the report request and notify the user."""

from __future__ import annotations

from datetime import datetime, timezone


def calculation_succeeded(result, precisions: dict) -> bool:
    """A stored 0% is a real result. A stored row with no plies or no precision is not."""
    if not getattr(result, "stored", False):
        return False
    try:
        ply_count = int(getattr(result, "ply_count", 0) or 0)
    except (TypeError, ValueError):
        return False
    if ply_count <= 0:
        return False
    return any(value is not None for value in (precisions or {}).values())


def summarize_calculations(game_ids: list[str], compute, read_precisions) -> dict:
    calculated = 0
    failed = 0
    for game_id in game_ids:
        try:
            result = compute(game_id)
            values = read_precisions(game_id)
        except Exception:
            failed += 1
            continue
        if calculation_succeeded(result, values):
            calculated += 1
        else:
            failed += 1
    return {"calculated": calculated, "failed": failed}


def notification_fields(calculated: int, failed: int) -> dict:
    if calculated and failed:
        noun = "partida" if calculated == 1 else "partidas"
        return {
            "type": "warning",
            "status": "completed",
            "title": "Cálculo de precisión",
            "message": (
                f"Se calculó la precisión de {calculated} {noun}. "
                f"{failed} no se pudieron calcular."
            ),
        }
    if calculated:
        noun = "partida" if calculated == 1 else "partidas"
        return {
            "type": "success",
            "status": "completed",
            "title": "Cálculo de precisión",
            "message": f"Se calculó la precisión de {calculated} {noun}.",
        }
    return {
        "type": "error",
        "status": "failed",
        "title": "Cálculo de precisión",
        "message": "No se pudo calcular la precisión de las partidas.",
    }


def start_message(count: int) -> str:
    noun = "partida" if count == 1 else "partidas"
    return f"Calculando la precisión de {count} {noun}."


def stored_precisions(db, game_id: str) -> dict:
    from modules.module07.coach_game_statistics_repository import get_summary

    row = get_summary(db, game_id)
    if row is None:
        return {}
    return {
        "precision_general": row.accuracy,
        "precision_apertura": row.opening_accuracy,
        "precision_medio_juego": row.middlegame_accuracy,
        "precision_final": row.endgame_accuracy,
    }


def run_precision_job(notification_id: str, game_ids: list[str]) -> None:
    """Own database session. The report request does not wait for Stockfish."""
    from database import SessionLocal
    from db.models.notifications import Notification
    from modules.module07.coach_game_statistics_compute import compute_coach_game_statistics

    db = SessionLocal()
    try:
        counts = summarize_calculations(
            game_ids,
            lambda game_id: compute_coach_game_statistics(db, game_id),
            lambda game_id: stored_precisions(db, game_id),
        )
        _finish_notification(db, Notification, notification_id, counts)
        db.commit()
    except Exception:
        db.rollback()
        _finish_notification(db, Notification, notification_id, {"calculated": 0, "failed": len(game_ids)})
        db.commit()
    finally:
        db.close()


def _finish_notification(db, notification_model, notification_id: str, counts: dict) -> None:
    notification = db.query(notification_model).filter_by(id=notification_id).first()
    if notification is None:
        return
    fields = notification_fields(counts["calculated"], counts["failed"])
    notification.type = fields["type"]
    notification.status = fields["status"]
    notification.title = fields["title"]
    notification.message = fields["message"]
    notification.updated_at = datetime.now(timezone.utc)
    notification.meta_data = {
        "calculated": counts["calculated"],
        "failed": counts["failed"],
        "games": counts["calculated"] + counts["failed"],
    }
