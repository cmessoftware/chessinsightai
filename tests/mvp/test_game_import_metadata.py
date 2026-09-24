"""UI-104 — corpus_type and speed_class helpers."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

SRC_DIR = Path(__file__).resolve().parents[2] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from modules.game_import.metadata import (
    infer_speed_class_from_headers,
    resolve_corpus_type,
)


def test_resolve_corpus_personal_always():
    assert resolve_corpus_type("personal", []) == "personal"
    assert resolve_corpus_type(None, []) == "personal"


def test_resolve_corpus_admin_only():
    assert resolve_corpus_type("elite", ["admin"]) == "elite"
    with pytest.raises(ValueError, match="admin-only"):
        resolve_corpus_type("elite", ["basic_gamer"])


def test_infer_speed_blitz_from_timecontrol():
    assert (
        infer_speed_class_from_headers({"TimeControl": "120+2"})
        == "blitz"
    )


def test_infer_speed_classical():
    assert (
        infer_speed_class_from_headers({"TimeControl": "900+10"})
        == "classical"
    )
