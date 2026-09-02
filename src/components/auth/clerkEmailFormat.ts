export type AuthBridgeKind = 'format' | 'exists' | 'credentials' | 'generic' | 'password'

export const EMAIL_FORMAT_MESSAGE = 'Please enter a valid email address.'
export const PASSWORD_FALLBACK_MESSAGE =
  'Your password does not meet the requirements. Use 8 or more characters.'

export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function extractEmailFromBody(body: unknown): string | null {
  if (!body) return null
  if (typeof body === 'string') {
    try {
      return extractEmailFromBody(JSON.parse(body))
    } catch {
      return null
    }
  }
  if (typeof body !== 'object') return null
  const rec = body as Record<string, unknown>
  const candidates = [rec.email_address, rec.emailAddress, rec.identifier, rec.email]
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) return c
  }
  return null
}

export function clerkErrorsIndicateFormat(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false
  const rec = payload as Record<string, unknown>
  const errors = Array.isArray(rec.errors) ? rec.errors : []
  const codes = errors
    .map((e) => (e && typeof e === 'object' ? String((e as Record<string, unknown>).code ?? '') : ''))
    .join(' ')
    .toLowerCase()
  if (
    codes.includes('form_param_format_invalid') ||
    codes.includes('form_identifier_invalid') ||
    codes.includes('form_param_format') ||
    codes.includes('invalid_email')
  ) {
    return true
  }
  const blob = JSON.stringify(payload).toLowerCase()
  return blob.includes('valid email') || blob.includes('invalid email') || blob.includes('is not a valid')
}

const PASSWORD_CODES = [
  'form_password_length_too_short',
  'form_password_length_too_long',
  'form_password_pwned',
  'form_password_not_strong_enough',
  'form_password_size_in_bytes_exceeded',
  'form_password_incorrect',
  'form_password_validation_failed',
]

function clerkErrorList(payload: unknown): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== 'object') return []
  const rec = payload as Record<string, unknown>
  return Array.isArray(rec.errors)
    ? rec.errors.filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
    : []
}

export function clerkErrorsIndicatePassword(payload: unknown): boolean {
  const codes = clerkErrorList(payload)
    .map((e) => String(e.code ?? '').toLowerCase())
    .join(' ')
  if (PASSWORD_CODES.some((c) => codes.includes(c))) return true
  const blob = JSON.stringify(payload ?? {}).toLowerCase()
  return (
    blob.includes('password must') ||
    blob.includes('password is too short') ||
    blob.includes('8 or more characters') ||
    blob.includes('not strong enough')
  )
}

export function clerkPasswordMessage(payload: unknown): string | null {
  const first = clerkErrorList(payload)[0]
  if (!first) return null
  const long = typeof first.longMessage === 'string' ? first.longMessage.trim() : ''
  const short = typeof first.message === 'string' ? first.message.trim() : ''
  return long || short || null
}

export function clerkErrorsIndicateExists(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false
  const rec = payload as Record<string, unknown>
  const errors = Array.isArray(rec.errors) ? rec.errors : []
  const codes = errors
    .map((e) => (e && typeof e === 'object' ? String((e as Record<string, unknown>).code ?? '') : ''))
    .join(' ')
    .toLowerCase()
  return (
    codes.includes('form_identifier_exists') ||
    codes.includes('identifier_already_exists') ||
    codes.includes('email_address_exists')
  )
}

export function classifySignup422(
  payload?: unknown,
  requestEmail?: string | null
): { message: string; kind: AuthBridgeKind } {
  // Password failures must win over the generic "email may already be in use"
  // fallback (OS-5955). Clerk often returns form_password_length_too_short
  // while the field validator already shows the 8-char rule.
  if (clerkErrorsIndicatePassword(payload)) {
    return {
      message: clerkPasswordMessage(payload) ?? PASSWORD_FALLBACK_MESSAGE,
      kind: 'password',
    }
  }
  if (clerkErrorsIndicateFormat(payload) || (requestEmail && !looksLikeEmail(requestEmail))) {
    return { message: EMAIL_FORMAT_MESSAGE, kind: 'format' }
  }
  if (clerkErrorsIndicateExists(payload)) {
    return {
      message:
        "We couldn't create your account with those details. The email may already be in use — try logging in, or use a different email address.",
      kind: 'exists',
    }
  }
  return {
    message:
      "We couldn't create your account with those details. Check the highlighted fields and try again.",
    kind: 'generic',
  }
}

export function classifySignin422(
  payload?: unknown,
  requestEmail?: string | null
): { message: string; kind: AuthBridgeKind } {
  if (clerkErrorsIndicateFormat(payload) || (requestEmail && !looksLikeEmail(requestEmail))) {
    return { message: EMAIL_FORMAT_MESSAGE, kind: 'format' }
  }
  return {
    message:
      "We couldn't sign you in with those details. Double-check your email and password, then try again.",
    kind: 'credentials',
  }
}
