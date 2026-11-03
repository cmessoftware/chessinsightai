"""Published Coach UI must pass the login preflight."""

from __future__ import annotations

import sys
from pathlib import Path

SRC_API = Path(__file__).resolve().parents[2] / "src" / "api"
if str(SRC_API) not in sys.path:
    sys.path.insert(0, str(SRC_API))

from middleware.cors_helpers import allowed_origins  # noqa: E402

FRONTEND = "https://chessdash-frontend.onrender.com"


def test_published_frontend_is_allowed_without_env():
    origins = allowed_origins(extra="")
    assert FRONTEND in origins
    assert "http://localhost:5173" in origins


def test_extra_origins_from_env_are_kept():
    origins = allowed_origins(extra="https://preview.example")
    assert FRONTEND in origins
    assert "https://preview.example" in origins


def test_app_registers_the_published_frontend_on_the_outer_middleware():
    from main import app

    outer = app.user_middleware[0]
    assert outer.cls.__name__ == "CORSMiddleware"
    assert FRONTEND in outer.options["allow_origins"]
