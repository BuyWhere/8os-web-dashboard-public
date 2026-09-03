import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  // OS-6134: probe alignment /api/alignment/tool-call POST route registration.
  // Railway deploy gate only supports GET health checks, so we validate via the
  // /api/alignment GET manifest which lists registered routes including toolCall.
  const alignmentProbe = await _probeAlignmentToolCall()
  const dbProbe = await _probeDatabase()

  const allOk = alignmentProbe.ok && dbProbe.ok
  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      db: dbProbe.data,
      probes: {
        alignment_tool_call: alignmentProbe.ok ? 'ok' : '404_not_registered',
      },
    },
    { status: allOk ? 200 : 503 },
  )
}

async function _probeAlignmentToolCall(): Promise<{ ok: boolean }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://api.8os.ai'
    const res = await fetch(`${baseUrl}/api/alignment`, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return { ok: false }
    const data = (await res.json()) as { routes?: { toolCall?: string } }
    const toolCall = data?.routes?.toolCall
    if (!toolCall || !toolCall.includes('/api/alignment/tool-call')) {
      return { ok: false }
    }
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

async function _probeDatabase(): Promise<{
  ok: boolean
  data: { pool: { active: number; idle: number; total: number } } | { error: string }
}> {
  try {
    const rows = await prisma.$queryRaw<
      { active: bigint; idle: bigint; total: bigint }[]
    >`
      SELECT
        count(*) FILTER (WHERE state = 'active') AS active,
        count(*) FILTER (WHERE state = 'idle')   AS idle,
        count(*)                                  AS total
      FROM pg_stat_activity
      WHERE datname = current_database()
    `
    const pool = rows[0]
    return {
      ok: true,
      data: {
        pool: {
          active: Number(pool.active),
          idle: Number(pool.idle),
          total: Number(pool.total),
        },
      },
    }
  } catch (err) {
    return {
      ok: false,
      data: { error: err instanceof Error ? err.message : 'unknown' },
    }
  }
}
