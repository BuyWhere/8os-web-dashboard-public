/**
 * Compact text renderings for Telegram bot commands (OS-2652).
 *
 * /brief    → Big-3-style top tasks (same models /api/today/big3 reads; the
 *             full BaZi soft-tint scoring stays in the route — this is the
 *             compact channel rendering, priority + scheduled-today biased).
 * /shutdown → same DONE-today / INCOMPLETE-today numbers as /api/shutdown.
 * /align    → the alignment verdict from the same engine /api/alignment uses
 *             (computeAlignment — read-side only; no LLM attribution pass).
 *
 * All queries are userId-scoped server-side; no HTTP round-trip, no Clerk
 * session needed (the webhook resolves userId from the Telegram link).
 */
import { prisma } from '@/lib/db/prisma'
import { computeAlignment } from '@/lib/alignment-engine'

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 }

function dayWindow(): { start: Date; end: Date } {
  // Server-local day window — the same convention /api/shutdown uses.
  const now = new Date()
  const start = new Date(now); start.setHours(0, 0, 0, 0)
  const end = new Date(now); end.setHours(23, 59, 59, 999)
  return { start, end }
}

export async function renderBrief(userId: string): Promise<string> {
  const { start, end } = dayWindow()
  const tasks = await prisma.oSTask.findMany({
    where: { userId, status: { in: ['todo', 'in_progress'] } },
    select: { id: true, name: true, priority: true, domainId: true, scheduledAt: true, duration: true },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })
  if (tasks.length === 0) {
    return 'Your Big 3, nothing on the board yet.\nSend me any to-do as plain text and I will capture it.'
  }
  const scored = tasks
    .map((t) => {
      const today = t.scheduledAt && t.scheduledAt >= start && t.scheduledAt <= end
      return { t, score: (today ? 100 : 0) + (10 - (PRIORITY_RANK[t.priority] ?? 3) * 5) }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
  const lines = scored.map(({ t }, i) => {
    const bits = [t.name]
    if (t.domainId) bits.push(t.domainId)
    if (t.priority && t.priority !== 'medium') bits.push(`${t.priority} priority`)
    if (t.scheduledAt) bits.push(t.scheduledAt.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }))
    return `${i + 1}. ${bits.join(' · ')}`
  })
  return `Your Big 3 for today:\n${lines.join('\n')}\n\nFull brief with the day's tint: 8os.ai/dashboard/today`
}

export async function renderShutdown(userId: string): Promise<string> {
  const { start, end } = dayWindow()
  const [done, incomplete] = await Promise.all([
    prisma.oSTask.findMany({
      where: { userId, completedAt: { gte: start, lte: end } },
      select: { name: true },
      take: 20,
    }),
    prisma.oSTask.findMany({
      where: { userId, scheduledAt: { gte: start, lte: end }, status: { in: ['todo', 'in_progress'] } },
      select: { name: true },
      take: 20,
    }),
  ])
  const list = (rows: { name: string }[]) =>
    rows.slice(0, 5).map((r) => `  • ${r.name}`).join('\n') + (rows.length > 5 ? `\n  …and ${rows.length - 5} more` : '')
  let out = `Shutdown, today's ledger:\nDone: ${done.length}`
  if (done.length) out += `\n${list(done)}`
  out += `\nStill open (scheduled today): ${incomplete.length}`
  if (incomplete.length) out += `\n${list(incomplete)}`
  out += `\n\nClose the day properly: 8os.ai/dashboard/shutdown`
  return out
}

export async function renderAlign(userId: string): Promise<string> {
  try {
    const result = await computeAlignment(userId, { days: 7 })
    const parts = [`Alignment (last ${result.windowDays} days):`, result.weekly.headline]
    if (result.daily.headline) parts.push(`Today: ${result.daily.headline}`)
    if (result.weekly.topRedirection) parts.push(`Redirection: ${result.weekly.topRedirection}`)
    parts.push('Receipts: 8os.ai/dashboard (Alignment)')
    return parts.filter(Boolean).join('\n')
  } catch (e) {
    console.error('[channels/commands] renderAlign failed:', e)
    return 'Alignment data is not ready yet, open 8os.ai and let the engine attribute a few days of activity first.'
  }
}
