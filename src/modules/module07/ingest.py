"""Multi-game PGN ingest for Module 07 MVP (username per game)."""

from __future__ import annotations

import hashlib
import io
import re
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


def ensure_fen_setup_headers(game: chess.pgn.Game) -> None:
    """chess.js needs ``SetUp 1`` to honor a ``FEN`` header."""
    fen = (game.headers.get("FEN") or "").strip()
    if not fen:
        return
    game.headers["SetUp"] = "1"
    game.headers["FEN"] = fen


def _content_game_id(game: chess.pgn.Game) -> str:
    ensure_fen_setup_headers(game)
    exporter = chess.pgn.StringExporter(headers=True, variations=False, comments=False)
    pgn_str = game.accept(exporter)
    return hashlib.sha256(pgn_str.encode("utf-8")).hexdigest()


def _export_game_pgn(game: chess.pgn.Game) -> str:
    ensure_fen_setup_headers(game)
    exporter = chess.pgn.StringExporter(headers=True, variations=True, comments=True)
    return game.accept(exporter)


def normalize_header_player(value: str | None, *, side_label: str) -> str:
    """PGN headers often use ``?`` when missing; use stable side labels for UI and queue."""
    name = (value or "").strip()
    if not name or name == "?":
        return side_label
    return name


ALLOWED_RESULTS = ("1-0", "0-1", "1/2-1/2", "*")


def normalize_result(value: str | None) -> str:
    r = (value or "").strip().replace("\u00bd", "1/2")
    if not r or r == "*":
        return "*"
    return r


def parse_allowed_result(value: str | None) -> str:
    r = normalize_result(value)
    if r not in ALLOWED_RESULTS:
        raise ValueError("result must be 1-0, 0-1, 1/2-1/2 or *")
    return r


def rewrite_pgn_result(pgn_text: str, result: str) -> str:
    text = (pgn_text or "").strip()
    if not text:
        return pgn_text or ""
    game = chess.pgn.read_game(io.StringIO(text))
    if game is None:
        return pgn_text
    game.headers["Result"] = result
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


@dataclass(frozen=True)
class PgnParseResult:
    games: tuple[ParsedModule07Game, ...]
    total_games_in_pgn: int


def _split_pgn_into_game_chunks(text: str) -> list[str]:
    """Split a multi-game file on blank lines before the next ``[Tag]`` block."""
    stripped = text.strip()
    if not stripped:
        return []
    chunks = re.split(r"\n\s*\n(?=\[)", stripped)
    return [c.strip() for c in chunks if c.strip()]


def _collapse_movetext_blank_lines(chunk: str) -> str:
    """
    Join movetext onto one line.

    Blank lines *between* moves look like game boundaries to python-chess; annotated
    exports often use one move (or ply) per line with empty lines in between.
    """
    header: list[str] = []
    body: list[str] = []
    for raw in chunk.splitlines():
        s = raw.strip()
        if not s:
            continue
        if s.startswith("[") and not body:
            header.append(s)
        else:
            body.append(s)
    if not body:
        return "\n".join(header).strip()
    head = "\n".join(header)
    movetext = " ".join(body)
    if head:
        return f"{head}\n\n{movetext}"
    return movetext


def normalize_pgn_text_for_parse(pgn_text: str) -> str:
    chunks = _split_pgn_into_game_chunks(pgn_text)
    if not chunks:
        raise ValueError("PGN text is empty")
    return "\n\n".join(_collapse_movetext_blank_lines(c) for c in chunks)


def parse_games_from_pgn_text(
    pgn_text: str,
    *,
    player_username: str | None = None,
    max_games: int | None = None,
) -> PgnParseResult:
    """
    Parse games from a PGN blob. Player POV is optional until analysis is queued.

    When ``max_games`` is set (e.g. 1 for Coach import), only that many games are
    returned; ``total_games_in_pgn`` still reflects the full file.
    """
    text = normalize_pgn_text_for_parse(pgn_text or "")
    if max_games is not None and max_games < 1:
        raise ValueError("max_games must be at least 1")

    stream = io.StringIO(text)
    parsed: list[ParsedModule07Game] = []
    total_in_pgn = 0
    while True:
        game = chess.pgn.read_game(stream)
        if game is None:
            break
        total_in_pgn += 1
        if max_games is not None and len(parsed) >= max_games:
            continue
        headers = game.headers
        white = normalize_header_player(headers.get("White"), side_label="Blancas")
        black = normalize_header_player(headers.get("Black"), side_label="Negras")
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
                result=normalize_result(headers.get("Result")),
                player_username=pov_name,
                player_color=pov_color,
                speed_class=infer_speed_class_from_headers(dict(headers)),
            )
        )

    if total_in_pgn == 0:
        raise ValueError("Could not parse any game from PGN")
    if not parsed:
        raise ValueError("Could not parse any game from PGN")
    return PgnParseResult(games=tuple(parsed), total_games_in_pgn=total_in_pgn)
