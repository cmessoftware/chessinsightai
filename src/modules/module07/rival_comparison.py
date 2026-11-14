"""RPT-FEAT-05: the rival's ranking and precision, only in games against me."""

from __future__ import annotations

from datetime import date

from modules.module07.precision_by_speed import precisions_for_row, summarize_precision
from modules.module07.ranking_by_speed import (
    SPEED_LABELS,
    choose_player,
    parse_played_on,
    player_elo,
    summarize_ranking,
    window_start,
)
from modules.game_import.metadata import resolve_display_speed_class


def _side(row: dict, name: str) -> tuple[str | None, str]:
    target = (name or "").strip().casefold()
    if not target:
        return None, ""
    white = str(row.get("white_player") or "").strip()
    black = str(row.get("black_player") or "").strip()
    if white.casefold() == target:
        return "white", white
    if black.casefold() == target:
        return "black", black
    return None, ""


def opponents_of(rows: list[dict], player: str) -> list[str]:
    found: dict[str, str] = {}
    for row in rows:
        me_color, _me_name = _side(row, player)
        if me_color is None:
            continue
        other_key = "black_player" if me_color == "white" else "white_player"
        other = str(row.get(other_key) or "").strip()
        if other and other.casefold() != player.casefold():
            found.setdefault(other.casefold(), other)
    return [found[key] for key in sorted(found)]


def _merge_rhythms(ranking: list[dict], precision: list[dict]) -> list[dict]:
    merged: dict[str, dict] = {}
    for rhythm in ranking:
        merged[rhythm["speed_class"]] = {
            "speed_class": rhythm["speed_class"],
            "label": rhythm["label"],
            "ranking": rhythm,
            "precision": None,
        }
    for rhythm in precision:
        slot = merged.setdefault(
            rhythm["speed_class"],
            {
                "speed_class": rhythm["speed_class"],
                "label": rhythm["label"],
                "ranking": None,
                "precision": None,
            },
        )
        slot["precision"] = rhythm
        slot["label"] = rhythm["label"]
    known = [speed for speed in SPEED_LABELS if speed in merged]
    extra = sorted(speed for speed in merged if speed not in SPEED_LABELS)
    return [merged[speed] for speed in known + extra]


def _as_side(row: dict, color: str, name: str) -> dict:
    chosen = dict(row)
    chosen["player_color"] = color
    chosen["player_username"] = name
    return chosen


def rows_against(rows: list[dict], player: str, rival: str) -> list[dict]:
    """Games where both play, seen from the rival."""
    return [rival_row for _mine, rival_row in paired_rows(rows, player, rival)]


def paired_rows(rows: list[dict], player: str, rival: str) -> list[tuple[dict, dict]]:
    if not player or not rival or player.casefold() == rival.casefold():
        return []
    paired = []
    for row in rows:
        me_color, me_name = _side(row, player)
        rival_color, rival_name = _side(row, rival)
        if me_color is None or rival_color is None or me_color == rival_color:
            continue
        paired.append((_as_side(row, me_color, me_name), _as_side(row, rival_color, rival_name)))
    return paired


def _overlay_series(paired: list[tuple[dict, dict]], *, today: date, months: int, reader) -> dict:
    start = window_start(today, months)
    buckets: dict[str, list] = {}
    for mine, rival in paired:
        played = parse_played_on(mine.get("date_played"))
        speed = resolve_display_speed_class(mine.get("speed_class"), mine.get("time_control"))
        if played is None or not speed or played < start or played > today:
            continue
        buckets.setdefault(speed, []).append(
            (played, str(mine.get("coach_game_id") or ""), reader(mine), reader(rival))
        )
    overlay = {}
    for speed, points in buckets.items():
        points.sort(key=lambda item: (item[0], item[1]))
        mine_series = []
        rival_series = []
        for played, _game_id, mine_value, rival_value in points:
            if mine_value is None or rival_value is None:
                continue
            point_date = played.isoformat()
            mine_series.append({"date": point_date, "rating": mine_value})
            rival_series.append({"date": point_date, "rating": rival_value})
        overlay[speed] = {"mine_series": mine_series, "rival_series": rival_series}
    return overlay


def _attach_overlay(rhythms: list[dict], key: str, overlay: dict) -> None:
    for rhythm in rhythms:
        curves = overlay.get(rhythm["speed_class"])
        block = rhythm.get(key)
        if block is None or curves is None:
            continue
        block["mine_series"] = curves["mine_series"]
        block["rival_series"] = curves["rival_series"]


def build_rival_report(
    rows: list[dict],
    *,
    today: date,
    months: int = 12,
    lichess_username: str | None = None,
    chesscom_username: str | None = None,
    player: str | None = None,
    rival: str | None = None,
    evals_by_game: dict | None = None,
) -> dict:
    chosen, ordered = choose_player(
        rows,
        lichess_username=lichess_username,
        chesscom_username=chesscom_username,
        player=player,
    )
    rivals = opponents_of(rows, chosen)
    catalog = {name.casefold(): name for name in rivals}
    requested = catalog.get((rival or "").strip().casefold())
    picked = requested or (rivals[0] if rivals else "")
    paired = paired_rows(rows, chosen, picked)
    against = [rival_row for _mine, rival_row in paired]
    mine_rows = [mine for mine, _rival in paired]
    prepared = []
    prepared_mine = []
    for mine, rival_row in paired:
        evals = (evals_by_game or {}).get(rival_row.get("coach_game_id"))
        prepared.append({**rival_row, **precisions_for_row(rival_row, evals)})
        prepared_mine.append({**mine, **precisions_for_row(mine, evals)})
    ranking = summarize_ranking(against, today=today, months=months)
    precision = summarize_precision(prepared, today=today, months=months)
    rhythms = _merge_rhythms(ranking["rhythms"], precision["rhythms"])
    _attach_overlay(
        rhythms,
        "ranking",
        _overlay_series(list(zip(mine_rows, against)), today=today, months=months, reader=player_elo),
    )
    _attach_overlay(
        rhythms,
        "precision",
        _overlay_series(
            list(zip(prepared_mine, prepared)),
            today=today,
            months=months,
            reader=lambda row: row.get("precision_general"),
        ),
    )
    return {
        "from": ranking["from"],
        "to": ranking["to"],
        "months": months,
        "player": chosen,
        "players": ordered,
        "rival": picked,
        "rivals": rivals,
        "rhythms": rhythms,
        "skipped": ranking["skipped"],
    }


def load_rival_rows(db, owner_user_id: int) -> tuple[list[dict], dict]:
    from sqlalchemy import inspect

    from models.database_models import Games
    from models.module07_models import CoachGame, CoachGameStatisticEval, CoachGameStatistics

    query = (
        db.query(
            CoachGame.id,
            CoachGame.speed_class,
            Games.time_control,
            Games.date_played,
            Games.white_player,
            Games.black_player,
            Games.white_elo,
            Games.black_elo,
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
                "speed_class": row[1],
                "time_control": row[2],
                "date_played": row[3],
                "white_player": row[4],
                "black_player": row[5],
                "white_elo": row[6],
                "black_elo": row[7],
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
