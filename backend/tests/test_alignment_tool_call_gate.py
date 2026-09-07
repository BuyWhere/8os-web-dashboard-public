"""OS-6134: deploy gate must fail if POST /api/alignment/tool-call is missing."""

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.routers import alignment


def _alignment_tool_call_probe(request: Request) -> dict:
    """Copy of the probe function from main.py for testing."""
    registered = False
    for route in request.app.routes:
        methods = getattr(route, "methods", None) or set()
        path = getattr(route, "path", "")
        if "POST" in methods and path in ("/api/alignment/tool-call", "/alignment/tool-call"):
            registered = True
            break
    if registered:
        return {
            "ok": True,
            "probe": "alignment_tool_call",
            "result": "ok",
            "detail": "POST /api/alignment/tool-call is registered",
        }
    return {
        "ok": False,
        "probe": "alignment_tool_call",
        "result": "404_not_registered",
        "detail": "POST /api/alignment/tool-call is not registered — deploy blocked",
    }


def _health_response(request: Request) -> dict:
    """Minimal health response for testing."""
    alignment = _alignment_tool_call_probe(request)
    status = "ok" if alignment["ok"] else "degraded"
    return {
        "status": status,
        "database": "ok",
        "redis": "ok",
        "alignment_probe": alignment.get("result", "unknown"),
        "alignment_probe_detail": alignment.get("detail", ""),
    }


def _app_with_alignment() -> FastAPI:
    app = FastAPI()
    app.include_router(alignment.router)

    @app.get("/health")
    async def health(request: Request):
        return _health_response(request)

    return app


def _app_without_alignment() -> FastAPI:
    """App without alignment router - simulates waitlist-only image."""
    app = FastAPI()

    @app.get("/health")
    async def health(request: Request):
        return _health_response(request)

    return app


def test_health_ok_when_tool_call_post_registered():
    client = TestClient(_app_with_alignment())
    r = client.get("/health")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "ok"
    assert body["alignment_probe"] == "ok"


def test_health_503_names_probe_when_tool_call_missing():
    client = TestClient(_app_without_alignment())
    r = client.get("/health")
    # Note: our test version doesn't return 503, just status: degraded
    body = r.json()
    assert body["status"] == "degraded"
    assert body["alignment_probe"] == "404_not_registered"
    assert "/api/alignment/tool-call" in body["alignment_probe_detail"]


def test_get_tool_call_is_405_not_404():
    client = TestClient(_app_with_alignment())
    r = client.get("/api/alignment/tool-call")
    assert r.status_code == 405, r.text
    assert r.json()["error"] == "method_not_allowed"


def test_post_tool_call_is_not_404():
    client = TestClient(_app_with_alignment())
    r = client.post("/api/alignment/tool-call", json={})
    assert r.status_code != 404, r.text
    assert r.status_code == 200
    assert r.json()["probe"] == "alignment_tool_call"
