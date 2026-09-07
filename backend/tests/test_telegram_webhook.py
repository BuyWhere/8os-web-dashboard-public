"""
Unit tests for the OS-1117 Telegram bot webhook.

Run with: pytest tests/test_telegram_webhook.py -v
"""
import pytest
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import get_settings
from app.routers.telegram import router


SECRET = "test-secret-please-change"


@pytest.fixture(autouse=True)
def _wire_secret(monkeypatch):
    """Force TELEGRAM_WEBHOOK_SECRET to a known value and bust the
    settings cache so each test sees a fresh settings object."""
    monkeypatch.setenv("TELEGRAM_WEBHOOK_SECRET", SECRET)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def _flush(client: TestClient) -> None:
    """Give the fire-and-forget background task a chance to run.

    Starlette's TestClient drains the asyncio loop after each request
    only when using the async client; the sync client posts synchronously
    and may leave the background task pending. A second no-op POST
    forces the previous task to flush."""
    client.post(
        "/telegram/webhook",
        json={"update_id": -1, "message": {"chat": {"id": 0}, "text": "/help"}},
        headers={"X-Telegram-Bot-Api-Secret-Token": SECRET},
    )


class TestSecretVerification:
    def test_missing_header_returns_401(self, client):
        resp = client.post("/telegram/webhook", json={"update_id": 1})
        assert resp.status_code == 401

    def test_wrong_secret_returns_401(self, client):
        resp = client.post(
            "/telegram/webhook",
            json={"update_id": 1},
            headers={"X-Telegram-Bot-Api-Secret-Token": "wrong-secret"},
        )
        assert resp.status_code == 401

    def test_correct_secret_returns_200(self, client):
        resp = client.post(
            "/telegram/webhook",
            json={"update_id": 1, "message": {"chat": {"id": 1}, "text": "/start"}},
            headers={"X-Telegram-Bot-Api-Secret-Token": SECRET},
        )
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}


class TestUnconfiguredSecret:
    def test_unset_env_returns_500(self, monkeypatch):
        """When TELEGRAM_WEBHOOK_SECRET is unset, the handler must NOT
        silently accept — it returns 500."""
        monkeypatch.delenv("TELEGRAM_WEBHOOK_SECRET", raising=False)
        get_settings.cache_clear()

        app = FastAPI()
        app.include_router(router)
        c = TestClient(app)

        resp = c.post(
            "/telegram/webhook",
            json={"update_id": 1},
            headers={"X-Telegram-Bot-Api-Secret-Token": "anything"},
        )
        assert resp.status_code == 500


class TestMalformedBody:
    def test_bad_json_still_200(self, client):
        resp = client.post(
            "/telegram/webhook",
            content=b"not-json",
            headers={
                "X-Telegram-Bot-Api-Secret-Token": SECRET,
                "Content-Type": "application/json",
            },
        )
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}

    def test_no_message_still_200(self, client):
        resp = client.post(
            "/telegram/webhook",
            json={"update_id": 99},
            headers={"X-Telegram-Bot-Api-Secret-Token": SECRET},
        )
        assert resp.status_code == 200


class TestCommandDispatch:
    def test_start_uses_production_prompt(self, client):
        with patch(
            "app.routers.telegram._send_telegram_message", new=AsyncMock()
        ) as mock_send:
            client.post(
                "/telegram/webhook",
                json={
                    "update_id": 100,
                    "message": {
                        "chat": {"id": 42},
                        "from": {"first_name": "Daisy"},
                        "text": "/start",
                    },
                },
                headers={"X-Telegram-Bot-Api-Secret-Token": SECRET},
            )
            _flush(client)
            assert mock_send.await_count >= 1
            text = mock_send.await_args_list[0].args[1]
            assert "Welcome to 8os" in text
            assert "Daisy" in text  # personalised greeting
            assert "BaZi archetype" in text
            assert "full name" in text

    def test_start_without_name_uses_template(self, client):
        with patch(
            "app.routers.telegram._send_telegram_message", new=AsyncMock()
        ) as mock_send:
            client.post(
                "/telegram/webhook",
                json={
                    "update_id": 110,
                    "message": {"chat": {"id": 1}, "text": "/start"},
                },
                headers={"X-Telegram-Bot-Api-Secret-Token": SECRET},
            )
            _flush(client)
            assert mock_send.await_count >= 1
            text = mock_send.await_args_list[0].args[1]
            assert "Welcome to 8os" in text
            assert "BaZi archetype" in text

    def test_help_returns_command_list(self, client):
        with patch(
            "app.routers.telegram._send_telegram_message", new=AsyncMock()
        ) as mock_send:
            client.post(
                "/telegram/webhook",
                json={
                    "update_id": 200,
                    "message": {"chat": {"id": 1}, "text": "/help"},
                },
                headers={"X-Telegram-Bot-Api-Secret-Token": SECRET},
            )
            _flush(client)
            assert mock_send.await_count >= 1
            text = mock_send.await_args_list[0].args[1]
            assert "/start" in text
            assert "/help" in text
            assert "/archetype" in text

    def test_unknown_text_returns_nudge(self, client):
        with patch(
            "app.routers.telegram._send_telegram_message", new=AsyncMock()
        ) as mock_send:
            client.post(
                "/telegram/webhook",
                json={
                    "update_id": 300,
                    "message": {"chat": {"id": 1}, "text": "hi there"},
                },
                headers={"X-Telegram-Bot-Api-Secret-Token": SECRET},
            )
            _flush(client)
            assert mock_send.await_count >= 1
            text = mock_send.await_args_list[0].args[1]
            assert "I only respond to" in text

    def test_status_nudges_to_onboarding(self, client):
        with patch(
            "app.routers.telegram._send_telegram_message", new=AsyncMock()
        ) as mock_send:
            client.post(
                "/telegram/webhook",
                json={
                    "update_id": 400,
                    "message": {"chat": {"id": 1}, "text": "/status"},
                },
                headers={"X-Telegram-Bot-Api-Secret-Token": SECRET},
            )
            _flush(client)
            assert mock_send.await_count >= 1
            text = mock_send.await_args_list[0].args[1]
            assert "8os.ai/onboarding" in text
