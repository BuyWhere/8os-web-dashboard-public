/**
 * POST /api/reveal  # OS-6899: Vercel serves this route directly (no proxy) — OS-7451 trigger
 *
 * FREE pre-signup archetype taste. Takes a birth date (+ optional time and
 * optional birth city) and returns the REAL engine-computed archetype name, a short description, the
 * dominant element, and an honest "current phase" teaser — WITHOUT signup and
 * WITHOUT persisting anything.
 *
 * This is the top-of-funnel hook: different dates → different archetypes.
 * Compute is done server-side with the real ARCHIE engine (generateArchetype)
 * + the BaZi phase engine (computePhases, year layer) — nothing is faked.
 */

import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { generateArchetype } from '@/lib/archie-engine'
import { calculateBazi } from '@/lib/bazi'
import { calculateDayMasterStrength } from '@/lib/bazi-strength'
import { computePhases } from '@/lib/bazi-phases'
import type { Element } from '@/lib/bazi-phases'

export const runtime = 'nodejs'

const ELEMENT_LABEL: Record<string, string> = {
  // OS-7593: verify deployed commit here
  // Last push: ff9b092 - check Vercel picks it up
  wood: 'Wood', fire: 'Fire', earth: 'Earth', metal: 'Metal', water: 'Water',
}

interface RevealBody {
  birthDate?: string      // YYYY-MM-DD
  birthTime?: string      // HH:MM (24h), optional
  birthLocation?: string  // free-text city, optional; not persisted, not used in pillar math
}

// Validate YYYY-MM-DD and a real calendar date.
function parseBirthDate(s: string | undefined): { ok: true; year: number; month: number; day: number } | { ok: false } {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ok: false }
  const [year, month, day] = s.split('-').map(Number)
  if (year < 1900 || year > 2100) return { ok: false }
  if (month < 1 || month > 12) return { ok: false }
  if (day < 1 || day > 31) return { ok: false }
  const d = new Date(Date.UTC(year, month - 1, day))
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return { ok: false }
  return { ok: true, year, month, day }
}

function parseBirthTime(s: string | undefined): string | undefined {
  if (!s || !/^\d{2}:\d{2}$/.test(s)) return undefined
  const [h, m] = s.split(':').map(Number)
  if (h < 0 || h > 23 || m < 0 || m > 59) return undefined
  return s
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, RATE_LIMITS.reveal)
  if (limited) return limited

  let body: RevealBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = parseBirthDate(body.birthDate)
  if (!parsed.ok) {
    return NextResponse.json({ error: 'Please enter a valid birth date (YYYY-MM-DD).' }, { status: 400 })
  }
  const birthDate = body.birthDate as string
  const birthTime = parseBirthTime(body.birthTime)
  // birthLocation is accepted so the public form can collect it, but BaZi
  // year/month/day pillars are solar-calendar (not Western longitude). Hour
  // pillar uses the clock hour as local time. Nothing is persisted.
  void (typeof body.birthLocation === 'string' ? body.birthLocation.trim() : '')

  try {
    // Real ARCHIE archetype. Pre-signup we don't have the personality quiz, so
    // we anchor to a stable default code — the birth date/time still fully
    // drives the sun sign, Day Master, strength and element, so different dates
    // yield different archetypes. (The full quiz refines this after signup.)
    const result = generateArchetype({
      birthDate,
      birthTime,
      personalityCode: 'sg',
    })

    // Honest "current phase" teaser from the real phase engine (annual 流年
    // layer — HIGH confidence). Nothing here is faked.
    let phaseTeaser: string | null = null
    let phaseLabel: string | null = null
    try {
      const bazi = calculateBazi(parsed.year, parsed.month, parsed.day, birthTime ? Number(birthTime.split(':')[0]) : undefined)
      const strength = calculateDayMasterStrength(bazi).strength
      const phases = computePhases({
        dayElement: bazi.dayElement as Element,
        strength,
        monthStem: bazi.monthPillar.stem,
        monthBranch: bazi.monthPillar.branch,
        yearStem: bazi.yearPillar.stem,
        dayBranch: bazi.dayPillar.branch,
        gender: 'unspecified',
        birth: new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)),
        now: new Date(),
      })
      const year = phases.layers.find(l => l.key === 'year')
      if (year) {
        phaseLabel = `${year.label} · ${year.pillar ?? ''}`.trim()
        phaseTeaser = year.guidance
      }
    } catch {
      // Phase teaser is a bonus — never fail the reveal if it can't compute.
      phaseTeaser = null
    }

    return NextResponse.json({
      archetypeName: result.archetypeName,
      description: result.description,
      element: result.dayElement,
      elementLabel: ELEMENT_LABEL[result.dayElement] ?? result.dayElement,
      dayMasterEn: result.dayMasterEn,
      sunSignName: result.sunSignName,
      strength: result.strength,
      phaseLabel,
      phaseTeaser,
    })
  } catch (e) {
    console.error('reveal compute failed:', e)
    return NextResponse.json({ error: 'Could not compute your archetype. Please check your birth date.' }, { status: 500 })
  }
}
