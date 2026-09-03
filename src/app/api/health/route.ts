import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  // OS-6134: Railway deploy gate evaluates HTTP status code + 60s timeout.
  // - Return 200: Railway marks deployment SUCCESS
  // - Return 503: Railway marks deployment FAILED (BLOCKS the new deploy, keeps old version live)
  //
  // Alignment probe: Railway only supports GET health checks, so we validate via the
  // /api/alignment GET manifest which lists registered routes including toolCall.
  const alignmentProbe = await _probeAlignmentToolCall()

  const status = alignmentProbe.ok ? 200 : 503
  return NextResponse.json(
    {
      status: alignmentProbe.ok ? 'ok' : 'degraded',
      alignment_probe: alignmentProbe.ok ? 'ok' : '404_not_registered',
      alignment_probe_detail: alignmentProbe.detail,
      timestamp: new Date().toISOString(),
    },
    { status },
  )
}

async function _probeAlignmentToolCall(): Promise<{
  ok: boolean
  detail: string
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://api.8os.ai'
    const res = await fetch(`${baseUrl}/api/alignment`, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      return { ok: false, detail: `HTTP ${res.status}` }
    }
    const data = (await res.json()) as {
      routes?: { toolCall?: string }
    }
    const toolCall = data?.routes?.toolCall
    if (!toolCall || !toolCall.includes('/api/alignment/tool-call')) {
      return { ok: false, detail: 'routes.toolCall missing from /api/alignment manifest' }
    }
    return { ok: true, detail: 'ok' }
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : 'fetch error',
    }
  }
}
