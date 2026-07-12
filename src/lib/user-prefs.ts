/**
 * Server-side user-preferences accessors (unified account hub).
 *
 * The single place other server code reads account preferences:
 *  - theme            → UserSettings.theme ('light' | 'dark' | 'system')
 *  - firstDayOfWeek   → UserSettings.firstDayOfWeek (1 = Monday, 0 = Sunday)
 *  - timezone         → UserProfile.timezone (E-0; see getUserTimezone in
 *                       ./user-time — re-exported here for one import site)
 *
 * Prisma is imported lazily so these stay safe to reference from modules that
 * may be pulled into edge/client bundles. All accessors are defensive: they
 * return sensible defaults rather than throwing when a row is missing.
 */

export type FirstDayOfWeek = 0 | 1 // 0 = Sunday, 1 = Monday
export type StoredThemeChoice = 'light' | 'dark' | 'system'

export const DEFAULT_FIRST_DAY_OF_WEEK: FirstDayOfWeek = 1 // Monday
export const DEFAULT_THEME: StoredThemeChoice = 'system'

export { getUserTimezone } from './user-time'

function normFirstDay(v: number | null | undefined): FirstDayOfWeek {
  return v === 0 ? 0 : 1
}

function normTheme(v: string | null | undefined): StoredThemeChoice {
  return v === 'light' || v === 'dark' ? v : 'system'
}

/**
 * The user's first-day-of-week preference. Other components ("this week",
 * calendar, weekly rollups) read this to bucket weeks correctly.
 * Returns 1 (Monday) when unset. Server-side only.
 */
export async function getFirstDayOfWeek(userId: string): Promise<FirstDayOfWeek> {
  try {
    const { prisma } = await import('./db/prisma')
    const s = await prisma.userSettings.findUnique({
      where: { userId },
      select: { firstDayOfWeek: true },
    })
    return normFirstDay(s?.firstDayOfWeek)
  } catch {
    return DEFAULT_FIRST_DAY_OF_WEEK
  }
}

/** The user's stored theme choice. Server-side only. */
export async function getThemeChoice(userId: string): Promise<StoredThemeChoice> {
  try {
    const { prisma } = await import('./db/prisma')
    const s = await prisma.userSettings.findUnique({
      where: { userId },
      select: { theme: true },
    })
    return normTheme(s?.theme)
  } catch {
    return DEFAULT_THEME
  }
}

export interface UserPreferences {
  theme: StoredThemeChoice
  firstDayOfWeek: FirstDayOfWeek
  timezone: string | null
}

/** All account preferences in one round trip. Server-side only. */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  try {
    const { prisma } = await import('./db/prisma')
    const [settings, profile] = await Promise.all([
      prisma.userSettings.findUnique({
        where: { userId },
        select: { theme: true, firstDayOfWeek: true },
      }),
      prisma.userProfile.findUnique({
        where: { userId },
        select: { timezone: true },
      }),
    ])
    return {
      theme: normTheme(settings?.theme),
      firstDayOfWeek: normFirstDay(settings?.firstDayOfWeek),
      timezone: profile?.timezone ?? null,
    }
  } catch {
    return { theme: DEFAULT_THEME, firstDayOfWeek: DEFAULT_FIRST_DAY_OF_WEEK, timezone: null }
  }
}
