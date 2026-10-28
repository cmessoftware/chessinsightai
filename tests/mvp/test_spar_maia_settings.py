"""SPAR-01 Maia OpenSpec settings."""

from __future__ import annotations

import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[2] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from modules.sparring.maia_settings import load_maia_settings


def test_maia3_default_argv(monkeypatch):
    monkeypatch.delenv("MAIA3_PYTHON", raising=False)
    monkeypatch.setenv("MAIA_PROVIDER", "maia3")
    monkeypatch.setenv("MAIA3_CMD", "maia3-5m")
    monkeypatch.setenv("MAIA3_EXTRA_ARGS", "--no-use-amp")
    s = load_maia_settings()
    assert s.provider == "maia3"
    assert s.build_uci_argv() == ["maia3-5m", "--no-use-amp"]
    assert s.default_elo == 1500
    assert s.use_uci_history is True


def test_maia3_python_module_argv(monkeypatch):
    monkeypatch.setenv("MAIA_PROVIDER", "maia3")
    monkeypatch.delenv("MAIA3_CMD", raising=False)
    monkeypatch.setenv("MAIA3_PYTHON", "python")
    monkeypatch.setenv("MAIA3_MODULE", "maia3.uci")
    monkeypatch.setenv("MAIA3_MODEL", "5m")
    monkeypatch.setenv("MAIA3_DEVICE", "cpu")
    monkeypatch.setenv("MAIA3_USE_UCI_HISTORY", "0")
    s = load_maia_settings()
    argv = s.build_uci_argv()
    assert argv[0:3] == ["python", "-m", "maia3.uci"]
    assert "--model" in argv and "maia3-5m" in argv


def test_lc0_fallback_argv(monkeypatch):
    monkeypatch.setenv("MAIA_PROVIDER", "lc0_maia2")
    monkeypatch.setenv("MAIA_ENGINE_PATH", r"C:\lc0\lc0.exe")
    s = load_maia_settings()
    assert s.build_uci_argv() == [r"C:\lc0\lc0.exe"]
