import {
  classifySignin422,
  classifySignup422,
  EMAIL_FORMAT_MESSAGE,
  extractEmailFromBody,
  looksLikeEmail,
} from '../clerkEmailFormat'

describe('looksLikeEmail', () => {
  it('rejects not-an-email', () => {
    expect(looksLikeEmail('not-an-email')).toBe(false)
  })
  it('accepts a normal address', () => {
    expect(looksLikeEmail('user@example.com')).toBe(true)
  })
})

describe('classifySignup422', () => {
  it('maps form_param_format_invalid to the email-format message', () => {
    const result = classifySignup422({
      errors: [{ code: 'form_param_format_invalid', message: 'is invalid' }],
    })
    expect(result.kind).toBe('format')
    expect(result.message).toBe(EMAIL_FORMAT_MESSAGE)
  })

  it('maps form_identifier_exists to the existing-email copy', () => {
    const result = classifySignup422({
      errors: [{ code: 'form_identifier_exists' }],
    })
    expect(result.kind).toBe('exists')
    expect(result.message).toMatch(/already be in use/i)
  })

  it('uses the request email when Clerk body is empty', () => {
    const result = classifySignup422(null, 'not-an-email')
    expect(result.kind).toBe('format')
    expect(result.message).toBe(EMAIL_FORMAT_MESSAGE)
  })
})

describe('classifySignin422', () => {
  it('maps invalid identifier to format message', () => {
    const result = classifySignin422(null, 'not-an-email')
    expect(result.kind).toBe('format')
    expect(result.message).toBe(EMAIL_FORMAT_MESSAGE)
  })
})

describe('extractEmailFromBody', () => {
  it('reads email_address from a JSON body string', () => {
    expect(extractEmailFromBody(JSON.stringify({ email_address: 'not-an-email' }))).toBe(
      'not-an-email'
    )
  })
})
