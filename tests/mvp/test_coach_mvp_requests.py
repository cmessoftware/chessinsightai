"""Coach import talks to Lichess and Chess.com through requests."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_coach_mvp_requirements_install_requests():
    text = (ROOT / "requirements-coach-mvp.txt").read_text(encoding="utf-8")
    assert "requests==2.32.3" in text
