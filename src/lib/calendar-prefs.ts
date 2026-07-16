/**
 * src/lib/calendar-prefs.ts — the user's visible calendar window (which hours the
 * day/week grid shows). Stored as two self-applying columns on user_settings
 * (CREATE-only ALTER … IF NOT EXISTS, same pattern as coach_plays), read/written
 * via raw SQL so there's no Prisma-model/migration coupling. Default 6–24.
 */
import { prisma } from '@/lib/db/prisma'

let _ensured: Promise<void> | null = null
function ensure(): Promise<void> {
  if (!_ensured) {
    _ensured = (async () => {
      await prisma.$executeRawUnsafe(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS calendar_start_hour smallint`)
      await prisma.$executeRawUnsafe(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS calendar_end_hour smallint`)
    })().catch((e) => { _ensured = null; throw e })
  }
  return _ensured
}

function clamp(start: number, end: number): { start: number; end: number } {
  let s = Math.max(0, Math.min(23, Math.round(Number(start))))
  let e = Math.max(s + 1, Math.min(24, Math.round(Number(end))))
  if (!Number.isFinite(s)) s = 6
  if (!Number.isFinite(e) || e <= s) e = 24
  return { start: s, end: e }
}

export async function getCalendarHours(userId: string): Promise<{ start: number; end: number }> {
  try {
    await ensure()
    const rows = await prisma.$queryRawUnsafe<{ s: number | null; e: number | null }[]>(
      `SELECT calendar_start_hour AS s, calendar_end_hour AS e FROM user_settings WHERE "userId" = $1 LIMIT 1`, userId,
    )
    const s = rows[0]?.s, e = rows[0]?.e
    if (s == null || e == null) return { start: 6, end: 24 }
    return clamp(Number(s), Number(e))
  } catch { return { start: 6, end: 24 } }
}

export async function setCalendarHours(userId: string, start: number, end: number): Promise<void> {
  await ensure()
  const { start: s, end: e } = clamp(start, end)
  const affected = await prisma.$executeRawUnsafe(
    `UPDATE user_settings SET calendar_start_hour = $2, calendar_end_hour = $3 WHERE "userId" = $1`, userId, s, e,
  )
  if (!affected) {
    // No settings row yet — create a minimal one (other columns have defaults).
    await prisma.$executeRawUnsafe(
      `INSERT INTO user_settings (id, "userId", calendar_start_hour, calendar_end_hour)
       VALUES (gen_random_uuid()::text, $1, $2, $3)
       ON CONFLICT ("userId") DO UPDATE SET calendar_start_hour = $2, calendar_end_hour = $3`,
      userId, s, e,
    ).catch(() => {})
  }
}
