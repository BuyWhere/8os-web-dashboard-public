import { createHash, createHmac, timingSafeEqual } from 'crypto'

const MAX_AUTH_AGE_SECONDS = 3600 // 1 hour

export interface TelegramAuthData {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required for Telegram login')
  return token
}

export function getTelegramBotUsername(): string {
  const name = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
  if (!name) throw new Error('NEXT_PUBLIC_TELEGRAM_BOT_USERNAME is required for Telegram Login Widget')
  return name
}

/**
 * Verifies Telegram Login Widget auth data using HMAC-SHA256.
 * Algorithm per https://core.telegram.org/widgets/login#checking-authorization
 *
 * 1. Build data_check_string: sorted key=value pairs (excluding `hash`), joined by \n
 * 2. Secret key = SHA-256(bot_token) — raw bytes, NOT hex
 * 3. Expected = HMAC-SHA256(data_check_string, secret_key) as hex
 * 4. Compare expected === hash (timing-safe)
 * 5. Validate auth_date is within MAX_AUTH_AGE_SECONDS
 */
export function verifyTelegramAuthData(data: Record<string, string>): TelegramAuthData {
  const { hash, ...rest } = data

  if (!hash) throw new Error('Missing hash in Telegram auth data')
  if (!rest.id) throw new Error('Missing id in Telegram auth data')
  if (!rest.auth_date) throw new Error('Missing auth_date in Telegram auth data')

  // Build data_check_string
  const dataCheckString = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join('\n')

  // Secret key = SHA256(bot_token) as raw bytes
  const secretKey = createHash('sha256').update(getBotToken()).digest()

  // Expected hash = HMAC-SHA256(data_check_string, secretKey) as hex
  const expectedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  // Timing-safe comparison
  if (
    hash.length !== expectedHash.length ||
    !timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'))
  ) {
    throw new Error('Invalid Telegram auth hash, possible tampering')
  }

  const authDate = parseInt(rest.auth_date, 10)
  if (isNaN(authDate)) throw new Error('Invalid auth_date in Telegram data')

  const ageSecs = Math.floor(Date.now() / 1000) - authDate
  if (ageSecs > MAX_AUTH_AGE_SECONDS) throw new Error('Telegram auth data has expired (>1 hour old)')
  if (ageSecs < -30) throw new Error('Telegram auth_date is in the future')

  return {
    id: parseInt(rest.id, 10),
    first_name: rest.first_name,
    last_name: rest.last_name,
    username: rest.username,
    photo_url: rest.photo_url,
    auth_date: authDate,
    hash,
  }
}
