import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/** Check HIBP (haveibeenpwned.com) to see if a password appears in known data breaches.
 *  Uses the k-anonymity model — only the first 5 hex chars of the SHA-1 hash are sent.
 */
export async function isPasswordPwned(password: string): Promise<boolean> {
  try {
    const { createHash } = await import('crypto')
    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase()
    const prefix = sha1.slice(0, 5)
    const suffix = sha1.slice(5)

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return false // fail open, don't block login on HIBP outage

    const text = await res.text()
    return text.split('\r\n').some((line) => line.startsWith(suffix))
  } catch {
    return false // fail open
  }
}
