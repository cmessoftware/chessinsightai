"""LS01-013 / LS01-014 — argparse CLI: sync / analyze / export / stats."""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from dotenv import load_dotenv

from chess_statistics.aggregates import AggregateQueryService
from chess_statistics.chesscom_client import ChessComClient
from chess_statistics.client import LichessClient
from chess_statistics.db import DEFAULT_DB_PATH, StatisticsRepository, connect, init_schema
from chess_statistics.service import (
    GameStatisticsService,
    iter_games_from_client,
    iter_ndjson_file,
    iter_pgn_file,
)
from chess_statistics.eval_policy import analyze_force_stockfish, sync_force_stockfish
from chess_statistics.sources import SOURCE_CHESSCOM, SOURCE_LICHESS, SOURCE_PGN, SOURCES
from chess_statistics.training_track import TRAINING_TRACKS


def _add_common(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--database",
        default=str(DEFAULT_DB_PATH),
        help="SQLite path or sqlite:/// URL (default: data/chess_statistics.sqlite)",
    )
    parser.add_argument(
        "--username",
        required=True,
        help="Username on the chosen source (POV for G/T/P and accuracy)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Count work without writing")


def _add_window(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--since", metavar="YYYY-MM-DD", help="Inclusive start date (UTC)")
    parser.add_argument("--until", metavar="YYYY-MM-DD", help="Inclusive end date (UTC)")
    parser.add_argument(
        "--perf-type",
        help="Speed filter: Lichess rapid/blitz/bullet/classical; Chess.com rapid/blitz/bullet/daily",
    )
    parser.add_argument("--max-games", type=int, help="Limit games (sync: Lichess download; omit to fetch all matching games)")


def _add_training_track(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--track",
        choices=TRAINING_TRACKS,
        help="Training track: rapid, classical, or daily (drops blitz/bullet)",
    )
    parser.add_argument(
        "--training",
        action="store_true",
        help="Keep rapid+classical+daily only (drop blitz/bullet); implied by --track",
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m chess_statistics",
        description="Chess statistics (LS01). Default: local Stockfish (comparable across Lichess, Chess.com, PGN). "
        "Optional --use-lichess-cloud on sync for Lichess NDJSON evals. Does not log LICHESS_API_TOKEN / LICHESS_TOKEN.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sync = sub.add_parser("sync", help="Download games; optionally analyze")
    _add_common(sync)
    _add_window(sync)
    sync.add_argument(
        "--source",
        choices=SOURCES,
        default=SOURCE_LICHESS,
        help="Game source: lichess (API/NDJSON/Lichess PGN), chess.com (pub API or PGN), pgn (local file)",
    )
    sync.add_argument(
        "--from-ndjson",
        help="Replay a local Lichess NDJSON fixture (only with --source lichess)",
    )
    sync.add_argument(
        "--from-pgn",
        help="Multi-game PGN. Lichess source keeps Lichess exports only; chess.com/pgn accept other PGNs and use local Stockfish",
    )
    sync.add_argument(
        "--download-only",
        action="store_true",
        help="Persist metadata only; skip evals and accuracy",
    )
    sync.add_argument(
        "--use-lichess-cloud",
        action="store_true",
        help="On Lichess sync only: use complete NDJSON cloud evals when present (default: always local Stockfish)",
    )
    sync.add_argument(
        "--force-stockfish",
        action="store_true",
        help="Deprecated alias for default behavior; kept for scripts",
    )

    analyze = sub.add_parser("analyze", help="Analyze games already in SQLite")
    _add_common(analyze)
    _add_window(analyze)
    analyze.add_argument(
        "--only-missing",
        action="store_true",
        help="Skip games that already have evaluations (default unless --reprocess)",
    )
    analyze.add_argument(
        "--reprocess",
        action="store_true",
        help="Re-analyze matching games even if evals exist",
    )
    analyze.add_argument("--lichess-id", help="Single Lichess game id")
    analyze.add_argument("--game-id", help="Single project SHA256 game_id")
    analyze.add_argument(
        "--force-stockfish",
        action="store_true",
        help="Default: local Stockfish from stored PGN (Lichess cloud not available on analyze)",
    )
    analyze.add_argument(
        "--use-lichess-cloud",
        action="store_true",
        help="No-op for analyze (PGN-only replay); use sync --use-lichess-cloud instead",
    )

    export = sub.add_parser("export", help="Write CSV + XLSX from SQLite (no HTTP)")
    _add_common(export)
    _add_window(export)
    export.add_argument(
        "--last-n",
        type=int,
        dest="last_n",
        help="Export only the last N games (after since/until/perf-type filters)",
    )
    export.add_argument(
        "--output",
        default="data/chess_statistics.xlsx",
        help="XLSX path (CSV is written next to it with .csv)",
    )
    export.add_argument("--csv", dest="csv_path", help="Override CSV path")
    _add_training_track(export)

    stats = sub.add_parser("stats", help="Print aggregate metrics (n + period; no engine)")
    _add_common(stats)
    _add_window(stats)
    _add_training_track(stats)
    stats.add_argument("--last-n", type=int, dest="last_n", help="Only the last N games in the window")
    stats.add_argument("--compare-since", metavar="YYYY-MM-DD", help="Start of comparison period B")
    stats.add_argument("--compare-until", metavar="YYYY-MM-DD", help="End of comparison period B")
    stats.add_argument(
        "--profile-out",
        metavar="PATH",
        help="Write player_training_profile JSON (layer C; use with --training or --track)",
    )
    return parser


def _open_repo(database: str) -> StatisticsRepository:
    conn = connect(database)
    init_schema(conn)
    return StatisticsRepository(conn)


def _games_for_sync(args: argparse.Namespace) -> object:
    source = getattr(args, "source", SOURCE_LICHESS)
    if args.from_ndjson and args.from_pgn:
        raise SystemExit("Use only one of --from-ndjson or --from-pgn")
    if source == SOURCE_PGN:
        if not args.from_pgn:
            raise SystemExit("--source pgn requires --from-pgn")
        if args.from_ndjson:
            raise SystemExit("--from-ndjson is only valid with --source lichess")
        return iter_pgn_file(args.from_pgn, require_lichess=False)
    if source == SOURCE_CHESSCOM:
        if args.from_ndjson:
            raise SystemExit("--from-ndjson is only valid with --source lichess")
        if args.from_pgn:
            return iter_pgn_file(args.from_pgn, require_lichess=False)
        return ChessComClient().iter_user_games(
            args.username,
            since=args.since,
            until=args.until,
            perf_type=args.perf_type,
            max_games=args.max_games,
        )
    if args.from_ndjson:
        return iter_ndjson_file(args.from_ndjson)
    if args.from_pgn:
        return iter_pgn_file(args.from_pgn, require_lichess=True)
    client = LichessClient()
    return iter_games_from_client(
        client,
        args.username,
        since=args.since,
        until=args.until,
        perf_type=args.perf_type,
        max_games=args.max_games,
    )


def _load_env() -> None:
    load_dotenv()
    search: list[Path] = [Path.cwd() / ".env"]
    if getattr(sys, "frozen", False):
        search.append(Path(sys.executable).resolve().parent / ".env")
    else:
        repo_root = Path(__file__).resolve().parents[2]
        search.append(repo_root / ".env")
        search.append(repo_root / "src" / ".env")
    for path in search:
        load_dotenv(path)


def run(argv: list[str] | None = None) -> int:
    _load_env()
    parser = build_parser()
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    repo = _open_repo(args.database)
    service = GameStatisticsService(repo)
    if args.command == "sync":
        if args.force_stockfish and args.use_lichess_cloud:
            raise SystemExit("Use only one of --force-stockfish and --use-lichess-cloud")
        service.sync(
            _games_for_sync(args),
            args.username,
            analyze=not args.download_only,
            force_stockfish=sync_force_stockfish(
                source=args.source,
                use_lichess_cloud=bool(args.use_lichess_cloud),
            ),
            max_games=args.max_games,
            dry_run=args.dry_run,
            since=args.since,
            until=args.until,
            perf_type=args.perf_type,
        )
        return 0
    if args.command == "analyze":
        only_missing = not args.reprocess and not args.force_stockfish
        service.analyze(
            args.username,
            only_missing=only_missing,
            force_stockfish=analyze_force_stockfish(
                use_lichess_cloud=bool(getattr(args, "use_lichess_cloud", False)),
            ),
            since=args.since,
            until=args.until,
            ritmo=args.perf_type,
            lichess_id=args.lichess_id,
            game_id=args.game_id,
            max_games=args.max_games,
            dry_run=args.dry_run,
        )
        return 0
    if args.command == "stats":
        queries = AggregateQueryService(repo)
        if args.compare_since or args.compare_until:
            payload = queries.compare_periods(
                args.username,
                period_a=(args.since, args.until),
                period_b=(args.compare_since, args.compare_until),
                ritmo=args.perf_type,
                track=args.track,
                training_only=args.training,
            )
        else:
            payload = queries.report(
                args.username,
                since=args.since,
                until=args.until,
                ritmo=args.perf_type,
                last_n=args.last_n,
                track=args.track,
                training_only=args.training,
            )
        print(json.dumps(payload, ensure_ascii=False, indent=2, default=str))
        profile_out = getattr(args, "profile_out", None)
        if profile_out:
            profile = payload.get("training_profile") if isinstance(payload, dict) else None
            if not profile and isinstance(payload, dict) and "period_a" not in payload:
                raise SystemExit("--profile-out requires --training or --track")
            if isinstance(payload, dict) and "period_a" in payload:
                raise SystemExit("--profile-out cannot be used with --compare-since/until")
            out_path = Path(profile_out)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(
                json.dumps(profile, ensure_ascii=False, indent=2, default=str),
                encoding="utf-8",
            )
        return 0
    output = Path(args.output)
    csv_path = Path(args.csv_path) if args.csv_path else output.with_suffix(".csv")
    xlsx_path = output if output.suffix.lower() in {".xlsx", ".xlsm"} else output.with_suffix(".xlsx")
    if output.suffix.lower() == ".csv":
        csv_path = output
        xlsx_path = output.with_suffix(".xlsx")
    service.export(
        csv_path=csv_path,
        xlsx_path=xlsx_path,
        usuario=args.username,
        since=args.since,
        until=args.until,
        ritmo=args.perf_type,
        last_n=args.last_n or args.max_games,
        track=getattr(args, "track", None),
        training_only=bool(getattr(args, "training", False)),
        dry_run=args.dry_run,
    )
    return 0


def main() -> None:
    sys.exit(run())
