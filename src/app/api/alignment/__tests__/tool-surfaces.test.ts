/**
 * OS-5119 — regression guard for /api/alignment/tool-spec and
 * /api/alignment/tool-call. The summary route advertises both endpoints;
 * both were 404 against api.8os.ai and the Railway origin. These tests pin
 * the contract so a future cleanup doesn't silently drop the surfaces again.
 *
 * Auth: authOrQa — both routes should 401/403 when no Clerk session is
 * present. The full pipeline (runAttribution / computeLedger / computeAlignment)
 * is mocked — we only verify the surface shape here.
 */
import { NextRequest, NextResponse } from 'next/server'
import { GET as toolSpecGET } from '../tool-spec/route'
import { POST as toolCallPOST, GET as toolCallGET } from '../tool-call/route'

// Mock the QA-auth shim so we can drive authed AND unauthed paths without a
// Clerk session.
jest.mock('@/lib/memory/qa-auth', () => ({
  authOrQa: jest.fn(),
}))
jest.mock('@/lib/rate-limit', () => ({
  enforceRateLimit: jest.fn(() => null),
  RATE_LIMITS: { alignment: { name: 'alignment', limit: 10, windowMs: 60000 } },
}))
jest.mock('@/lib/db/prisma', () => ({
  prisma: { alignmentAttribution: { findMany: jest.fn().mockResolvedValue([]) } },
}))
jest.mock('@/lib/alignment-engine', () => ({
  runAttribution: jest.fn().mockResolvedValue({ scanned: 0, errors: [] }),
  computeLedger: jest.fn().mockResolvedValue([]),
  computeAlignment: jest.fn().mockResolvedValue({
    asOf: '2026-07-29T00:00:00.000Z',
    windowDays: 7,
    correctionRate: 0,
    correctionStats: { total: 0, corrected: 0 },
    daily: { headline: '', unalignedShare: null },
    weekly: {
      headline: '',
      topRedirection: '',
      perGoal: [],
      unalignedShare: 0,
      receipts: [],
    },
  }),
}))
jest.mock('@/lib/error-track', () => ({ captureServerException: jest.fn() }))

import { authOrQa } from '@/lib/memory/qa-auth'

const authOrQaMock = authOrQa as jest.Mock

function makeReq(url: string, init?: { method?: string; body?: string }): NextRequest {
  return new NextRequest(url, init as never)
}

describe('OS-5119 — alignment tool surfaces', () => {
  beforeEach(() => {
    authOrQaMock.mockReset()
  })

  describe('GET /api/alignment/tool-spec', () => {
    it('returns the schema manifest when authed', async () => {
      authOrQaMock.mockResolvedValue({ userId: 'u_test' })
      const res = await toolSpecGET(makeReq('http://localhost/api/alignment/tool-spec'))
      const body = await res.json()
      expect(res.status).toBe(200)
      expect(body.name).toBe('get_alignment')
      expect(body.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(body.input.properties).toHaveProperty('days')
      expect(body.input.properties).toHaveProperty('full')
      expect(body.input.properties).toHaveProperty('debug')
      expect(body.output.required).toEqual(
        expect.arrayContaining(['attribution', 'ledger', 'asOf', 'windowDays', 'daily', 'weekly']),
      )
      expect(body.companion).toEqual({
        correct: 'POST /api/alignment/correct',
        rank: 'POST /api/alignment/rank',
      })
    })

    it('returns the auth response when unauthenticated', async () => {
      authOrQaMock.mockResolvedValue(
        NextResponse.json({ error: 'unauthenticated' }, { status: 401 }),
      )
      const res = await toolSpecGET(makeReq('http://localhost/api/alignment/tool-spec'))
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/alignment/tool-call', () => {
    it('returns the alignment payload (authed, defaults)', async () => {
      authOrQaMock.mockResolvedValue({ userId: 'u_test' })
      const res = await toolCallPOST(
        makeReq('http://localhost/api/alignment/tool-call', {
          method: 'POST',
          body: JSON.stringify({}),
        }),
      )
      const body = await res.json()
      expect(res.status).toBe(200)
      expect(body).toHaveProperty('attribution')
      expect(body).toHaveProperty('ledger')
      expect(body).toHaveProperty('asOf')
      expect(body).toHaveProperty('weekly')
    })

    it('honors full / debug flags', async () => {
      authOrQaMock.mockResolvedValue({ userId: 'u_test' })
      const res = await toolCallPOST(
        makeReq('http://localhost/api/alignment/tool-call', {
          method: 'POST',
          body: JSON.stringify({ days: 14, full: true, debug: true }),
        }),
      )
      const body = await res.json()
      expect(res.status).toBe(200)
      expect(body.attributions).toBeDefined()
      expect(body.debug).toBeDefined()
    })

    it('returns 400 on invalid JSON body', async () => {
      authOrQaMock.mockResolvedValue({ userId: 'u_test' })
      const res = await toolCallPOST(
        makeReq('http://localhost/api/alignment/tool-call', {
          method: 'POST',
          body: 'not json{',
        }),
      )
      const body = await res.json()
      expect(res.status).toBe(400)
      expect(body.error).toBe('invalid JSON body')
    })

    it('GET returns 405 with Allow: POST', async () => {
      const res = await toolCallGET()
      expect(res.status).toBe(405)
      expect(res.headers.get('Allow')).toBe('POST')
    })

    it('returns the auth response when unauthenticated', async () => {
      authOrQaMock.mockResolvedValue(
        NextResponse.json({ error: 'unauthenticated' }, { status: 401 }),
      )
      const res = await toolCallPOST(
        makeReq('http://localhost/api/alignment/tool-call', {
          method: 'POST',
          body: JSON.stringify({}),
        }),
      )
      expect(res.status).toBe(401)
    })
  })
})