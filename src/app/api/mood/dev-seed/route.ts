/**
 * POST /api/mood/dev-seed — QA-only mood_logs seeding for the E-9 probe
 * (qa/mood-probe.js). Lets QA seed ≥10 mood logs across weeks (dated by
 * local_date) directly, exactly as the shutdown upsert would have written them,
 * so the weekly correlation insight can be exercised end-to-end.
 *
 * GUARDED: only usable by @qa.8os.ai accounts, or anyone when
 * MOOD_DEV_SEED=1 is set. Everyone else gets 403. Clerk-authed, rate-limited,
 * userId-scoped (you can only seed your own data).
 *
 * Body: { logs: [{ localDate: "YYYY-MM-DD", mood?: 1-5, energy?: 1-5 }] }
 * Upserts on (user_id, local_date) so re-seeding is idempotent.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { randomUUID } from 'crypto'
import { z } from 'zod'

const Scale = z.number().int().min(1).max(5)
const Schema = z.object({
  logs: z
    .array(
      z.object({
        localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        mood: Scale.optional().nullable(),
        energy: Scale.optional().nullable(),
      }),
    )
    .min(1)
    .max(120),
})

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const limited = enforceRateLimit(req, RATE_LIMITS.moodDevSeed, auth.userId)
  if (limited) return limited

  // ── Guard: QA accounts or explicit env flag only ──
  if (process.env.MOOD_DEV_SEED !== '1') {
    const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { email: true } })
    if (!user?.email || !user.email.toLowerCase().endsWith('@qa.8os.ai')) {
      return NextResponse.json({ error: 'dev-seed is restricted to QA accounts' }, { status: 403 })
    }
  }

  const parsed = Schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  let created = 0
  for (const l of parsed.data.logs) {
    const localDate = new Date(`${l.localDate}T00:00:00.000Z`)
    await prisma.moodLog.upsert({
      where: { userId_localDate: { userId: auth.userId, localDate } },
      create: {
        id: randomUUID(),
        userId: auth.userId,
        localDate,
        mood: l.mood ?? null,
        energy: l.energy ?? null,
        source: 'dev_seed',
      },
      update: {
        mood: l.mood ?? null,
        energy: l.energy ?? null,
        source: 'dev_seed',
      },
    })
    created++
  }

  return NextResponse.json({ seeded: created }, { status: 201 })
}
