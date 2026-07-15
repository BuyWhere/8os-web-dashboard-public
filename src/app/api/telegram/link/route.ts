/**
 * /api/telegram/link — mint Telegram deep-link tokens + report channel status
 * (OS-2652). Clerk-authed.
 *
 * POST — mints a signed one-time token (10-min expiry) and returns the
 *        t.me/<bot>?start=<token> deep link. If TELEGRAM_BOT_USERNAME (or the
 *        existing NEXT_PUBLIC_TELEGRAM_BOT_USERNAME) is unset, returns a clear
 *        not-configured shape instead.
 * GET  — link/config status for /settings/channels: whether the bot token is
 *        live, the bot username, and whether THIS user has linked.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { mintLinkToken } from '@/lib/channels/link-token'
import { isTelegramConfigured, getTelegramBotUsernameOrNull, getLinkedTelegramChatId } from '@/lib/channels/telegram'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const chatId = await getLinkedTelegramChatId(auth.userId)
  return NextResponse.json({
    webInbox: { enabled: true },
    telegram: {
      botConfigured: isTelegramConfigured(),
      botUsername: getTelegramBotUsernameOrNull(),
      linked: !!chatId,
    },
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const botUsername = getTelegramBotUsernameOrNull()
  if (!botUsername) {
    return NextResponse.json({
      configured: false,
      error: 'telegram_not_configured',
      message: 'Telegram not configured yet',
    })
  }

  const minted = mintLinkToken(auth.userId)
  if (!minted) {
    return NextResponse.json(
      { configured: false, error: 'link_token_unavailable', message: 'Could not mint a link token' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    configured: true,
    botConfigured: isTelegramConfigured(),
    botUsername,
    deepLink: `https://t.me/${botUsername}?start=${minted.token}`,
    expiresAt: minted.expiresAt,
  })
}
