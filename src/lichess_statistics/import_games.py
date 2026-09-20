"""LS01-005 — per-game metadata from Lichess NDJSON (user POV)."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from lichess_statistics.db import InsertResult, StatisticsRepository
from lichess_statistics.evals import StockfishAnalysisService, persist_evals
from lichess_statistics.filters import filter_import_game, total_move_count
from lichess_statistics.game_id import identity_from_ndjson

logger = logging.getLogger(__name__)

RESULT_WIN = "G"
RESULT_DRAW = "T"
RESULT_LOSS = "P"
COLOR_WHITE = "WHITE"
COLOR_BLACK = "BLACK"


class GameMetadataError(ValueError):
    """NDJSON game cannot be mapped for the given user."""


@dataclass(frozen=True)
class GameRow:
    game_id: str
    lichess_id: str | None
    fecha: str | None
    usuario: str
    color: str
    rival: str | None
    resultado: str
    ritmo: str | None
    perf: str | None
    duracion_segundos: int | None
    ranking_inicial: int | None
    variacion_ranking: int | None
    ranking_final: int | None
    apertura: str | None
    eco: str | None
    cantidad_jugadas: int
    pgn: str | None

    def insert_fields(self) -> dict[str, Any]:
        return {
            "lichess_id": self.lichess_id,
            "fecha": self.fecha,
            "usuario": self.usuario,
            "color": self.color,
            "rival": self.rival,
            "resultado": self.resultado,
            "ritmo": self.ritmo,
            "perf": self.perf,
            "duracion_segundos": self.duracion_segundos,
            "ranking_inicial": self.ranking_inicial,
            "variacion_ranking": self.variacion_ranking,
            "ranking_final": self.ranking_final,
            "apertura": self.apertura,
            "eco": self.eco,
            "cantidad_jugadas": self.cantidad_jugadas,
            "pgn": self.pgn,
        }


def ranking_final(inicial: int | None, variacion: int | None) -> int | None:
    if inicial is None:
        return None
    return inicial + (0 if variacion is None else variacion)


def _player_name(player: dict[str, Any] | None) -> str | None:
    if not isinstance(player, dict):
        return None
    user = player.get("user") or {}
    if not isinstance(user, dict):
        return None
    name = str(user.get("name") or user.get("id") or "").strip()
    return name or None


def _names_match(left: str, right: str) -> bool:
    return left.strip().lower() == right.strip().lower()


def _int_or_none(value: Any) -> int | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _fecha_from_created_at(created_at: Any) -> str | None:
    ms = _int_or_none(created_at)
    if ms is None:
        return None
    dt = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
    return dt.strftime("%Y-%m-%d")


def _pgn_tag(pgn: str | None, name: str) -> str | None:
    if not pgn:
        return None
    prefix = f"[{name} "
    for line in pgn.splitlines():
        if line.startswith(prefix) and line.endswith("]"):
            raw = line[len(prefix) : -1].strip()
            if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in {'"', "'"}:
                raw = raw[1:-1]
            return raw.strip() or None
    return None


def format_clock_label(initial_seconds: int, increment: int) -> str:
    """Lichess UI style: 15+10, 8+2, 10+0 (minutes + increment)."""
    inc = max(0, increment)
    if initial_seconds % 60 == 0:
        return f"{initial_seconds // 60}+{inc}"
    return f"{initial_seconds}s+{inc}"


def ritmo_from_ndjson(game: dict[str, Any]) -> str | None:
    """Exact time control for the spreadsheet Ritmo column."""
    clock = game.get("clock") if isinstance(game.get("clock"), dict) else None
    if clock:
        initial = _int_or_none(clock.get("initial"))
        increment = _int_or_none(clock.get("increment")) or 0
        if initial is not None:
            return format_clock_label(initial, increment)
    days = _int_or_none(game.get("daysPerTurn"))
    if days is not None:
        return f"{days}d"
    pgn_tc = _pgn_tag(str(game.get("pgn") or "") or None, "TimeControl")
    if pgn_tc and pgn_tc not in {"-", "*"}:
        if "+" in pgn_tc:
            left, _, right = pgn_tc.partition("+")
            initial = _int_or_none(left)
            increment = _int_or_none(right) or 0
            if initial is not None:
                return format_clock_label(initial, increment)
        return pgn_tc
    return str(game.get("speed") or game.get("perf") or "").strip() or None


def perf_from_ndjson(game: dict[str, Any]) -> str | None:
    return str(game.get("speed") or game.get("perf") or "").strip() or None


def _duration_seconds(game: dict[str, Any]) -> int | None:
    start = _int_or_none(game.get("createdAt"))
    end = _int_or_none(game.get("lastMoveAt"))
    if start is None or end is None:
        return None
    return max(0, (end - start) // 1000)


def _user_side(game: dict[str, Any], username: str) -> str:
    players = game.get("players") or {}
    if not isinstance(players, dict):
        raise GameMetadataError(f"User {username!r} not in game")
    white = _player_name(players.get("white") if isinstance(players.get("white"), dict) else None)
    black = _player_name(players.get("black") if isinstance(players.get("black"), dict) else None)
    if white and _names_match(white, username):
        return "white"
    if black and _names_match(black, username):
        return "black"
    raise GameMetadataError(f"User {username!r} not in game")


def _resultado(user_side: str, winner: Any) -> str:
    if winner in (None, "", "draw"):
        return RESULT_DRAW
    if str(winner).lower() == user_side:
        return RESULT_WIN
    if str(winner).lower() in {"white", "black"}:
        return RESULT_LOSS
    return RESULT_DRAW


def game_row_from_ndjson(game: dict[str, Any], username: str) -> GameRow:
    """Map one Lichess NDJSON object to a games row (user POV)."""
    user_side = _user_side(game, username)
    opp_side = "black" if user_side == "white" else "white"
    players = game.get("players") or {}
    user_player = players.get(user_side) if isinstance(players, dict) else {}
    opp_player = players.get(opp_side) if isinstance(players, dict) else {}
    if not isinstance(user_player, dict):
        user_player = {}
    if not isinstance(opp_player, dict):
        opp_player = {}

    inicial = _int_or_none(user_player.get("rating"))
    variacion = _int_or_none(user_player.get("ratingDiff"))
    opening = game.get("opening") if isinstance(game.get("opening"), dict) else {}
    identity = identity_from_ndjson(game)
    pgn = str(game.get("pgn") or "").strip() or None
    ritmo = ritmo_from_ndjson(game)
    perf = perf_from_ndjson(game)

    return GameRow(
        game_id=identity.game_id,
        lichess_id=identity.lichess_id,
        fecha=_fecha_from_created_at(game.get("createdAt")),
        usuario=username,
        color=COLOR_WHITE if user_side == "white" else COLOR_BLACK,
        rival=_player_name(opp_player),
        resultado=_resultado(user_side, game.get("winner")),
        ritmo=ritmo,
        perf=perf,
        duracion_segundos=_duration_seconds(game),
        ranking_inicial=inicial,
        variacion_ranking=variacion,
        ranking_final=ranking_final(inicial, variacion),
        apertura=str(opening.get("name") or "").strip() or None,
        eco=str(opening.get("eco") or "").strip() or None,
        cantidad_jugadas=total_move_count(game),
        pgn=pgn,
    )


class GameImportService:
    """Filter, identify, persist metadata, then cloud evals or local Stockfish fallback."""

    def import_game(
        self,
        repo: StatisticsRepository,
        game: dict[str, Any],
        username: str,
        *,
        force_stockfish: bool = False,
        fallback_local: bool = True,
        stockfish_service: StockfishAnalysisService | None = None,
        analyze: bool = True,
    ) -> InsertResult | None:
        decision = filter_import_game(game)
        if not decision.keep:
            return None
        row = game_row_from_ndjson(game, username)
        result = repo.insert_game(row.game_id, **row.insert_fields())
        if not result.inserted:
            repo.update_game_fields(
                result.game_id,
                ritmo=row.ritmo,
                perf=row.perf,
            )
        if not analyze:
            return result
        eval_result = persist_evals(
            repo,
            game,
            game_id=result.game_id,
            force_stockfish=force_stockfish,
            fallback_local=fallback_local,
            stockfish_service=stockfish_service,
            user_color=row.color,
        )
        if not eval_result.stored and eval_result.reason in {"no_engine", "incomplete"}:
            logger.warning(
                "No accuracy metrics for %s (%s)",
                row.lichess_id or result.game_id,
                eval_result.reason,
            )
        return result
