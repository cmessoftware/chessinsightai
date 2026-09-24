"""Tests for LS01-021 — tactical motifs and endgame signatures on layer B positions."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import chess

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from chess_statistics.learning_events import learning_event_from_eval  # noqa: E402
from chess_statistics.motifs import (  # noqa: E402
    MOTIF_FORK,
    MOTIF_PIN,
    annotate_position_tags,
    endgame_signature_from_fen,
    is_endgame_material,
    material_signature,
    tactical_motifs_from_fen,
)

FEN_PIN = "4k3/8/2n5/1B6/8/8/8/4K3 b - - 0 1"
FEN_KRP_VS_KR = "4K2R/8/3P4/8/8/8/4k2r/8 w - - 0 1"


def _fork_fen() -> str:
    board = chess.Board(None)
    board.clear_board()
    board.set_piece_at(chess.G8, chess.Piece(chess.KING, chess.BLACK))
    board.set_piece_at(chess.E1, chess.Piece(chess.KING, chess.WHITE))
    board.set_piece_at(chess.C8, chess.Piece(chess.ROOK, chess.BLACK))
    board.set_piece_at(chess.E7, chess.Piece(chess.KNIGHT, chess.WHITE))
    board.turn = chess.WHITE
    return board.fen()


def test_pin_fixture():
    assert MOTIF_PIN in tactical_motifs_from_fen(FEN_PIN)


def test_fork_fixture():
    assert MOTIF_FORK in tactical_motifs_from_fen(_fork_fen())


def test_krp_vs_kr_signature():
    board = chess.Board(FEN_KRP_VS_KR)
    assert material_signature(board) == "KRPvsKR"
    assert is_endgame_material(board)
    assert endgame_signature_from_fen(FEN_KRP_VS_KR, phase="endgame") == "KRPvsKR"


def test_middlegame_not_signed_as_endgame():
    start = chess.Board().fen()
    assert not is_endgame_material(chess.Board(start))
    assert endgame_signature_from_fen(start, phase="endgame") is None
    assert endgame_signature_from_fen(start, phase="middlegame") is None


def test_learning_event_carries_motif_tags():
    game = {
        "game_id": "g1",
        "color": "WHITE",
        "perf": "rapid",
        "ritmo": "15+10",
        "lichess_id": "abc",
    }
    eval_row = {
        "ply": 5,
        "fen": FEN_PIN,
        "move_san": "h6",
        "cp_loss": 200,
        "judgment": "Mistake",
        "phase": "opening",
    }
    event = learning_event_from_eval(game, eval_row)
    assert event is not None
    assert MOTIF_PIN in event["tactical_motifs"]
    assert event["endgame_signature"] is None

    tags = annotate_position_tags(FEN_KRP_VS_KR, phase="endgame")
    assert tags["endgame_signature"] == "KRPvsKR"
