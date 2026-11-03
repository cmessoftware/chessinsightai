"""Coach startup must not import the course Lichess client."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"


def test_coach_statistics_lookup_does_not_import_the_http_client():
    script = """
import sys
sys.path[:0] = [r"%s", r"%s"]
from modules.module07.chess_statistics_summary import lookup_chess_statistics
assert "chess_statistics.client" not in sys.modules
assert callable(lookup_chess_statistics)
""" % (SRC, SRC / "api")
    completed = subprocess.run(
        [sys.executable, "-c", script],
        cwd=SRC.parent,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr


def test_public_names_still_resolve():
    script = """
import sys
sys.path.insert(0, r"%s")
from chess_statistics import LichessClient, StatisticsRepository, connect
assert LichessClient.__name__ == "LichessClient"
assert StatisticsRepository.__name__ == "StatisticsRepository"
assert callable(connect)
""" % SRC
    completed = subprocess.run(
        [sys.executable, "-c", script],
        cwd=SRC.parent,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr
