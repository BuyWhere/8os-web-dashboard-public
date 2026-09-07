"""
Inbound Telegram bot webhook for @eight_os_bot.

OS-1117: wires api.8os.ai up as a webhook endpoint so the bot can
receive messages. Telegram sends updates as POST with a JSON body; we
verify the X-Telegram-Bot-Api-Secret-Token header against
`TELEGRAM_WEBHOOK_SECRET`, return 200 {ok:true} within 2s, then handle
the message fire-and-forget.

Public URL: `POST https://api.8os.ai/telegram/webhook` (NOT /api/telegram/webhook —
api.8os.ai is the FastAPI orchestrator, not the Next.js dashboard).

Mounted from `app.main` via `app.include_router(telegram_router)`.
"""
import asyncio
import hashlib
import hmac
import json
import logging
from typing import Any

import httpx
from fastapi import APIRouter, Header, HTTPException, Request, status

from app.config import get_settings

logger = logging.getLogger("8os.api.telegram")

router = APIRouter(tags=["Telegram"])

# Production onboarding prompt used by Daisy for the OS-1104 PH
# screenshot storyboard. Keep identical to the Next.js
# web-dashboard/src/lib/telegram/webhook equivalent (commit 52175c0)
# so users in both surfaces see the same conversation.
START_PROMPT_TEMPLATE = (
    "👋 Welcome to 8os — your personal operating system.\n\n"
    "I'll ask 5 quick questions to generate your BaZi archetype and "
    "morning briefing. Takes ~60 seconds.\n\n"
    "Ready? Reply with your **full name** to begin."
)

HELP_TEXT = (
    "🤖 *8os bot commands*\n\n"
    "/start — Begin the onboarding quiz\n"
    "/status — See your current archetype (if any)\n"
    "/archetype — Get your archetype summary\n"
    "/help — Show this message"
)

UNKNOWN_TEXT = (
    "🤖 I only respond to /start, /help, /status, /archetype. "
    "Tap /start to begin."
)


def _verify_secret(provided: str | None, expected: str | None) -> None:
    """Constant-time secret check. Raises 401 on mismatch, 500 if not configured."""
    if not expected:
        logger.error(json.dumps({"event": "telegram_webhook_secret_unset"}))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="TELEGRAM_WEBHOOK_SECRET is not configured",
        )
    if not provided:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing secret token"
        )
    # timing-safe compare on equal-length digests
    a = hashlib.sha256(provided.encode("utf-8")).digest()
    b = hashlib.sha256(expected.encode("utf-8")).digest()
    if not hmac.compare_digest(a, b):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid secret token"
        )


async def _send_telegram_message(chat_id: int, text: str) -> None:
    """POST sendMessage to the Telegram Bot API. Fire-and-forget wrapper."""
    settings = get_settings()
    if not settings.telegram_bot_token:
        logger.warning(json.dumps({"event": "telegram_send_skipped", "reason": "no_token"}))
        return
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code >= 400:
                logger.warning(
                    json.dumps(
                        {
                            "event": "telegram_send_failed",
                            "status": resp.status_code,
                            "body": resp.text[:200],
                        }
                    )
                )
    except (httpx.HTTPError, asyncio.TimeoutError) as exc:
        logger.warning(json.dumps({"event": "telegram_send_error", "error": str(exc)}))


async def _handle_command(update: dict[str, Any]) -> None:
    """Dispatch a parsed update to the right command handler.

    User-lookup commands (status / archetype) currently return a soft
    "no archetype yet" reply because the orchestrator doesn't track a
    telegram_id column on the users table yet. Wiring that up is a
    separate issue (the briefing flow uses localStorage + the
    /briefing/by-telegram/{id} endpoint on the OLD
    orchestrator-production-1643 Railway service, not this one).
    """
    message = update.get("message") or {}
    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    text = (message.get("text") or "").strip()
    if not chat_id or not text:
        return

    # Resolve the displayed name for /start so the greeting feels personal.
    user = message.get("from") or {}
    first_name = user.get("first_name")

    cmd = text.split(maxsplit=1)[0].lower().split("@", 1)[0]
    logger.info(
        json.dumps(
            {
                "event": "telegram_command",
                "update_id": update.get("update_id"),
                "chat_id": chat_id,
                "command": cmd,
            }
        )
    )

    if cmd == "/start":
        greeting = (
            f"👋 Welcome to 8os, {first_name} — your personal operating system.\n\n"
            "I'll ask 5 quick questions to generate your BaZi archetype and "
            "morning briefing. Takes ~60 seconds.\n\n"
            "Ready? Reply with your **full name** to begin."
            if first_name
            else START_PROMPT_TEMPLATE
        )
        await _send_telegram_message(chat_id, greeting)
        return

    if cmd == "/help":
        await _send_telegram_message(chat_id, HELP_TEXT)
        return

    if cmd in ("/status", "/archetype"):
        # Orchestrator has no telegram_id column; reply with a nudge to
        # complete web onboarding so the briefing can be generated.
        await _send_telegram_message(
            chat_id,
            "🪪 No archetype on file yet. Finish onboarding at "
            "https://8os.ai/onboarding and your archetype will show up here.",
        )
        return

    # Any other text — only respond to known commands so we don't echo
    # arbitrary user input back through the bot.
    await _send_telegram_message(chat_id, UNKNOWN_TEXT)


@router.post("/telegram/webhook")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
):
    """Inbound Telegram bot update handler.

    Verifies the secret token, returns 200 {ok:true} immediately, then
    dispatches the command in the background so we always respond to
    Telegram within the 2-second SLA.
    """
    settings = get_settings()
    _verify_secret(x_telegram_bot_api_secret_token, settings.telegram_webhook_secret)

    try:
        update = await request.json()
    except Exception:
        # Malformed body — Telegram should never send us one, but if it
        # does we still ack so it doesn't retry forever.
        logger.warning(json.dumps({"event": "telegram_webhook_bad_json"}))
        return {"ok": True}

    update_id = update.get("update_id")
    message = update.get("message") or {}
    chat_id = (message.get("chat") or {}).get("id")
    text_head = (message.get("text") or "")[:40]
    logger.info(
        json.dumps(
            {
                "event": "telegram_update",
                "update_id": update_id,
                "chat_id": chat_id,
                "text_head": text_head,
            }
        )
    )

    # Fire-and-forget: ack Telegram first, then handle the command.
    asyncio.create_task(_handle_command(update))
    return {"ok": True}
