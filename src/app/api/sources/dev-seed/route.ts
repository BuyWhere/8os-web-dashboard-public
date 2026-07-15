/**
 * POST /api/sources/dev-seed — QA-only pipeline seeding for E-1 (gcal-sync
 * probe). Google OAuth is dormant until the owner supplies credentials, so
 * this endpoint lets QA exercise the WHOLE downstream pipeline (tables →
 * settings UI → scheduler busy-time → attribution) with a fake source +
 * external_events, exactly as a real sync would have written them.
 *
 * GUARDED: only usable by @qa.8os.ai accounts, or anyone when
 * EXTERNAL_SOURCES_DEV_SEED=1 is set. Everyone else gets 403.
 * Clerk-authed (requireAuth), rate-limited, userId-scoped (you can only seed
 * your own data).
 *
 * Body: { events: [{ title, startAt, endAt, icalUid?, attendees?: [{email}] }] }
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { encrypt } from '@/lib/encryption'
import { GOOGLE_CALENDAR_PROVIDER } from '@/lib/external/google-calendar'
import { randomUUID } from 'crypto'
import { z } from 'zod'

const Schema = z.object({
  events: z
    .array(
      z.object({
        title: z.string().min(1).max(300),
        startAt: z.string().datetime(),
        endAt: z.string().datetime(),
        icalUid: z.string().max(300).optional(),
        externalId: z.string().max(300).optional(),
        attendees: z.array(z.object({ email: z.string().max(200) })).max(20).optional(),
      }),
    )
    .min(1)
    .max(50),
})

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const limited = enforceRateLimit(req, RATE_LIMITS.sourcesDevSeed, auth.userId)
  if (limited) return limited

  // ── Guard: QA accounts or explicit env flag only ──
  if (process.env.EXTERNAL_SOURCES_DEV_SEED !== '1') {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { email: true },
    })
    if (!user?.email || !user.email.toLowerCase().endsWith('@qa.8os.ai')) {
      return NextResponse.json({ error: 'dev-seed is restricted to QA accounts' }, { status: 403 })
    }
  }

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Fake source: marked dev inside the encrypted token blob, so syncSource
  // no-ops on it and revoke skips the network. Reuse the caller's existing
  // dev source when present (idempotent re-seeding).
  let source = await prisma.externalSignalSource.findFirst({
    where: { userId: auth.userId, provider: GOOGLE_CALENDAR_PROVIDER, status: 'active' },
  })
  if (!source) {
    source = await prisma.externalSignalSource.create({
      data: {
        userId: auth.userId,
        provider: GOOGLE_CALENDAR_PROVIDER,
        encryptedTokens: encrypt(JSON.stringify({ dev: true })),
        status: 'active',
        lastSyncedAt: new Date(),
      },
    })
  }

  const created: Array<{ id: string; externalId: string; title: string; startsAt: string; endsAt: string }> = []
  for (const ev of parsed.data.events) {
    const externalId = ev.externalId ?? `dev-${randomUUID()}`
    const startsAt = new Date(ev.startAt)
    const endsAt = new Date(ev.endAt)
    if (endsAt <= startsAt) {
      return NextResponse.json({ error: `event "${ev.title}" ends before it starts` }, { status: 400 })
    }
    const fields = {
      icalUid: ev.icalUid ?? null,
      title: ev.title,
      startsAt,
      endsAt,
      attendeesJson: ev.attendees && ev.attendees.length > 0 ? ev.attendees : undefined,
      isDeleted: false,
      updatedAt: new Date(),
    }
    const row = await prisma.externalEvent.upsert({
      where: { sourceId_externalId: { sourceId: source.id, externalId } },
      create: { ...fields, userId: auth.userId, sourceId: source.id, externalId },
      update: fields,
    })
    created.push({
      id: row.id,
      externalId,
      title: ev.title,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    })
  }

  return NextResponse.json({ sourceId: source.id, created: created.length, events: created }, { status: 201 })
}
