import { POST } from '../route'
import { NextRequest } from 'next/server'

// OS-1242: reserved-TLD emails must return 400 (not 502) at the proxy.
// The orchestrator's pydantic EmailStr rejects these with 422; before
// the fix, the proxy wrapped the 422 as 502 "Upstream waitlist service
// unavailable" which made common typos like `gmail.local` look like a
// server outage to the form.

function makeReq(body: object): NextRequest {
  return new NextRequest('http://localhost/api/waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/waitlist, reserved TLD validation (OS-1242)', () => {
  let fetchMock: jest.SpyInstance

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }))
  })

  afterEach(() => {
    fetchMock.mockRestore()
  })

  it('returns 400 for .local reserved TLD and does not call orchestrator', async () => {
    const res = await POST(makeReq({ email: 'test@buywhere.local' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body).toEqual({ error: 'Invalid email format' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 400 for .test reserved TLD', async () => {
    const res = await POST(makeReq({ email: 'test@example.test' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid email format')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 400 for .invalid reserved TLD', async () => {
    const res = await POST(makeReq({ email: 'user@example.invalid' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid email format')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 400 for .localhost reserved TLD', async () => {
    const res = await POST(makeReq({ email: 'user@example.localhost' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid email format')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 400 for .onion reserved TLD', async () => {
    const res = await POST(makeReq({ email: 'user@example.onion' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid email format')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does NOT pre-validate .example TLD (orchestrator accepts; smoke probe uses it)', async () => {
    // pydantic EmailStr does not reject .example, so we must not either.
    // The smoke probe at scripts/smoke-probe-8os.sh posts to
    // @paperclip.example intentionally — the proxy must let it through
    // to the orchestrator and return whatever the orchestrator returns.
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: 'Joined',
        position: 1,
        total: 1,
      }),
      headers: new Headers(),
    })
    const res = await POST(makeReq({ email: 'smoke@paperclip.example' }))
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('treats reserved-TLD match as case-insensitive', async () => {
    // pydantic EmailStr lowercases the TLD before checking, so we mirror.
    const res = await POST(makeReq({ email: 'user@BuyWhere.LOCAL' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid email format')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still returns 400 for empty body (existing behavior preserved)', async () => {
    const res = await POST(makeReq({}))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Email is required')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still returns 400 for no-TLD email (existing behavior preserved)', async () => {
    const res = await POST(makeReq({ email: 'no-tld' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid email format')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('forwards a normal email to the orchestrator unchanged', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: 'Joined',
        position: 42,
        total: 100,
      }),
      headers: new Headers(),
    })
    const res = await POST(makeReq({ email: 'real@example.com' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual({
      success: true,
      message: 'Joined',
      position: 42,
      total: 100,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.8os.ai/waitlist/join')
    expect(JSON.parse(init.body)).toEqual({
      email: 'real@example.com',
      source: 'dashboard',
      affiliate_opt_in: false,
    })
  })

  it('passes through orchestrator 422 (defense in depth) with the validation msg', async () => {
    // If pydantic adds a new reserved TLD or a deliverability check that
    // the proxy blocklist doesn't know about, the orchestrator returns
    // 422 with detail as an array of {msg, ...} objects. The proxy must
    // pass that through as 422 (not wrap as 502). Use a non-blocklisted
    // TLD so the proxy pre-validation lets the request through to the
    // orchestrator (simulating a future reserved TLD not yet on the list).
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        detail: [
          {
            type: 'value_error',
            loc: ['body', 'email'],
            msg: 'value is not a valid email address: The part after the @-sign is a special-use or reserved name that cannot be used with email.',
          },
        ],
      }),
      headers: new Headers(),
    })
    const res = await POST(makeReq({ email: 'test@example.com' }))
    const body = await res.json()
    expect(res.status).toBe(422)
    expect(body.error).toBe('Invalid email format')
    expect(body.detail).toContain('special-use or reserved name')
  })
})
