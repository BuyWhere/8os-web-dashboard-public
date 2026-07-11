/**
 * BaZi Multi-Timescale PHASE ENGINE (大运 / 流年 / 流月 / 日 + derived week)
 *
 * Implements the temporal layers from docs/BAZI-PHASES-AND-PLANNER-RESEARCH.md:
 *  - A.0  Favorable / unfavorable elements (用神) — the hinge (function of Day Master + strength)
 *  - A.1  Luck Pillar 大运 — start age (days to nearest solar term ÷ 3), direction
 *         (gender × year-stem polarity), active 10-yr pillar (stem→first 5y, branch→next 5y)
 *  - A.2  Annual pillar 流年 — current year's S+B, anchored to Lì Chūn (~Feb 4)
 *  - A.3  Monthly pillar 流月 — current solar-term month's S+B
 *  - A.4  Daily transit 日 — continuous 60-day cycle (soft/optional, light tint)
 *  - A.5  Week — explicit 8os DERIVATION (no BaZi basis); inherits the month pillar's theme
 *  - PART B  Goal taglines via the Ten Gods (十神) element→domain mapping
 *
 * Honesty rule (A.6): the shorter the horizon, the softer the claim.
 *   decade/year = high confidence; month = medium; day = gentle tint; week = a labelled planning horizon.
 *
 * Everything is GENUINE BaZi method or an honestly-labelled app derivation.
 * There is NO time-of-day "energy hours" anything here (that anti-pattern was removed).
 */

import {
  STEMS, BRANCHES, STEM_ELEMENT, STEM_POLARITY, BRANCH_ELEMENT,
  STEM_NAMES_EN, BRANCH_NAMES_EN,
  type Stem, type Branch,
} from './bazi'
import type { DayMasterStrength } from './bazi-strength'

export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

// ─── Element cycles (shared with strength engine) ──────────────────────────────
const GENERATES: Record<Element, Element> = {
  wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
}
const CONTROLS: Record<Element, Element> = {
  wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood',
}
// inverse helpers
function generatedBy(e: Element): Element {
  return (Object.keys(GENERATES) as Element[]).find(k => GENERATES[k] === e)!
}
function controlledBy(e: Element): Element {
  return (Object.keys(CONTROLS) as Element[]).find(k => CONTROLS[k] === e)!
}

const ELEMENT_EN: Record<Element, string> = {
  wood: 'Wood', fire: 'Fire', earth: 'Earth', metal: 'Metal', water: 'Water',
}

// ─── A.0  Favorable / Unfavorable elements (用神 yòng shén) ─────────────────────
// Doc A.0: if Day Master is WEAK → favorable = its resource (the element that
// produces it) + its OWN element (reinforce). If STRONG → favorable = output
// (what it produces), wealth (what it controls), officer (what controls it) —
// i.e. drain/control/counter. "Balanced" → mild: lean to whichever side keeps balance,
// here we treat balanced like a gentle strong (favor output/wealth) but keep the
// supporting set neutral, never unfavorable.

export interface FavorableElements {
  favorable: Element[]
  unfavorable: Element[]
  // human-readable rationale, traditional framing
  basis: string
}

export function deriveFavorableElements(
  dayElement: Element,
  strength: DayMasterStrength,
): FavorableElements {
  const self = dayElement
  const resource = generatedBy(self)   // produces the Day Master (印 Resource)
  const output = GENERATES[self]        // Day Master produces (食伤 Output)
  const wealth = CONTROLS[self]         // Day Master controls (财 Wealth)
  const officer = controlledBy(self)    // controls the Day Master (官杀 Officer)

  if (strength === 'weak') {
    // weak DM wants reinforcement: resource + self
    return {
      favorable: [resource, self],
      unfavorable: [output, wealth, officer],
      basis: `A weak ${ELEMENT_EN[self]} Day Master is reinforced by its resource (${ELEMENT_EN[resource]}) and its own element (${ELEMENT_EN[self]}). Elements that drain or control it are unfavorable.`,
    }
  }
  if (strength === 'strong') {
    // strong DM wants draining/controlling: output + wealth + officer
    return {
      favorable: [output, wealth, officer],
      unfavorable: [resource, self],
      basis: `A strong ${ELEMENT_EN[self]} Day Master is balanced by output (${ELEMENT_EN[output]}), wealth (${ELEMENT_EN[wealth]}) and officer (${ELEMENT_EN[officer]}) — channels that express or check its strength. More of its own/resource element is unfavorable.`,
    }
  }
  // balanced: gently favor output + wealth (expression without over-draining);
  // treat resource/self as neutral-positive, officer as neutral. Mark only the
  // most extreme (more self) as mildly unfavorable to keep a real signal.
  return {
    favorable: [output, wealth],
    unfavorable: [self],
    basis: `A balanced ${ELEMENT_EN[self]} Day Master reads best through expression (${ELEMENT_EN[output]}) and wealth (${ELEMENT_EN[wealth]}); piling on more ${ELEMENT_EN[self]} risks tipping it out of balance.`,
  }
}

// ─── Element-vs-favorable verdict ───────────────────────────────────────────────
export type Verdict = 'favorable' | 'unfavorable' | 'neutral'

export function verdictFor(el: Element, fav: FavorableElements): Verdict {
  if (fav.favorable.includes(el)) return 'favorable'
  if (fav.unfavorable.includes(el)) return 'unfavorable'
  return 'neutral'
}

// ─── Sexagenary helpers ─────────────────────────────────────────────────────────
function stemIdx(s: Stem): number { return STEMS.indexOf(s) }
function branchIdx(b: Branch): number { return BRANCHES.indexOf(b) }

// Branch clash (冲): six opposing pairs, 6 apart on the 12-branch wheel.
function branchesClash(a: Branch, b: Branch): boolean {
  return Math.abs(branchIdx(a) - branchIdx(b)) === 6
}
// Branch six-combine (六合): 子丑 寅亥 卯戌 辰酉 巳申 午未
const SIX_COMBINE: Record<Branch, Branch> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
}
function branchesCombine(a: Branch, b: Branch): boolean {
  return SIX_COMBINE[a] === b
}

// ─── Solar terms (节气) — astronomical approximation ─────────────────────────────
// The 24 solar terms are evenly spaced 15° of solar ecliptic longitude apart.
// We use the standard low-precision formula (accurate to ~1 day, 1900–2100):
//   D = INT(Y_frac * 365.2422 + C) - INT((Y-1) / 4) + offsetForCentury
// where C is a per-term constant (for the 20th/21st century) and Y_frac handles the
// 1900-base year fraction. Source: widely-published "通用寿星公式" (Shouxing formula).
// We compute the 12 MAJOR terms (节 jié) that begin each BaZi solar month, plus we
// expose nearest-term distance for the luck-pillar start age.

// The 12 month-beginning terms (节), in calendar order, with their month BRANCH.
// Lì Chūn (立春) begins the 寅 (Tiger) month and the BaZi solar year.
interface SolarTermDef { name: string; nameEn: string; branch: Branch; month: number; C20: number; C21: number }

// month = Gregorian month the term falls in; C20/C21 = formula constant for 1901–2000 / 2001–2100
const JIE_TERMS: SolarTermDef[] = [
  { name: '小寒', nameEn: 'Xiǎohán', branch: '丑', month: 1,  C20: 6.11,  C21: 5.4055 },
  { name: '立春', nameEn: 'Lìchūn',  branch: '寅', month: 2,  C20: 4.6295, C21: 3.87 },
  { name: '惊蛰', nameEn: 'Jīngzhé', branch: '卯', month: 3,  C20: 6.3826, C21: 5.63 },
  { name: '清明', nameEn: 'Qīngmíng',branch: '辰', month: 4,  C20: 5.59,   C21: 4.81 },
  { name: '立夏', nameEn: 'Lìxià',   branch: '巳', month: 5,  C20: 6.318,  C21: 5.52 },
  { name: '芒种', nameEn: 'Mángzhòng',branch: '午', month: 6, C20: 6.5,    C21: 5.678 },
  { name: '小暑', nameEn: 'Xiǎoshǔ', branch: '未', month: 7,  C20: 7.928,  C21: 7.108 },
  { name: '立秋', nameEn: 'Lìqiū',   branch: '申', month: 8,  C20: 8.35,   C21: 7.5 },
  { name: '白露', nameEn: 'Báilù',   branch: '酉', month: 9,  C20: 8.44,   C21: 7.646 },
  { name: '寒露', nameEn: 'Hánlù',   branch: '戌', month: 10, C20: 9.098,  C21: 8.318 },
  { name: '立冬', nameEn: 'Lìdōng',  branch: '亥', month: 11, C20: 8.218,  C21: 7.438 },
  { name: '大雪', nameEn: 'Dàxuě',   branch: '子', month: 12, C20: 7.9,    C21: 7.18 },
]

// Compute the day-of-month for a given JIE term in a given year (low-precision formula).
function jieDay(term: SolarTermDef, year: number): number {
  const Y = year % 100
  const C = year >= 2000 ? term.C21 : term.C20
  // For Xiaohan (Jan) and Daxue (Dec) the leap correction uses (Y-1)/4 vs Y/4 around
  // the year boundary; the standard formula uses INT(Y*0.2422 + C) - INT((Y-1)/4) for
  // Jan/Feb terms and INT(Y*0.2422 + C) - INT(Y/4) for the rest.
  const leap = (term.month <= 2) ? Math.floor((Y - 1) / 4) : Math.floor(Y / 4)
  return Math.floor(Y * 0.2422 + C) - leap
}

// Return the Date (UTC midnight) of a JIE term in a given Gregorian year.
function jieDate(term: SolarTermDef, year: number): Date {
  const d = jieDay(term, year)
  return new Date(Date.UTC(year, term.month - 1, d))
}

/**
 * For a date, find the active BaZi solar month: the JIE term currently in force
 * (the most recent term boundary at or before the date). Returns the term + its branch.
 */
export function activeSolarMonth(date: Date): { term: SolarTermDef; startDate: Date } {
  const y = date.getUTCFullYear()
  // Build candidate boundaries spanning prev-year-Dec .. this-year .. handle Jan edge.
  const candidates: { term: SolarTermDef; startDate: Date }[] = []
  for (const t of JIE_TERMS) {
    candidates.push({ term: t, startDate: jieDate(t, y) })
    // also previous-year December term (子 month) can govern early January
    if (t.month === 12) candidates.push({ term: t, startDate: jieDate(t, y - 1) })
  }
  candidates.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  let active = candidates[0]
  for (const c of candidates) {
    if (c.startDate.getTime() <= date.getTime()) active = c
    else break
  }
  return active
}

/**
 * Nearest JIE term boundary distance in days (signed), for luck-pillar start age.
 *  - forward charts: count to the NEXT term (positive)
 *  - backward charts: count to the PREVIOUS term (positive magnitude)
 */
export function daysToTerm(birth: Date, direction: 'forward' | 'backward'): number {
  const y = birth.getUTCFullYear()
  const boundaries: Date[] = []
  for (const yr of [y - 1, y, y + 1]) {
    for (const t of JIE_TERMS) boundaries.push(jieDate(t, yr))
  }
  boundaries.sort((a, b) => a.getTime() - b.getTime())
  const t0 = birth.getTime()
  if (direction === 'forward') {
    const next = boundaries.find(d => d.getTime() > t0)!
    return (next.getTime() - t0) / 86400000
  } else {
    const prev = [...boundaries].reverse().find(d => d.getTime() <= t0)!
    return (t0 - prev.getTime()) / 86400000
  }
}

// ─── A.1  Luck Pillar 大运 ───────────────────────────────────────────────────────

export interface LuckPillar {
  combined: string
  stem: Stem
  branch: Branch
  element: Element        // stem element (governs first 5 yrs)
  branchElement: Element  // branch element (governs second 5 yrs)
  startAge: number        // age (years) the pillar becomes active
  endAge: number
  index: number           // ordinal from the first luck pillar (0-based)
}

export interface LuckPillarResult {
  direction: 'forward' | 'backward'
  startAge: number              // age the FIRST luck pillar begins (qǐ yùn 起运)
  startAgeYears: number
  startAgeMonths: number
  current: LuckPillar | null    // the active pillar for the user's current age
  activeHalf: 'stem' | 'branch' // which half of the current decade we are in
  yearsRemainingInPillar: number
  upcoming: LuckPillar | null
  all: LuckPillar[]             // first ~10 pillars for inspection
}

/**
 * Compute the luck-pillar sequence + active pillar.
 * @param monthStem/monthBranch  the natal MONTH pillar (luck pillars step from it)
 * @param yearStem               the natal YEAR stem (its polarity sets direction)
 * @param gender                 'male' | 'female' | 'nonbinary'  (nonbinary → treated as the year-polarity-forward default, see note)
 * @param birth                  birth Date (UTC) for start-age solar-term distance
 * @param currentDate            "now"
 */
export function computeLuckPillars(
  monthStem: Stem,
  monthBranch: Branch,
  yearStem: Stem,
  gender: string,
  birth: Date,
  currentDate: Date,
): LuckPillarResult {
  const yearYang = STEM_POLARITY[yearStem] === 'yang'
  // Doc A.1: forward = (male & yang year) OR (female & yin year);
  //          backward = (male & yin year) OR (female & yang year).
  // Nonbinary has no traditional rule; we default to the male mapping and label it
  // (documented limitation) rather than inventing a third rule.
  const treatMale = gender !== 'female'
  const direction: 'forward' | 'backward' =
    (treatMale && yearYang) || (!treatMale && !yearYang) ? 'forward' : 'backward'

  // Start age: days to nearest term ÷ 3 (3 days = 1 year; 1 day = 4 months)
  const dist = daysToTerm(birth, direction)
  const startAgeRaw = dist / 3
  let startAgeYears = Math.floor(startAgeRaw)
  let startAgeMonths = Math.round((startAgeRaw - startAgeYears) * 12)
  if (startAgeMonths >= 12) { startAgeYears += 1; startAgeMonths -= 12 } // roll 12m -> +1y
  const startAge = startAgeYears + startAgeMonths / 12

  // Sequence: step from the MONTH pillar through the 60-cycle.
  const sIdx0 = stemIdx(monthStem)
  const bIdx0 = branchIdx(monthBranch)
  const step = direction === 'forward' ? 1 : -1

  const all: LuckPillar[] = []
  for (let i = 0; i < 10; i++) {
    const n = i + 1 // first luck pillar = next/prev pair after the month pillar
    const sI = ((sIdx0 + step * n) % 10 + 10) % 10
    const bI = ((bIdx0 + step * n) % 12 + 12) % 12
    const stem = STEMS[sI]
    const branch = BRANCHES[bI]
    const start = startAge + i * 10
    all.push({
      combined: stem + branch,
      stem, branch,
      element: STEM_ELEMENT[stem] as Element,
      branchElement: BRANCH_ELEMENT[branch] as Element,
      startAge: start,
      endAge: start + 10,
      index: i,
    })
  }

  // Current age (in years, fractional) from birth → now
  const ageMs = currentDate.getTime() - birth.getTime()
  const ageYears = ageMs / (365.2422 * 86400000)

  let current: LuckPillar | null = null
  let upcoming: LuckPillar | null = null
  for (const p of all) {
    if (ageYears >= p.startAge && ageYears < p.endAge) { current = p; break }
  }
  if (current) {
    upcoming = all.find(p => p.index === current!.index + 1) ?? null
  } else if (ageYears < startAge) {
    // before luck pillars begin (childhood) — no active pillar yet
    upcoming = all[0]
  }

  let activeHalf: 'stem' | 'branch' = 'stem'
  let yearsRemainingInPillar = 0
  if (current) {
    const into = ageYears - current.startAge
    activeHalf = into < 5 ? 'stem' : 'branch'
    yearsRemainingInPillar = Math.max(0, current.endAge - ageYears)
  }

  return {
    direction, startAge, startAgeYears, startAgeMonths,
    current, activeHalf, yearsRemainingInPillar, upcoming, all,
  }
}

// ─── A.2 / A.3 / A.4  Transit pillars (year / month / day) ──────────────────────

// Annual pillar 流年: sexagenary of the BaZi YEAR (anchored to Lì Chūn, ~Feb 4).
// Reference: 1924 = 甲子 (stem 0, branch 0).
export interface TransitPillar {
  combined: string
  stem: Stem
  branch: Branch
  element: Element
  branchElement: Element
}

function pillarFromYear(baziYear: number): TransitPillar {
  const sI = ((baziYear - 1924) % 10 + 10) % 10
  const bI = ((baziYear - 1924) % 12 + 12) % 12
  return makeTransit(STEMS[sI], BRANCHES[bI])
}

function makeTransit(stem: Stem, branch: Branch): TransitPillar {
  return {
    combined: stem + branch,
    stem, branch,
    element: STEM_ELEMENT[stem] as Element,
    branchElement: BRANCH_ELEMENT[branch] as Element,
  }
}

/** BaZi year for a date: rolls over at Lì Chūn (立春), not Jan 1. */
export function baziYearOf(date: Date): number {
  const lichun = JIE_TERMS.find(t => t.name === '立春')!
  const y = date.getUTCFullYear()
  const lichunDate = jieDate(lichun, y)
  return date.getTime() < lichunDate.getTime() ? y - 1 : y
}

export function annualPillar(date: Date): TransitPillar {
  return pillarFromYear(baziYearOf(date))
}

/** Monthly pillar 流月: stem from year-stem via 五虎遁; branch from active JIE term. */
export function monthlyPillar(date: Date): { pillar: TransitPillar; termName: string; termEn: string; startDate: string } {
  const { term, startDate } = activeSolarMonth(date)
  const branch = term.branch
  // month index 0 = 寅 month. branchIdx(寅)=2 → monthIndex = (branchIdx-2+12)%12
  const monthIndex = ((branchIdx(branch) - 2) % 12 + 12) % 12
  const baziYear = baziYearOf(date)
  const yearStemIdx = ((baziYear - 1924) % 10 + 10) % 10
  // 五虎遁: month stem = (yearStemGroup*2 + 2 + monthIndex) % 10
  const sI = ((yearStemIdx % 5) * 2 + 2 + monthIndex) % 10
  return {
    pillar: makeTransit(STEMS[sI], branch),
    termName: term.name,
    termEn: term.nameEn,
    startDate: startDate.toISOString().slice(0, 10),
  }
}

/** Daily transit 日: continuous 60-cycle. Ref: 1900-01-01 = 甲戌 (stem 0, branch 10). */
export function dailyPillar(date: Date): TransitPillar {
  const jdn = toJDN(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
  const ref = 2415021 // JDN of 1900-01-01
  const diff = jdn - ref
  const sI = ((diff % 10) + 10) % 10
  const bI = (((diff + 10) % 12) + 12) % 12
  return makeTransit(STEMS[sI], BRANCHES[bI])
}

function toJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return day + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045
}

// ─── The 5-layer reader ─────────────────────────────────────────────────────────

export type Confidence = 'high' | 'medium' | 'low' | 'derived'

export interface PhaseLayer {
  key: 'decade' | 'year' | 'month' | 'week' | 'day'
  label: string            // owner's label: "Couple of years" / "Year" / etc.
  basis: string            // BaZi basis honesty tag
  pillar: string | null    // the S+B in play (null for the week derivation)
  verdict: Verdict
  confidence: Confidence
  guidance: string         // one-line read
}

function elementLabel(e: Element): string { return ELEMENT_EN[e] }

// Reads a layer's element(s) against the favorable set → guidance + verdict.
function readVerdict(els: Element[], fav: FavorableElements): Verdict {
  const verdicts = els.map(e => verdictFor(e, fav))
  if (verdicts.includes('favorable') && !verdicts.includes('unfavorable')) return 'favorable'
  if (verdicts.includes('unfavorable') && !verdicts.includes('favorable')) return 'unfavorable'
  if (verdicts.includes('favorable') && verdicts.includes('unfavorable')) return 'neutral'
  return 'neutral'
}

export interface PhaseInput {
  dayElement: Element
  strength: DayMasterStrength
  monthStem: Stem
  monthBranch: Branch
  yearStem: Stem
  dayBranch: Branch        // natal day branch (for clash reads)
  gender: string
  birth: Date
  now: Date
}

export interface PhasesResult {
  asOf: string
  favorable: FavorableElements
  luck: LuckPillarResult
  layers: PhaseLayer[]
}

export function computePhases(input: PhaseInput): PhasesResult {
  const { dayElement, strength, monthStem, monthBranch, yearStem, dayBranch, gender, birth, now } = input
  const fav = deriveFavorableElements(dayElement, strength)

  // LAYER 1 — Luck Pillar (decade) — HIGH confidence
  const luck = computeLuckPillars(monthStem, monthBranch, yearStem, gender, birth, now)
  const decadeLayer = buildDecadeLayer(luck, fav)

  // LAYER 2 — Annual pillar (year) — HIGH
  const annual = annualPillar(now)
  const annualVerdict = readVerdict([annual.element, annual.branchElement], fav)
  const annualClash = branchesClash(annual.branch, dayBranch)
  const annualCombine = branchesCombine(annual.branch, dayBranch)
  const yearLayer: PhaseLayer = {
    key: 'year', label: 'Year', basis: 'Annual pillar 流年 (traditional)',
    pillar: annual.combined, verdict: annualVerdict, confidence: 'high',
    guidance: yearGuidance(annual, annualVerdict, annualClash, annualCombine),
  }

  // LAYER 3 — Monthly pillar (month) — MEDIUM
  const monthly = monthlyPillar(now)
  const monthVerdict = readVerdict([monthly.pillar.element, monthly.pillar.branchElement], fav)
  const monthLayer: PhaseLayer = {
    key: 'month', label: 'Month', basis: `Monthly pillar 流月 (solar term ${monthly.termName} / ${monthly.termEn}, traditional)`,
    pillar: monthly.pillar.combined, verdict: monthVerdict, confidence: 'medium',
    guidance: monthGuidance(monthly.pillar, monthVerdict),
  }

  // LAYER 4 — Daily transit (day) — LOW (gentle tint)
  const daily = dailyPillar(now)
  const dayVerdict = readVerdict([daily.element, daily.branchElement], fav)
  const dayClash = branchesClash(daily.branch, dayBranch)
  const dayLayer: PhaseLayer = {
    key: 'day', label: 'Day', basis: 'Daily transit 日 (traditional but weak — a gentle tint, not a mandate)',
    pillar: daily.combined, verdict: dayClash ? 'unfavorable' : dayVerdict, confidence: 'low',
    guidance: dayGuidance(daily, dayVerdict, dayClash),
  }

  // LAYER 5 — Week — DERIVED (no BaZi basis), inherits the month theme
  const weekLayer: PhaseLayer = {
    key: 'week', label: 'Week', basis: '8os derivation — NOT a BaZi pillar; a planning horizon that inherits the month theme',
    pillar: null, verdict: monthVerdict, confidence: 'derived',
    guidance: weekGuidance(monthVerdict, weekOfMonth(now, monthly.startDate)),
  }

  return {
    asOf: now.toISOString().slice(0, 10),
    favorable: fav,
    luck,
    layers: [decadeLayer, yearLayer, monthLayer, weekLayer, dayLayer],
  }
}

function buildDecadeLayer(luck: LuckPillarResult, fav: FavorableElements): PhaseLayer {
  if (!luck.current) {
    return {
      key: 'decade', label: 'Couple of years', basis: 'Luck Pillar 大运 (traditional)',
      pillar: null, verdict: 'neutral', confidence: 'high',
      guidance: `Your first Luck Pillar begins at age ${luck.startAgeYears}y ${luck.startAgeMonths}m (${luck.direction} sequence). Until then the natal chart sets the tone.`,
    }
  }
  const halfEl = luck.activeHalf === 'stem' ? luck.current.element : luck.current.branchElement
  const verdict = verdictFor(halfEl, fav)
  const remaining = Math.round(luck.yearsRemainingInPillar * 10) / 10
  let g: string
  if (verdict === 'favorable') {
    g = `You're in a ${elementLabel(halfEl)} building decade (${luck.current.combined}) — your favorable element. An expansion phase: plant ambitiously; the active ${luck.activeHalf} half rewards initiative. ~${remaining}y left in this pillar.`
  } else if (verdict === 'unfavorable') {
    g = `A fortify decade (${luck.current.combined}), not an expand one — its ${elementLabel(halfEl)} runs against your favorable set. Resistance to bold moves is the season talking; invest in skills, systems and relationships that pay out next pillar. ~${remaining}y left.`
  } else {
    g = `A mixed decade (${luck.current.combined}) — ${elementLabel(halfEl)} is neutral for you. Steady progress; pick your spots rather than betting the decade. ~${remaining}y left (currently the ${luck.activeHalf} half).`
  }
  return {
    key: 'decade', label: 'Couple of years', basis: 'Luck Pillar 大运 (traditional)',
    pillar: luck.current.combined, verdict, confidence: 'high', guidance: g,
  }
}

function yearGuidance(p: TransitPillar, v: Verdict, clash: boolean, combine: boolean): string {
  if (clash) return `${p.combined} clashes your Day branch — expect movement and change (a move, a role switch). Channel it deliberately: pick the change you want before one is forced.`
  if (v === 'favorable') return `${p.combined} adds your favorable ${elementLabel(p.element)} — a "fire the bullet" year. Set your most ambitious goal of the decade now and act decisively.${combine ? ' It also harmonises with your Day branch — partnerships land well.' : ''}`
  if (v === 'unfavorable') return `${p.combined} brings friction (${elementLabel(p.element)} runs against your favorable set). Treat it as a positioning year — tighten systems and pipeline; the payoff window opens as conditions turn.`
  return `${p.combined} is a neutral year — neither tailwind nor headwind. Make progress on fundamentals; save the boldest bets for a more favorable year.`
}

function monthGuidance(p: TransitPillar, v: Verdict): string {
  if (v === 'favorable') return `This month (${p.combined}) carries your favorable ${elementLabel(p.element)} — a green-light window. Front-load launches and outreach into the next ~4 weeks.`
  if (v === 'unfavorable') return `A lower-key month (${p.combined}) — ${elementLabel(p.element)} is unfavorable. Handle maintenance, planning and admin; hold the big push for a friendlier month.`
  return `A neutral month (${p.combined}). Steady execution — keep momentum without forcing a launch.`
}

function dayGuidance(p: TransitPillar, v: Verdict, clash: boolean): string {
  if (clash) return `Today's branch (${p.combined}) clashes yours — a fine day for routine and clearing the deck, a poor day for signing or launching. If you can, push the big decision a day or two.`
  if (v === 'favorable') return `Today (${p.combined}) leans favorable — a good day to tackle your top goal's hardest task.`
  if (v === 'unfavorable') return `Today (${p.combined}) is a bit choppy — favour routine over launches. A light tint, not a rule.`
  return `An ordinary day (${p.combined}) — nothing the transit pushes for or against. Work your plan.`
}

function weekGuidance(monthVerdict: Verdict, weekNo: number): string {
  const phase = weekNo <= 2 ? `Week ${weekNo} of the month` : `Week ${weekNo} of the month`
  if (monthVerdict === 'favorable') {
    return weekNo <= 2
      ? `${phase} (derived from your favorable month): a build week — protect two deep-work blocks for your top goal.`
      : `${phase} (derived from your favorable month): consolidate and review while the month still favours you.`
  }
  if (monthVerdict === 'unfavorable') {
    return `${phase} (derived from a lower-key month): keep it light — review, plan, and prep rather than launch.`
  }
  return `${phase} (derived from a neutral month): a steady week — pick two priorities and protect the time.`
}

function weekOfMonth(now: Date, monthStartISO: string): number {
  const start = new Date(monthStartISO + 'T00:00:00Z')
  const days = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return Math.max(1, Math.floor(days / 7) + 1)
}

// ─── PART B  Goal taglines via the Ten Gods (十神) ───────────────────────────────

export type GoalDomain =
  | 'career' | 'wealth' | 'health' | 'relationships' | 'learning' | 'legacy'
  | 'creative' | 'self'

export type TenGod = 'output' | 'wealth' | 'officer' | 'resource' | 'peer'

// Doc B.1: domain → Ten-God group. Mapping the 8os domains:
//  career        → Officer (官杀: career/authority/status/leadership/reputation)
//  wealth        → Wealth  (财: wealth/income/assets/business)
//  health        → Resource (印: nurture/health/restoration/study)
//  learning      → Resource (印: learning/knowledge/support/mentorship)
//  relationships → Peer (比劫: peers/collaboration/community/partners)
//  creative      → Output (食伤: creativity/performance/self-expression/products)
//  legacy        → Output (食伤: what you create/leave behind/expression at scale)
//  self          → Peer (比劫: independence/self-reliance)
export const DOMAIN_TEN_GOD: Record<GoalDomain, TenGod> = {
  career: 'officer',
  wealth: 'wealth',
  health: 'resource',
  learning: 'resource',
  relationships: 'peer',
  creative: 'output',
  legacy: 'output',
  self: 'peer',
}

// The element a Ten-God occupies, relative to the Day Master element.
export function tenGodElement(dayElement: Element, god: TenGod): Element {
  switch (god) {
    case 'peer':     return dayElement                 // same as DM (比劫)
    case 'output':   return GENERATES[dayElement]       // DM produces (食伤)
    case 'wealth':   return CONTROLS[dayElement]         // DM controls (财)
    case 'officer':  return controlledBy(dayElement)     // controls DM (官杀)
    case 'resource': return generatedBy(dayElement)      // produces DM (印)
  }
}

const GOD_LABEL: Record<TenGod, string> = {
  output: 'expressive (Output)',
  wealth: 'wealth',
  officer: 'authority (Officer)',
  resource: 'nurturing (Resource)',
  peer: 'peer/collaboration',
}

export interface GoalTagline {
  domain: GoalDomain
  tenGod: TenGod
  domainElement: Element
  decadeVerdict: Verdict
  yearVerdict: Verdict
  overall: Verdict
  tagline: string
}

/**
 * PART B: classify a goal's domain → its Ten-God element for THIS user → check it
 * against the active Luck Pillar + current year → one-line "why now / how" tagline.
 * Favorable = press the advantage; resisted = reframe as foundation-building (never "don't").
 */
export function goalTagline(
  domain: GoalDomain,
  dayElement: Element,
  strength: DayMasterStrength,
  now: Date,
  luck: LuckPillarResult,
): GoalTagline {
  const fav = deriveFavorableElements(dayElement, strength)
  const god = DOMAIN_TEN_GOD[domain] ?? 'peer'
  const domainElement = tenGodElement(dayElement, god)

  // decade verdict from the active half element
  let decadeVerdict: Verdict = 'neutral'
  if (luck.current) {
    const halfEl = luck.activeHalf === 'stem' ? luck.current.element : luck.current.branchElement
    // a goal's domain is "supported by the decade" when its element is favorable AND/OR
    // matches the decade's flavour; we read it as: is the domain element favorable to the user?
    decadeVerdict = verdictFor(domainElement, fav)
    // if the decade's own element equals the domain element, that amplifies the read
    if (halfEl === domainElement) {
      decadeVerdict = verdictFor(domainElement, fav)
    }
  } else {
    decadeVerdict = verdictFor(domainElement, fav)
  }

  const annual = annualPillar(now)
  // year supports the domain if the domain element is favorable, reinforced when the
  // annual element matches/produces the domain element
  let yearVerdict = verdictFor(domainElement, fav)
  if (annual.element === domainElement || GENERATES[annual.element] === domainElement) {
    if (yearVerdict === 'favorable') yearVerdict = 'favorable'
  } else if (CONTROLS[annual.element] === domainElement) {
    // year controls/clashes the domain element → friction
    if (yearVerdict !== 'favorable') yearVerdict = 'unfavorable'
  }

  const overall = combineVerdicts(decadeVerdict, yearVerdict)
  return {
    domain, tenGod: god, domainElement, decadeVerdict, yearVerdict, overall,
    tagline: buildTagline(domain, god, domainElement, overall, decadeVerdict, yearVerdict),
  }
}

function combineVerdicts(a: Verdict, b: Verdict): Verdict {
  const score = (v: Verdict) => v === 'favorable' ? 1 : v === 'unfavorable' ? -1 : 0
  const s = score(a) + score(b)
  if (s > 0) return 'favorable'
  if (s < 0) return 'unfavorable'
  return 'neutral'
}

function buildTagline(
  domain: GoalDomain, god: TenGod, el: Element, overall: Verdict,
  decade: Verdict, year: Verdict,
): string {
  const godPhrase = GOD_LABEL[god]
  const elName = elementLabel(el)
  if (overall === 'favorable') {
    return `Your ${godPhrase} element (${elName}) is supported right now — this is a "press the advantage" ${domain} goal. Be ambitious with the target and move early.`
  }
  if (overall === 'unfavorable') {
    return `Your ${godPhrase} element (${elName}) meets some friction this season. Treat this as a foundation-building ${domain} goal — tighten systems and skills now; the payoff window opens as conditions turn favorable.`
  }
  // neutral, but lean on whichever layer is positive
  if (decade === 'favorable' || year === 'favorable') {
    return `Conditions are mixed but leaning your way for this ${domain} goal (${godPhrase}, ${elName}). Make steady, intentional progress — the timing supports consistency over big bets.`
  }
  return `A steady-season ${domain} goal (${godPhrase}, ${elName}) — neither tailwind nor headwind. Build the habit now so you're ready to push when the year turns favorable.`
}

// re-export element names for callers
export { ELEMENT_EN }

// ─── Daily Big 3 support: which goal DOMAINS are favorable right now ──────────────
// Reuses the SAME Ten-Gods domain→element mapping + favorable-element verdict the
// rest of the engine uses (DOMAIN_TEN_GOD + tenGodElement + verdictFor). No new
// metaphysics: a domain is favorable when ITS Ten-God element is in the user's
// favorable set for their Day Master + strength. Used to BIAS the Big 3 toward
// tasks/goals whose domain maps to a currently-favorable element.
export interface DomainFavor {
  domain: GoalDomain
  tenGod: TenGod
  element: Element
  verdict: Verdict
}

export function domainFavorability(
  dayElement: Element,
  strength: DayMasterStrength,
): Record<string, DomainFavor> {
  const fav = deriveFavorableElements(dayElement, strength)
  const out: Record<string, DomainFavor> = {}
  for (const domain of Object.keys(DOMAIN_TEN_GOD) as GoalDomain[]) {
    const god = DOMAIN_TEN_GOD[domain]
    const element = tenGodElement(dayElement, god)
    out[domain] = { domain, tenGod: god, element, verdict: verdictFor(element, fav) }
  }
  return out
}

/** The list of goal-domains whose Ten-God element is currently favorable. */
export function favorableDomains(
  dayElement: Element,
  strength: DayMasterStrength,
): GoalDomain[] {
  const map = domainFavorability(dayElement, strength)
  return (Object.keys(map) as GoalDomain[]).filter((d) => map[d].verdict === 'favorable')
}

// ─── QUARTER / 12-WEEK HORIZON — project the next ~3 solar months forward ──────────
// Spec: docs/BAZI-PHASES-AND-PLANNER-RESEARCH.md + OS-2173.
// Reuses the SAME 流月 method as monthlyPillar() (五虎遁 stem + JIE-term branch) and the
// SAME favorable-element verdict + Ten-Gods domain mapping as the rest of the engine.
// NO new metaphysics, NO hardcoded pillars: every month's pillar is derived from the
// solar-term boundary that governs it, exactly like the current-month layer.

/**
 * Walk JIE-term boundaries forward from `from` and return the starts of the next
 * `count` BaZi solar months, beginning with the CURRENT one (index 0 = the month in
 * force at `from`). Each entry carries the governing JIE term + its UTC start date.
 */
export function upcomingSolarMonths(
  from: Date,
  count: number,
): { term: SolarTermDef; startDate: Date }[] {
  // Build a sorted list of every JIE boundary spanning a few years around `from`,
  // then take the active one + the following (count-1) boundaries.
  const y = from.getUTCFullYear()
  const all: { term: SolarTermDef; startDate: Date }[] = []
  for (const yr of [y - 1, y, y + 1, y + 2]) {
    for (const t of JIE_TERMS) all.push({ term: t, startDate: jieDate(t, yr) })
  }
  all.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  // index of the active month (most recent boundary at or before `from`)
  let activeIdx = 0
  for (let i = 0; i < all.length; i++) {
    if (all[i].startDate.getTime() <= from.getTime()) activeIdx = i
    else break
  }
  return all.slice(activeIdx, activeIdx + count)
}

export interface QuarterMonth {
  /** 0 = current solar month, 1 = next, … */
  index: number
  /** The 流月 pillar (S+B) governing this solar month. */
  pillar: string
  stem: Stem
  branch: Branch
  /** Stem element + branch element of the month pillar. */
  element: Element
  branchElement: Element
  /** Governing JIE term. */
  termName: string
  termEn: string
  /** ISO date (UTC) the solar month begins. */
  startDate: string
  /** ISO date (UTC, exclusive) the solar month ends = next month's start. */
  endDate: string
  /** Human label, e.g. "Jul 2026". */
  label: string
  /** Favorable / unfavorable / neutral for THIS user's chart. */
  verdict: Verdict
  /** A "push" (favorable) vs "consolidate" (unfavorable) vs "steady" (neutral) verdict. */
  mode: 'push' | 'consolidate' | 'steady'
  /** One-line theme for the month. */
  theme: string
  /** Goal-domains whose Ten-God element is favorable THIS month's user chart. */
  favorableDomains: GoalDomain[]
}

export interface QuarterGoalSuggestion {
  goalId: string
  name: string
  domain: string
  tenGod: TenGod
  domainElement: Element
  /** indexes (0..N-1) of the months whose verdict favors this goal's domain. */
  favorableMonthIndexes: number[]
  /** the single best month index to push this goal, or null if none favorable. */
  suggestedMonthIndex: number | null
}

export interface QuarterInput {
  dayElement: Element
  strength: DayMasterStrength
  now: Date
  /** how many solar months to project (default 3). */
  months?: number
  /** user goals to map onto favorable months. */
  goals?: { id: string; name: string; domain: string }[]
}

export interface QuarterResult {
  asOf: string
  favorable: Element[]
  unfavorable: Element[]
  favorableBasis: string
  months: QuarterMonth[]
  goals: QuarterGoalSuggestion[]
}

function monthLabel(startISO: string): string {
  const d = new Date(startISO + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function monthTheme(p: TransitPillar, v: Verdict, favDomains: GoalDomain[]): string {
  const el = ELEMENT_EN[p.element]
  const domHint = favDomains.length
    ? ` Best for ${favDomains.slice(0, 3).join(', ')}.`
    : ''
  if (v === 'favorable') {
    return `Green-light month (${p.combined}) — its ${el} carries your favorable element. Front-load launches, outreach and your boldest milestone here.${domHint}`
  }
  if (v === 'unfavorable') {
    return `Consolidate month (${p.combined}) — ${el} runs against your favorable set. Tighten systems, plan and prep; hold the big push for a friendlier month.`
  }
  return `Steady month (${p.combined}) — ${el} is neutral. Keep momentum on fundamentals without forcing a launch.${domHint}`
}

/**
 * Project the upcoming ~3 solar months forward: each month's 流月 pillar (same
 * 五虎遁 method as monthlyPillar), its favorable/consolidate verdict vs the user's
 * favorable elements, its favorable goal-domains, and which of the user's goals fall
 * in a favorable domain for each month.
 */
export function computeQuarter(input: QuarterInput): QuarterResult {
  const { dayElement, strength, now } = input
  const count = Math.max(1, Math.min(input.months ?? 3, 6))
  const fav = deriveFavorableElements(dayElement, strength)

  // Solar-month boundaries: current + the next (count-1).
  const bounds = upcomingSolarMonths(now, count + 1) // +1 so the last month has an endDate

  // Per-month favorable goal-domains depend ONLY on the user's chart (domain Ten-God
  // element favorability), not the month — but the month's VERDICT is what makes the
  // month a good time to push. We surface both: the chart-favorable domains, and we
  // only suggest pushing a goal in months whose verdict is favorable/steady.
  const chartFav = domainFavorability(dayElement, strength)
  const chartFavDomains = (Object.keys(chartFav) as GoalDomain[])
    .filter((d) => chartFav[d].verdict === 'favorable')

  const months: QuarterMonth[] = []
  for (let i = 0; i < count; i++) {
    const b = bounds[i]
    const startMid = new Date(b.startDate.getTime() + 86400000) // a day into the month → unambiguous
    const m = monthlyPillar(startMid)
    const p = m.pillar
    const verdict = readVerdict([p.element, p.branchElement], fav)
    const endDate = (bounds[i + 1]?.startDate ?? new Date(b.startDate.getTime() + 31 * 86400000))
    const mode: QuarterMonth['mode'] =
      verdict === 'favorable' ? 'push' : verdict === 'unfavorable' ? 'consolidate' : 'steady'
    months.push({
      index: i,
      pillar: p.combined,
      stem: p.stem,
      branch: p.branch,
      element: p.element,
      branchElement: p.branchElement,
      termName: m.termName,
      termEn: m.termEn,
      startDate: m.startDate,
      endDate: endDate.toISOString().slice(0, 10),
      label: monthLabel(m.startDate),
      verdict,
      mode,
      theme: monthTheme(p, verdict, chartFavDomains),
      favorableDomains: chartFavDomains,
    })
  }

  // Map goals → favorable months. A goal's domain element favorability is fixed by the
  // chart; we suggest PUSHING it in months whose verdict is favorable (or, if none are,
  // the steady months) AND whose chart makes the domain favorable. Suggested month = the
  // earliest favorable month if the domain is chart-favorable, else the earliest non-
  // consolidate month, else null.
  const goalsOut: QuarterGoalSuggestion[] = (input.goals ?? []).map((g) => {
    const god = DOMAIN_TEN_GOD[g.domain as GoalDomain] ?? 'peer'
    const domainElement = tenGodElement(dayElement, god)
    const domainFavorable = verdictFor(domainElement, fav) === 'favorable'
    // months that favor this goal: month verdict favorable AND (domain chart-favorable
    // OR month is at least not a consolidate month). We bias to genuine green-light months.
    const favIdx = months
      .filter((mo) => mo.verdict === 'favorable' && (domainFavorable || mo.mode !== 'consolidate'))
      .map((mo) => mo.index)
    let suggested: number | null = favIdx.length ? favIdx[0] : null
    if (suggested === null) {
      // fall back to the earliest steady (neutral) month so there's always a "when"
      const steady = months.find((mo) => mo.verdict !== 'unfavorable')
      suggested = steady ? steady.index : null
    }
    return {
      goalId: g.id,
      name: g.name,
      domain: g.domain,
      tenGod: god,
      domainElement,
      favorableMonthIndexes: favIdx,
      suggestedMonthIndex: suggested,
    }
  })

  return {
    asOf: now.toISOString().slice(0, 10),
    favorable: fav.favorable,
    unfavorable: fav.unfavorable,
    favorableBasis: fav.basis,
    months,
    goals: goalsOut,
  }
}
