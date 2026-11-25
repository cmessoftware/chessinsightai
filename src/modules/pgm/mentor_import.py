"""Select and parse PGN Mentor ZIP games for PGM shared library import."""

from __future__ import annotations

import io
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

import chess.pgn

from modules.game_import.metadata import infer_speed_class_from_headers
from modules.module07.ingest import (
    ParsedModule07Game,
    ensure_fen_setup_headers,
    normalize_header_player,
    normalize_result,
)


MIN_MAINLINE_PLIES = 10


def _mainline_plies(game: chess.pgn.Game) -> int:
    n = 0
    node = game
    while node.variations:
        node = node.variation(0)
        n += 1
    return n


def _has_pgn_comments(game: chess.pgn.Game) -> bool:
    if (game.comment or "").strip():
        return True
    node = game
    while node.variations:
        node = node.variation(0)
        if (node.comment or "").strip():
            return True
    return False


def _is_study_position(game: chess.pgn.Game) -> bool:
    return bool((game.headers.get("SetUp") or "").strip() == "1" or (game.headers.get("FEN") or "").strip())


def _date_sort_key(game: chess.pgn.Game) -> str:
    return (game.headers.get("Date") or "0000.00.00").replace("?", "0")


def _export_game_pgn(game: chess.pgn.Game) -> str:
    ensure_fen_setup_headers(game)
    exporter = chess.pgn.StringExporter(headers=True, variations=True, comments=True)
    return game.accept(exporter)


def _content_game_id(game: chess.pgn.Game) -> str:
    import hashlib

    ensure_fen_setup_headers(game)
    exporter = chess.pgn.StringExporter(headers=True, variations=False, comments=False)
    pgn_str = game.accept(exporter)
    return hashlib.sha256(pgn_str.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class ScoredMentorGame:
    game: chess.pgn.Game
    mainline_plies: int
    has_comments: bool
    date_key: str


def iter_games_from_zip(zip_path: Path) -> Iterator[chess.pgn.Game]:
    with zipfile.ZipFile(zip_path) as zf:
        for name in zf.namelist():
            if not name.lower().endswith(".pgn"):
                continue
            raw = zf.read(name)
            try:
                text = raw.decode("utf-8")
            except UnicodeDecodeError:
                text = raw.decode("latin-1", errors="replace")
            stream = io.StringIO(text)
            while True:
                game = chess.pgn.read_game(stream)
                if game is None:
                    break
                yield game


def score_candidates(games: Iterator[chess.pgn.Game]) -> list[ScoredMentorGame]:
    scored: list[ScoredMentorGame] = []
    for game in games:
        plies = _mainline_plies(game)
        if plies <= MIN_MAINLINE_PLIES and not _is_study_position(game):
            continue
        scored.append(
            ScoredMentorGame(
                game=game,
                mainline_plies=plies,
                has_comments=_has_pgn_comments(game),
                date_key=_date_sort_key(game),
            )
        )
    return scored


def select_games_for_import(
    scored: list[ScoredMentorGame],
    *,
    max_games: int,
) -> list[ScoredMentorGame]:
    """Prefer commented games; then longer games; then newer dates."""
    if max_games < 1:
        return []
    ordered = sorted(
        scored,
        key=lambda s: (s.has_comments, s.mainline_plies, s.date_key),
        reverse=True,
    )
    return ordered[:max_games]


def scored_to_parsed(item: ScoredMentorGame) -> ParsedModule07Game:
    game = item.game
    headers = game.headers
    white = normalize_header_player(headers.get("White"), side_label="Blancas")
    black = normalize_header_player(headers.get("Black"), side_label="Negras")
    pgn = _export_game_pgn(game)
    return ParsedModule07Game(
        content_game_id=_content_game_id(game),
        pgn=pgn,
        white_player=white,
        black_player=black,
        result=normalize_result(headers.get("Result")),
        player_username=None,
        player_color=None,
        speed_class=infer_speed_class_from_headers(dict(headers)),
    )


def build_provenance(
    *,
    player_slug: str,
    display_name: str | None,
    scored: ScoredMentorGame,
) -> dict:
    return {
        "provider": "pgn_mentor",
        "pgm_curated": True,
        "player_slug": player_slug,
        "gm_display": display_name or player_slug,
        "archive": f"{player_slug}.zip",
        "has_comments": scored.has_comments,
        "mainline_plies": scored.mainline_plies,
        "event_date": scored.date_key,
    }


def load_player_selection(
    data_dir: Path,
    player_slug: str,
    *,
    max_games: int,
) -> tuple[list[ParsedModule07Game], list[dict]]:
    zip_path = data_dir / f"{player_slug}.zip"
    if not zip_path.is_file():
        raise FileNotFoundError(f"Missing archive: {zip_path}")
    scored = score_candidates(iter_games_from_zip(zip_path))
    picked = select_games_for_import(scored, max_games=max_games)
    parsed = [scored_to_parsed(s) for s in picked]
    return parsed, [build_provenance(player_slug=player_slug, display_name=None, scored=s) for s in picked]