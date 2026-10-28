"""Estado público sparring para UI (FEAT-068 / pre SPAR-04)."""

from __future__ import annotations

from typing import Any

from modules.sparring.maia_adapter import MaiaHumanMoveModel
from modules.sparring.maia_settings import load_maia_settings


def build_sparring_status(*, sessions_api_enabled: bool = False) -> dict[str, Any]:
    """Snapshot sin arrancar motor UCI."""
    try:
        settings = load_maia_settings()
        config_ok = True
        config_error: str | None = None
    except ValueError as exc:
        settings = None
        config_ok = False
        config_error = str(exc)

    caps = None
    if settings is not None:
        caps = MaiaHumanMoveModel(settings).capabilities()

    return {
        "mvp_ready": False,
        "sessions_api_enabled": sessions_api_enabled,
        "maia_config_ok": config_ok,
        "maia_config_error": config_error,
        "provider": settings.provider if settings else None,
        "capabilities": (
            {
                "model_name": caps.model_name,
                "model_version": caps.model_version,
                "rating_min": caps.rating_min,
                "rating_max": caps.rating_max,
                "history_support": caps.history_support,
                "full_policy_support": caps.full_policy_support,
                "sampling_support": caps.sampling_support,
            }
            if caps
            else None
        ),
        "next_milestone": "SPAR-04",
    }
