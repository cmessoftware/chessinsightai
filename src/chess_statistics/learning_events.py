"""LS01-019 — layer B learning events from stored eval rows (training analyzer)."""

from __future__ import annotations

from typing import Any

from chess_statistics.accuracy import JUDGMENT_BLUNDER, JUDGMENT_MISTAKE
from chess_statistics.db import StatisticsRepository
from chess_statistics.evals import _cp_loss
from chess_statistics.import_games import COLOR_BLACK, COLOR_WHITE
from chess_statistics.motifs import annotate_position_tags
from chess_statistics.training_track import training_track

DEFAULT_EVALUATION_DROP_CP = 150


def _is_user_ply(ply: int, user_color: str) -> bool:
    white_move = ply % 2 == 1
    if user_color == COLOR_WHITE:
        return white_move
    if user_color == COLOR_BLACK:
        return not white_move
    return False


def user_eval_loss_cp(row: dict[str, Any], ply: int) -> int | None:
    """Centipawn loss for the side that played this ply (positive = worse for mover)."""
    raw = row.get("cp_loss")
    if raw is not None:
        try:
            loss = int(raw)
        except (TypeError, ValueError):
            loss = None
        else:
            return max(0, loss)
    before = row.get("evaluation_before_cp")
    after = row.get("evaluation_after_cp")
    if before is not None and after is not None:
        computed = _cp_loss(int(before), int(after), ply)
        if computed is not None:
            return max(0, computed)
    judgment = row.get("judgment")
    if judgment in {JUDGMENT_BLUNDER, JUDGMENT_MISTAKE} and raw is None and after is None:
        return DEFAULT_EVALUATION_DROP_CP
    return None


def _game_url(game: dict[str, Any]) -> str | None:
    url = str(game.get("source_url") or "").strip()
    if url:
        return url
    lichess_id = str(game.get("lichess_id") or "").strip()
    if lichess_id:
        return f"https://lichess.org/{lichess_id}"
    return None


def learning_event_from_eval(
    game: dict[str, Any],
    eval_row: dict[str, Any],
    *,
    drop_threshold_cp: int = DEFAULT_EVALUATION_DROP_CP,
) -> dict[str, Any] | None:
    ply = int(eval_row["ply"])
    user_color = str(game.get("color") or "")
    if not _is_user_ply(ply, user_color):
        return None
    eval_loss = user_eval_loss_cp(eval_row, ply)
    if eval_loss is None or eval_loss < drop_threshold_cp:
        return None
    track = training_track(
        perf=str(game.get("perf") or "") or None,
        ritmo=str(game.get("ritmo") or "") or None,
    )
    event: dict[str, Any] = {
        "game_id": game.get("game_id"),
        "url": _game_url(game),
        "fecha": game.get("fecha"),
        "track": track,
        "ply": ply,
        "fen_before": eval_row.get("fen"),
        "move_san": eval_row.get("move_san"),
        "eval_loss_cp": eval_loss,
        "evaluation_drop": eval_loss >= drop_threshold_cp,
        "judgment": eval_row.get("judgment"),
        "phase": eval_row.get("phase"),
    }
    event.update(
        annotate_position_tags(
            event.get("fen_before"),
            phase=event.get("phase"),
        )
    )
    return event


def collect_learning_events(
    repo: StatisticsRepository,
    games: list[dict[str, Any]],
    *,
    drop_threshold_cp: int = DEFAULT_EVALUATION_DROP_CP,
) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for game in games:
        game_id = game.get("game_id")
        if not game_id:
            continue
        eval_rows = repo.list_evals(str(game_id))
        if not eval_rows:
            continue
        merged = {**game, "game_id": game_id}
        for row in eval_rows:
            event = learning_event_from_eval(
                merged,
                row,
                drop_threshold_cp=drop_threshold_cp,
            )
            if event is not None:
                events.append(event)
    events.sort(key=lambda item: (str(item.get("fecha") or ""), str(item.get("game_id") or ""), int(item.get("ply") or 0)))
    return events


def summarize_learning_events(
    events: list[dict[str, Any]],
    *,
    drop_threshold_cp: int = DEFAULT_EVALUATION_DROP_CP,
) -> dict[str, Any]:
    return {
        "layer": "B",
        "drop_threshold_cp": drop_threshold_cp,
        "n_events": len(events),
        "events": events,
    }
