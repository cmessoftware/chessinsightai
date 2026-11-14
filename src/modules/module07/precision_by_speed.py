"""RPT-FEAT-04: mean accuracy per speed class, the same fields as chess_statistics."""

from __future__ import annotations

from datetime import date

from modules.game_import.metadata import resolve_display_speed_class
from modules.module07.coach_game_statistics_compute import metrics_for_color
from modules.module07.ranking_by_speed import (
    SPEED_LABELS,
    choose_player,
    parse_played_on,
    rows_for_player,
    window_start,
)

PRECISION_FIELDS = (
    "precision_general",
    "precision_apertura",
    "precision_medio_juego",
    "precision_final",
)

_STORED_FIELDS = {
    "precision_general": "accuracy",
    "precision_apertura": "opening_accuracy",
    "precision_medio_juego": "middlegame_accuracy",
    "precision_final": "endgame_accuracy",
}


def _finite(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _mean(values: list) -> dict:
    nums = [value for value in (_finite(item) for item in values) if value is not None]
    if not nums:
        return {"mean": None, "n": 0}
    return {"mean": round(sum(nums) / len(nums), 1), "n": len(nums)}


def _ply_series(evals: list) -> tuple[list, list]:
    if not evals:
        return [], []

    def read(row, key):
        return row[key] if isinstance(row, dict) else getattr(row, key)

    by_ply = {int(read(row, "ply")): row for row in evals}
    last = max(by_ply)
    cps = []
    sans = []
    for ply in range(1, last + 1):
        row = by_ply.get(ply)
        cps.append(None if row is None else read(row, "evaluation_after_cp"))
        san = "" if row is None else read(row, "move_san")
        sans.append(san or "")
    return cps, sans


def precisions_for_row(row: dict, evals: list | None = None) -> dict:
    """Stored summary when it belongs to the selected color. Otherwise the same formula on the evals."""
    selected = str(row.get("player_color") or "").strip().lower()
    stored = str(row.get("stats_color") or "").strip().lower()
    if stored == selected and stored in {"white", "black"}:
        return {field: _finite(row.get(_STORED_FIELDS[field])) for field in PRECISION_FIELDS}
    cps, sans = _ply_series(evals or [])
    if not cps:
        return {field: None for field in PRECISION_FIELDS}
    metrics = metrics_for_color(cps, sans, selected, "")
    return {field: _finite(metrics.get(field)) for field in PRECISION_FIELDS}


def summarize_precision(rows: list[dict], *, today: date, months: int = 12) -> dict:
    start = window_start(today, months)
    grouped: dict[str, list[dict]] = {}
    skipped = 0
    for row in rows:
        played = parse_played_on(row.get("date_played"))
        speed = resolve_display_speed_class(row.get("speed_class"), row.get("time_control"))
        values = {field: _finite(row.get(field)) for field in PRECISION_FIELDS}
        if played is None or not speed:
            skipped += 1
            continue
        if played < start or played > today:
            continue
        grouped.setdefault(speed, []).append({"date": played, **values})

    rhythms = []
    known = [speed for speed in SPEED_LABELS if speed in grouped]
    extra = sorted(speed for speed in grouped if speed not in SPEED_LABELS)
    for speed in known + extra:
        points = sorted(grouped[speed], key=lambda point: (point["date"], point["precision_general"] or 0))
        series = [
            {"date": point["date"].isoformat(), "rating": point["precision_general"]}
            for point in points
            if point["precision_general"] is not None
        ]
        rhythms.append(
            {
                "speed_class": speed,
                "label": SPEED_LABELS.get(speed, speed[:1].upper() + speed[1:]),
                "games": len(points),
                **{field: _mean([point[field] for point in points]) for field in PRECISION_FIELDS},
                "series": series,
            }
        )
    return {
        "from": start.isoformat(),
        "to": today.isoformat(),
        "months": months,
        "skipped": skipped,
        "rhythms": rhythms,
    }


def build_precision_report(
    rows: list[dict],
    *,
    today: date,
    months: int = 12,
    lichess_username: str | None = None,
    chesscom_username: str | None = None,
    player: str | None = None,
    evals_by_game: dict | None = None,
) -> dict:
    chosen, ordered = choose_player(
        rows,
        lichess_username=lichess_username,
        chesscom_username=chesscom_username,
        player=player,
    )
    selected = rows_for_player(rows, chosen) if chosen else []
    prepared = []
    for row in selected:
        values = precisions_for_row(row, (evals_by_game or {}).get(row.get("coach_game_id")))
        prepared.append({**row, **values})
    summary = summarize_precision(prepared, today=today, months=months)
    pending_ids = pending_precision_ids(prepared, today=today, months=months)
    summary["players"] = ordered
    summary["player"] = chosen
    summary["pending"] = len(pending_ids)
    summary["pending_ids"] = pending_ids
    return summary


def pending_precision_ids(rows: list[dict], *, today: date, months: int = 12) -> list[str]:
    """Games in the window that still have no precision for the selected color."""
    start = window_start(today, months)
    pending = []
    for row in rows:
        played = parse_played_on(row.get("date_played"))
        speed = resolve_display_speed_class(row.get("speed_class"), row.get("time_control"))
        if played is None or not speed or played < start or played > today:
            continue
        if any(_finite(row.get(field)) is not None for field in PRECISION_FIELDS):
            continue
        game_id = str(row.get("coach_game_id") or "").strip()
        if game_id:
            pending.append(game_id)
    return pending


def load_precision_rows(db, owner_user_id: int) -> tuple[list[dict], dict]:
    from sqlalchemy import inspect

    from models.database_models import Games
    from models.module07_models import CoachGame, CoachGameStatisticEval, CoachGameStatistics

    query = (
        db.query(
            CoachGame.id,
            CoachGame.player_color,
            CoachGame.player_username,
            CoachGame.speed_class,
            Games.time_control,
            Games.date_played,
            Games.white_player,
            Games.black_player,
            CoachGameStatistics.player_color,
            CoachGameStatistics.accuracy,
            CoachGameStatistics.opening_accuracy,
            CoachGameStatistics.middlegame_accuracy,
            CoachGameStatistics.endgame_accuracy,
        )
        .join(Games, CoachGame.master_game_id == Games.game_id)
        .outerjoin(CoachGameStatistics, CoachGameStatistics.coach_game_id == CoachGame.id)
        .filter(CoachGame.owner_user_id == owner_user_id)
        .filter(CoachGame.corpus_type == "personal")
    )
    rows = []
    game_ids = []
    for row in query.all():
        game_ids.append(row[0])
        rows.append(
            {
                "coach_game_id": row[0],
                "player_color": row[1],
                "player_username": row[2],
                "speed_class": row[3],
                "time_control": row[4],
                "date_played": row[5],
                "white_player": row[6],
                "black_player": row[7],
                "stats_color": row[8],
                "accuracy": row[9],
                "opening_accuracy": row[10],
                "middlegame_accuracy": row[11],
                "endgame_accuracy": row[12],
            }
        )
    evals_by_game: dict[str, list] = {}
    evals_ready = bool(game_ids) and inspect(db.get_bind()).has_table(
        CoachGameStatisticEval.__tablename__
    )
    if evals_ready:
        evals = (
            db.query(CoachGameStatisticEval)
            .filter(CoachGameStatisticEval.coach_game_id.in_(game_ids))
            .order_by(CoachGameStatisticEval.ply.asc())
            .all()
        )
        for item in evals:
            evals_by_game.setdefault(item.coach_game_id, []).append(item)
    return rows, evals_by_game
