/**
 * POST /api/telegram/webhook — inbound Telegram bot updates (OS-2652).
 *
 * Guard: Telegram echoes the secret we register via setWebhook in the
 * `X-Telegram-Bot-Api-Secret-Token` header. We verify it (timing-safe)
 * against TELEGRAM_WEBHOOK_SECRET; when the env var is unset EVERY request is
 * rejected — the guard holds even before go-live. Per-IP rate limited.
 *
 * Handled updates (all userId-scoped via the OauthAccount telegram link):
 *   /start <token> — signed one-time link token from POST /api/telegram/link →
 *                    store the Telegram user id on OauthAccount(provider='telegram')
 *                    (same row shape the existing widget link rail writes).
 *   /brief /shutdown /align — compact command renderings (src/lib/channels/commands).
 *   plain text     — universal capture through the SAME classifier as
 *                    /api/capture (runCapture — one code path).
 *   callback_query — acknowledged + persisted to inbox_messages meta as a
 *                    record; action wiring to redirections lands in Phase C.
 *
 * Always returns 200 after auth so Telegram doesn't retry-storm; replies to
 * the chat are best-effort (drivers never throw).
 */
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { verifyLinkToken } from '@/lib/channels/link-token'
import { sendTelegramMessage, telegramApi } from '@/lib/channels/telegram'
import { writeInboxMessage } from '@/lib/channels/web-inbox'
import { renderBrief, renderShutdown, renderAlign } from '@/lib/channels/commands'
import { runCapture } from '@/lib/capture-core'
import { captureServerException } from '@/lib/error-track'

interface TgUser { id: number }
interface TgChat { id: number }
interface TgMessage { message_id?: number; from?: TgUser; chat?: TgChat; text?: string }
interface TgCallbackQuery { id: string; from: TgUser; message?: TgMessage; data?: string }
interface TgUpdate { update_id?: number; message?: TgMessage; callback_query?: TgCallbackQuery }

function secretOk(req: NextRequest): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!expected) return false // not configured → reject everything
  const got = req.headers.get('x-telegram-bot-api-secret-token') ?? ''
  const a = Buffer.from(got, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

async function linkedUserId(telegramUserId: number): Promise<string | null> {
  const row = await prisma.oauthAccount.findUnique({
    where: { provider_providerUid: { provider: 'telegram', providerUid: String(telegramUserId) } },
    select: { userId: true },
  })
  return row?.userId ?? null
}

const reply = (chatId: number, body: string) =>
  sendTelegramMessage(chatId, { body }).catch(() => ({ ok: false as const }))

async function handleStart(chatId: number, fromId: number, param: string | null): Promise<void> {
  if (!param) {
    await reply(chatId, 'Welcome to 8os. Link this chat from 8os.ai → Settings → Channels, then send me anything to capture it.')
    return
  }
  const userId = verifyLinkToken(param)
  if (!userId) {
    await reply(chatId, 'That link has expired or is invalid. Generate a fresh one at 8os.ai → Settings → Channels.')
    return
  }
  const providerUid = String(fromId)
  const existing = await prisma.oauthAccount.findUnique({
    where: { provider_providerUid: { provider: 'telegram', providerUid } },
  })
  if (existing && existing.userId !== userId) {
    await reply(chatId, 'This Telegram account is already linked to a different 8os account. Unlink it there first.')
    return
  }
  await prisma.oauthAccount.upsert({
    where: { provider_providerUid: { provider: 'telegram', providerUid } },
    update: { userId },
    create: { userId, provider: 'telegram', providerUid },
  })
  await reply(chatId, 'Linked ✓ — this chat now receives your 8os briefs.\nSend any to-do as plain text to capture it, or try /brief, /shutdown, /align.')
}

async function handleMessage(msg: TgMessage): Promise<void> {
  const chatId = msg.chat?.id
  const fromId = msg.from?.id
  const text = (msg.text ?? '').trim()
  if (chatId == null || fromId == null || !text) return

  const startMatch = text.match(/^\/start(?:\s+(\S+))?/)
  if (startMatch) {
    await handleStart(chatId, fromId, startMatch[1] ?? null)
    return
  }

  const userId = await linkedUserId(fromId)
  if (!userId) {
    await reply(chatId, 'This chat is not linked to an 8os account yet. Link it at 8os.ai → Settings → Channels.')
    return
  }

  const command = text.split(/[\s@]/)[0].toLowerCase()
  if (command === '/brief') { await reply(chatId, await renderBrief(userId)); return }
  if (command === '/shutdown') { await reply(chatId, await renderShutdown(userId)); return }
  if (command === '/align') { await reply(chatId, await renderAlign(userId)); return }
  if (command.startsWith('/')) {
    await reply(chatId, 'Commands: /brief, /shutdown, /align — or send plain text to capture a task or goal.')
    return
  }

  // Default inbound = universal capture through the SAME classifier as /api/capture.
  const result = await runCapture(userId, text)
  await reply(chatId, result.ok ? `✓ ${result.confirmation}` : result.error)
}

async function handleCallbackQuery(cq: TgCallbackQuery): Promise<void> {
  // Acknowledge so the client stops its spinner (best-effort).
  await telegramApi('answerCallbackQuery', { callback_query_id: cq.id, text: 'Got it — recorded.' })

  const userId = await linkedUserId(cq.from.id)
  if (!userId) return

  // Phase C wires actions to redirections; for now persist the payload as a record.
  await writeInboxMessage(
    userId,
    {
      title: 'Telegram action received',
      body: `Action "${cq.data ?? ''}" was tapped in Telegram. One-tap execution lands in Phase C.`,
      meta: {
        kind: 'telegram_callback',
        data: cq.data ?? null,
        telegramUserId: cq.from.id,
        chatId: cq.message?.chat?.id ?? null,
        messageId: cq.message?.message_id ?? null,
        at: new Date().toISOString(),
      },
    },
    { read: true }, // it's a log record, not a notification
  ).catch((e) => console.error('[telegram/webhook] callback persist failed:', e))
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, RATE_LIMITS.telegramWebhook)
  if (limited) return limited

  if (!secretOk(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let update: TgUpdate
  try {
    update = (await req.json()) as TgUpdate
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    if (update.callback_query) await handleCallbackQuery(update.callback_query)
    else if (update.message) await handleMessage(update.message)
    // Unknown update types are acknowledged and ignored.
  } catch (e) {
    // Never bubble — a thrown handler would make Telegram retry the update forever.
    console.error('[telegram/webhook] handler error:', e)
    captureServerException(e, {
      route: '/api/telegram/webhook',
      extra: { updateKind: update.callback_query ? 'callback_query' : update.message ? 'message' : 'other' },
    })
  }

  return NextResponse.json({ ok: true })
}
