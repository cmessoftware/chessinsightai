"""Smoke: Module 07 API router loads."""

from __future__ import annotations

import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[2] / "src" / "api"
SRC_DIR = API_DIR.parent
for path in (str(SRC_DIR), str(API_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)


def test_module07_router_has_ingest_route():
    from routers import module07

    paths = [getattr(r, "path", None) for r in module07.router.routes]
    assert "/api/v1/module07/ingest-and-analyze" in paths
