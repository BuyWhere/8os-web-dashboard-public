/**
 * Telegram delivery driver (OS-2652) — code-complete, dormant without a token.
 *
 * Uses the plain Telegram Bot API over https fetch (NO SDK — hard rule).
 * Env:
 *   TELEGRAM_BOT_TOKEN — from BotFather. If unset the driver reports
 *     not-configured and deliver() silently falls back to the web inbox.
 *
 * Linking rail: a linked user has an OauthAccount row with provider='telegram'
 * and providerUid = the Telegram user id (same shape the existing Login-Widget
 * link flow writes in /api/auth/telegram/callback). For private chats the
 * Telegram user id IS the chat id, so providerUid doubles as the send target.
 */
import { prisma } from '@/lib/db/prisma'
import type { ChannelMessage, DeliveryChannel, DeliveryResult } from './types'

const TELEGRAM_API = 'https://api.telegram.org'

export function isTelegramConfigured(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN
}

/** Bot username for t.me deep links. Falls back to the login-widget env var. */
export function getTelegramBotUsernameOrNull(): string | null {
  return process.env.TELEGRAM_BOT_USERNAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || null
}

/** The linked Telegram chat id (providerUid) for a user, or null if unlinked. */
export async function getLinkedTelegramChatId(userId: string): Promise<string | null> {
  const row = await prisma.oauthAccount.findFirst({
    where: { userId, provider: 'telegram' },
    select: { providerUid: true },
  })
  return row?.providerUid ?? null
}

/**
 * Call a Telegram Bot API method. Never throws — returns the parsed response
 * or null. Monitoring-style resilience: a channel failure must never break the
 * calling playbook (web inbox is the record either way).
 */
export async function telegramApi(
  method: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; result?: unknown; description?: string } | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return null
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return (await res.json()) as { ok: boolean; result?: unknown; description?: string }
  } catch (e) {
    console.error(`[channels/telegram] ${method} failed:`, e)
    return null
  }
}

/** Render a ChannelMessage as plain text (no parse_mode — no escaping surprises). */
function renderText(message: ChannelMessage): string {
  return message.title ? `${message.title}\n\n${message.body}` : message.body
}

/** Send a message to a chat id, with actions as an inline keyboard. */
export async function sendTelegramMessage(
  chatId: string | number,
  message: ChannelMessage,
): Promise<{ ok: boolean; messageId?: number }> {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text: renderText(message).slice(0, 4096), // Telegram hard limit
  }
  if (message.actions && message.actions.length > 0) {
    payload.reply_markup = {
      inline_keyboard: message.actions.map((a) => [
        { text: a.label, callback_data: a.id.slice(0, 64) },
      ]),
    }
  }
  const res = await telegramApi('sendMessage', payload)
  if (!res || !res.ok) return { ok: false }
  const mid = (res.result as { message_id?: number } | undefined)?.message_id
  return { ok: true, messageId: mid }
}

export const telegramChannel: DeliveryChannel = {
  key: 'telegram',
  async send(userId: string, message: ChannelMessage): Promise<DeliveryResult> {
    if (!isTelegramConfigured()) return { delivered: false, detail: 'not-configured' }
    const chatId = await getLinkedTelegramChatId(userId)
    if (!chatId) return { delivered: false, detail: 'not-linked' }
    const sent = await sendTelegramMessage(chatId, message)
    return sent.ok
      ? { delivered: true, detail: sent.messageId != null ? String(sent.messageId) : undefined }
      : { delivered: false, detail: 'send-failed' }
  },
}
