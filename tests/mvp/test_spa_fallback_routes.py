"""BUG-098: SPA routes rewrite to index.html; assets, API, and unknown paths do not."""

from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
BLUEPRINT = ROOT / "render.yaml"
PUBLISHED = {"/index.html", "/assets/app.js", "/favicon.ico", "/logo.png"}


def _frontend_routes():
    data = yaml.safe_load(BLUEPRINT.read_text(encoding="utf-8"))
    service = next(item for item in data["services"] if item.get("name") == "chessdash-frontend")
    return service["routes"]


def _matches(source: str, path: str) -> bool:
    if source.endswith("/*"):
        return path.startswith(source[:-1])
    return source == path


def resolve(path: str) -> str:
    if path == "/" or path in PUBLISHED:
        return "file"
    for route in _frontend_routes():
        assert route["type"] == "rewrite"
        assert route["destination"] == "/index.html"
        if _matches(route["source"], path):
            return "rewrite"
    return "missing"


def test_direct_app_routes_serve_the_spa():
    for path in (
        "/login",
        "/changelog",
        "/unauthorized",
        "/coach",
        "/coach/partidas",
        "/coach/games/42/analysis",
        "/coach/position",
        "/coach/position/study",
        "/coach/configuracion",
        "/reports",
        "/games",
        "/import/legacy",
        "/chess-board/7",
        "/logs",
        "/admin/users",
    ):
        assert resolve(path) == "rewrite", path


def test_assets_api_and_unknown_paths_are_not_rewritten():
    assert resolve("/") == "file"
    assert resolve("/index.html") == "file"
    assert resolve("/assets/app.js") == "file"
    assert resolve("/logo.png") == "file"
    assert resolve("/assets/missing.js") == "missing"
    assert resolve("/api/health") == "missing"
    assert resolve("/api/v1/coach/games") == "missing"
    assert resolve("/not-a-real-route") == "missing"
    assert resolve("/reports-extra") == "missing"
    assert resolve("/coach-extra") == "missing"


def test_redirects_file_is_not_the_fallback():
    assert not (ROOT / "src" / "frontend" / "public" / "_redirects").exists()
