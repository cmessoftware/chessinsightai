"""GC-3 — slim Coach catalog (sin ``module07_games`` operativo)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
API = SRC / "api"
for path in (str(SRC), str(API)):
    if path not in sys.path:
        sys.path.insert(0, path)

from modules.game_import.coach_catalog import (  # noqa: E402
    backfill_master_games_from_module07,
    coach_catalog_health,
    sync_coach_library_to_master_games,
)


def test_sync_alias_points_to_same_callable():
    assert backfill_master_games_from_module07 is sync_coach_library_to_master_games


def test_coach_catalog_health_keys():
    """Shape contract (sin DB)."""
    assert callable(coach_catalog_health)
    assert callable(sync_coach_library_to_master_games)


def test_module07_router_exposes_catalog_routes():
    from routers import module07 as router_mod

    paths = {getattr(r, "path", None) for r in router_mod.router.routes}
    assert "/api/v1/module07/coach-catalog/health" in paths
    assert "/api/v1/module07/coach-catalog/repair" in paths
