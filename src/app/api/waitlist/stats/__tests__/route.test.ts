import { GET } from '../route'
import { NextRequest } from 'next/server'

function makeReq(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`)
}

describe('GET /api/waitlist/stats', () => {
  let fetchMock: jest.SpyInstance

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ count: 1, entries: [] }),
    })
  })

  afterEach(() => {
    fetchMock.mockRestore()
  })

  it('omits test entries by default', async () => {
    const res = await GET(makeReq('/api/waitlist/stats'))
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://orchestrator-production-1643.up.railway.app/waitlist/stats'),
      { cache: 'no-store' }
    )
  })

  it('forwards include_tests=true for internal stats', async () => {
    const res = await GET(makeReq('/api/waitlist/stats?include_tests=true'))
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://orchestrator-production-1643.up.railway.app/waitlist/stats?include_tests=true'),
      { cache: 'no-store' }
    )
  })
})
