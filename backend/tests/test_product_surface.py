from httpx import ASGITransport, AsyncClient
import pytest

from app.main import app, limiter


limiter.enabled = False


@pytest.mark.asyncio
async def test_product_catalog_routes_return_products():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        for path in ("/api/products", "/products", "/api/products/trending", "/api/products/search"):
            response = await client.get(path)
            assert response.status_code == 200
            body = response.json()
            assert {p["id"] for p in body["products"]} >= {
                "pro_monthly",
                "pro_yearly",
                "life_report",
            }


@pytest.mark.asyncio
async def test_product_detail_routes_return_single_product():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/api/products/pro_monthly")
        assert response.status_code == 200
        assert response.json()["product"]["price"]["lookupKey"] == "pro_monthly"

        missing = await client.get("/api/products/not-a-product")
        assert missing.status_code == 404
