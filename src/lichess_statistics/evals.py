"""LS01-006 / LS01-007 — Lichess cloud evals and local Stockfish fallback."""

from __future__ import annotations

import io
import logging
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

import chess
import chess.engine
import chess.pgn

from lichess_statistics.accuracy import (
    force_as_cp,
    persist_judgments,
    persist_user_accuracy,
    win_percent_user_pov,
)
from lichess_statistics.db import StatisticsRepository
from lichess_statistics.phases import persist_phases
from lichess_statistics.filters import total_move_count
from lichess_statistics.game_id import identity_from_ndjson

logger = logging.getLogger(__name__)

FUENTE_LICHESS = "lichess"
FUENTE_STOCKFISH_LOCAL = "stockfish_local"

DEFAULT_STOCKFISH_DEPTH = 15
DEFAULT_STOCKFISH_THREADS = 1
DEFAULT_STOCKFISH_HASH_MB = 16

EngineFactory = Callable[["StockfishConfig"], chess.engine.SimpleEngine]


class StockfishConfigError(RuntimeError):
    """Local Stockfish is required but not available."""


@dataclass(frozen=True)
class CloudEvalConfig:
    engine_name: str | None
    engine_version: str | None
    depth: int | None


@dataclass(frozen=True)
class CloudEvalPly:
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
    judgment: str | None


@dataclass(frozen=True)
class CloudEvalPersistResult:
    stored: bool
    ply_count: int
    reason: str


def analysis_entries(game: dict[str, Any]) -> list[dict[str, Any]]:
    raw = game.get("analysis")
    if raw is None:
        raw = game.get("evals")
    if not isinstance(raw, list):
        return []
    return [item if isinstance(item, dict) else {} for item in raw]


def _entry_cp(entry: dict[str, Any]) -> int | None:
    if "eval" not in entry or entry.get("eval") is None:
        return None
    try:
        return int(entry["eval"])
    except (TypeError, ValueError):
        return None


def _entry_mate(entry: dict[str, Any]) -> int | None:
    if "mate" not in entry or entry.get("mate") is None:
        return None
    try:
        return int(entry["mate"])
    except (TypeError, ValueError):
        return None


def _advance_score(
    prev_cp: int | None,
    prev_mate: int | None,
    after_cp: int | None,
    after_mate: int | None,
) -> tuple[int | None, int | None]:
    if after_cp is not None:
        return after_cp, None
    if after_mate is not None:
        return None, after_mate
    return prev_cp, prev_mate


def _entry_has_score(entry: dict[str, Any]) -> bool:
    if _entry_cp(entry) is not None:
        return True
    mate = entry.get("mate")
    return mate is not None and str(mate).strip() != ""


def cloud_evals_complete(game: dict[str, Any]) -> bool:
    """True when there is one scored analysis object per ply (eval or mate)."""
    moves = total_move_count(game)
    if moves < 1:
        return False
    entries = analysis_entries(game)
    if len(entries) != moves:
        return False
    return all(_entry_has_score(entry) for entry in entries)


def cloud_eval_config(game: dict[str, Any]) -> CloudEvalConfig:
    """Engine snapshot from NDJSON when Lichess includes it (often absent)."""
    engine = game.get("engine") if isinstance(game.get("engine"), dict) else {}
    name = engine.get("name") or game.get("evalEngine") or game.get("analysisEngine")
    version = engine.get("version") or game.get("evalVersion") or game.get("stockfishVersion")
    depth = engine.get("depth") or game.get("evalDepth")
    name_text = str(name).strip() if name else None
    version_text = str(version).strip() if version else None
    depth_int: int | None
    try:
        depth_int = int(depth) if depth is not None else None
    except (TypeError, ValueError):
        depth_int = None
    return CloudEvalConfig(
        engine_name=name_text or None,
        engine_version=version_text or None,
        depth=depth_int,
    )


def _cp_loss(before: int | None, after: int | None, ply: int) -> int | None:
    if before is None or after is None:
        return None
    if ply % 2 == 1:
        return before - after
    return after - before


def _replay_move(board: chess.Board, san: str) -> tuple[str | None, str | None]:
    fen = board.fen()
    try:
        move = board.parse_san(san)
    except ValueError:
        return fen, None
    uci = move.uci()
    board.push(move)
    return fen, uci


def parse_cloud_evals(game: dict[str, Any]) -> list[CloudEvalPly] | None:
    if not cloud_evals_complete(game):
        return None
    entries = analysis_entries(game)
    move_tokens = str(game.get("moves") or "").split()
    board = chess.Board()
    rows: list[CloudEvalPly] = []
    prev_cp: int | None = None
    prev_mate: int | None = None
    for index, entry in enumerate(entries):
        ply = index + 1
        san = move_tokens[index] if index < len(move_tokens) else None
        fen, uci = (None, None)
        if san:
            fen, uci = _replay_move(board, san)
        after_cp = _entry_cp(entry)
        after_mate = _entry_mate(entry)
        judgment = None
        raw_j = entry.get("judgment")
        if isinstance(raw_j, dict):
            judgment = str(raw_j.get("name") or "").strip() or None
        best = str(entry.get("best") or "").strip() or None
        rows.append(
            CloudEvalPly(
                ply=ply,
                fen=fen,
                move_uci=uci,
                move_san=san,
                evaluation_before_cp=prev_cp,
                evaluation_after_cp=after_cp,
                mate_before=prev_mate,
                mate_after=after_mate,
                best_move=best,
                cp_loss=_cp_loss(prev_cp, after_cp, ply),
                judgment=judgment,
            )
        )
        prev_cp, prev_mate = _advance_score(prev_cp, prev_mate, after_cp, after_mate)
    return rows


def _iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _write_eval_rows(
    repo: StatisticsRepository,
    game_id: str,
    rows: list[CloudEvalPly],
    *,
    fuente_evaluacion: str,
    version_stockfish: str | None,
    profundidad_stockfish: int | None,
    user_color: str | None = None,
    game: dict[str, Any] | None = None,
) -> None:
    for row in rows:
        win_before = None
        win_after = None
        if user_color:
            win_before = win_percent_user_pov(
                row.evaluation_before_cp,
                row.mate_before,
                user_color,
                use_initial_if_missing=True,
            )
            win_after = win_percent_user_pov(
                row.evaluation_after_cp,
                row.mate_after,
                user_color,
                use_initial_if_missing=False,
            )
        repo.insert_eval(
            game_id,
            row.ply,
            fen=row.fen,
            move_uci=row.move_uci,
            move_san=row.move_san,
            evaluation_before_cp=row.evaluation_before_cp,
            evaluation_after_cp=row.evaluation_after_cp,
            best_move=row.best_move,
            cp_loss=row.cp_loss,
            judgment=row.judgment,
            win_probability_before=win_before,
            win_probability_after=win_after,
        )
    repo.set_game_analysis_meta(
        game_id,
        fuente_evaluacion=fuente_evaluacion,
        fecha_analisis=_iso_now(),
        version_stockfish=version_stockfish,
        profundidad_stockfish=profundidad_stockfish,
    )
    if user_color:
        ply_cps = [force_as_cp(row.evaluation_after_cp, row.mate_after) for row in rows]
        persist_user_accuracy(repo, game_id, user_color, ply_cps)
        persist_phases(
            repo,
            game_id,
            user_color,
            ply_cps,
            game=game,
            sans=[row.move_san for row in rows if row.move_san],
        )
        persist_judgments(repo, game_id, user_color, ply_cps)


def persist_cloud_evals(
    repo: StatisticsRepository,
    game: dict[str, Any],
    *,
    game_id: str | None = None,
    user_color: str | None = None,
) -> CloudEvalPersistResult:
    """Write one evals row per ply when cloud analysis is complete. No local engine."""
    rows = parse_cloud_evals(game)
    if not rows:
        return CloudEvalPersistResult(stored=False, ply_count=0, reason="incomplete")
    gid = game_id or identity_from_ndjson(game).game_id
    config = cloud_eval_config(game)
    version = config.engine_version or config.engine_name
    _write_eval_rows(
        repo,
        gid,
        rows,
        fuente_evaluacion=FUENTE_LICHESS,
        version_stockfish=version,
        profundidad_stockfish=config.depth,
        user_color=user_color,
        game=game,
    )
    return CloudEvalPersistResult(stored=True, ply_count=len(rows), reason="")


@dataclass(frozen=True)
class StockfishConfig:
    path: str | None = None
    depth: int = DEFAULT_STOCKFISH_DEPTH
    movetime_ms: int | None = None
    threads: int = DEFAULT_STOCKFISH_THREADS
    hash_mb: int = DEFAULT_STOCKFISH_HASH_MB

    def resolved_path(self) -> str | None:
        if self.path is not None:
            return str(self.path).strip() or None
        env = (os.environ.get("STOCKFISH_PATH") or "").strip()
        candidates = [env] if env else []
        if getattr(sys, "frozen", False):
            exe_dir = Path(sys.executable).resolve().parent
            candidates.append(str(exe_dir / "stockfish.exe"))
            candidates.append(str(exe_dir / "stockfish"))
        else:
            root = Path(__file__).resolve().parents[2]
            candidates.append(str(root / "bin" / "stockfish.exe"))
            candidates.append(str(root / "bin" / "stockfish"))
        for text in candidates:
            if text and Path(text).is_file():
                return text
        return env or None

    def binary_available(self) -> bool:
        path = self.resolved_path()
        return bool(path and Path(path).is_file())

    def limit(self) -> chess.engine.Limit:
        if self.movetime_ms is not None and self.movetime_ms > 0:
            return chess.engine.Limit(time=self.movetime_ms / 1000.0)
        return chess.engine.Limit(depth=self.depth)


def _move_sans(game: dict[str, Any]) -> list[str]:
    tokens = str(game.get("moves") or "").split()
    if tokens:
        return tokens
    pgn_text = str(game.get("pgn") or "").strip()
    if not pgn_text:
        return []
    parsed = chess.pgn.read_game(io.StringIO(pgn_text))
    if parsed is None:
        return []
    board = parsed.board()
    sans: list[str] = []
    for move in parsed.mainline_moves():
        sans.append(board.san(move))
        board.push(move)
    return sans


def _white_score(info: chess.engine.InfoDict) -> tuple[int | None, int | None]:
    score = info.get("score")
    if score is None:
        return None, None
    white = score.white()
    mate = white.mate()
    if mate is not None:
        return None, int(mate)
    cp = white.score()
    return (int(cp) if cp is not None else None), None


def _best_uci(info: chess.engine.InfoDict) -> str | None:
    pv = info.get("pv") or []
    if not pv:
        return None
    return pv[0].uci()


class StockfishAnalysisService:
    """Uniform local analysis (path / depth / movetime / threads / hash)."""

    def __init__(
        self,
        config: StockfishConfig | None = None,
        *,
        engine_factory: EngineFactory | None = None,
    ) -> None:
        self.config = config or StockfishConfig()
        self._engine_factory = engine_factory
        self._engine_version: str | None = None

    @classmethod
    def from_env(cls) -> StockfishAnalysisService | None:
        cfg = StockfishConfig()
        path = cfg.resolved_path()
        if path and cfg.binary_available():
            return cls(cfg)
        if path and not cfg.binary_available():
            logger.warning("STOCKFISH_PATH is set but no binary exists at that path")
        return None

    def available(self) -> bool:
        return self._engine_factory is not None or self.config.binary_available()

    def _open_engine(self) -> chess.engine.SimpleEngine:
        if self._engine_factory is not None:
            return self._engine_factory(self.config)
        path = self.config.resolved_path()
        if not path:
            raise StockfishConfigError("STOCKFISH_PATH is not set")
        if not Path(path).is_file():
            raise StockfishConfigError(f"Stockfish binary not found: {path}")
        return chess.engine.SimpleEngine.popen_uci(path)

    def analyse_game(self, game: dict[str, Any]) -> list[CloudEvalPly]:
        sans = _move_sans(game)
        if not sans:
            return []
        engine = self._open_engine()
        try:
            engine.configure(
                {"Threads": self.config.threads, "Hash": self.config.hash_mb}
            )
            version = None
            ident = getattr(engine, "id", None)
            if isinstance(ident, dict):
                version = str(ident.get("name") or "").strip() or None
            limit = self.config.limit()
            board = chess.Board()
            rows: list[CloudEvalPly] = []
            before_info = engine.analyse(board, limit)
            prev_cp, prev_mate = _white_score(before_info)
            prev_best = _best_uci(before_info)
            for index, san in enumerate(sans):
                ply = index + 1
                fen, uci = _replay_move(board, san)
                after_info = engine.analyse(board, limit)
                after_cp, after_mate = _white_score(after_info)
                rows.append(
                    CloudEvalPly(
                        ply=ply,
                        fen=fen,
                        move_uci=uci,
                        move_san=san,
                        evaluation_before_cp=prev_cp,
                        evaluation_after_cp=after_cp,
                        mate_before=prev_mate,
                        mate_after=after_mate,
                        best_move=prev_best,
                        cp_loss=_cp_loss(prev_cp, after_cp, ply),
                        judgment=None,
                    )
                )
                prev_cp, prev_mate = _advance_score(prev_cp, prev_mate, after_cp, after_mate)
                prev_best = _best_uci(after_info)
            self._engine_version = version
            return rows
        finally:
            engine.quit()


    def persist(
        self,
        repo: StatisticsRepository,
        game: dict[str, Any],
        *,
        game_id: str | None = None,
        replace: bool = False,
        user_color: str | None = None,
    ) -> CloudEvalPersistResult:
        gid = game_id or identity_from_ndjson(game).game_id
        rows = self.analyse_game(game)
        if not rows:
            return CloudEvalPersistResult(stored=False, ply_count=0, reason="no_moves")
        if replace:
            repo.delete_evals(gid)
        _write_eval_rows(
            repo,
            gid,
            rows,
            fuente_evaluacion=FUENTE_STOCKFISH_LOCAL,
            version_stockfish=self._engine_version,
            profundidad_stockfish=self.config.depth,
            user_color=user_color,
            game=game,
        )
        return CloudEvalPersistResult(stored=True, ply_count=len(rows), reason="")


def persist_evals(
    repo: StatisticsRepository,
    game: dict[str, Any],
    *,
    game_id: str | None = None,
    force_stockfish: bool = False,
    fallback_local: bool = True,
    stockfish_service: StockfishAnalysisService | None = None,
    user_color: str | None = None,
) -> CloudEvalPersistResult:
    """Cloud evals when complete; local Stockfish only if missing/incomplete or forced."""
    gid = game_id or identity_from_ndjson(game).game_id
    existing = repo.get_game(gid)
    if user_color is None and existing and existing.get("color"):
        user_color = str(existing["color"])
    fuente = existing.get("fuente_evaluacion") if existing else None
    eval_rows = repo.list_evals(gid) if existing else []
    if not force_stockfish and eval_rows and fuente:
        reason = "already_lichess" if fuente == FUENTE_LICHESS else "already_analyzed"
        return CloudEvalPersistResult(
            stored=False,
            ply_count=len(eval_rows),
            reason=reason,
        )
    if not force_stockfish and cloud_evals_complete(game):
        return persist_cloud_evals(repo, game, game_id=gid, user_color=user_color)

    if not fallback_local and not force_stockfish:
        return CloudEvalPersistResult(stored=False, ply_count=0, reason="incomplete")

    service = stockfish_service
    if service is None:
        service = StockfishAnalysisService.from_env()
    if service is None or not service.available():
        if force_stockfish:
            raise StockfishConfigError("force-stockfish requires a Stockfish binary or injected engine")
        return CloudEvalPersistResult(stored=False, ply_count=0, reason="no_engine")

    return service.persist(
        repo,
        game,
        game_id=gid,
        replace=force_stockfish or bool(repo.list_evals(gid)),
        user_color=user_color,
    )
