/**
 * BaZi (八字) Four-Pillar Calculation Engine
 *
 * Computes the Year, Month, Day, and Hour pillars from a birth date/time.
 * Each pillar = Heavenly Stem (天干) + Earthly Branch (地支).
 * The Day Stem is the "Day Master" — the core of personality in BaZi.
 */

// ─── Heavenly Stems 天干 ──────────────────────────────────────────────────
export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
export type Stem = typeof STEMS[number]

export const STEM_NAMES_EN: Record<Stem, string> = {
  甲: 'Jiǎ', 乙: 'Yǐ', 丙: 'Bǐng', 丁: 'Dīng', 戊: 'Wù',
  己: 'Jǐ', 庚: 'Gēng', 辛: 'Xīn', 壬: 'Rén', 癸: 'Guǐ',
}

// 0=Wood, 1=Fire, 2=Earth, 3=Metal, 4=Water (index % 5, pairs)
export const STEM_ELEMENT: Record<Stem, string> = {
  甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth',
  己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water',
}

export const STEM_POLARITY: Record<Stem, string> = {
  甲: 'yang', 乙: 'yin', 丙: 'yang', 丁: 'yin', 戊: 'yang',
  己: 'yin', 庚: 'yang', 辛: 'yin', 壬: 'yang', 癸: 'yin',
}

// ─── Earthly Branches 地支 ───────────────────────────────────────────────
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
export type Branch = typeof BRANCHES[number]

export const BRANCH_NAMES_EN: Record<Branch, string> = {
  子: 'Zǐ (Rat)', 丑: 'Chǒu (Ox)', 寅: 'Yín (Tiger)', 卯: 'Mǎo (Rabbit)',
  辰: 'Chén (Dragon)', 巳: 'Sì (Snake)', 午: 'Wǔ (Horse)', 未: 'Wèi (Goat)',
  申: 'Shēn (Monkey)', 酉: 'Yǒu (Rooster)', 戌: 'Xū (Dog)', 亥: 'Hài (Pig)',
}

export const BRANCH_ELEMENT: Record<Branch, string> = {
  子: 'water', 丑: 'earth', 寅: 'wood', 卯: 'wood', 辰: 'earth', 巳: 'fire',
  午: 'fire', 未: 'earth', 申: 'metal', 酉: 'metal', 戌: 'earth', 亥: 'water',
}

// ─── Types ────────────────────────────────────────────────────────────────
export interface Pillar {
  stem: Stem
  branch: Branch
  stemName: string
  branchName: string
  element: string   // stem element
  polarity: string  // yang | yin
  combined: string  // e.g. "甲子"
}

export interface BaziResult {
  yearPillar: Pillar
  monthPillar: Pillar
  dayPillar: Pillar
  hourPillar: Pillar | null
  dayMaster: Stem
  dayElement: string
  dayPolarity: string
  dominantElement: string
  elementCounts: Record<string, number>
  pillarsText: {
    year: string; month: string; day: string; hour: string | null
  }
}

// ─── Year Pillar ─────────────────────────────────────────────────────────
// Reference: 1924 = 甲子 (stem 0, branch 0)
function yearPillar(year: number): Pillar {
  const stemIdx = ((year - 1924) % 10 + 10) % 10
  const branchIdx = ((year - 1924) % 12 + 12) % 12
  const stem = STEMS[stemIdx]
  const branch = BRANCHES[branchIdx]
  return makePillar(stem, branch)
}

// ─── Month Pillar ─────────────────────────────────────────────────────────
// Month branch: 寅 (2) in Feb, 卯 (3) in Mar, … (fixed offset from calendar month)
// Month stem derived from year stem group (五虎遁年起月法)
// monthIndex 0 = 寅 month (~Feb), 11 = 丑 month (~Jan)
function monthPillar(year: number, month: number, day: number): Pillar {
  // Approximate solar month index (0=Tiger/寅 = ~Feb 4)
  // We add a simple day-based correction for solar terms
  let solarMonthIdx = month - 2  // Jan=−1, Feb=0, Mar=1 …
  // Rough solar-term boundary: if before ~4th of the month, use prior
  if (day < 5) solarMonthIdx -= 1
  solarMonthIdx = ((solarMonthIdx % 12) + 12) % 12

  // Branch: 寅(2) + monthIdx
  const branchIdx = (2 + solarMonthIdx) % 12

  // Stem: year-stem group * 2 + 2 + monthIdx (五虎遁)
  const yearStemIdx = ((year - 1924) % 10 + 10) % 10
  const stemIdx = ((yearStemIdx % 5) * 2 + 2 + solarMonthIdx) % 10

  return makePillar(STEMS[stemIdx], BRANCHES[branchIdx])
}

// ─── Day Pillar ───────────────────────────────────────────────────────────
// Uses Julian Day Number. Reference: Jan 1, 1900 = 甲戌 (stem=0, branch=10)
function dayPillar(year: number, month: number, day: number): Pillar {
  const jdn = toJulianDayNumber(year, month, day)
  // JDN of Jan 1, 1900 = 2415021
  const ref = 2415021
  const diff = jdn - ref
  const stemIdx = ((diff % 10) + 10) % 10
  const branchIdx = ((diff + 10) % 12 + 12) % 12  // +10 because Jan 1 1900 branch = 戌 (10)
  return makePillar(STEMS[stemIdx], BRANCHES[branchIdx])
}

// ─── Hour Pillar ──────────────────────────────────────────────────────────
// 子(0): 23–01, 丑(1): 01–03, 寅(2): 03–05, …
// Hour stem: day stem group * 2 + hourBranch (五鼠遁日起時法)
function hourPillar(dayPillarStem: Stem, hour: number): Pillar {
  // Normalize hour: 23:00 wraps to next day's 子
  const h = hour === 23 ? 0 : hour
  const branchIdx = Math.floor((h + 1) / 2) % 12

  const dayStemIdx = STEMS.indexOf(dayPillarStem)
  const stemIdx = ((dayStemIdx % 5) * 2 + branchIdx) % 10

  return makePillar(STEMS[stemIdx], BRANCHES[branchIdx])
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function makePillar(stem: Stem, branch: Branch): Pillar {
  return {
    stem,
    branch,
    stemName: STEM_NAMES_EN[stem],
    branchName: BRANCH_NAMES_EN[branch],
    element: STEM_ELEMENT[stem],
    polarity: STEM_POLARITY[stem],
    combined: stem + branch,
  }
}

function toJulianDayNumber(year: number, month: number, day: number): number {
  // Gregorian calendar → JDN
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return day + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045
}

function dominantElement(pillars: Pillar[], hourPillar: Pillar | null): { dominant: string; counts: Record<string, number> } {
  const counts: Record<string, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  const all = [...pillars, ...(hourPillar ? [hourPillar] : [])]
  for (const p of all) {
    counts[p.element] = (counts[p.element] || 0) + 1
    counts[BRANCH_ELEMENT[p.branch]] = (counts[BRANCH_ELEMENT[p.branch]] || 0) + 1
  }
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
  return { dominant, counts }
}

// ─── Main export ──────────────────────────────────────────────────────────
export function calculateBazi(
  year: number,
  month: number,
  day: number,
  hour?: number,   // 0-23, optional
  minute?: number, // reserved, not used in pillar calc
): BaziResult {
  const yp = yearPillar(year)
  const mp = monthPillar(year, month, day)
  const dp = dayPillar(year, month, day)
  const hp = hour !== undefined ? hourPillar(dp.stem, hour) : null

  const { dominant, counts } = dominantElement([yp, mp, dp], hp)

  return {
    yearPillar: yp,
    monthPillar: mp,
    dayPillar: dp,
    hourPillar: hp,
    dayMaster: dp.stem,
    dayElement: dp.element,
    dayPolarity: dp.polarity,
    dominantElement: dominant,
    elementCounts: counts,
    pillarsText: {
      year: yp.combined,
      month: mp.combined,
      day: dp.combined,
      hour: hp?.combined ?? null,
    },
  }
}

/**
 * Client-safe: compute just the Day Master for instant preview.
 * No server required; works in the browser.
 */
export function getDayMaster(year: number, month: number, day: number): Stem {
  return dayPillar(year, month, day).stem
}
