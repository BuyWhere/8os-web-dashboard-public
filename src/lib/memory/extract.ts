/**
 * src/lib/memory/extract.ts — the E-5/E-6 nightly consolidation (backlog §3.2/§3.3).
 *
 * `consolidateUser(userId)` gathers the last 24h of the user's journal entries,
 * assistant messages, and completed reflections, asks Flow AI (cheap lane — the
 * existing client as-is, no lane changes; E-8 owns lanes) to distill them into:
 *
 *   - candidate MEMORY ITEMS  { kind, content, salience 1-5, source_kind, source_id }
 *   - candidate COMMITMENTS   { content, due_date?, goal_id? }
 *
 * MERGE (v1 = SQL + keyword similarity, NO embeddings — parked per §3.2):
 *   - memory: a candidate that keyword-overlaps an existing same-kind item just
 *     bumps last_confirmed_at (no duplicate). A candidate that CONTRADICTS an
 *     existing item (same subject, opposing content) supersedes it
 *     (superseded_by set on the old row; new row inserted).
 *   - commitments: dedupe by content similarity vs OPEN commitments; only insert
 *     new ones.
 *
 * IDEMPOTENT: safe to re-run the same local day. Because merge bumps rather than
 * inserts, a second same-day pass over the same source window produces no new
 * memory rows. Never throws — every failure degrades to "no candidates".
 *
 * Node runtime only (prisma + Flow AI). No new deps.
 */
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { createChatCompletion, type ChatMessage } from '@/lib/flow-ai'
import { captureServerException } from '@/lib/error-track'

export type MemoryKind = 'fact' | 'preference' | 'person' | 'insight' | 'event'
const MEMORY_KINDS: MemoryKind[] = ['fact', 'preference', 'person', 'insight', 'event']

export interface CandidateMemory {
  kind: MemoryKind
  content: string
  salience: number
  source_kind: string
  source_id: string | null
}

export interface CandidateCommitment {
  content: string
  due_date: string | null // ISO date "YYYY-MM-DD"
  goal_id: string | null
}

export interface ConsolidateResult {
  ok: boolean
  reason?: string
  candidatesMemory: number
  candidatesCommitment: number
  memoryInserted: number
  memoryConfirmed: number
  memorySuperseded: number
  commitmentsInserted: number
  usedLlm: boolean
}

interface ExistingMemory {
  id: string
  kind: string
  content: string
}

// ── keyword similarity (no embeddings) ────────────────────────────────────────
const STOP = new Set([
  'the', 'a', 'an', 'to', 'of', 'and', 'or', 'in', 'on', 'at', 'for', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'i', 'my', 'me', 'you', 'your',
  'he', 'she', 'they', 'it', 'that', 'this', 'their', 'his', 'her', 'we', 'our',
  'has', 'have', 'had', 'will', 'would', 'can', 'do', 'does', 'not', 'by', 'as',
])

export function tokens(s: string): Set<string> {
  return new Set(
    (s.toLowerCase().match(/[a-z0-9]+/g) ?? [])
      .filter((w) => w.length > 2 && !STOP.has(w)),
  )
}

/** Jaccard overlap of significant keyword tokens. 0..1. */
export function keywordSimilarity(a: string, b: string): number {
  const ta = tokens(a)
  const tb = tokens(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  Array.from(ta).forEach((t) => { if (tb.has(t)) inter++ })
  const union = ta.size + tb.size - inter
  return union === 0 ? 0 : inter / union
}

const MERGE_THRESHOLD = 0.4 // "same fact restated" — bump, don't duplicate
const CONTRADICT_THRESHOLD = 0.28 // shares subject keywords but content diverges
const NEG = /\b(no longer|not|never|stopped|quit|left|changed|instead|used to|now)\b/i

/**
 * Fetch the raw 24h source window for a user (journal + reflections + assistant
 * messages). Returns typed snippets with source pointers so the LLM can cite.
 */
async function gatherWindow(userId: string, now: Date) {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const journals = await prisma.journalEntry
    .findMany({
      where: { userId, createdAt: { gte: since } },
      select: { id: true, content: true, kind: true, mood: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })
    .catch(() => [] as Array<{ id: string; content: string; kind: string; mood: string | null; createdAt: Date }>)

  // Assistant + user chat turns in the window (join via conversation → userId).
  const convos = await prisma.assistantConversation
    .findMany({ where: { userId }, select: { id: true }, take: 200 })
    .catch(() => [] as Array<{ id: string }>)
  const convoIds = convos.map((c) => c.id)
  const messages = convoIds.length
    ? await prisma.assistantMessage
        .findMany({
          where: {
            conversationId: { in: convoIds },
            role: { in: ['user', 'assistant'] },
            createdAt: { gte: since },
          },
          select: { id: true, role: true, content: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
          take: 200,
        })
        .catch(() => [] as Array<{ id: string; role: string; content: string | null; createdAt: Date }>)
    : []

  return { journals, messages }
}

/** Build the source-text block the LLM distills (with source pointers). */
function renderSources(
  journals: Array<{ id: string; content: string; kind: string; mood: string | null }>,
  messages: Array<{ id: string; role: string; content: string | null }>,
): { text: string; hasContent: boolean } {
  const L: string[] = []
  for (const j of journals) {
    const c = (j.content ?? '').trim()
    if (!c) continue
    const sk = j.kind === 'free' ? 'journal' : 'reflection'
    L.push(`[${sk}#${j.id}${j.mood ? ` mood=${j.mood}` : ''}] ${c}`)
  }
  for (const m of messages) {
    const c = (m.content ?? '').trim()
    if (!c) continue
    L.push(`[chat#${m.id} ${m.role}] ${c}`)
  }
  return { text: L.join('\n'), hasContent: L.length > 0 }
}

const SYSTEM = [
  'You are the memory-distillation module of 8os, a personal accountability OS.',
  'From the user\'s last 24h of journal entries, reflections, and chat turns, extract:',
  '',
  '(A) durable MEMORY ITEMS — stable truths worth remembering across sessions:',
  '    kind ∈ fact | preference | person | insight | event.',
  '    - fact: stable truth ("works at a fintech, reports to the board quarterly")',
  '    - preference: a like/dislike ("hates morning meetings")',
  '    - person: a named relationship ("Wei Ling — cofounder")',
  '    - insight: an observed behavioral pattern ("ships best in 90-minute blocks")',
  '    - event: a dated life event ("moving apartments in August")',
  '    salience is 1–5 (5 = core identity fact, 1 = minor).',
  '    source_kind + source_id: copy them from the [tag#id] the fact came from.',
  '    Do NOT extract fleeting states, todos, or the day\'s mood. Only durable facts.',
  '',
  '(B) COMMITMENTS — things the user said they WILL do, with an explicit or',
  '    inferable date. ("I\'ll decide on the hire by Friday", "email the landlord',
  '    tomorrow"). due_date is an ISO date (YYYY-MM-DD) or null if truly undated.',
  '',
  'Return STRICT JSON only, no prose, matching:',
  '{ "memory": [ { "kind": "...", "content": "...", "salience": 3, "source_kind": "...", "source_id": "..." } ],',
  '  "commitments": [ { "content": "...", "due_date": "YYYY-MM-DD" | null, "goal_id": null } ] }',
  'If nothing durable, return empty arrays. Never invent facts not in the source.',
].join('\n')

function coerceMemory(raw: unknown): CandidateMemory[] {
  if (!Array.isArray(raw)) return []
  const out: CandidateMemory[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const kind = String(o.kind ?? '').toLowerCase() as MemoryKind
    const content = typeof o.content === 'string' ? o.content.trim() : ''
    if (!MEMORY_KINDS.includes(kind) || content.length < 3) continue
    let salience = Math.round(Number(o.salience))
    if (!Number.isFinite(salience)) salience = 3
    salience = Math.min(5, Math.max(1, salience))
    out.push({
      kind,
      content: content.slice(0, 1000),
      salience,
      source_kind: typeof o.source_kind === 'string' ? o.source_kind.slice(0, 40) : 'chat',
      source_id: typeof o.source_id === 'string' ? o.source_id.slice(0, 200) : null,
    })
  }
  return out
}

function coerceCommitments(raw: unknown): CandidateCommitment[] {
  if (!Array.isArray(raw)) return []
  const out: CandidateCommitment[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const content = typeof o.content === 'string' ? o.content.trim() : ''
    if (content.length < 3) continue
    let due: string | null = null
    if (typeof o.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.due_date.trim())) {
      due = o.due_date.trim()
    }
    out.push({
      content: content.slice(0, 1000),
      due_date: due,
      goal_id: typeof o.goal_id === 'string' && o.goal_id ? o.goal_id.slice(0, 200) : null,
    })
  }
  return out
}

// Stricter retry system prompt (OS-2808): when the first pass returns nothing
// parseable/usable, Flow AI's gpt-4o-mini often routes to MiniMax, which
// preambles ("Here is the JSON:") and can truncate. This prompt forbids prose
// entirely and asks for a bare array so the reply is smaller + harder to break.
const SYSTEM_STRICT = [
  SYSTEM,
  '',
  'CRITICAL OUTPUT RULE: Return ONLY the JSON object. No preamble, no prose, no',
  'markdown fences, no explanation before or after. Your ENTIRE reply must be a',
  'single JSON object that JSON.parse can read. Start your reply with { and end',
  'with }. If nothing durable exists, reply exactly {"memory":[],"commitments":[]}.',
].join('\n')

/**
 * Tolerant parse of a Flow AI reply into {memory, commitments} candidate arrays.
 * Handles the MiniMax failure modes seen in prod (OS-2808):
 *   - leading/trailing prose ("Here is the JSON: …", "Hope that helps.")
 *   - ```json … ``` fences
 *   - a bare top-level array instead of the {memory, commitments} object
 *   - truncated JSON (unbalanced braces) — repaired by appending closers
 * Returns null ONLY when nothing JSON-shaped can be recovered at all.
 */
function parseDistillation(
  bodyRaw: string,
): { memory: CandidateMemory[]; commitments: CandidateCommitment[] } | null {
  if (!bodyRaw) return null
  // 1. Strip markdown code fences (```json … ``` or ``` … ```) if present.
  let body = bodyRaw.trim()
  const fence = body.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence && fence[1].trim()) body = fence[1].trim()

  // 2. Try to recover a top-level OBJECT first (the expected shape).
  const objText = extractBalanced(body, '{', '}')
  if (objText) {
    const parsed = tryParse(objText)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const o = parsed as { memory?: unknown; commitments?: unknown }
      return { memory: coerceMemory(o.memory), commitments: coerceCommitments(o.commitments) }
    }
  }

  // 3. Fall back to a bare top-level ARRAY embedded in text — treat as memory.
  const arrText = extractBalanced(body, '[', ']')
  if (arrText) {
    const parsed = tryParse(arrText)
    if (Array.isArray(parsed)) {
      return { memory: coerceMemory(parsed), commitments: [] }
    }
  }

  return null
}

/**
 * Extract the first balanced open→close span, tolerating truncation: if the
 * reply was cut off mid-object (depth never returns to 0), we append the
 * missing closers and return the repaired span so JSON.parse gets a fighting
 * chance. Skips brackets inside string literals.
 */
function extractBalanced(s: string, open: string, close: string): string | null {
  const start = s.indexOf(open)
  if (start < 0) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') { inStr = true; continue }
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return s.slice(start, i + 1)
    }
  }
  // Truncated: never balanced. Repair by closing the open depth (and any open
  // string). Better a best-effort parse than a guaranteed empty extraction.
  if (depth > 0) {
    let repaired = s.slice(start)
    if (inStr) repaired += '"'
    repaired += close.repeat(depth)
    return repaired
  }
  return null
}

function tryParse(s: string): unknown {
  try { return JSON.parse(s) } catch { return null }
}

/**
 * Distill the source window with Flow AI. Returns empty candidates (usedLlm
 * false) only if Flow AI is unavailable; a parseable-but-empty reply is
 * usedLlm:true, parsed:true. Never throws — consolidation must not break the
 * nightly tick.
 *
 * Retry-on-empty (OS-2808): the first pass is non-deterministic (gpt-4o-mini →
 * MiniMax preambles/truncation). If it yields ZERO usable candidates but the
 * source window was non-trivial (>200 chars), we retry ONCE with a stricter
 * "JSON only" prompt and a higher token cap. Two independent samples make the
 * clearly-extractable 0-item first pass vanishingly rare.
 */
async function distill(sourceText: string): Promise<{
  memory: CandidateMemory[]
  commitments: CandidateCommitment[]
  usedLlm: boolean
  parsed: boolean
  attempts: number
}> {
  const nonTrivial = sourceText.trim().length > 200

  const attempt = async (
    system: string,
    maxTokens: number,
  ): Promise<{ memory: CandidateMemory[]; commitments: CandidateCommitment[]; parsed: boolean }> => {
    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: `=== LAST 24H (source pointers in [tag#id]) ===\n${sourceText}` },
    ]
    const resp = await createChatCompletion(messages, {
      model: 'gpt-4o-mini', // cheap lane; existing client as-is
      temperature: 0.2,
      max_tokens: maxTokens,
      tool_choice: 'none',
    })
    const body = resp.choices?.[0]?.message?.content?.trim() ?? ''
    const parsed = parseDistillation(body)
    if (!parsed) {
      console.error('[memory/extract] unparseable distill reply (head):', body.slice(0, 200))
      return { memory: [], commitments: [], parsed: false }
    }
    return { memory: parsed.memory, commitments: parsed.commitments, parsed: true }
  }

  try {
    // Pass 1 — the standard prompt.
    let r = await attempt(SYSTEM, 900)
    let attempts = 1

    // Pass 2 — retry ONCE on empty when the input was clearly non-trivial.
    if (nonTrivial && r.memory.length === 0 && r.commitments.length === 0) {
      console.warn('[memory/extract] first pass empty on non-trivial input — retrying strict')
      const r2 = await attempt(SYSTEM_STRICT, 1200)
      attempts = 2
      // Prefer the pass that actually produced candidates.
      if (r2.memory.length > 0 || r2.commitments.length > 0) r = r2
      else if (r2.parsed && !r.parsed) r = r2 // at least a clean empty over a parse failure
    }

    return { memory: r.memory, commitments: r.commitments, usedLlm: true, parsed: r.parsed, attempts }
  } catch (e) {
    console.error('[memory/extract] distill failed:', e)
    return { memory: [], commitments: [], usedLlm: false, parsed: false, attempts: 0 }
  }
}

/**
 * Nightly consolidation for one user. Idempotent per local day.
 */
export async function consolidateUser(userId: string, opts: { at?: Date } = {}): Promise<ConsolidateResult> {
  const now = opts.at ?? new Date()
  const empty: ConsolidateResult = {
    ok: true, candidatesMemory: 0, candidatesCommitment: 0,
    memoryInserted: 0, memoryConfirmed: 0, memorySuperseded: 0,
    commitmentsInserted: 0, usedLlm: false,
  }

  try {
    const { journals, messages } = await gatherWindow(userId, now)
    const { text, hasContent } = renderSources(journals, messages)
    if (!hasContent) return { ...empty, reason: 'no source in window' }

    const { memory, commitments, usedLlm, parsed, attempts } = await distill(text)
    if (memory.length === 0 && commitments.length === 0) {
      // OS-2808 observability: a non-trivial window that STILL distills to zero
      // is a real miss (parse failure or a stubborn empty). Surface it in
      // PostHog error-tracking so these are visible, not silent, with enough
      // context (userId, input size, whether the reply parsed) to triage.
      if (text.trim().length > 200) {
        void captureServerException(
          new Error('memory consolidation yielded 0 candidates on non-trivial input'),
          {
            route: 'memory/extract:consolidateUser',
            userId,
            extra: {
              inputLength: text.length,
              journalCount: journals.length,
              messageCount: messages.length,
              usedLlm,
              parsed,
              attempts,
            },
          },
        )
      }
      return { ...empty, usedLlm, reason: parsed ? 'no candidates' : 'unparseable llm reply' }
    }

    // ── MEMORY merge ──────────────────────────────────────────────────────────
    const existing = await prisma.$queryRawUnsafe<ExistingMemory[]>(
      `SELECT id, kind, content FROM memory_items
         WHERE user_id = $1 AND superseded_by IS NULL
         ORDER BY last_confirmed_at DESC LIMIT 500`,
      userId,
    ).catch(() => [] as ExistingMemory[])

    let inserted = 0, confirmed = 0, superseded = 0
    // Track this-run inserts so two identical same-run candidates don't both insert.
    const runInserts: ExistingMemory[] = []
    const pool = () => [...existing, ...runInserts]

    for (const cand of memory) {
      // Best same-kind match by keyword overlap.
      let best: { row: ExistingMemory; sim: number } | null = null
      for (const row of pool()) {
        if (row.kind !== cand.kind) continue
        const sim = keywordSimilarity(row.content, cand.content)
        if (!best || sim > best.sim) best = { row, sim }
      }

      if (best && best.sim >= MERGE_THRESHOLD) {
        // Same fact restated → bump confirmation, do not duplicate.
        await prisma.$executeRawUnsafe(
          `UPDATE memory_items SET last_confirmed_at = now(),
             salience = GREATEST(salience, $2) WHERE id = $1`,
          best.row.id, cand.salience,
        ).catch(() => {})
        confirmed++
        continue
      }

      if (best && best.sim >= CONTRADICT_THRESHOLD && NEG.test(cand.content)) {
        // Shares subject but negates/changes it → supersede the old row.
        const id = randomUUID()
        await prisma.$executeRawUnsafe(
          `INSERT INTO memory_items (id, user_id, kind, content, salience, source_kind, source_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          id, userId, cand.kind, cand.content, cand.salience, cand.source_kind, cand.source_id,
        ).catch(() => {})
        await prisma.$executeRawUnsafe(
          `UPDATE memory_items SET superseded_by = $2 WHERE id = $1`,
          best.row.id, id,
        ).catch(() => {})
        superseded++
        inserted++
        runInserts.push({ id, kind: cand.kind, content: cand.content })
        continue
      }

      // Novel → insert.
      const id = randomUUID()
      await prisma.$executeRawUnsafe(
        `INSERT INTO memory_items (id, user_id, kind, content, salience, source_kind, source_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        id, userId, cand.kind, cand.content, cand.salience, cand.source_kind, cand.source_id,
      ).catch(() => {})
      inserted++
      runInserts.push({ id, kind: cand.kind, content: cand.content })
    }

    // ── COMMITMENT dedupe ─────────────────────────────────────────────────────
    const openCommits = await prisma.$queryRawUnsafe<{ id: string; content: string }[]>(
      `SELECT id, content FROM commitments
         WHERE user_id = $1 AND status = 'open' ORDER BY created_at DESC LIMIT 200`,
      userId,
    ).catch(() => [] as Array<{ id: string; content: string }>)

    let commitInserted = 0
    const seenThisRun: string[] = []
    for (const cand of commitments) {
      const dupExisting = openCommits.some((c) => keywordSimilarity(c.content, cand.content) >= MERGE_THRESHOLD)
      const dupRun = seenThisRun.some((c) => keywordSimilarity(c, cand.content) >= MERGE_THRESHOLD)
      if (dupExisting || dupRun) continue
      const id = randomUUID()
      await prisma.$executeRawUnsafe(
        `INSERT INTO commitments (id, user_id, content, due_date, status, source_kind, source_id, goal_id)
           VALUES ($1,$2,$3,$4::date,'open',$5,$6,$7)`,
        id, userId, cand.content, cand.due_date, 'consolidation', null, cand.goal_id,
      ).catch((e) => { console.error('[memory/extract] commitment insert failed:', e) })
      commitInserted++
      seenThisRun.push(cand.content)
    }

    return {
      ok: true,
      candidatesMemory: memory.length,
      candidatesCommitment: commitments.length,
      memoryInserted: inserted,
      memoryConfirmed: confirmed,
      memorySuperseded: superseded,
      commitmentsInserted: commitInserted,
      usedLlm,
    }
  } catch (e) {
    console.error('[memory/extract] consolidateUser failed:', e)
    return { ...empty, ok: false, reason: e instanceof Error ? e.message : String(e) }
  }
}
