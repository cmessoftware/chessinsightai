"""LS01-013 — orchestrate sync / analyze / export. No HTTP in export."""

from __future__ import annotations

import json
import logging
import time
from collections.abc import Iterable, Iterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from chess_statistics.client import LichessClient
from chess_statistics.db import StatisticsRepository
from chess_statistics.evals import (
    FUENTE_LICHESS,
    FUENTE_STOCKFISH_LOCAL,
    StockfishAnalysisService,
    persist_evals,
)
from chess_statistics.export import ExcelStatisticsExporter, rows_from_repository
from chess_statistics.filters import filter_import_game, filter_sync_window
from chess_statistics.import_games import GameImportService, GameMetadataError
from chess_statistics.pgn_source import iter_pgn_file
from chess_statistics.sources import SOURCE_LICHESS, uses_lichess_cloud

logger = logging.getLogger(__name__)


@dataclass
class RunReport:
    downloaded: int = 0
    new: int = 0
    skipped: int = 0
    lichess_analyzed: int = 0
    local_analyzed: int = 0
    errors: int = 0
    elapsed_s: float = 0.0
    csv_path: str | None = None
    xlsx_path: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)

    @property
    def avg_s_per_game(self) -> float | None:
        if self.downloaded < 1:
            return None
        return self.elapsed_s / self.downloaded

    def log_lines(self) -> list[str]:
        avg = self.avg_s_per_game
        lines = [
            f"downloaded={self.downloaded}",
            f"new={self.new}",
            f"skipped={self.skipped}",
            f"lichess_analyzed={self.lichess_analyzed}",
            f"local_analyzed={self.local_analyzed}",
            f"errors={self.errors}",
            f"elapsed_s={self.elapsed_s:.3f}",
            f"avg_s_per_game={avg:.3f}" if avg is not None else "avg_s_per_game=",
        ]
        if self.csv_path:
            lines.append(f"csv={self.csv_path}")
        if self.xlsx_path:
            lines.append(f"xlsx={self.xlsx_path}")
        return lines


def iter_ndjson_file(path: str | Path) -> Iterator[dict[str, Any]]:
    text = Path(path).read_text(encoding="utf-8")
    for line in text.splitlines():
        if not line.strip():
            continue
        payload = json.loads(line)
        if isinstance(payload, dict):
            yield payload


def game_payload_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return {"id": row.get("lichess_id"), "pgn": row.get("pgn")}


def _record_eval_result(report: RunReport, repo: StatisticsRepository, game_id: str) -> None:
    stored = repo.get_game(game_id)
    fuente = stored.get("fuente_evaluacion") if stored else None
    if fuente == FUENTE_LICHESS:
        report.lichess_analyzed += 1
    elif fuente == FUENTE_STOCKFISH_LOCAL:
        report.local_analyzed += 1


class GameStatisticsService:
    """Sync / analyze / export using repository, importer, and exporter."""

    def __init__(
        self,
        repo: StatisticsRepository,
        *,
        importer: GameImportService | None = None,
        exporter: ExcelStatisticsExporter | None = None,
        stockfish_service: StockfishAnalysisService | None = None,
        clock: Any = time.monotonic,
    ) -> None:
        self._repo = repo
        self._importer = importer or GameImportService()
        self._exporter = exporter or ExcelStatisticsExporter()
        self._stockfish = stockfish_service
        self._clock = clock

    def sync(
        self,
        games: Iterable[dict[str, Any]],
        username: str,
        *,
        analyze: bool = True,
        force_stockfish: bool = False,
        fallback_local: bool = True,
        max_games: int | None = None,
        dry_run: bool = False,
        since: str | None = None,
        until: str | None = None,
        perf_type: str | None = None,
    ) -> RunReport:
        started = self._clock()
        report = RunReport()
        for game in games:
            window = filter_sync_window(
                game, since=since, until=until, perf_type=perf_type
            )
            if window is not None:
                report.skipped += 1
                logger.info("skipped id=%s reason=%s", game.get("id"), window.reason)
                continue
            if max_games is not None and report.downloaded >= max_games:
                break
            report.downloaded += 1
            decision = filter_import_game(game)
            if not decision.keep:
                report.skipped += 1
                logger.info("skipped id=%s reason=%s", game.get("id"), decision.reason)
                continue
            if dry_run:
                report.new += 1
                continue
            try:
                result = self._importer.import_game(
                    self._repo,
                    game,
                    username,
                    force_stockfish=force_stockfish,
                    fallback_local=fallback_local,
                    stockfish_service=self._stockfish,
                    analyze=analyze,
                )
            except GameMetadataError:
                report.skipped += 1
                logger.info("skipped id=%s reason=user_not_in_game", game.get("id"))
                continue
            except Exception:
                report.errors += 1
                logger.exception("Failed to import game id=%s", game.get("id"))
                continue
            if result is None:
                report.skipped += 1
                continue
            if result.inserted:
                report.new += 1
            else:
                report.skipped += 1
            if analyze:
                if result.inserted or force_stockfish:
                    _record_eval_result(report, self._repo, result.game_id)
        report.elapsed_s = self._clock() - started
        for line in report.log_lines():
            logger.info("%s", line)
        return report

    def analyze(
        self,
        username: str,
        *,
        only_missing: bool = True,
        force_stockfish: bool = False,
        fallback_local: bool = True,
        since: str | None = None,
        until: str | None = None,
        ritmo: str | None = None,
        lichess_id: str | None = None,
        game_id: str | None = None,
        max_games: int | None = None,
        dry_run: bool = False,
    ) -> RunReport:
        started = self._clock()
        report = RunReport()
        rows = self._repo.list_games(
            usuario=username,
            since=since,
            until=until,
            ritmo=ritmo,
            lichess_id=lichess_id,
            game_id=game_id,
            only_missing=only_missing and not force_stockfish,
            limit=max_games,
        )
        for row in rows:
            report.downloaded += 1
            if dry_run:
                report.new += 1
                continue
            payload = game_payload_from_row(row)
            try:
                result = persist_evals(
                    self._repo,
                    payload,
                    game_id=row["game_id"],
                    force_stockfish=force_stockfish
                    or not uses_lichess_cloud(str(row.get("source_platform") or SOURCE_LICHESS)),
                    fallback_local=fallback_local,
                    stockfish_service=self._stockfish,
                    user_color=row.get("color"),
                )
            except Exception:
                report.errors += 1
                logger.exception("Failed to analyze game_id=%s", row.get("game_id"))
                continue
            if result.stored:
                _record_eval_result(report, self._repo, row["game_id"])
            else:
                report.skipped += 1
        report.elapsed_s = self._clock() - started
        for line in report.log_lines():
            logger.info("%s", line)
        return report

    def export(
        self,
        *,
        csv_path: str | Path,
        xlsx_path: str | Path,
        usuario: str | None = None,
        since: str | None = None,
        until: str | None = None,
        ritmo: str | None = None,
        last_n: int | None = None,
        dry_run: bool = False,
    ) -> RunReport:
        started = self._clock()
        report = RunReport()
        rows = rows_from_repository(
            self._repo,
            usuario=usuario,
            since=since,
            until=until,
            ritmo=ritmo,
            last_n=last_n,
        )
        report.downloaded = len(rows)
        if dry_run:
            report.elapsed_s = self._clock() - started
            for line in report.log_lines():
                logger.info("%s", line)
            return report
        csv_out, xlsx_out = self._exporter.export(
            self._repo,
            csv_path=csv_path,
            xlsx_path=xlsx_path,
            usuario=usuario,
            since=since,
            until=until,
            ritmo=ritmo,
            last_n=last_n,
        )
        report.csv_path = str(csv_out)
        report.xlsx_path = str(xlsx_out)
        report.elapsed_s = self._clock() - started
        for line in report.log_lines():
            logger.info("%s", line)
        return report


def iter_games_from_client(
    client: LichessClient,
    username: str,
    *,
    since: str | None = None,
    until: str | None = None,
    perf_type: str | None = None,
    max_games: int | None = None,
) -> Iterator[dict[str, Any]]:
    yield from client.iter_user_games(
        username,
        since=since,
        until=until,
        perf_type=perf_type,
        max_games=max_games,
    )
