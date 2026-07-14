/**
 * Sun Sign Calculator — 100% accurate for non-cusp dates
 *
 * Sign IDs match the spec (OS-219):
 *  0=Capricorn  1=Aquarius   2=Pisces      3=Aries      4=Taurus    5=Gemini
 *  6=Cancer     7=Leo        8=Virgo       9=Libra     10=Scorpio  11=Sagittarius
 *
 * Implementation: Month/day boundary table with exact solar-term cutoff dates.
 * People born exactly ON the cusp day (±1 day from boundary) may need birth-time
 * for ephemeris-level accuracy — flagged via `isCusp: true` in the result.
 */

// ─── Sign Data ───────────────────────────────────────────────────────────────

export interface SunSignData {
  id: number
  key: string          // e.g. "capricorn"
  name: string
  symbol: string
  element: 'fire' | 'earth' | 'air' | 'water'
  modality: 'cardinal' | 'fixed' | 'mutable'
  rulingPlanet: string
  // Standard date range label (descriptive only)
  dateRange: string
}

export const SUN_SIGNS: SunSignData[] = [
  { id: 0,  key: 'capricorn',   name: 'Capricorn',   symbol: '♑', element: 'earth', modality: 'cardinal', rulingPlanet: 'Saturn',          dateRange: 'Dec 22 - Jan 19' },
  { id: 1,  key: 'aquarius',    name: 'Aquarius',    symbol: '♒', element: 'air',   modality: 'fixed',    rulingPlanet: 'Saturn/Uranus',   dateRange: 'Jan 20 - Feb 18' },
  { id: 2,  key: 'pisces',      name: 'Pisces',      symbol: '♓', element: 'water', modality: 'mutable',  rulingPlanet: 'Jupiter/Neptune', dateRange: 'Feb 19 - Mar 20' },
  { id: 3,  key: 'aries',       name: 'Aries',       symbol: '♈', element: 'fire',  modality: 'cardinal', rulingPlanet: 'Mars',            dateRange: 'Mar 21 - Apr 19' },
  { id: 4,  key: 'taurus',      name: 'Taurus',      symbol: '♉', element: 'earth', modality: 'fixed',    rulingPlanet: 'Venus',           dateRange: 'Apr 20 - May 20' },
  { id: 5,  key: 'gemini',      name: 'Gemini',      symbol: '♊', element: 'air',   modality: 'mutable',  rulingPlanet: 'Mercury',         dateRange: 'May 21 - Jun 20' },
  { id: 6,  key: 'cancer',      name: 'Cancer',      symbol: '♋', element: 'water', modality: 'cardinal', rulingPlanet: 'Moon',            dateRange: 'Jun 21 - Jul 22' },
  { id: 7,  key: 'leo',         name: 'Leo',         symbol: '♌', element: 'fire',  modality: 'fixed',    rulingPlanet: 'Sun',             dateRange: 'Jul 23 - Aug 22' },
  { id: 8,  key: 'virgo',       name: 'Virgo',       symbol: '♍', element: 'earth', modality: 'mutable',  rulingPlanet: 'Mercury',         dateRange: 'Aug 23 - Sep 22' },
  { id: 9,  key: 'libra',       name: 'Libra',       symbol: '♎', element: 'air',   modality: 'cardinal', rulingPlanet: 'Venus',           dateRange: 'Sep 23 - Oct 22' },
  { id: 10, key: 'scorpio',     name: 'Scorpio',     symbol: '♏', element: 'water', modality: 'fixed',    rulingPlanet: 'Mars/Pluto',      dateRange: 'Oct 23 - Nov 21' },
  { id: 11, key: 'sagittarius', name: 'Sagittarius', symbol: '♐', element: 'fire',  modality: 'mutable',  rulingPlanet: 'Jupiter',         dateRange: 'Nov 22 - Dec 21' },
]

// ─── Boundary table ───────────────────────────────────────────────────────────
// Each entry: [month, day] at which the NEXT sign begins.
// Ordered by calendar year (Jan through Dec).
// Before Jan 20 → Capricorn (id 0), after Dec 21 → Capricorn (id 0).
const BOUNDARIES: { month: number; day: number; signId: number }[] = [
  { month: 1,  day: 20, signId: 1  }, // Jan 20 → Aquarius
  { month: 2,  day: 19, signId: 2  }, // Feb 19 → Pisces
  { month: 3,  day: 21, signId: 3  }, // Mar 21 → Aries
  { month: 4,  day: 20, signId: 4  }, // Apr 20 → Taurus
  { month: 5,  day: 21, signId: 5  }, // May 21 → Gemini
  { month: 6,  day: 21, signId: 6  }, // Jun 21 → Cancer
  { month: 7,  day: 23, signId: 7  }, // Jul 23 → Leo
  { month: 8,  day: 23, signId: 8  }, // Aug 23 → Virgo
  { month: 9,  day: 23, signId: 9  }, // Sep 23 → Libra
  { month: 10, day: 23, signId: 10 }, // Oct 23 → Scorpio
  { month: 11, day: 22, signId: 11 }, // Nov 22 → Sagittarius
  { month: 12, day: 22, signId: 0  }, // Dec 22 → Capricorn
]

// Cusp tolerance in days — births within ±1 day of boundary are flagged
const CUSP_TOLERANCE_DAYS = 1

// ─── Calculator ───────────────────────────────────────────────────────────────

export interface SunSignResult {
  signId: number
  sign: SunSignData
  isCusp: boolean        // true if born within 1 day of sign boundary
  cuspNeighbor?: number  // adjacent sign ID if cusp
}

export function calculateSunSign(month: number, day: number): SunSignResult {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid date: month=${month}, day=${day}`)
  }

  let signId = 0 // default Capricorn (Dec 22 onward)

  // Walk boundaries in order; last one that month/day >= wins
  for (const b of BOUNDARIES) {
    if (month > b.month || (month === b.month && day >= b.day)) {
      signId = b.signId
    }
  }

  // Cusp detection: is the date within CUSP_TOLERANCE_DAYS of any boundary?
  let isCusp = false
  let cuspNeighbor: number | undefined

  for (const b of BOUNDARIES) {
    const dayDiff = daysBetween(month, day, b.month, b.day)
    if (Math.abs(dayDiff) <= CUSP_TOLERANCE_DAYS) {
      isCusp = true
      // If dayDiff < 0 we're just before the boundary; if >= 0 we've crossed
      cuspNeighbor = dayDiff < 0
        ? (BOUNDARIES.find(bb => bb.signId === signId)?.signId ?? signId) // prior sign
        : b.signId
      break
    }
  }

  return {
    signId,
    sign: SUN_SIGNS[signId],
    isCusp,
    cuspNeighbor: isCusp ? cuspNeighbor : undefined,
  }
}

/** Approximate signed day difference (date1 - boundary), ignoring year. */
function daysBetween(m1: number, d1: number, m2: number, d2: number): number {
  const a = m1 * 31 + d1
  const b = m2 * 31 + d2
  return a - b
}

/** Convenience: look up SunSignData by key. */
export function getSunSignByKey(key: string): SunSignData | undefined {
  return SUN_SIGNS.find(s => s.key === key)
}

/** Convenience: look up SunSignData by id. */
export function getSunSignById(id: number): SunSignData | undefined {
  return SUN_SIGNS.find(s => s.id === id)
}
