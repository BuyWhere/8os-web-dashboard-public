/**
 * src/lib/memory/commitment-detect.ts — real-time commitment extraction (E-6, §3.3).
 *
 * After each assistant conversation turn, run a REGEX-CHEAP prefilter over the
 * user's turn (intent phrase + a date phrase). On a hit, ONE Flow AI confirm
 * call decides whether it is a genuine commitment and normalizes the due date
 * against the user's local "today"; if confirmed, insert a commitment row
 * (deduped against open commitments).
 *
 * Wired into /api/assistant/chat best-effort AFTER the turn completes — it is
 * fire-and-forget and NEVER blocks or breaks chat (all errors swallowed).
 *
 * No new deps. Node runtime. Dedup reuses the keyword similarity from extract.ts.
 */
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { createChatCompletion, type ChatMessage } from '@/lib/flow-ai'
import { keywordSimilarity } from './extract'
import { DEFAULT_TIMEZONE, isValidTimezone, userLocalDate } from '@/lib/user-time'
import { captureServerEvent } from '@/lib/analytics-server'

// Intent to do something in the future.
const INTENT = /\b(i'?ll|i will|i'?m going to|i am going to|i plan to|i'?ll try to|gonna|i need to|i want to|let me|i should|i'?ve got to|i have to|i'?ll get|by then i'?ll)\b/i
// Any explicit or relative date phrase.
const DATE = /\b(today|tonight|tomorrow|tmr|next week|next month|this week|this weekend|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(tember)?|oct(ober)?|nov(ember)?|dec(ember)?|by (the )?end of|by \w+|in \d+ (day|days|week|weeks)|\d{1,2}(st|nd|rd|th)?|\d{4}-\d{2}-\d{2})\b/i

/** Cheap prefilter: true only if the text expresses intent AND names a time. */
export function prefilterCommitment(text: string): boolean {
  if (!text || text.length < 8) return false
  return INTENT.test(text) && DATE.test(text)
}

interface Confirmed {
  isCommitment: boolean
  content: string
  due_date: string | null
}

function extractJson(s: string): string | null {
  const start = s.indexOf('{')
  if (start < 0) return null
  let depth = 0
  for (let i = start; i < s.length; i++) {
    if (s[i] === '{') depth++
    else if (s[i] === '}') { depth--; if (depth === 0) return s.slice(start, i + 1) }
  }
  return null
}

/**
 * Detect + persist a commitment from a single user turn. Fire-and-forget.
 * Returns the new commitment id (or null). Never throws.
 */
export async function detectAndStoreCommitment(
  userId: string,
  userTurn: string,
  opts: { sourceId?: string | null; at?: Date } = {},
): Promise<{ inserted: boolean; id?: string; reason?: string }> {
  try {
    if (!prefilterCommitment(userTurn)) return { inserted: false, reason: 'no prefilter hit' }

    // User's local today anchors relative dates ("tomorrow", "Friday").
    let tz = DEFAULT_TIMEZONE
    try {
      const p = await prisma.userProfile.findUnique({ where: { userId }, select: { timezone: true } })
      if (isValidTimezone(p?.timezone)) tz = p!.timezone as string
    } catch { /* default tz */ }
    const at = opts.at ?? new Date()
    const todayIso = userLocalDate(tz, at).iso

    const system = [
      'You are a JSON API. You classify one user chat message as a COMMITMENT or not.',
      'A commitment is something the USER says they WILL do, with an explicit or',
      'inferable target date. Questions, hypotheticals, and the assistant\'s ideas',
      'are NOT commitments.',
      `Today (the user's local date) is ${todayIso}. Resolve relative dates`,
      '("tomorrow", "by Friday", "next week") to an absolute ISO date (YYYY-MM-DD).',
      'For "next week" with no weekday, use the following Monday. If truly undated,',
      'set due_date null.',
      'You MUST reply with a single raw JSON object and NOTHING else, no prose, no',
      'code fences. Schema:',
      '{"isCommitment": true|false, "content": "<concise 1-line restatement>", "due_date": "YYYY-MM-DD"|null}',
      'Example input: "I\'ll email the landlord tomorrow" →',
      `{"isCommitment": true, "content": "Email the landlord", "due_date": "${todayIso}"}`,
    ].join('\n')

    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: `Classify this message and reply with ONLY the JSON object:\n"${userTurn.slice(0, 1000)}"` },
    ]

    const resp = await createChatCompletion(messages, {
      model: 'gpt-4o-mini',
      temperature: 0,
      // Flow AI may route gpt-4o-mini to a verbose model (e.g. MiniMax) that
      // preambles before the JSON; 200 truncates it (finish_reason=length).
      // 700 leaves ample room for the small JSON object plus any preamble.
      max_tokens: 700,
      tool_choice: 'none',
    })
    const body = resp.choices?.[0]?.message?.content?.trim() ?? ''
    const jsonText = extractJson(body)
    if (!jsonText) return { inserted: false, reason: `no json: ${body.slice(0, 120)}` }
    const parsed = JSON.parse(jsonText) as Partial<Confirmed>
    if (!parsed.isCommitment) return { inserted: false, reason: 'not a commitment' }
    const content = typeof parsed.content === 'string' ? parsed.content.trim().slice(0, 1000) : ''
    if (content.length < 3) return { inserted: false, reason: 'empty content' }
    const due = typeof parsed.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.due_date.trim())
      ? parsed.due_date.trim()
      : null

    // Dedup against open commitments.
    const open = await prisma.$queryRawUnsafe<{ content: string }[]>(
      `SELECT content FROM commitments WHERE user_id = $1 AND status = 'open' ORDER BY created_at DESC LIMIT 200`,
      userId,
    ).catch(() => [] as Array<{ content: string }>)
    if (open.some((c) => keywordSimilarity(c.content, content) >= 0.4)) {
      return { inserted: false, reason: 'duplicate' }
    }

    const id = randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO commitments (id, user_id, content, due_date, status, source_kind, source_id, goal_id)
         VALUES ($1,$2,$3,$4::date,'open','chat',$5,NULL)`,
      id, userId, content, due, opts.sourceId ?? null,
    )
    // §4.4 funnel: `commitment_created` — a promise the user made was captured.
    try { captureServerEvent(userId, 'commitment_created', { source_kind: 'chat', has_due_date: !!due }) } catch {}
    return { inserted: true, id }
  } catch (e) {
    console.error('[commitment-detect] failed (non-blocking):', e)
    return { inserted: false, reason: 'error' }
  }
}
