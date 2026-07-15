/**
 * POST /api/journal/extract  { content, entryDate? }
 *
 * The "extract everything" pass for a journal entry (or any free-text capture,
 * incl. a Coach turn). Splits into:
 *   - AUTO (applied immediately): durable memory_items (facts/preferences/people/
 *     insights) so the brain learns. Goal-linking of proposed items is inferred
 *     here too.
 *   - CONFIRM-FIRST (returned, not created): newly-created tasks / calendar events
 *     / goals + relationship follow-ups. The client shows these in ONE pass for the
 *     user to approve/trim; /api/journal/apply creates the kept ones.
 *
 * Cheap Flow AI call; never throws into the client (returns empty proposals).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { prisma } from '@/lib/db/prisma'
import { createChatCompletion, type ChatMessage } from '@/lib/flow-ai'
import { getUserTimezone } from '@/lib/user-time'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Extraction = {
  memories?: Array<{ kind?: string; content?: string; salience?: number }>
  tasks?: Array<{ name?: string; scheduledAt?: string | null; goalId?: string | null; goalName?: string | null }>
  events?: Array<{ title?: string; startTime?: string; endTime?: string }>
  goals?: Array<{ name?: string; horizon?: string; domainId?: string }>
  relationshipFollowups?: Array<{ person?: string; action?: string; when?: string | null }>
}

const MEM_KINDS = ['fact', 'preference', 'person', 'insight', 'event']

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.userId

  const body = await req.json().catch(() => ({} as any))
  const content = String(body?.content || '').trim()
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const tz = await getUserTimezone(userId).catch(() => 'Asia/Singapore')
  const todayIso = (() => {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date()) } catch { return new Date().toISOString().slice(0, 10) }
  })()

  // Give the extractor the user's live goals so it can LINK items + avoid dup goals.
  const goals = await prisma.goal.findMany({
    where: { userId, status: { in: ['active', 'paused'] } },
    select: { id: true, name: true, domainId: true, horizon: true },
    orderBy: { createdAt: 'asc' },
    take: 100,
  }).catch(() => [])
  const goalList = goals.map((g) => `[${g.id}] "${g.name}" (${g.domainId})`).join('\n') || '(none yet)'

  const system = [
    'You extract structured items from a user\'s journal/voice note. Output STRICT JSON only, no prose.',
    `Today is ${todayIso} (timezone ${tz}). Resolve relative dates ("today","tomorrow","Friday") against this.`,
    'The user\'s current goals (id, name, domain):',
    goalList,
    '',
    'Return an object with these arrays (omit or empty when nothing applies):',
    '- memories: durable things worth remembering long-term — {kind: fact|preference|person|insight|event, content, salience 1-5}. Include PEOPLE mentioned (kind:person).',
    '- tasks: concrete actions the user should DO — {name, scheduledAt (ISO datetime if a day/time is implied else null), goalId (an EXISTING goal id from the list if it clearly fits, else null)}.',
    '- events: scheduled meetings/appointments that have a real time — {title, startTime ISO, endTime ISO}.',
    '- goals: genuinely NEW longer-term aims (not day tasks) — {name, horizon: weekly|monthly|quarterly|yearly|three_year|five_year, domainId: career|wealth|health|relationships|learning|legacy}.',
    '- relationshipFollowups: people to contact/reconnect with — {person, action, when (ISO date or null)}.',
    'Be conservative: only include items clearly implied. Do NOT invent. Prefer linking a task to an existing goalId over creating a new goal.',
  ].join('\n')

  let ex: Extraction = {}
  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content },
    ]
    const resp = await createChatCompletion(messages, { model: 'auto', temperature: 0.2, max_tokens: 1200 })
    const raw = resp?.choices?.[0]?.message?.content || '{}'
    const jsonStr = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
    ex = JSON.parse(jsonStr)
  } catch {
    return NextResponse.json({ memoriesCreated: 0, proposals: { tasks: [], events: [], goals: [], relationshipFollowups: [] } })
  }

  // AUTO-apply: durable memories (best-effort; light keyword de-dup against recent).
  let memoriesCreated = 0
  const mems = (ex.memories || []).filter((m) => m?.content && MEM_KINDS.includes(String(m.kind)))
  if (mems.length) {
    const recent = await prisma.$queryRawUnsafe<{ content: string }[]>(
      `SELECT content FROM memory_items WHERE user_id = $1 AND superseded_by IS NULL ORDER BY created_at DESC LIMIT 100`, userId,
    ).catch(() => [])
    const seen = new Set(recent.map((r) => r.content.toLowerCase().slice(0, 60)))
    for (const m of mems.slice(0, 20)) {
      const key = String(m.content).toLowerCase().slice(0, 60)
      if (seen.has(key)) continue
      seen.add(key)
      await prisma.$executeRawUnsafe(
        `INSERT INTO memory_items (id, user_id, kind, content, salience, source_kind) VALUES ($1,$2,$3,$4,$5,'journal')`,
        randomUUID(), userId, String(m.kind), String(m.content).slice(0, 1000), Math.max(1, Math.min(5, Number(m.salience) || 3)),
      ).then(() => { memoriesCreated++ }).catch(() => {})
    }
  }

  // CONFIRM-FIRST: return proposed new items (created only after the user approves).
  const proposals = {
    tasks: (ex.tasks || []).filter((t) => t?.name).slice(0, 25),
    events: (ex.events || []).filter((e) => e?.title && e?.startTime).slice(0, 25),
    goals: (ex.goals || []).filter((g) => g?.name).slice(0, 25),
    relationshipFollowups: (ex.relationshipFollowups || []).filter((r) => r?.person).slice(0, 25),
  }
  return NextResponse.json({ memoriesCreated, proposals })
}
