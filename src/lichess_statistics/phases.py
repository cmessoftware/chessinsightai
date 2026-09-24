"""LS01-010 — game-phase classifier (replaceable).

Priority:
1. Lichess NDJSON ``division`` (``middle`` / ``end`` ply thresholds).
2. Port of scalachess ``Divider`` (majors/minors, sparse back rank, mixedness).
3. Documented fallback matching ``features_generator`` piece-count
   (>=24 opening, >=12 middlegame, else endgame). Not ply-number cuts.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import chess

from lichess_statistics.accuracy import CP_INITIAL, game_accuracy_percent

PHASE_OPENING = "opening"
PHASE_MIDDLEGAME = "middlegame"
PHASE_ENDGAME = "endgame"

SOURCE_NDJSON = "lichess_ndjson"
SOURCE_DIVIDER = "lichess_divider"
SOURCE_PIECE_COUNT = "piece_count"


@dataclass(frozen=True)
class GameDivision:
    middle: int | None
    end: int | None
    plies: int
    source: str

    def phase_of(self, ply: int) -> str:
        if self.middle is None or ply < self.middle:
            return PHASE_OPENING
        if self.end is not None and self.end <= ply:
            return PHASE_ENDGAME
        return PHASE_MIDDLEGAME


def _popcount(bitboard: int) -> int:
    return bitboard.bit_count()


def majors_and_minors(board: chess.Board) -> int:
    """Non-king, non-pawn pieces (Lichess Divider)."""
    return _popcount(board.occupied & ~board.kings & ~board.pawns)


def backrank_sparse(board: chess.Board) -> bool:
    white_home = _popcount(chess.BB_RANK_1 & board.occupied_co[chess.WHITE])
    black_home = _popcount(chess.BB_RANK_8 & board.occupied_co[chess.BLACK])
    return white_home < 4 or black_home < 4


def _mixedness_score(y: int, white: int, black: int) -> int:
    """Port of scalachess ``Divider.score`` (y is 1-based region rank)."""
    if white == 0:
        if black == 1:
            return 1 + y
        if black == 2:
            return 2 + (6 - y) if y < 6 else 0
        if black in {3, 4}:
            return 3 + (7 - y) if y < 7 else 0
        return 0
    if white == 1:
        if black == 0:
            return 1 + (8 - y)
        if black == 1:
            return 5 + abs(4 - y)
        if black == 2:
            return 4 + (7 - y)
        if black == 3:
            return 5 + (7 - y)
        return 0
    if white == 2:
        if black == 0:
            return 2 + (y - 2) if y > 2 else 0
        if black == 1:
            return 4 + (y - 1)
        if black == 2:
            return 7
        return 0
    if white == 3:
        if black == 0:
            return 3 + (y - 1) if y > 1 else 0
        if black == 1:
            return 5 + (y - 1)
        return 0
    if white == 4:
        if black == 0:
            return 3 + (y - 1) if y > 1 else 0
        return 0
    return 0


def mixedness(board: chess.Board) -> int:
    total = 0
    small = 0x0303
    for index in range(49):
        y_off, x_off = divmod(index, 7)
        region = small << (x_off + 8 * y_off)
        y = y_off + 1
        white = _popcount(board.occupied_co[chess.WHITE] & region)
        black = _popcount(board.occupied_co[chess.BLACK] & region)
        total += _mixedness_score(y, white, black)
    return total


def _is_middlegame_board(board: chess.Board) -> bool:
    return (
        majors_and_minors(board) <= 10
        or backrank_sparse(board)
        or mixedness(board) > 150
    )


def boards_from_sans(sans: list[str]) -> list[chess.Board]:
    board = chess.Board()
    boards = [board.copy()]
    for san in sans:
        try:
            board.push_san(san)
        except ValueError:
            break
        boards.append(board.copy())
    return boards


def division_from_ndjson(game: dict[str, Any] | None) -> GameDivision | None:
    if not game:
        return None
    raw = game.get("division")
    if not isinstance(raw, dict):
        return None
    middle = raw.get("middle")
    end = raw.get("end")
    try:
        middle_i = int(middle) if middle is not None else None
    except (TypeError, ValueError):
        middle_i = None
    try:
        end_i = int(end) if end is not None else None
    except (TypeError, ValueError):
        end_i = None
    if middle_i is None and end_i is None:
        return None
    plies = 0
    moves = str(game.get("moves") or "").split()
    if moves:
        plies = len(moves)
    return GameDivision(middle=middle_i, end=end_i, plies=plies, source=SOURCE_NDJSON)


def division_from_divider(boards: list[chess.Board]) -> GameDivision:
    """Port of scalachess ``Divider.apply`` (board index == plies completed)."""
    mid: int | None = None
    for index, board in enumerate(boards):
        if _is_middlegame_board(board):
            mid = index
            break
    end: int | None = None
    if mid is not None:
        for index, board in enumerate(boards):
            if majors_and_minors(board) <= 6:
                end = index
                break
    if mid is not None and end is not None and mid >= end:
        mid = None
    return GameDivision(middle=mid, end=end, plies=max(0, len(boards) - 1), source=SOURCE_DIVIDER)


def phase_from_piece_count(board: chess.Board) -> str:
    """Fallback identical to ``src/modules/features_generator.py`` (piece_count)."""
    count = len(board.piece_map())
    if count >= 24:
        return PHASE_OPENING
    if count >= 12:
        return PHASE_MIDDLEGAME
    return PHASE_ENDGAME


def classify_game(
    *,
    game: dict[str, Any] | None = None,
    sans: list[str] | None = None,
    ply_count: int = 0,
) -> GameDivision:
    ndjson = division_from_ndjson(game)
    if ndjson is not None:
        if ndjson.plies <= 0 and ply_count:
            return GameDivision(ndjson.middle, ndjson.end, ply_count, ndjson.source)
        return ndjson
    tokens = list(sans or [])
    if not tokens and game:
        tokens = str(game.get("moves") or "").split()
    if tokens:
        boards = boards_from_sans(tokens)
        return division_from_divider(boards)
    return GameDivision(middle=None, end=None, plies=ply_count, source=SOURCE_PIECE_COUNT)


def phase_labels(
    ply_count: int,
    division: GameDivision,
    *,
    boards_after_ply: list[chess.Board] | None = None,
) -> list[str]:
    """Phase of each 1-based ply (the move just played)."""
    labels: list[str] = []
    use_pieces = division.source == SOURCE_PIECE_COUNT and boards_after_ply is not None
    for ply in range(1, ply_count + 1):
        if use_pieces:
            board = boards_after_ply[ply] if ply < len(boards_after_ply) else boards_after_ply[-1]
            labels.append(phase_from_piece_count(board))
        else:
            labels.append(division.phase_of(ply))
    return labels


def phase_accuracies(
    ply_cps: list[int | None],
    user_color: str,
    division: GameDivision,
) -> dict[str, float | None]:
    """Reuse LS01-009 ``gameAccuracy`` on each phase slice (lila phaseAccuracies)."""
    n = len(ply_cps)
    labels = phase_labels(n, division)
    result: dict[str, float | None] = {
        PHASE_OPENING: None,
        PHASE_MIDDLEGAME: None,
        PHASE_ENDGAME: None,
    }
    for phase in (PHASE_OPENING, PHASE_MIDDLEGAME, PHASE_ENDGAME):
        indices = [i for i, name in enumerate(labels) if name == phase]
        if not indices:
            continue
        first_ply = indices[0] + 1
        slice_cps = [ply_cps[i] for i in indices]
        if first_ply == 1:
            initial = CP_INITIAL
        else:
            prev = ply_cps[first_ply - 2]
            initial = CP_INITIAL if prev is None else prev
        start_white = first_ply % 2 == 1
        result[phase] = game_accuracy_percent(
            slice_cps,
            user_color,
            start_white=start_white,
            initial_cp=initial,
        )
    return result


def persist_phases(
    repo: Any,
    game_id: str,
    user_color: str,
    ply_cps: list[int | None],
    *,
    game: dict[str, Any] | None = None,
    sans: list[str] | None = None,
) -> GameDivision:
    n = len(ply_cps)
    division = classify_game(game=game, sans=sans, ply_count=n)
    boards = None
    if division.source == SOURCE_PIECE_COUNT and sans:
        boards = boards_from_sans(sans)
        division = GameDivision(None, None, n, SOURCE_PIECE_COUNT)
    labels = phase_labels(n, division, boards_after_ply=boards)
    for ply, phase in enumerate(labels, start=1):
        repo.set_eval_phase(game_id, ply, phase)
    acc = phase_accuracies(ply_cps, user_color, division)
    game_row = repo.get_game(game_id)
    usuario = game_row.get("usuario") if game_row else None
    repo.upsert_stats(
        game_id,
        usuario=usuario,
        precision_apertura=acc[PHASE_OPENING],
        precision_medio_juego=acc[PHASE_MIDDLEGAME],
        precision_final=acc[PHASE_ENDGAME],
    )
    return division
