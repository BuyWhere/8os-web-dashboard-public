/**
 * User-timezone utilities (E-0 timezone foundation — OS-2651, backlog §4.1).
 *
 * PROBLEM (P-5): nothing stored the user's timezone; daily pillar, "today"
 * buckets and briefs silently used server time. This module is the single
 * place "today" is derived from a user's IANA timezone.
 *
 * Doctrinal note: the BIRTH chart uses the stored birth moment (untouched);
 * the CURRENT daily pillar and all "today" windows use current local civil
 * time in the user's timezone.
 *
 * Pure Intl-based — no new dependencies. The prisma import in
 * getUserTimezone is lazy so pure helpers stay safe in client bundles.
 */

export const DEFAULT_TIMEZONE = 'Asia/Singapore'

/** True when `tz` is an IANA zone this runtime's Intl can resolve. */
export function isValidTimezone(tz: string | null | undefined): tz is string {
  if (!tz || typeof tz !== 'string' || tz.length > 64) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** IANA zone list for pickers; [] when Intl.supportedValuesOf is unavailable. */
export function knownTimezones(): string[] {
  try {
    const anyIntl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    if (typeof anyIntl.supportedValuesOf === 'function') return anyIntl.supportedValuesOf('timeZone')
  } catch {
    /* fall through */
  }
  return []
}

/**
 * The user's stored timezone (user_profiles.timezone), defaulting to
 * Asia/Singapore when missing/invalid. Server-side only.
 */
export async function getUserTimezone(userId: string): Promise<string> {
  try {
    const { prisma } = await import('./db/prisma')
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { timezone: true },
    })
    return isValidTimezone(profile?.timezone) ? (profile!.timezone as string) : DEFAULT_TIMEZONE
  } catch {
    return DEFAULT_TIMEZONE
  }
}

/**
 * The local wall-clock hour (0-23) in `tz` at instant `at`. Pure Intl —
 * safe in client bundles. Used to pick morning/afternoon/evening greetings
 * from the USER's local time instead of the server's.
 */
export function userLocalHour(tz: string, at: Date = new Date()): number {
  const zone = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE
  const hh = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hour: '2-digit', hour12: false,
  }).format(at)
  // en-US hour12:false can emit "24" at midnight — normalise to 0.
  const n = Number(hh)
  return Number.isFinite(n) ? n % 24 : 0
}

export interface CivilDate {
  year: number
  month: number // 1-12
  day: number // 1-31
  iso: string // YYYY-MM-DD
}

/** The civil (calendar) date in `tz` at instant `at`. */
export function userLocalDate(tz: string, at: Date = new Date()): CivilDate {
  const zone = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE
  // en-CA formats as YYYY-MM-DD.
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(at)
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month, day, iso }
}

/**
 * UTC-midnight Date of the user's local calendar date at `at` — the canonical
 * day-bucket key for civil-date math (ledger buckets, daily pillar).
 */
export function userLocalDayUTC(tz: string, at: Date = new Date()): Date {
  const { year, month, day } = userLocalDate(tz, at)
  return new Date(Date.UTC(year, month - 1, day))
}

/** Offset (ms) of `tz` from UTC at instant `at` (east of UTC = positive). */
function tzOffsetMs(tz: string, at: Date): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
  const p: Record<string, number> = {}
  for (const part of fmt.formatToParts(at)) {
    if (part.type !== 'literal') p[part.type] = Number(part.value)
  }
  const asUTC = Date.UTC(p.year, (p.month ?? 1) - 1, p.day ?? 1, (p.hour ?? 0) % 24, p.minute ?? 0, p.second ?? 0)
  return asUTC - Math.floor(at.getTime() / 1000) * 1000
}

/** The UTC instant of local midnight (00:00:00.000) on y-m-d in `zone`. */
function localMidnightUTC(zone: string, year: number, month: number, day: number): Date {
  const naive = Date.UTC(year, month - 1, day)
  // Guess with the offset at naive-UTC, refine once for DST edges near midnight.
  let guess = new Date(naive - tzOffsetMs(zone, new Date(naive)))
  guess = new Date(naive - tzOffsetMs(zone, guess))
  return guess
}

/**
 * UTC instants bounding the user's local day containing `at`:
 * start = local 00:00:00.000, end = local 23:59:59.999 (next midnight − 1ms).
 * DST-safe: the end is derived from the NEXT local midnight, not start+24h.
 */
export function userDayBounds(tz: string, at: Date = new Date()): { start: Date; end: Date; localDate: string } {
  const zone = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE
  const { year, month, day, iso } = userLocalDate(zone, at)
  const start = localMidnightUTC(zone, year, month, day)
  const next = new Date(Date.UTC(year, month - 1, day + 1)) // Date.UTC rolls over month/year
  const end = new Date(
    localMidnightUTC(zone, next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()).getTime() - 1,
  )
  return { start, end, localDate: iso }
}
