#!/usr/bin/env python3
"""pytest configuration — portable paths (local + GitHub Actions)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
SRC = REPO_ROOT / "src"
API = SRC / "api"
COURSE = REPO_ROOT / "docs" / "ai_chess_coach_course"

for path in (SRC, API, COURSE):
    text = str(path)
    if text not in sys.path:
        sys.path.insert(0, text)


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )
    config.addinivalue_line(
        "markers", "parallel: marks tests related to parallel processing"
    )


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    test_env = {
        "PYTHONPATH": os.pathsep.join(str(p) for p in (SRC, API)),
        "CHESS_TRAINER_DB_URL": os.environ.get(
            "CHESS_TRAINER_DB_URL",
            "postgresql://chess:chess_pass@localhost:5432/chess_trainer_db",
        ),
        "STOCKFISH_PATH": os.environ.get("STOCKFISH_PATH", ""),
        "MAX_WORKERS": "2",
        "FEATURES_PER_CHUNK": "10",
        "PYTEST_CURRENT_TEST": "true",
        "LICHESS_API_TOKEN": "",
        "LICHESS_TOKEN": "",
    }

    for key, value in test_env.items():
        os.environ[key] = value

    yield
