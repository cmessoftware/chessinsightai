"""Compute one Coach game's chess statistics and store them in Postgres (EST-FEAT-03).

The point of view is ``player_color`` / ``player_username`` on the Coach row.
The PGN comes from ``games`` through ``master_game_id``. Evals already present
in the export (``[%eval]`` comments) are used first; otherwise a local
Stockfish service fills the same ply rows. Accuracy, phases and judgment
bands are the course functions. This module does not open the course SQLite
file and does not read the WASM ply annotations.
"""

from __future__ import annotations

import io
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Protocol

import chess.pgn

from chess_statistics.accuracy import (
    CP_INITIAL,
    force_as_cp,
    game_accuracy_percent,
    is_user_move_ply,
    judgment_from_wc_drop,
    mover_wc_drop,
    per_move_accuracies,
    win_percent_user_pov,
)
from chess_statistics.phases import (
    PHASE_ENDGAME,
    PHASE_MIDDLEGAME,
    PHASE_OPENING,
    classify_game,
    phase_accuracies,
    phase_labels,
)
from models.module07_models import CoachGame
from modules.module07.coach_game_statistics_repository import replace_evals, replace_summary

SOURCE_EXPORT = "lichess"
SOURCE_STOCKFISH = "stockfish_local"

_EVAL_TOKEN = re.compile(r"\[%eval\s+([^\]\s,]+)")


class StockfishAnalyser(Protocol):
    def available(self) -> bool: ...

    def analyse_game(self, game: dict[str, Any]) -> list[Any]: ...


@dataclass(frozen=True)
class EvalPly:
    ply: int
    fen: str | None
    move_uci: str | None
    move_san: str | None
    evaluation_before_cp: int | None
    evaluation_after_cp: int | None
    mate_before: int | None
    mate_after: int | None
    best_move: str | None
    cp_loss: int | None


@dataclass(frozen=True)
class CoachStatisticsComputeResult:
    stored: bool
    coach_game_id: str
    evaluation_source: str | None
    ply_count: int
    reason: str


def compute_coach_game_statistics(
    db,
    coach_game_id: str,
    *,
    stockfish_service: StockfishAnalyser | None = None,
) -> CoachStatisticsComputeResult:
    """Load one Coach game, compute its statistics, and replace the Postgres rows."""
    key = (coach_game_id or "").strip()
    coach = db.query(CoachGame).filter(CoachGame.id == key).one_or_none()
    if coach is None:
        return CoachStatisticsComputeResult(False, key, None, 0, "missing_game")
    pgn = coach.pgn
    if not pgn or not str(pgn).strip():
        return CoachStatisticsComputeResult(False, key, None, 0, "no_pgn")
    color = _point_of_view(coach)

    rows = evals_from_pgn(pgn)
    source = SOURCE_EXPORT
    engine = None
    if rows is None:
        if not _pgn_has_moves(pgn):
            return CoachStatisticsComputeResult(False, key, None, 0, "no_moves")
        engine = stockfish_service if stockfish_service is not None else _engine_from_env()
        if engine is None or not engine.available():
            return CoachStatisticsComputeResult(False, key, None, 0, "no_engine")
        rows = list(engine.analyse_game({"pgn": pgn}))
        source = SOURCE_STOCKFISH
        if not rows:
            return CoachStatisticsComputeResult(False, key, source, 0, "empty_analysis")

    summary, evals = _metrics(
        rows,
        user_color=color,
        username=coach.player_username,
        opponent=_opponent(coach, color),
        speed_class=coach.speed_class,
        master_game_id=coach.master_game_id,
        pgn=pgn,
        source=source,
        engine=engine,
    )
    replace_summary(db, key, summary)
    replace_evals(db, key, evals)
    return CoachStatisticsComputeResult(True, key, source, len(evals), "stored")


_DEMAND_DETAIL = {
    "missing_game": "Partida no encontrada.",
    "no_pgn": "Esta partida no tiene PGN.",
    "no_color": "Falta el color del jugador.",
    "no_moves": "El PGN no tiene jugadas.",
    "no_engine": "Esta partida no trae evaluaciones y Stockfish local no está disponible.",
    "empty_analysis": "El análisis no produjo jugadas.",
}


def compute_open_game_statistics(
    db,
    coach_game_id: str,
    *,
    stockfish_service: StockfishAnalyser | None = None,
) -> dict[str, Any]:
    """Calculate the Coach game open in the analysis panel.

    A second call replaces that same row. It does not walk the owner's library.
    """
    from modules.module07.chess_statistics_summary import lookup_chess_statistics

    result = compute_coach_game_statistics(
        db, coach_game_id, stockfish_service=stockfish_service
    )
    if not result.stored:
        raise ValueError(
            _DEMAND_DETAIL.get(result.reason, "No se pudieron calcular las estadísticas.")
        )
    coach = db.query(CoachGame).filter(CoachGame.id == result.coach_game_id).one()
    return lookup_chess_statistics(db, coach)


def evals_from_pgn(pgn: str) -> list[EvalPly] | None:
    """Mainline ``[%eval]`` comments, or None when any ply has no eval."""
    game = chess.pgn.read_game(io.StringIO(pgn))
    if game is None:
        return None
    node = game
    board = game.board()
    rows: list[EvalPly] = []
    prev_cp: int | None = None
    prev_mate: int | None = None
    while node.variations:
        node = node.variation(0)
        parsed = _comment_eval(node.comment or "")
        if parsed is None:
            return None
        after_cp, after_mate = parsed
        move = node.move
        if move is None:
            return None
        fen = board.fen()
        san = board.san(move)
        uci = move.uci()
        board.push(move)
        ply = len(rows) + 1
        rows.append(
            EvalPly(
                ply=ply,
                fen=fen,
                move_uci=uci,
                move_san=san,
                evaluation_before_cp=prev_cp,
                evaluation_after_cp=after_cp,
                mate_before=prev_mate,
                mate_after=after_mate,
                best_move=None,
                cp_loss=_cp_loss(prev_cp, after_cp, ply),
            )
        )
        prev_cp, prev_mate = after_cp, after_mate
    return rows or None


def _metrics(
    rows: list[Any],
    *,
    user_color: str,
    username: str | None,
    opponent: str | None,
    speed_class: str | None,
    master_game_id: str,
    pgn: str,
    source: str,
    engine: StockfishAnalyser | None,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    ply_cps = [
        force_as_cp(getattr(row, "evaluation_after_cp", None), getattr(row, "mate_after", None))
        for row in rows
    ]
    sans = [str(getattr(row, "move_san") or "") for row in rows]
    per_move = per_move_accuracies(ply_cps)
    division = classify_game(sans=sans, ply_count=len(rows))
    labels = phase_labels(len(rows), division)
    phases = phase_accuracies(ply_cps, user_color, division)
    judgments = _user_judgments(ply_cps, user_color)
    initial, change, final = _ratings(pgn, user_color)

    evals: list[dict[str, Any]] = []
    for index, row in enumerate(rows):
        ply = index + 1
        accuracy = None
        item = per_move[index] if index < len(per_move) else None
        if item is not None and is_user_move_ply(ply, user_color):
            accuracy = item[1]
        before_cp = getattr(row, "evaluation_before_cp", None)
        after_cp = getattr(row, "evaluation_after_cp", None)
        evals.append(
            {
                "ply": ply,
                "fen": getattr(row, "fen", None),
                "move_uci": getattr(row, "move_uci", None),
                "move_san": getattr(row, "move_san", None),
                "evaluation_before_cp": before_cp,
                "evaluation_after_cp": after_cp,
                "best_move": getattr(row, "best_move", None),
                "cp_loss": getattr(row, "cp_loss", None),
                "win_probability_before": win_percent_user_pov(
                    before_cp, getattr(row, "mate_before", None), user_color
                ),
                "win_probability_after": win_percent_user_pov(
                    after_cp, getattr(row, "mate_after", None), user_color
                ),
                "move_accuracy": accuracy,
                "judgment": judgments["by_ply"].get(ply),
                "phase": labels[index] if index < len(labels) else None,
                "played_by": "white" if ply % 2 == 1 else "black",
            }
        )

    depth = None
    version = None
    if source == SOURCE_STOCKFISH and engine is not None:
        config = getattr(engine, "config", None)
        depth = getattr(config, "depth", None)
        version = getattr(engine, "_engine_version", None) or getattr(engine, "version", None)

    summary = {
        "master_game_id": master_game_id,
        "player_username": username,
        "player_color": user_color,
        "opponent": opponent,
        "speed_class": speed_class,
        "initial_rating": initial,
        "rating_change": change,
        "final_rating": final,
        "inaccuracies": judgments["inaccuracies"],
        "mistakes": judgments["mistakes"],
        "blunders": judgments["blunders"],
        "average_cp_loss": judgments["average_cp_loss"],
        "accuracy": game_accuracy_percent(ply_cps, user_color),
        "opening_accuracy": phases[PHASE_OPENING],
        "middlegame_accuracy": phases[PHASE_MIDDLEGAME],
        "endgame_accuracy": phases[PHASE_ENDGAME],
        "evaluation_source": source,
        "stockfish_version": version,
        "stockfish_depth": depth,
        "analyzed_at": datetime.now(timezone.utc),
    }
    return summary, evals


def metrics_for_color(
    ply_cps: list[int | None],
    sans: list[str],
    color: str,
    pgn: str,
) -> dict[str, Any]:
    """Accuracy, phases, judgments and ratings for one color of the same ply list."""
    judgments = _user_judgments(ply_cps, color)
    division = classify_game(sans=sans, ply_count=len(ply_cps))
    phases = phase_accuracies(ply_cps, color, division)
    initial, _change, final = _ratings(pgn or "", color)
    return {
        "imprecisiones": judgments["inaccuracies"],
        "errores": judgments["mistakes"],
        "errores_graves": judgments["blunders"],
        "perdida_promedio_cp": judgments["average_cp_loss"],
        "precision_general": game_accuracy_percent(ply_cps, color),
        "precision_apertura": phases[PHASE_OPENING],
        "precision_medio_juego": phases[PHASE_MIDDLEGAME],
        "precision_final": phases[PHASE_ENDGAME],
        "ranking_inicial": initial,
        "ranking_final": final,
    }


def _user_judgments(ply_cps: list[int | None], user_color: str) -> dict[str, Any]:
    """Same bands as ``persist_judgments``: counts and mean cp loss for the user only."""
    prev = CP_INITIAL
    inaccuracies = mistakes = blunders = 0
    losses: list[int] = []
    by_ply: dict[int, str | None] = {}
    for index, after_cp in enumerate(ply_cps):
        ply = index + 1
        if after_cp is None:
            continue
        drop = mover_wc_drop(prev, after_cp, ply)
        judgment = judgment_from_wc_drop(drop)
        by_ply[ply] = judgment
        if is_user_move_ply(ply, user_color):
            if judgment == "Inaccuracy":
                inaccuracies += 1
            elif judgment == "Mistake":
                mistakes += 1
            elif judgment == "Blunder":
                blunders += 1
            if ply % 2 == 1:
                losses.append(prev - after_cp)
            else:
                losses.append(after_cp - prev)
        prev = after_cp
    average = (sum(losses) / len(losses)) if losses else None
    return {
        "inaccuracies": inaccuracies,
        "mistakes": mistakes,
        "blunders": blunders,
        "average_cp_loss": average,
        "by_ply": by_ply,
    }


def _ratings(pgn: str, user_color: str) -> tuple[int | None, int | None, int | None]:
    game = chess.pgn.read_game(io.StringIO(pgn))
    headers = game.headers if game is not None else {}
    if user_color == "white":
        initial = _header_int(headers, "WhiteElo")
        change = _header_int(headers, "WhiteRatingDiff")
    else:
        initial = _header_int(headers, "BlackElo")
        change = _header_int(headers, "BlackRatingDiff")
    final = initial + change if initial is not None and change is not None else None
    return initial, change, final


def _header_int(headers, *names: str) -> int | None:
    for name in names:
        raw = headers.get(name) if headers is not None else None
        if raw is None or str(raw).strip() == "":
            continue
        try:
            return int(str(raw).strip())
        except ValueError:
            continue
    return None


def _comment_eval(comment: str) -> tuple[int | None, int | None] | None:
    match = _EVAL_TOKEN.search(comment)
    if not match:
        return None
    token = match.group(1).strip()
    if token.startswith("#"):
        try:
            return None, int(token[1:])
        except ValueError:
            return None
    try:
        return int(round(float(token) * 100)), None
    except ValueError:
        return None


def _cp_loss(before: int | None, after: int | None, ply: int) -> int | None:
    if before is None or after is None:
        return None
    if ply % 2 == 1:
        return before - after
    return after - before


def _pgn_has_moves(pgn: str) -> bool:
    game = chess.pgn.read_game(io.StringIO(pgn))
    return game is not None and bool(game.variations)


def _point_of_view(coach: CoachGame) -> str:
    """Same default as the analysis board: an empty color is white."""
    explicit = _normalize_color(coach.player_color)
    if explicit:
        return explicit
    user = (coach.player_username or "").strip().casefold()
    if user and user == (coach.black_player or "").strip().casefold():
        return "black"
    return "white"


def _normalize_color(value: str | None) -> str | None:
    text = (value or "").strip().lower()
    if text in {"white", "w"}:
        return "white"
    if text in {"black", "b"}:
        return "black"
    return None


def _opponent(coach: CoachGame, color: str) -> str | None:
    name = coach.black_player if color == "white" else coach.white_player
    text = (name or "").strip()
    return text or None


def _engine_from_env() -> StockfishAnalyser | None:
    from chess_statistics.evals import StockfishAnalysisService

    return StockfishAnalysisService.from_env()
