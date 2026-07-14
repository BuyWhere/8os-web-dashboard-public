import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// OS-3647: monitor Clerk /v1/client/sign_ins 4xx responses from a single
// process-wide counter. The LoginClerkErrorBridge client posts each upstream
// error here (best-effort, no auth — fires before login). GET reports the
// current rate so Railway logs / external monitoring can pick up regressions
// without needing direct Clerk dashboard access.
//
// Counter is in-memory per process. Multi-replica Railway deploys will see
// partial counts; that's acceptable for a regression signal — the QA board
// wants visibility, not exact replay.
//
// Schema is intentionally minimal so we can ship without a migration.
// If the table isn't present, the route falls back to a no-op so the
// /login page is never blocked by a missing monitoring table.

interface HealthRow {
  bucket_minute: Date
  status: number
  endpoint: string
  count: bigint
}

async function ensureTable(): Promise<boolean> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS clerk_sign_in_errors (
        bucket_minute timestamptz NOT NULL,
        status        integer     NOT NULL,
        endpoint      text        NOT NULL,
        count         bigint      NOT NULL DEFAULT 1,
        PRIMARY KEY (bucket_minute, status, endpoint)
      )
    `)
    return true
  } catch {
    return false
  }
}

function bucketMinute(d: Date): Date {
  const b = new Date(d)
  b.setUTCSeconds(0, 0)
  return b
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body.status !== 'number' || typeof body.endpoint !== 'string') {
    return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 })
  }
  if (body.status < 400 || body.status > 599) {
    return NextResponse.json({ ok: false, error: 'status out of range' }, { status: 400 })
  }
  if (body.endpoint.length > 512) {
    return NextResponse.json({ ok: false, error: 'endpoint too long' }, { status: 400 })
  }
  const bucket = bucketMinute(new Date())
  if (!(await ensureTable())) {
    return NextResponse.json({ ok: true, stored: false }, { status: 202 })
  }
  try {
    await prisma.$executeRaw`
      INSERT INTO clerk_sign_in_errors (bucket_minute, status, endpoint, count)
      VALUES (${bucket}, ${body.status}, ${body.endpoint}, 1)
      ON CONFLICT (bucket_minute, status, endpoint)
      DO UPDATE SET count = clerk_sign_in_errors.count + 1
    `
    return NextResponse.json({ ok: true, stored: true })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}

export async function GET() {
  if (!(await ensureTable())) {
    return NextResponse.json(
      { ok: false, status: 'table-missing' },
      { status: 503 }
    )
  }
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000) // last hour
    const rows = await prisma.$queryRaw<HealthRow[]>`
      SELECT bucket_minute, status, endpoint, count
        FROM clerk_sign_in_errors
       WHERE bucket_minute >= ${since}
       ORDER BY bucket_minute DESC, count DESC
       LIMIT 200
    `
    const byStatus: Record<string, number> = {}
    let total = 0
    for (const r of rows) {
      byStatus[String(r.status)] = (byStatus[String(r.status)] ?? 0) + Number(r.count)
      total += Number(r.count)
    }
    return NextResponse.json({
      ok: true,
      windowMinutes: 60,
      total,
      byStatus,
      sample: rows.slice(0, 20).map((r) => ({
        bucketMinute: r.bucket_minute.toISOString(),
        status: r.status,
        endpoint: r.endpoint,
        count: Number(r.count),
      })),
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}