/**
 * GET /api/commitments/proposals — bridge captured commitments onto the calendar.
 *
 * The Coach/journal capture pipeline stores what the user said they'd do
 * (`commitments`), but nothing turned them into calendar events — the user's
 * whole day plan sat in the DB invisibly. This endpoint takes recent OPEN,
 * not-yet-scheduled commitments and (strong tier) converts the ones with a real
 * time into proposed events for one-pass confirm. Approving goes through
 * /api/journal/apply, which stamps commitments.scheduled_event_id so a
 * commitment is only ever proposed once.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { prisma } from '@/lib/db/prisma'
import { createChatCompletion, type ChatMessage } from '@/lib/flow-ai'
import { getUserTimezone } from '@/lib/user-time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let _ensured: Promise<void> | null = null
function ensureColumn(): Promise<void> {
  if (!_ensured) {
    _ensured = prisma
      .$executeRawUnsafe(`ALTER TABLE commitments ADD COLUMN IF NOT EXISTS scheduled_event_id text`)
      .then(() => undefined)
      .catch((e) => { _ensured = null; throw e })
  }
  return _ensured
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.userId

  try {
    await ensureColumn()
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; content: string; due_date: Date | null }>>(
      `SELECT id, content, due_date FROM commitments
       WHERE user_id = $1 AND status = 'open' AND scheduled_event_id IS NULL
         AND created_at > now() - interval '7 days'
       ORDER BY created_at DESC LIMIT 40`,
      userId,
    )
    if (rows.length === 0) return NextResponse.json({ events: [] })

    const tz = await getUserTimezone(userId).catch(() => 'Asia/Singapore')
    const nowStr = new Intl.DateTimeFormat('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: tz,
    }).format(new Date())

    const system = [
      'You turn a user\'s captured commitments into calendar events. STRICT JSON only.',
      `Right now it is ${nowStr} (timezone ${tz}).`,
      'Input: a list of {id, content, dueDate}. For each commitment that implies a REAL clock time',
      '(e.g. "pack up 7:30 to 8:00 pm", "workout 11:00-12:30"), output',
      '{commitmentId, title (short), startTime, endTime} — ISO LOCAL datetimes WITHOUT timezone suffix',
      '(e.g. "2026-07-16T19:30:00"); the system converts to the user\'s timezone. Resolve day words',
      '("today", "tonight", "before dinner") against the current date; if the commitment names no day, assume today',
      'if the time is still ahead, else tomorrow. SKIP commitments with no inferable clock time.',
      'If an end time is not stated, use a sensible duration (30-60 min).',
      'Return {"events": [...]}. Do not invent commitments.',
    ].join('\n')

    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(rows.map((r) => ({ id: r.id, content: r.content, dueDate: r.due_date ? String(r.due_date).slice(0, 10) : null }))) },
    ]
    const resp = await createChatCompletion(messages, { model: 'flow-1', temperature: 0.1, max_tokens: 1500 })
    const raw = resp?.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
    const byId = new Map(rows.map((r) => [r.id, r]))
    const events = (Array.isArray(parsed?.events) ? parsed.events : [])
      .filter((e: any) => e?.commitmentId && byId.has(e.commitmentId) && e?.title && e?.startTime)
      .slice(0, 25)
      .map((e: any) => ({
        commitmentId: String(e.commitmentId),
        title: String(e.title).slice(0, 200),
        startTime: String(e.startTime),
        endTime: e.endTime ? String(e.endTime) : undefined,
        source: byId.get(e.commitmentId)!.content.slice(0, 140),
      }))
    return NextResponse.json({ events })
  } catch (err) {
    console.error('[commitments/proposals] failed:', err)
    return NextResponse.json({ events: [] })
  }
}
