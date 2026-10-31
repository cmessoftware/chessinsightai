"""FEAT-017 — delete Coach library games via module07 API."""

from __future__ import annotations

import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[2] / "src" / "api"
SRC_DIR = API_DIR.parent
for path in (str(SRC_DIR), str(API_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)


def test_module07_router_exposes_delete_game_routes():
    from routers import module07 as router_mod

    paths = {getattr(r, "path", None) for r in router_mod.router.routes}
    assert "/api/v1/module07/games/{game_id}" in paths
    assert "/api/v1/module07/games/bulk-delete" in paths
    assert "/api/v1/module07/games/bulk-corpus" in paths
