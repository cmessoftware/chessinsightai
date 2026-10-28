"""FEAT-068 — sparring status payload."""

from __future__ import annotations

import os
import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[2] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from modules.sparring.status import build_sparring_status


def test_sparring_status_default_env(monkeypatch):
    monkeypatch.delenv("MAIA_PROVIDER", raising=False)
    body = build_sparring_status()
    assert body["maia_config_ok"] is True
    assert body["provider"] == "maia3"
    assert body["capabilities"]["model_name"] == "Maia3"
    assert body["sessions_api_enabled"] is False
    assert body["mvp_ready"] is False


def test_sparring_status_invalid_provider(monkeypatch):
    monkeypatch.setenv("MAIA_PROVIDER", "invalid")
    body = build_sparring_status()
    assert body["maia_config_ok"] is False
    assert body["maia_config_error"]
