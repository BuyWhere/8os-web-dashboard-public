"""
OS-6138: tests for the alignment tool-call route probe in /health.

Acceptance test from the issue (verbatim):
    POST /api/alignment/tool-call {} -> 404  =>  /api/health MUST be 503

These tests do NOT require the alignment route to actually exist in the
running app — they exercise both states by patching the route table directly.
"""
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import _build_health_response, _tool_call_route_registered, app, limiter


# Disable the rate limiter in tests (matches test_retired_auth_and_alignment.py).
# Without this, the slowapi middleware intercepts redis ConnectionError and
# surfaces it as an unhandled exception in the /health path.
limiter.enabled = False


# --- Pure-function probe ----------------------------------------------------


def test_probe_returns_false_when_route_absent():
    """When no /api/alignment/tool-call route is registered, probe is False."""
    # Build a fresh FastAPI app with NO alignment router attached.
    bare_app = FastAPI()

    @bare_app.get("/health")
    async def _h():
        return {"status": "ok"}

    assert _tool_call_route_registered(bare_app) is False


def test_probe_returns_true_when_route_registered():
    """When /api/alignment/tool-call POST is registered, probe is True."""
    fresh_app = FastAPI()

    @fresh_app.post("/api/alignment/tool-call")
    async def _tc():
        return {"ok": True}

    assert _tool_call_route_registered(fresh_app) is True


def test_probe_rejects_get_only_route():
    """A GET-only /api/alignment/tool-call must NOT satisfy the probe."""
    fresh_app = FastAPI()

    @fresh_app.get("/api/alignment/tool-call")
    async def _tc():
        return {"ok": True}

    assert _tool_call_route_registered(fresh_app) is False


def test_probe_rejects_wrong_path():
    """A POST at a different path must NOT satisfy the probe."""
    fresh_app = FastAPI()

    @fresh_app.post("/api/alignment/tool")
    async def _t():
        return {"ok": True}

    assert _tool_call_route_registered(fresh_app) is False


# --- /health endpoint -------------------------------------------------------


def _make_response_with_probe(registered: bool):
    """Helper: invoke _build_health_response with the probe patched."""
    with patch(
        "app.main._tool_call_route_registered",
        return_value=registered,
    ):
        # _build_health_response is async
        import asyncio

        return asyncio.run(_build_health_response())


def test_health_returns_503_when_alignment_route_not_registered():
    """Acceptance test: missing tool-call route → /health is 503."""
    body, status_code = _make_response_with_probe(registered=False)

    assert status_code == 503, (
        "OS-6138 acceptance test FAILED: probe should fail-closed. "
        f"Got status={status_code}, body={body.model_dump()}"
    )
    payload = body.model_dump()
    assert payload["alignment_probe"] == "not_registered"
    assert payload["alignment_probe_detail"], "detail should explain why"
    assert payload["status"] == "degraded"


def test_health_returns_200_when_alignment_route_registered():
    """When the route is registered, /health returns 200."""
    # Patch db + redis to "ok" so they don't fail in test env.
    with patch("app.main._tool_call_route_registered", return_value=True), \
         patch("app.main._ping_database", return_value=True), \
         patch("app.main._ping_redis", return_value=True):
        import asyncio

        body, status_code = asyncio.run(_build_health_response())

    assert status_code == 200
    payload = body.model_dump()
    assert payload["alignment_probe"] == "ok"
    assert payload["alignment_probe_detail"] is None


def test_health_exposes_probe_on_both_prefixes():
    """Both /health and /api/health must include the probe fields.

    The two endpoint handlers (`health` and `api_health`) share
    `_build_health_response`; we verify here that the helper returns the
    expected probe keys. Wiring each handler through TestClient would
    require Redis/DB lifespans which are not available in unit tests.
    """
    with patch("app.main._tool_call_route_registered", return_value=True), \
         patch("app.main._ping_database", return_value=True), \
         patch("app.main._ping_redis", return_value=True):
        import asyncio

        body, status_code = asyncio.run(_build_health_response())
        assert status_code == 200
        payload = body.model_dump()
        assert payload["alignment_probe"] == "ok"
        assert "alignment_probe_detail" in payload


def test_health_routes_registered_for_both_prefixes():
    """Verify /health AND /api/health are both wired in app.routes.

    This is the structural guarantee that the Railway deploy gate hits
    api.8os.ai/api/health (per the orchestrator's openapi) and gets the
    same probe shape as the bare /health endpoint.
    """
    paths = [getattr(r, "path", None) for r in app.routes]
    assert "/health" in paths, "/health route not registered"
    assert "/api/health" in paths, "/api/health route not registered"
