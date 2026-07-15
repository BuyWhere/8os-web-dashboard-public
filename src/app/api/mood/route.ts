/**
 * /api/mood — E-9 mood loop capture (backlog §5).
 *
 *  POST { mood?: 1-5, energy?: 1-5, source? } — upsert the caller's mood_logs
 *        row for their LOCAL calendar date (E-0/OS-2651 user-time util). UNIQUE
 *        (user_id, local_date): re-logging the same day UPDATES, never
 *        duplicates. ≈2s of friction from the daily shutdown surface.
 *  GET   — recent mood/energy history strip (last 14 local days) for the
 *        dashboard mood strip + the shutdown "already logged today?" state.
 *
 * Authed (Clerk requireAuth, userId-scoped) — same pattern as /api/shutdown.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getUserTimezone, userLocalDate } from '@/lib/user-time'
import { randomUUID } from 'crypto'
import { z } from 'zod'

const Scale = z.number().int().min(1).max(5)
const Body = z
  .object({
    mood: Scale.optional().nullable(),
    energy: Scale.optional().nullable(),
    source: z.string().max(40).optional(),
  })
  .refine((b) => b.mood != null || b.energy != null, { message: 'provide mood and/or energy (1-5)' })

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const limited = enforceRateLimit(req, RATE_LIMITS.mood, auth.userId)
  if (limited) return limited

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const tz = await getUserTimezone(auth.userId)
  const { iso } = userLocalDate(tz)
  // local_date is a @db.Date column — store as midnight-UTC of the civil date.
  const localDate = new Date(`${iso}T00:00:00.000Z`)
  const source = parsed.data.source ?? 'shutdown'

  // UNIQUE upsert on (user_id, local_date): same-day re-log updates in place.
  const row = await prisma.moodLog.upsert({
    where: { userId_localDate: { userId: auth.userId, localDate } },
    create: {
      id: randomUUID(),
      userId: auth.userId,
      localDate,
      mood: parsed.data.mood ?? null,
      energy: parsed.data.energy ?? null,
      source,
    },
    update: {
      // Only overwrite fields the caller supplied (a mood-only re-log keeps energy).
      ...(parsed.data.mood != null ? { mood: parsed.data.mood } : {}),
      ...(parsed.data.energy != null ? { energy: parsed.data.energy } : {}),
      source,
    },
    select: { id: true, localDate: true, mood: true, energy: true, source: true },
  })

  return NextResponse.json(
    { ok: true, localDate: iso, mood: row.mood, energy: row.energy, source: row.source },
    { status: 201 },
  )
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const tz = await getUserTimezone(auth.userId)
  const { iso } = userLocalDate(tz)
  const [y, m, d] = iso.split('-').map(Number)
  const since = new Date(Date.UTC(y, m - 1, d - 13)) // last 14 local days

  const logs = await prisma.moodLog.findMany({
    where: { userId: auth.userId, localDate: { gte: since } },
    select: { localDate: true, mood: true, energy: true, source: true },
    orderBy: { localDate: 'asc' },
  })

  const todayIso = iso
  const today = logs.find((l) => l.localDate.toISOString().slice(0, 10) === todayIso) ?? null

  return NextResponse.json({
    timezone: tz,
    todayLocalDate: todayIso,
    loggedToday: today != null,
    today: today ? { mood: today.mood, energy: today.energy } : null,
    history: logs.map((l) => ({
      localDate: l.localDate.toISOString().slice(0, 10),
      mood: l.mood,
      energy: l.energy,
      source: l.source,
    })),
  })
}
