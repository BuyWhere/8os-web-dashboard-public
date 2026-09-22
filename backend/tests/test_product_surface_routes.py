from httpx import ASGITransport, AsyncClient
import pytest

from app.main import app, limiter


limiter.enabled = False


@pytest.mark.asyncio
async def test_product_surface_routes_are_registered():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        expected_keys = {
            "/api/agents": "agents",
            "/api/tasks": "tasks",
            "/api/coach": "coach",
            "/api/calendar": "calendar",
            "/api/journal": "journal",
            "/api/methodology": "methodology",
            "/api/onboarding": "onboarding",
            "/api/generate": "generate",
        }

        for path, key in expected_keys.items():
            response = await client.get(path)
            assert response.status_code == 200, path
            body = response.json()
            assert body["status"] == "live"
            assert body["surface"] == "8os-product"
            assert key in body
