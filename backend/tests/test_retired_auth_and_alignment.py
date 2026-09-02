from fastapi.testclient import TestClient

from app.main import app, limiter


limiter.enabled = False
client = TestClient(app)


def test_legacy_register_returns_gone_without_processing_payload():
    response = client.post(
        "/auth/register",
        json={"email": "legacy@example.com", "password": "password123"},
    )

    assert response.status_code == 410
    assert "Clerk" in response.json()["detail"]


def test_legacy_verify_returns_gone_without_processing_payload():
    response = client.post(
        "/auth/verify",
        json={"email": "legacy@example.com", "password": "password123"},
    )

    assert response.status_code == 410
    assert "Clerk" in response.json()["detail"]


def test_alignment_requires_bearer_token_before_touching_session_store():
    response = client.get("/alignment")

    assert response.status_code == 401
    assert response.json()["detail"] == "Missing bearer token"
