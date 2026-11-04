"""Origins the Coach API may answer. Browser login fails without these headers."""

from __future__ import annotations

import os

from fastapi import Request

_LOCAL_ORIGINS = (
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000",
)
_PRODUCT_ORIGINS = ("https://chessdash-frontend.onrender.com",)


def allowed_origins(extra: str | None = None) -> list[str]:
    """Local dev, the published Coach UI, plus ``CORS_ALLOW_ORIGINS``."""
    raw = os.environ.get("CORS_ALLOW_ORIGINS", "") if extra is None else extra
    seen: list[str] = []
    for origin in (
        *_LOCAL_ORIGINS,
        *_PRODUCT_ORIGINS,
        *(part.strip() for part in raw.split(",")),
    ):
        if origin and origin not in seen:
            seen.append(origin)
    return seen


def cors_headers_for_request(request: Request) -> dict[str, str]:
    """CORS on error responses; otherwise the browser hides status and body."""
    origin = request.headers.get("origin", "")
    if origin in allowed_origins():
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        }
    return {}
