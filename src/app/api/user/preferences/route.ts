/**
 * /api/user/preferences — read/write account-hub preferences.
 *
 * The single API behind the Preferences tab + the theme toggle:
 *   - theme            → UserSettings.theme ('light' | 'dark' | 'system')
 *   - firstDayOfWeek   → UserSettings.firstDayOfWeek (1 = Mon, 0 = Sun)
 *   - timezone         → UserProfile.timezone (E-0; read by getUserTimezone)
 *
 * Clerk-authed (requireAuth), userId-scoped. GET applies defaults when a row
 * is missing. PATCH upserts UserSettings and updates UserProfile.timezone if a
 * profile exists (profiles require birth data to create, so we never create
 * one here — we updateMany, a safe no-op when absent).
 *
 * Server helpers getFirstDayOfWeek / getUserPreferences (src/lib/user-prefs.ts)
 * read the same columns for the calendar, "this week" buckets, and greeting.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { isValidTimezone } from '@/lib/user-time'
import { getCalendarHours, setCalendarHours } from '@/lib/calendar-prefs'
import {
  DEFAULT_THEME,
  DEFAULT_FIRST_DAY_OF_WEEK,
  type StoredThemeChoice,
  type FirstDayOfWeek,
} from '@/lib/user-prefs'

function normTheme(v: string | null | undefined): StoredThemeChoice {
  return v === 'light' || v === 'dark' ? v : 'system'
}
function normFirstDay(v: number | null | undefined): FirstDayOfWeek {
  return v === 0 ? 0 : 1
}

/** GET /api/user/preferences — theme, first-day-of-week, timezone. */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const [settings, profile] = await Promise.all([
    prisma.userSettings.findUnique({
      where: { userId: auth.userId },
      select: { theme: true, firstDayOfWeek: true },
    }),
    prisma.userProfile.findUnique({
      where: { userId: auth.userId },
      select: { timezone: true },
    }),
  ])

  const calHours = await getCalendarHours(auth.userId)
  return NextResponse.json({
    theme: normTheme(settings?.theme),
    firstDayOfWeek: normFirstDay(settings?.firstDayOfWeek),
    timezone: profile?.timezone ?? null,
    calendarStartHour: calHours.start,
    calendarEndHour: calHours.end,
    // Whether a UserProfile row exists — the client uses this to decide if it
    // can persist an auto-detected timezone yet (no profile → nowhere to store).
    hasProfile: profile !== null,
  })
}

const patchSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    firstDayOfWeek: z.union([z.literal(0), z.literal(1)]).optional(),
    timezone: z.string().max(64).optional(),
    calendarStartHour: z.number().int().min(0).max(23).optional(),
    calendarEndHour: z.number().int().min(1).max(24).optional(),
  })
  .refine(
    (d) => d.theme !== undefined || d.firstDayOfWeek !== undefined || d.timezone !== undefined || d.calendarStartHour !== undefined || d.calendarEndHour !== undefined,
    { message: 'Provide at least one preference to update' },
  )

/** PATCH /api/user/preferences — update any of theme / firstDayOfWeek / timezone. */
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }
  const { theme, firstDayOfWeek, timezone, calendarStartHour, calendarEndHour } = parsed.data

  // Calendar view-window hours (stored on user_settings via calendar-prefs).
  if (calendarStartHour !== undefined || calendarEndHour !== undefined) {
    const cur = await getCalendarHours(auth.userId)
    await setCalendarHours(auth.userId, calendarStartHour ?? cur.start, calendarEndHour ?? cur.end)
  }

  // Reject a bad timezone up front so we never persist junk into the E-0 field.
  if (timezone !== undefined && !isValidTimezone(timezone)) {
    return NextResponse.json({ error: 'Invalid IANA timezone' }, { status: 422 })
  }

  // UserSettings holds theme + firstDayOfWeek. Upsert so first-time users get a
  // row. Only set the fields that were provided.
  const settingsData: { theme?: string; firstDayOfWeek?: number } = {}
  if (theme !== undefined) settingsData.theme = theme
  if (firstDayOfWeek !== undefined) settingsData.firstDayOfWeek = firstDayOfWeek

  if (Object.keys(settingsData).length > 0) {
    await prisma.userSettings.upsert({
      where: { userId: auth.userId },
      create: { userId: auth.userId, ...settingsData },
      update: settingsData,
    })
  }

  // Timezone lives on UserProfile (E-0). Profiles require birth data to create,
  // so we never create one here — updateMany is a safe no-op when absent.
  let timezoneStored = timezone !== undefined
  if (timezone !== undefined) {
    const res = await prisma.userProfile.updateMany({
      where: { userId: auth.userId },
      data: { timezone },
    })
    timezoneStored = res.count > 0
  }

  const [settings, profile] = await Promise.all([
    prisma.userSettings.findUnique({
      where: { userId: auth.userId },
      select: { theme: true, firstDayOfWeek: true },
    }),
    prisma.userProfile.findUnique({
      where: { userId: auth.userId },
      select: { timezone: true },
    }),
  ])

  return NextResponse.json({
    theme: normTheme(settings?.theme),
    firstDayOfWeek: normFirstDay(settings?.firstDayOfWeek),
    timezone: profile?.timezone ?? null,
    timezoneStored,
  })
}
