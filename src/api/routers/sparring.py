"""Sparring API (SPAR-04+); status MVP FEAT-068."""

from __future__ import annotations

from fastapi import APIRouter, Request

from modules.sparring.status import build_sparring_status

router = APIRouter(prefix="/api/v1/sparring", tags=["sparring"])


@router.get("/status")
def sparring_status(request: Request):
    """Estado Maia/config para la página Coach → Sparring (sin sesiones aún)."""
    _ = request  # auth vía JWT middleware
    return build_sparring_status(sessions_api_enabled=False)
