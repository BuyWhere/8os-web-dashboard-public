export type AuthBridgeKind = 'format' | 'exists' | 'credentials' | 'generic'

export const EMAIL_FORMAT_MESSAGE = 'Please enter a valid email address.'

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
      "We couldn't create your account with those details. The email may already be in use — try logging in, or use a different email address.",
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
