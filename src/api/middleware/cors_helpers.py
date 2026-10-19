from fastapi import Request

_DEV_ORIGINS = frozenset(
    {
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
    }
)


def cors_headers_for_request(request: Request) -> dict[str, str]:
    """CORS on error responses; otherwise the browser hides status/body (looks like CORS failure)."""
    origin = request.headers.get("origin", "")
    if origin in _DEV_ORIGINS:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        }
    return {}
