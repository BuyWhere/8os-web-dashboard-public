/**
 * Signed one-time Telegram link tokens (OS-2652).
 *
 * Minted by POST /api/telegram/link (Clerk-authed), consumed by the webhook's
 * `/start <token>` handler. Telegram deep-link start payloads are limited to
 * 64 chars of [A-Za-z0-9_-], so the token is a FIXED-WIDTH compact encoding:
 *
 *   [32 chars] userId as undashed uuid hex
 *   [ 8 chars] expiry, unix SECONDS in base36, zero-padded
 *   [24 chars] HMAC-SHA256(secret, uidHex + "." + exp36) hex, truncated (96 bits)
 *   = 64 chars exactly.
 *
 * Secret material: TELEGRAM_LINK_SECRET env when set, else derived server-side
 * from CLERK_SECRET_KEY (sha256, domain-separated) so no new env var is
 * REQUIRED for go-live. Tokens expire after 10 minutes; consumption is
 * idempotent (re-use within the window re-links the same user — harmless).
 */
import { createHash, createHmac, timingSafeEqual } from 'crypto'

const TOKEN_TTL_MS = 10 * 60 * 1000
const UID_LEN = 32
const EXP_LEN = 8
const SIG_LEN = 24
export const LINK_TOKEN_LENGTH = UID_LEN + EXP_LEN + SIG_LEN // 64

function getLinkSecret(): Buffer | null {
  const explicit = process.env.TELEGRAM_LINK_SECRET
  if (explicit) return createHash('sha256').update(explicit).digest()
  const clerk = process.env.CLERK_SECRET_KEY
  if (clerk) return createHash('sha256').update(`8os:telegram-link:${clerk}`).digest()
  return null
}

function sign(secret: Buffer, uidHex: string, exp36: string): string {
  return createHmac('sha256', secret).update(`${uidHex}.${exp36}`).digest('hex').slice(0, SIG_LEN)
}

/** Mint a link token for a user. Returns null when the userId isn't a uuid
 *  (rare requireAuth fallback path) or no secret material exists. */
export function mintLinkToken(userId: string): { token: string; expiresAt: string } | null {
  const secret = getLinkSecret()
  if (!secret) return null
  const uidHex = userId.replace(/-/g, '').toLowerCase()
  if (!/^[0-9a-f]{32}$/.test(uidHex)) return null
  const expiresMs = Date.now() + TOKEN_TTL_MS
  const exp36 = Math.floor(expiresMs / 1000).toString(36).padStart(EXP_LEN, '0')
  const token = `${uidHex}${exp36}${sign(secret, uidHex, exp36)}`
  return { token, expiresAt: new Date(expiresMs).toISOString() }
}

/** Verify a token from `/start <token>`. Returns the dashed userId or null. */
export function verifyLinkToken(token: string): string | null {
  const secret = getLinkSecret()
  if (!secret) return null
  if (typeof token !== 'string' || token.length !== LINK_TOKEN_LENGTH) return null
  const uidHex = token.slice(0, UID_LEN).toLowerCase()
  const exp36 = token.slice(UID_LEN, UID_LEN + EXP_LEN)
  const sig = token.slice(UID_LEN + EXP_LEN)
  if (!/^[0-9a-f]{32}$/.test(uidHex) || !/^[0-9a-z]{8}$/.test(exp36)) return null
  const expected = sign(secret, uidHex, exp36)
  const a = Buffer.from(sig, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  const expSec = parseInt(exp36, 36)
  if (!Number.isFinite(expSec) || expSec * 1000 < Date.now()) return null
  return `${uidHex.slice(0, 8)}-${uidHex.slice(8, 12)}-${uidHex.slice(12, 16)}-${uidHex.slice(16, 20)}-${uidHex.slice(20)}`
}
