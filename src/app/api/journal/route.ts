/**
 * GET  /api/journal   → list the user's journal entries (newest first)
 *                       ?from=YYYY-MM-DD & ?to=YYYY-MM-DD  filter by entryDate range
 *                       ?kind=free|shutdown_reflection|weekly_reflection|gratitude
 *                       ?limit=1..200 (default 100)
 * POST /api/journal   → create a journal entry
 *
 * Authed (Clerk requireAuth, userId-scoped) — same pattern as /api/tasks.
 * This is the persistence layer for the journal page, the shutdown-ritual
 * reflection (kind=shutdown_reflection) and the weekly-review reflection
 * (kind=weekly_reflection). Entries are first-class signal for goal-alignment
 * tracking (OS-2542).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { captureServerException } from '@/lib/error-track'
import { z } from 'zod'

const KINDS = ['free', 'shutdown_reflection', 'weekly_reflection', 'gratitude'] as const

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const CreateEntrySchema = z.object({
  content: z.string().min(1).max(20000),
  kind: z.enum(KINDS).default('free'),
  mood: z.string().max(100).optional().nullable(),
  // Day the entry belongs to; defaults to today (server UTC date).
  entryDate: z.string().regex(DATE_RE).optional(),
})

// entryDate column is a DATE — anchor at UTC midnight so it round-trips cleanly.
function toEntryDate(d: string): Date {
  return new Date(`${d}T00:00:00.000Z`)
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const kind = searchParams.get('kind')
  const limitRaw = Number(searchParams.get('limit') ?? 100)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200) : 100

  const where: Record<string, unknown> = { userId: auth.userId }
  if (kind && (KINDS as readonly string[]).includes(kind)) where.kind = kind
  if ((from && DATE_RE.test(from)) || (to && DATE_RE.test(to))) {
    where.entryDate = {
      ...(from && DATE_RE.test(from) ? { gte: toEntryDate(from) } : {}),
      ...(to && DATE_RE.test(to) ? { lte: toEntryDate(to) } : {}),
    }
  }

  let entries
  try {
    entries = await prisma.journalEntry.findMany({
      where,
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    })
  } catch (err) {
    console.error('[journal] list failed:', err)
    captureServerException(err, { route: '/api/journal', userId: auth.userId, extra: { method: 'GET' } })
    return NextResponse.json({ error: 'Could not load journal entries.' }, { status: 500 })
  }

  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const parsed = CreateEntrySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const data = parsed.data
  const entryDate = toEntryDate(data.entryDate ?? new Date().toISOString().slice(0, 10))

  let entry
  try {
    entry = await prisma.journalEntry.create({
      data: {
        userId: auth.userId,
        content: data.content,
        kind: data.kind,
        mood: data.mood ?? null,
        entryDate,
      },
    })
  } catch (err) {
    console.error('[journal] create failed:', err)
    captureServerException(err, { route: '/api/journal', userId: auth.userId, extra: { method: 'POST' } })
    return NextResponse.json({ error: 'Could not save journal entry.' }, { status: 500 })
  }

  return NextResponse.json(entry, { status: 201 })
}
