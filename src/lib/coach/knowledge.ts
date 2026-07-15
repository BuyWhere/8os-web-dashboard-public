/**
 * src/lib/coach/knowledge.ts — the Coach's SHARED knowledge tier (identical for
 * every user): how the 8os platform works, plus topical BaZi doctrine pulled from
 * the knowledge base on demand.
 *
 * This is the "all users" half of the two-tier brain. The per-USER half (chart,
 * archetype, goals, calendar, durable memory, commitments) comes from
 * assembleAgentContext. Keep this file product/doctrine knowledge only — nothing
 * user-specific.
 */
import { BAZI_KNOWLEDGE_MD } from '@/lib/bazi-knowledge-content'

/**
 * Always injected. How the OS is structured, so the Coach reasons and acts
 * correctly no matter who it's talking to. Deliberately compact.
 */
export const PLATFORM_KNOWLEDGE = `## How 8os works (product knowledge)
8os is the user's life operating system. Structure:
- DOMAINS (the fixed six): career, wealth, health, relationships, learning, legacy. Every goal and task belongs to exactly one.
- GOALS = outcomes pursued over time. Each has a HORIZON (weekly, monthly, quarterly, yearly, three_year, five_year — goals are grouped by horizon in the Goals view) and a checkMethod: binary (a yes/no accountability check, for aims you can't put a number on), numeric, time, streak, or milestone. A goal is active, paused, or archived. "Focus Mode" caps ACTIVE goals (default 3); goals beyond the cap are created PAUSED — they are real and visible (they appear in your context), just not counted as active.
- PROJECTS = optional groupings of tasks under a goal.
- TASKS = single concrete actions, usually tied to a day (scheduledAt). Tasks populate the CALENDAR, which two-way syncs with the user's Google Calendar. A task does NOT need a goal.
Operating rules: a dated / "today" / "due" item is a TASK; a longer-run outcome is a GOAL. To remove something created by mistake, call delete_goal (archives it — recoverable) or delete_task. Only real tool calls change the user's OS; never merely describe an action you didn't take.`

/**
 * Pull up to `max` relevant BaZi doctrine sections for this message. The KB is a
 * series of "## SECTION: NAME, ..." blocks written for retrieval-injection; we
 * score each section's header words against the user's message and inject only the
 * best matches (bounded), so chart/timing/personality questions get real doctrine
 * without bloating every turn. Returns '' when nothing is relevant.
 */
export function selectBaziDoctrine(message: string, max = 2): string {
  const m = (message || '').toLowerCase()
  if (m.length < 3) return ''
  // Topic hints that map common phrasings onto section-header vocabulary.
  const hints: Array<[RegExp, string]> = [
    [/\b(element|wood|fire|earth|metal|water|favorable|useful god|strength)\b/i, 'element'],
    [/\b(luck|pillar|timing|year|month|season|phase|when should|good time)\b/i, 'timing'],
    [/\b(personality|who am i|what am i like|character|nature|archetype)\b/i, 'personality'],
    [/\b(career|wealth|money|relationship|health|love|marriage)\b/i, 'life'],
    [/\b(chart|bazi|day master|pillar|reading|destiny)\b/i, 'chart'],
  ]
  const boosted = hints.filter(([re]) => re.test(m)).map(([, k]) => k)
  if (boosted.length === 0) return ''

  const parts = BAZI_KNOWLEDGE_MD.split(/\n(?=## SECTION:)/)
  const scored = parts
    .map((p) => {
      const header = (p.match(/## SECTION:\s*([^\n]+)/)?.[1] || '').toLowerCase()
      const hay = (header + ' ' + p.slice(0, 400)).toLowerCase()
      const score = boosted.reduce((s, k) => s + (hay.includes(k) ? 1 : 0), 0)
      return { p, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
  if (scored.length === 0) return ''
  return (
    '\n\n## BaZi doctrine (relevant excerpts — use to interpret the chart facts above)\n' +
    scored.map((x) => x.p.slice(0, 1400)).join('\n\n')
  )
}
