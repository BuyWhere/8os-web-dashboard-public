/**
 * src/lib/coach/plays.ts — the CURATED PLAYBOOK layer of the Coach's shared brain.
 *
 * Unlike per-user memory, these "plays" are best-practice coaching patterns shared
 * by EVERY user. The owner curates them while dogfooding; new users inherit the
 * accumulated wisdom, so the Coach gets more effective as the library grows.
 *
 * Storage is a self-applying `coach_plays` table (CREATE TABLE IF NOT EXISTS on
 * first access — same raw-SQL pattern as memory_items/commitments), so no
 * migration-pipeline dependency. Topical selection injects only relevant plays.
 */
import { prisma } from '@/lib/db/prisma'

export interface CoachPlay {
  id: string
  title: string
  topic: string
  body: string
  enabled: boolean
  priority: number
}

const STARTER_PLAYS: Array<{ title: string; topic: string; body: string; priority: number }> = [
  {
    title: 'Clarify a vague goal before creating it',
    topic: 'goal vague unclear idea want improve grow',
    priority: 10,
    body: 'When the user gives a fuzzy goal ("get healthier", "grow the business"), ask ONE sharp question to make it concrete and measurable, then propose the goal with a fitting horizon + checkMethod and a first task. Never spawn a wall of goals from one vague line.',
  },
  {
    title: "Turn overwhelm into today's Big 3",
    topic: 'overwhelm busy stressed too much everything list dump lots many',
    priority: 10,
    body: 'When the user dumps many things at once, do NOT create 20 goals. Help them pick the 3 that matter most TODAY, create those as scheduled tasks, and park the rest. Fewer, real, dated actions beat a long inert list.',
  },
  {
    title: 'Plan the day around energy',
    topic: 'plan day today schedule morning organise organize time block',
    priority: 8,
    body: "For \"plan my day\": read today's tasks + calendar, then propose a time-blocked order that puts the hardest / most important work in the user's peak-energy hours and protects existing meetings. Offer to schedule it, then actually do it with real tool calls.",
  },
  {
    title: 'Weekly review structure',
    topic: 'weekly review reflect week retro looking back recap',
    priority: 6,
    body: 'For a weekly review: (1) what moved (wins + completed tasks), (2) what slipped and why — no guilt, (3) what carries into next week, (4) one adjustment. Keep it tight; end with the single most important focus for the coming week.',
  },
]

let _ensured: Promise<void> | null = null
function ensureTable(): Promise<void> {
  if (!_ensured) {
    _ensured = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS coach_plays (
          id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
          title text NOT NULL,
          topic text NOT NULL DEFAULT '',
          body text NOT NULL,
          enabled boolean NOT NULL DEFAULT true,
          priority integer NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )`)
      const rows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*)::bigint AS n FROM coach_plays`)
      if (Number(rows[0]?.n ?? 0) === 0) {
        for (const p of STARTER_PLAYS) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO coach_plays (title, topic, body, priority) VALUES ($1,$2,$3,$4)`,
            p.title, p.topic, p.body, p.priority,
          )
        }
      }
    })().catch((e) => { _ensured = null; throw e })
  }
  return _ensured
}

/** Curated plays relevant to this message (topic keyword match), bounded + ranked. */
export async function selectPlays(message: string, max = 3): Promise<string> {
  try {
    await ensureTable()
    const rows = await prisma.$queryRawUnsafe<CoachPlay[]>(
      `SELECT id, title, topic, body, enabled, priority FROM coach_plays WHERE enabled = true ORDER BY priority DESC, created_at ASC`,
    )
    if (!rows.length) return ''
    const m = (message || '').toLowerCase()
    const scored = rows
      .map((p) => {
        const kws = (p.topic || '').toLowerCase().split(/[,\s]+/).filter(Boolean)
        // No topic → always-on general best practice; topical plays match keywords.
        const score = kws.length === 0 ? 0.5 : kws.reduce((s, k) => s + (m.includes(k) ? 1 : 0), 0)
        return { p, score }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, max)
    if (!scored.length) return ''
    return (
      '\n\n## Coaching plays (curated best practices — apply the relevant ones)\n' +
      scored.map((x) => `### ${x.p.title}\n${x.p.body}`).join('\n\n')
    )
  } catch {
    return ''
  }
}

export async function listPlays(): Promise<CoachPlay[]> {
  await ensureTable()
  return prisma.$queryRawUnsafe<CoachPlay[]>(
    `SELECT id, title, topic, body, enabled, priority FROM coach_plays ORDER BY priority DESC, created_at ASC`,
  )
}

export async function createPlay(input: { title: string; topic?: string; body: string; priority?: number }): Promise<void> {
  await ensureTable()
  await prisma.$executeRawUnsafe(
    `INSERT INTO coach_plays (title, topic, body, priority) VALUES ($1,$2,$3,$4)`,
    input.title, input.topic ?? '', input.body, Number.isFinite(input.priority as number) ? input.priority : 0,
  )
}

export async function updatePlay(
  id: string,
  patch: { title?: string; topic?: string; body?: string; enabled?: boolean; priority?: number },
): Promise<void> {
  await ensureTable()
  const cols: Array<[keyof typeof patch, string]> = [
    ['title', 'title'], ['topic', 'topic'], ['body', 'body'], ['enabled', 'enabled'], ['priority', 'priority'],
  ]
  const sets: string[] = []
  const vals: any[] = []
  let i = 1
  for (const [k, col] of cols) {
    if (patch[k] !== undefined) { sets.push(`${col} = $${i++}`); vals.push(patch[k]) }
  }
  if (!sets.length) return
  sets.push('updated_at = now()')
  vals.push(id)
  await prisma.$executeRawUnsafe(`UPDATE coach_plays SET ${sets.join(', ')} WHERE id = $${i}`, ...vals)
}

export async function deletePlay(id: string): Promise<void> {
  await ensureTable()
  await prisma.$executeRawUnsafe(`DELETE FROM coach_plays WHERE id = $1`, id)
}

/** Owner gate: env allow-list of emails (COACH_ADMIN_EMAILS) or an admin role. */
export function isCoachAdmin(email: string | null | undefined, role?: string | null): boolean {
  if (role === 'admin') return true
  const allow = (process.env.COACH_ADMIN_EMAILS || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  return !!email && allow.includes(email.toLowerCase())
}
