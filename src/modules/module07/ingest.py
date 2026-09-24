"""Multi-game PGN ingest for Module 07 MVP (username per game)."""

from __future__ import annotations

import hashlib
import io
from dataclasses import dataclass

import chess.pgn


@dataclass(frozen=True)
class ParsedModule07Game:
    content_game_id: str
    pgn: str
    white_player: str
    black_player: str
    result: str
    player_username: str
    player_color: str


def _content_game_id(game: chess.pgn.Game) -> str:
    exporter = chess.pgn.StringExporter(headers=True, variations=False, comments=False)
    pgn_str = game.accept(exporter)
    return hashlib.sha256(pgn_str.encode("utf-8")).hexdigest()


def _export_game_pgn(game: chess.pgn.Game) -> str:
    exporter = chess.pgn.StringExporter(headers=True, variations=True, comments=True)
    return game.accept(exporter)


def resolve_player_color(white: str, black: str, username: str) -> str:
    """Return ``white`` or ``black`` when username matches a PGN header."""
    name = (username or "").strip()
    if not name:
        raise ValueError("player username is required")
    w = (white or "").strip()
    b = (black or "").strip()
    if name == w:
        return "white"
    if name == b:
        return "black"
    raise ValueError(
        f"username {name!r} does not match White {w!r} or Black {b!r} in this game"
    )


def parse_games_from_pgn_text(
    pgn_text: str,
    *,
    player_username: str,
) -> list[ParsedModule07Game]:
    """Parse every game in a PGN blob; same username must match each game's headers."""
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
        color = resolve_player_color(white, black, player_username)
        pgn = _export_game_pgn(game)
        parsed.append(
            ParsedModule07Game(
                content_game_id=_content_game_id(game),
                pgn=pgn,
                white_player=white,
                black_player=black,
                result=headers.get("Result", "*"),
                player_username=player_username.strip(),
                player_color=color,
            )
        )

    if not parsed:
        raise ValueError("Could not parse any game from PGN")
    return parsed
