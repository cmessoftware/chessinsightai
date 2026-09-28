"""Multi-game PGN ingest for Module 07 MVP (username per game)."""

from __future__ import annotations

import hashlib
import io
from dataclasses import dataclass

import chess.pgn

from modules.game_import.metadata import infer_speed_class_from_headers


@dataclass(frozen=True)
class ParsedModule07Game:
    content_game_id: str
    pgn: str
    white_player: str
    black_player: str
    result: str
    player_username: str | None
    player_color: str | None
    speed_class: str


def _content_game_id(game: chess.pgn.Game) -> str:
    exporter = chess.pgn.StringExporter(headers=True, variations=False, comments=False)
    pgn_str = game.accept(exporter)
    return hashlib.sha256(pgn_str.encode("utf-8")).hexdigest()


def _export_game_pgn(game: chess.pgn.Game) -> str:
    exporter = chess.pgn.StringExporter(headers=True, variations=True, comments=True)
    return game.accept(exporter)


def resolve_player_color(white: str, black: str, username: str) -> str:
    """Return ``white`` or ``black`` when username matches a PGN header (case-insensitive)."""
    name = (username or "").strip()
    if not name:
        raise ValueError("player username is required")
    w = (white or "").strip()
    b = (black or "").strip()
    key = name.casefold()
    if key == w.casefold():
        return "white"
    if key == b.casefold():
        return "black"
    raise ValueError(
        f"username {name!r} does not match White {w!r} or Black {b!r} in this game"
    )


def parse_games_from_pgn_text(
    pgn_text: str,
    *,
    player_username: str | None = None,
) -> list[ParsedModule07Game]:
    """Parse every game in a PGN blob. Player POV is optional until analysis is queued."""
    text = (pgn_text or "").strip()
    if not text:
        raise ValueError("PGN text is empty")

    stream = io.StringIO(text)
    parsed: list[ParsedModule07Game] = []
    while True:
        game = chess.pgn.read_game(stream)
        if game is None:
            break
        headers = game.headers
        white = headers.get("White", "?")
        black = headers.get("Black", "?")
        pov_name = (player_username or "").strip() or None
        if pov_name:
            color = resolve_player_color(white, black, pov_name)
            pov_color: str | None = color
        else:
            pov_color = None
        pgn = _export_game_pgn(game)
        parsed.append(
            ParsedModule07Game(
                content_game_id=_content_game_id(game),
                pgn=pgn,
                white_player=white,
                black_player=black,
                result=headers.get("Result", "*"),
                player_username=pov_name,
                player_color=pov_color,
                speed_class=infer_speed_class_from_headers(dict(headers)),
            )
        )

    if not parsed:
        raise ValueError("Could not parse any game from PGN")
    return parsed
