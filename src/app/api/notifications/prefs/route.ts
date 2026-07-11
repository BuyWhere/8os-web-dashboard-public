/**
 * /api/notifications/prefs — read/write notification governance prefs (E-13,
 * backlog §3.6). Clerk-authed (requireAuth), userId-scoped.
 *
 * GET  — the user's prefs (defaults applied when no row exists yet).
 * POST — upsert: brief hour, shutdown hour, quiet hours, daily cap, and a
 *        one-tap "snooze a week" (snooze_until = now + 7 days) / unsnooze.
 *
 * prefs_json shape: { daily_brief: { enabled, hour }, daily_shutdown: {...} }.
 * The governor (src/lib/channels/governor.ts) and the heartbeat tick read the
 * same columns/keys.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { getBehaviorTokens, type NudgeFrequency } from '@/lib/behavior-tokens'

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

// E-11: the nudge_frequency behavior token sets the DEFAULT proactive daily cap
// for a user who has not explicitly chosen one. low → 2, medium → 3, high → 5.
// This never overrides a stored dailyCap — it only fills the default.
const NUDGE_DEFAULT_CAP: Record<NudgeFrequency, number> = { low: 2, medium: 3, high: 5 }

interface PrefsShape {
  daily_brief: { enabled: boolean; hour: number }
  daily_shutdown: { enabled: boolean; hour: number }
  // Phase-E: preserved passthrough for keys the heartbeat tick reads
  // (weekly/monthly/quarterly/annual cadence prefs + focus_mode). We never drop
  // unknown keys, so the E-10 Focus-Mode override + rhythm hour prefs survive
  // a notifications-page save.
  focus_mode?: { enabled: boolean }
  weekly?: { enabled?: boolean; hour?: number; dow?: number }
  monthly?: { enabled?: boolean }
  quarterly?: { enabled?: boolean }
  annual?: { enabled?: boolean; offsetDays?: number }
  [k: string]: unknown
}

function normalizePrefs(raw: unknown): PrefsShape {
  const j = (raw as Record<string, { enabled?: boolean; hour?: number }>) ?? {}
  const clampHour = (h: unknown, def: number) =>
    typeof h === 'number' && h >= 0 && h <= 23 ? Math.floor(h) : def
  // Start from the stored blob so ALL keys (weekly/monthly/annual/focus_mode +
  // anything the concurrent build added) survive, then normalize the daily ones.
  const out: PrefsShape = {
    ...(j as unknown as PrefsShape),
    daily_brief: { enabled: j.daily_brief?.enabled !== false, hour: clampHour(j.daily_brief?.hour, 7) },
    daily_shutdown: { enabled: j.daily_shutdown?.enabled !== false, hour: clampHour(j.daily_shutdown?.hour, 21) },
  }
  return out
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const row = await prisma.notificationPrefs.findUnique({ where: { userId: auth.userId } })
  const prefs = normalizePrefs(row?.prefsJson)

  // E-11: default the proactive daily cap from the nudge_frequency token when
  // the user has no stored prefs row yet. A stored dailyCap always wins.
  const nudgeFrequency: NudgeFrequency = (await getBehaviorTokens(auth.userId)).nudge_frequency
  const defaultCap = NUDGE_DEFAULT_CAP[nudgeFrequency]

  return NextResponse.json({
    prefs,
    quietStart: row?.quietStart ?? '22:00',
    quietEnd: row?.quietEnd ?? '07:30',
    dailyCap: row?.dailyCap ?? defaultCap,
    nudgeFrequency, // E-11: surfaced so the governor/UI can read the derived default
    // Phase-E: Focus Mode (E-10 active-goal cap) is default-ON; only an explicit
    // false disables it. Weekly cadence hour surfaced for the settings UI.
    focusMode: prefs.focus_mode?.enabled !== false,
    weeklyHour: typeof prefs.weekly?.hour === 'number' ? prefs.weekly.hour : 18,
    weeklyEnabled: prefs.weekly?.enabled !== false,
    snoozeUntil: row?.snoozeUntil ? row.snoozeUntil.toISOString() : null,
    snoozed: !!(row?.snoozeUntil && row.snoozeUntil.getTime() > Date.now()),
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const current = await prisma.notificationPrefs.findUnique({ where: { userId: auth.userId } })
  const prefs = normalizePrefs(current?.prefsJson)

  // Apply partial updates.
  if (typeof body.briefHour === 'number' && body.briefHour >= 0 && body.briefHour <= 23) {
    prefs.daily_brief.hour = Math.floor(body.briefHour)
  }
  if (typeof body.briefEnabled === 'boolean') prefs.daily_brief.enabled = body.briefEnabled
  if (typeof body.shutdownHour === 'number' && body.shutdownHour >= 0 && body.shutdownHour <= 23) {
    prefs.daily_shutdown.hour = Math.floor(body.shutdownHour)
  }
  if (typeof body.shutdownEnabled === 'boolean') prefs.daily_shutdown.enabled = body.shutdownEnabled

  // ── Phase-E: Focus Mode (E-10 active-goal cap override) + weekly cadence ──
  if (typeof body.focusMode === 'boolean') {
    prefs.focus_mode = { enabled: body.focusMode }
  }
  if (typeof body.weeklyHour === 'number' && body.weeklyHour >= 0 && body.weeklyHour <= 23) {
    prefs.weekly = { ...(prefs.weekly ?? {}), hour: Math.floor(body.weeklyHour) }
  }
  if (typeof body.weeklyEnabled === 'boolean') {
    prefs.weekly = { ...(prefs.weekly ?? {}), enabled: body.weeklyEnabled }
  }
  if (typeof body.weeklyDow === 'number' && body.weeklyDow >= 0 && body.weeklyDow <= 6) {
    prefs.weekly = { ...(prefs.weekly ?? {}), dow: Math.floor(body.weeklyDow) }
  }
  if (typeof body.annualOffsetDays === 'number' && body.annualOffsetDays >= -15 && body.annualOffsetDays <= 15) {
    prefs.annual = { ...(prefs.annual ?? {}), offsetDays: Math.floor(body.annualOffsetDays) }
  }

  let quietStart = current?.quietStart ?? '22:00'
  let quietEnd = current?.quietEnd ?? '07:30'
  if (typeof body.quietStart === 'string' && HHMM.test(body.quietStart)) quietStart = body.quietStart
  if (typeof body.quietEnd === 'string' && HHMM.test(body.quietEnd)) quietEnd = body.quietEnd

  let dailyCap = current?.dailyCap ?? 3
  if (typeof body.dailyCap === 'number' && body.dailyCap >= 0 && body.dailyCap <= 20) {
    dailyCap = Math.floor(body.dailyCap)
  }

  let snoozeUntil = current?.snoozeUntil ?? null
  if (body.snooze === true) snoozeUntil = new Date(Date.now() + 7 * 24 * 3600 * 1000)
  else if (body.snooze === false) snoozeUntil = null

  await prisma.notificationPrefs.upsert({
    where: { userId: auth.userId },
    create: {
      userId: auth.userId,
      prefsJson: prefs as unknown as object,
      quietStart, quietEnd, dailyCap, snoozeUntil,
    },
    update: {
      prefsJson: prefs as unknown as object,
      quietStart, quietEnd, dailyCap, snoozeUntil,
    },
  })

  return NextResponse.json({
    ok: true,
    prefs,
    quietStart, quietEnd, dailyCap,
    snoozeUntil: snoozeUntil ? snoozeUntil.toISOString() : null,
    snoozed: !!(snoozeUntil && snoozeUntil.getTime() > Date.now()),
  })
}
