/**
 * src/lib/channels/governor.ts — notification governance (E-13, backlog §3.6).
 *
 * `deliverProactive(userId, message, opts)` is the ONLY path a proactive
 * (agent-initiated) message may take to a user. It sits in front of the channel
 * dispatcher `deliver()` and enforces the E-13 guardrails from notification_prefs:
 *
 *   - per-playbook enable flag (prefs_json.<kind>.enabled, default on)
 *   - quiet hours (default 22:00–07:30), evaluated in the user's LOCAL wall
 *     clock via the E-0 user-time util
 *   - global daily cap (default 3) — counts PROACTIVE inbox_messages already
 *     sent to the user on their local day (meta.proactive === true)
 *   - global snooze ("quiet week") — snooze_until in the future suppresses all
 *
 * When suppressed, NOTHING is sent and — if a run id is supplied — the run is
 * recorded status='skipped' with the suppression reason. Reactive/on-demand
 * messages must call deliver() directly, NOT this.
 *
 * Never throws: on any internal error it fails OPEN is NOT acceptable for a
 * cap/quiet-hours breach, so it fails CLOSED (suppresses) and reports the error
 * as the reason — a missed brief is always safer than a governance violation.
 */
import { prisma } from '@/lib/db/prisma'
import { deliver, type DeliverOutcome } from './index'
import type { ChannelMessage } from './types'
import {
  DEFAULT_TIMEZONE, isValidTimezone, userDayBounds, userLocalDate,
} from '@/lib/user-time'

export type ProactiveKind =
  | 'daily_brief' | 'daily_shutdown' | 'weekly' | 'monthly'
  | 'quarterly' | 'annual' | 'adhoc_nudge'

export interface GovernorOutcome {
  suppressed: boolean
  reason?: 'disabled' | 'quiet_hours' | 'daily_cap' | 'snoozed' | 'error'
  outcome?: DeliverOutcome
}

interface Prefs {
  prefsJson: Record<string, { enabled?: boolean; hour?: number; channel?: string }> | null
  quietStart: string
  quietEnd: string
  dailyCap: number
  snoozeUntil: Date | null
}

const DEFAULT_PREFS: Omit<Prefs, 'prefsJson'> & { prefsJson: null } = {
  prefsJson: null,
  quietStart: '22:00',
  quietEnd: '07:30',
  dailyCap: 3,
  snoozeUntil: null,
}

async function loadPrefs(userId: string): Promise<Prefs> {
  const row = await prisma.notificationPrefs.findUnique({ where: { userId } }).catch(() => null)
  if (!row) return DEFAULT_PREFS
  return {
    prefsJson: (row.prefsJson as Prefs['prefsJson']) ?? null,
    quietStart: row.quietStart || '22:00',
    quietEnd: row.quietEnd || '07:30',
    dailyCap: typeof row.dailyCap === 'number' ? row.dailyCap : 3,
    snoozeUntil: row.snoozeUntil ?? null,
  }
}

/** "HH:MM" → minutes since local midnight (NaN-safe, defaults to 0). */
function hhmmToMinutes(hhmm: string): number {
  const [h, m] = (hhmm || '').split(':').map(Number)
  if (Number.isNaN(h)) return 0
  return (h % 24) * 60 + (Number.isNaN(m) ? 0 : m)
}

/** The user's current local time-of-day in minutes since local midnight. */
function localMinutesNow(tz: string, at: Date): number {
  const zone = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(at)
  const p: Record<string, string> = {}
  for (const part of parts) p[part.type] = part.value
  const h = Number(p.hour) % 24
  const m = Number(p.minute)
  return h * 60 + (Number.isNaN(m) ? 0 : m)
}

/**
 * True when `nowMin` falls inside the quiet window [start, end). Handles the
 * common overnight case where end < start (e.g. 22:00 → 07:30).
 */
export function inQuietHours(nowMin: number, startMin: number, endMin: number): boolean {
  if (startMin === endMin) return false // no quiet window
  if (startMin < endMin) return nowMin >= startMin && nowMin < endMin // same-day window
  return nowMin >= startMin || nowMin < endMin // overnight window
}

/** Count proactive messages already delivered to the user on their local day. */
async function proactiveCountToday(userId: string, tz: string, at: Date): Promise<number> {
  const { start, end } = userDayBounds(tz, at)
  // meta.proactive === true marks agent-initiated deliveries. Prisma JSON path
  // filter keeps this a single indexed-ish query on inbox_messages.
  return prisma.inboxMessage.count({
    where: {
      userId,
      createdAt: { gte: start, lte: end },
      meta: { path: ['proactive'], equals: true },
    },
  }).catch(() => 0)
}

/**
 * Mark an agent_runs row skipped with the suppression reason (best-effort).
 */
async function markSkipped(runId: string | undefined, reason: string): Promise<void> {
  if (!runId) return
  await prisma.agentRun.update({
    where: { id: runId },
    data: {
      status: 'skipped',
      finishedAt: new Date(),
      outputJson: { skipped: true, reason },
    },
  }).catch((e) => console.error('[governor] markSkipped failed:', e))
}

/**
 * Governed proactive delivery. Returns { suppressed } and, when it did send,
 * the underlying DeliverOutcome.
 *
 * @param opts.kind    the playbook kind (for the per-playbook enable flag)
 * @param opts.runId   the agent_runs row to mark 'skipped' if suppressed
 * @param opts.at      the reference instant (tests inject; defaults to now)
 */
export async function deliverProactive(
  userId: string,
  message: ChannelMessage,
  opts: { kind: ProactiveKind; runId?: string; at?: Date } = { kind: 'adhoc_nudge' },
): Promise<GovernorOutcome> {
  const at = opts.at ?? new Date()
  let tz = DEFAULT_TIMEZONE
  try {
    const { getUserTimezone } = await import('@/lib/user-time')
    tz = await getUserTimezone(userId)
  } catch {
    /* default tz */
  }

  let prefs: Prefs
  try {
    prefs = await loadPrefs(userId)
  } catch (e) {
    console.error('[governor] loadPrefs failed — failing closed:', e)
    await markSkipped(opts.runId, 'error')
    return { suppressed: true, reason: 'error' }
  }

  // 1) Global snooze ("quiet week").
  if (prefs.snoozeUntil && prefs.snoozeUntil.getTime() > at.getTime()) {
    await markSkipped(opts.runId, 'snoozed')
    return { suppressed: true, reason: 'snoozed' }
  }

  // 2) Per-playbook enable flag (default enabled).
  const playbookPrefs = prefs.prefsJson?.[opts.kind]
  if (playbookPrefs && playbookPrefs.enabled === false) {
    await markSkipped(opts.runId, 'disabled')
    return { suppressed: true, reason: 'disabled' }
  }

  // 3) Quiet hours (user-local wall clock).
  const nowMin = localMinutesNow(tz, at)
  if (inQuietHours(nowMin, hhmmToMinutes(prefs.quietStart), hhmmToMinutes(prefs.quietEnd))) {
    await markSkipped(opts.runId, 'quiet_hours')
    return { suppressed: true, reason: 'quiet_hours' }
  }

  // 4) Daily cap on PROACTIVE messages.
  const sentToday = await proactiveCountToday(userId, tz, at)
  if (sentToday >= prefs.dailyCap) {
    await markSkipped(opts.runId, 'daily_cap')
    return { suppressed: true, reason: 'daily_cap' }
  }

  // Passed all gates → deliver, tagging the message as proactive so it counts
  // toward the cap on subsequent sends this local day.
  const taggedMeta = { ...(message.meta ?? {}), proactive: true, kind: opts.kind, localDate: userLocalDate(tz, at).iso }
  const outcome = await deliver(userId, { ...message, meta: taggedMeta })
  return { suppressed: false, outcome }
}
