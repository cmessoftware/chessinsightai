"""Tablero python-chess desde contexto de sparring."""

from __future__ import annotations

import chess

from modules.sparring.types import PositionContext


def board_from_context(ctx: PositionContext) -> chess.Board:
    board = chess.Board(ctx.fen)
    for uci in ctx.uci_history:
        move = chess.Move.from_uci(uci)
        if move not in board.legal_moves:
            raise ValueError(f"illegal move in history: {uci!r}")
        board.push(move)
    return board
