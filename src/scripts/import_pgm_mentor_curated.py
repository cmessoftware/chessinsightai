#!/usr/bin/env python3
"""
Import curated PGN Mentor archives into Coach (shared PGM library).

Usage (from repo root, .env with DATABASE_URL):
  python src/scripts/import_pgm_mentor_curated.py --dry-run
  python src/scripts/import_pgm_mentor_curated.py --owner-user-id 1
  python src/scripts/import_pgm_mentor_curated.py --players Fischer,Tal --max-games 20

Slugs default to PgnMentorPlayerSlug (26 GMs). Data dir: PGM_MENTOR_DATA_DIR or data/games/fide_processed.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT / "src" / "api"))

import dotenv
from sqlalchemy.orm import sessionmaker

dotenv.load_dotenv(ROOT / ".env")

from database import engine  # noqa: E402
from modules.module07.repository import create_games_from_ingest  # noqa: E402
from modules.pgm.mentor_import import load_player_selection  # noqa: E402
from modules.pgm.mentor_roster import (  # noqa: E402
    DEFAULT_ROSTER_JSON,
    load_roster_config,
    resolve_slugs,
    roster_players,
)


def _max_games_for_slug(slug: str, default_max: int, roster_path: Path | None) -> int:
    for row in roster_players(roster_path):
        if row.get("slug") == slug and row.get("max_games") is not None:
            return int(row["max_games"])
    return default_max


def main() -> int:
    parser = argparse.ArgumentParser(description="Import PGN Mentor ZIPs into coach_games (PGM corpus).")
    parser.add_argument(
        "--players",
        help="Comma-separated ZIP slugs (default: all 26 in PgnMentorPlayerSlug)",
    )
    parser.add_argument(
        "--max-games",
        type=int,
        default=None,
        help="Override max games per player (default: roster JSON or 100)",
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=None,
        help="Directory with {Slug}.zip files",
    )
    parser.add_argument(
        "--roster-json",
        type=Path,
        default=DEFAULT_ROSTER_JSON,
        help="Roster config (max_games per player)",
    )
    parser.add_argument(
        "--owner-user-id",
        type=int,
        default=int(os.environ.get("PGM_LIBRARY_OWNER_USER_ID", "0") or 0),
        help="coach_games owner (shared library user); env PGM_LIBRARY_OWNER_USER_ID",
    )
    parser.add_argument(
        "--corpus-type",
        default=os.environ.get("PGM_MENTOR_CORPUS_TYPE", "elite"),
    )
    parser.add_argument(
        "--imported-by",
        default=os.environ.get("PGM_MENTOR_IMPORTED_BY", "pgm_mentor_import"),
    )
    parser.add_argument("--dry-run", action="store_true", help="Count selection only; no DB writes")
    parser.add_argument("--commit-batch", type=int, default=100, help="Games per DB transaction")
    args = parser.parse_args()

    data_dir = args.data_dir or Path(
        os.environ.get("PGM_MENTOR_DATA_DIR", str(ROOT / "data" / "games" / "fide_processed"))
    )
    if not data_dir.is_dir():
        print(f"ERROR: data dir not found: {data_dir}", file=sys.stderr)
        return 1

    if args.max_games is not None:
        default_max = int(args.max_games)
    else:
        default_max = int(load_roster_config(args.roster_json).get("max_games_per_player", 100))

    if args.players:
        slugs = resolve_slugs(players=args.players.split(","), use_enum_defaults=False)
    else:
        slugs = resolve_slugs(use_enum_defaults=True)

    print(f"Players ({len(slugs)}): {', '.join(slugs)}")
    print(f"Data: {data_dir}")

    total_parsed = 0
    total_with_comments = 0
    pending_parsed: list = []
    pending_prov: list[dict] = []

    for slug in slugs:
        cap = _max_games_for_slug(slug, default_max, args.roster_json)
        try:
            parsed, prov_list = load_player_selection(data_dir, slug, max_games=cap)
        except FileNotFoundError as exc:
            print(f"SKIP {slug}: {exc}")
            continue
        commented = sum(1 for p in prov_list if p.get("has_comments"))
        total_parsed += len(parsed)
        total_with_comments += commented
        print(f"  {slug}: selected {len(parsed)}/{cap} (with comments: {commented})")
        if args.dry_run:
            continue
        pending_parsed.extend(parsed)
        pending_prov.extend(prov_list)

    print(f"Total selected: {total_parsed} (with comments: {total_with_comments})")

    if args.dry_run:
        print("Dry run — no database changes.")
        return 0

    if args.owner_user_id < 1:
        print("ERROR: set --owner-user-id or PGM_LIBRARY_OWNER_USER_ID", file=sys.stderr)
        return 1

    Session = sessionmaker(bind=engine)
    db = Session()
    created = 0
    new_count = 0
    try:
        batch = max(1, args.commit_batch)
        for start in range(0, len(pending_parsed), batch):
            chunk = pending_parsed[start : start + batch]
            prov_chunk = pending_prov[start : start + batch]
            rows, flags = create_games_from_ingest(
                db,
                owner_user_id=args.owner_user_id,
                parsed_games=chunk,
                corpus_type=args.corpus_type,
                source="pgn_mentor",
                imported_by=args.imported_by,
                import_provenance=prov_chunk,
            )
            created += len(rows)
            new_count += sum(1 for f in flags if f)
        print(f"Committed {created} coach rows ({new_count} new).")
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())