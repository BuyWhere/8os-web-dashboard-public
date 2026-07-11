/**
 * BaZi Advisor (OS-2543).
 *
 * Pure computation behind the assistant's `get_bazi_reading` and
 * `get_compatibility` tools: turns decrypted birth data into a structured,
 * doctrine-grounded payload (chart facts + phases + the relevant curated
 * knowledge sections) that the LLM composes a reading from.
 *
 * No hardcoded readings live here — everything is computed from the engines
 * (bazi.ts / bazi-strength.ts / bazi-phases.ts) plus docs/bazi-knowledge.md.
 */
import {
  calculateBazi,
  STEMS,
  STEM_ELEMENT,
  STEM_POLARITY,
  BRANCHES,
  BRANCH_ELEMENT,
  type BaziResult,
  type Pillar,
  type Stem,
  type Branch,
} from './bazi'
import { calculateDayMasterStrength, type DayMasterStrength } from './bazi-strength'
import {
  computePhases,
  deriveFavorableElements,
  type Element,
  type PhasesResult,
} from './bazi-phases'
import { getKnowledgeSections } from './bazi-knowledge'

// ─── Five-element cycle (local copies; not exported by bazi-phases) ──────────
const GENERATES: Record<Element, Element> = {
  wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
}
const CONTROLS: Record<Element, Element> = {
  wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood',
}

// ─── Ten Gods (十神) derivation ───────────────────────────────────────────────
export type TenGodGroup = 'peer' | 'output' | 'wealth' | 'officer' | 'resource'

const TEN_GOD_NAMES: Record<TenGodGroup, [string, string]> = {
  // [same polarity, opposite polarity]
  peer: ['比肩 Friend', '劫财 Rob Wealth'],
  output: ['食神 Eating God', '伤官 Hurting Officer'],
  wealth: ['偏财 Indirect Wealth', '正财 Direct Wealth'],
  officer: ['七杀 Seven Killings', '正官 Direct Officer'],
  resource: ['偏印 Indirect Resource', '正印 Direct Resource'],
}

function relationToDayMaster(dayElement: Element, other: Element): TenGodGroup {
  if (other === dayElement) return 'peer'
  if (GENERATES[dayElement] === other) return 'output'
  if (CONTROLS[dayElement] === other) return 'wealth'
  if (CONTROLS[other] === dayElement) return 'officer'
  return 'resource'
}

/** The exact Ten God a stem is, relative to the Day Master. */
export function tenGodOfStem(dayStem: Stem, other: Stem): { name: string; group: TenGodGroup } {
  const group = relationToDayMaster(STEM_ELEMENT[dayStem] as Element, STEM_ELEMENT[other] as Element)
  const samePolarity = STEM_POLARITY[dayStem] === STEM_POLARITY[other]
  return { name: TEN_GOD_NAMES[group][samePolarity ? 0 : 1], group }
}

/**
 * Count element occurrences per Ten-God group (from the chart's element
 * counts, day master excluded from its own peer count) and name the dominant
 * group, if any.
 */
function tenGodGroupProfile(dayElement: Element, elementCounts: Record<string, number>) {
  const groups: Record<TenGodGroup, number> = { peer: 0, output: 0, wealth: 0, officer: 0, resource: 0 }
  for (const [el, count] of Object.entries(elementCounts)) {
    groups[relationToDayMaster(dayElement, el as Element)] += count
  }
  // Exclude the Day Master itself from its own peer count.
  groups.peer = Math.max(0, groups.peer - 1)
  const sorted = (Object.entries(groups) as [TenGodGroup, number][]).sort((a, b) => b[1] - a[1])
  const dominant = sorted[0][1] > 0 && sorted[0][1] > sorted[1][1] ? sorted[0][0] : null
  return { counts: groups, dominantGroup: dominant }
}

// ─── Branch interactions (compatibility) ─────────────────────────────────────
const SIX_COMBINE: Record<Branch, Branch> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
}
const SIX_HARM: Record<Branch, Branch> = {
  子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅',
  卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉',
}
const TRINES: Record<string, Branch[]> = {
  water: ['申', '子', '辰'], fire: ['寅', '午', '戌'],
  metal: ['巳', '酉', '丑'], wood: ['亥', '卯', '未'],
}

function branchRelation(a: Branch, b: Branch) {
  const clash = (BRANCHES.indexOf(a) - BRANCHES.indexOf(b) + 12) % 12 === 6
  const combine = SIX_COMBINE[a] === b
  const harm = SIX_HARM[a] === b
  const sharedTrine = a !== b
    ? (Object.entries(TRINES).find(([, tr]) => tr.includes(a) && tr.includes(b))?.[0] ?? null)
    : null
  const parts: string[] = []
  if (combine) parts.push('六合 six-combine (harmony/bond)')
  if (clash) parts.push('六冲 clash (movement/friction)')
  if (harm) parts.push('六害 harm (subtle undermining)')
  if (sharedTrine) parts.push(`三合 same ${sharedTrine} trine (natural alliance)`)
  if (a === b) parts.push('same branch (self-punishment themes for 辰/午/酉/亥; otherwise resonance)')
  return { combine, clash, harm, sharedTrine, summary: parts.length ? parts.join('; ') : 'no major combination/clash/harm — a neutral pairing' }
}

function stemRelation(userStem: Stem, partnerStem: Stem): string {
  const ue = STEM_ELEMENT[userStem] as Element
  const pe = STEM_ELEMENT[partnerStem] as Element
  const fiveCombine = Math.abs(STEMS.indexOf(userStem) - STEMS.indexOf(partnerStem)) === 5
  let base: string
  if (ue === pe) base = `both ${ue} Day Masters — peers (comrades or rivals depending on balance)`
  else if (GENERATES[ue] === pe) base = `user's ${ue} produces partner's ${pe} — the user feeds/supports the partner`
  else if (GENERATES[pe] === ue) base = `partner's ${pe} produces user's ${ue} — the partner feeds/supports the user`
  else if (CONTROLS[ue] === pe) base = `user's ${ue} controls partner's ${pe} — the user structures/pressures the partner`
  else base = `partner's ${pe} controls user's ${ue} — the partner structures/pressures the user`
  return fiveCombine ? `${base}; ALSO 五合 stem combination between the day stems (the classic affinity signal)` : base
}

// ─── Shared chart summarization ──────────────────────────────────────────────
function pillarText(p: Pillar): string {
  return `${p.combined} — ${p.stemName} ${p.element} (${p.polarity}) over ${p.branchName} [branch element: ${BRANCH_ELEMENT[p.branch]}]`
}

function chartSummary(natal: BaziResult, strength: DayMasterStrength, hourAssumed: boolean) {
  const dayElement = natal.dayElement as Element
  const fav = deriveFavorableElements(dayElement, strength)
  const tenGods = tenGodGroupProfile(dayElement, natal.elementCounts)
  return {
    pillars: {
      year: pillarText(natal.yearPillar),
      month: pillarText(natal.monthPillar),
      day: pillarText(natal.dayPillar),
      hour: natal.hourPillar
        ? pillarText(natal.hourPillar) + (hourAssumed ? ' (ASSUMED — birth time unknown, noon used; treat hour-pillar claims as low-confidence)' : '')
        : null,
    },
    dayMaster: {
      stem: natal.dayMaster,
      name: natal.dayPillar.stemName,
      element: dayElement,
      polarity: natal.dayPolarity,
      strength,
      description: `${strength} ${natal.dayPolarity} ${dayElement} (${natal.dayMaster} ${natal.dayPillar.stemName})`,
    },
    elementCounts: natal.elementCounts,
    dominantElement: natal.dominantElement,
    favorableElements: fav.favorable,
    unfavorableElements: fav.unfavorable,
    favorableBasis: fav.basis,
    stemTenGods: {
      yearStem: tenGodOfStem(natal.dayMaster, natal.yearPillar.stem).name,
      monthStem: tenGodOfStem(natal.dayMaster, natal.monthPillar.stem).name,
      hourStem: natal.hourPillar ? tenGodOfStem(natal.dayMaster, natal.hourPillar.stem).name : null,
    },
    tenGodGroupCounts: tenGods.counts,
    dominantTenGodGroup: tenGods.dominantGroup,
  }
}

function computeChart(birthDate: string, birthTime: string | null) {
  const [y, m, d] = birthDate.split('-').map(Number)
  const [hh, mm] = birthTime ? birthTime.split(':').map(Number) : [12, 0]
  const natal = calculateBazi(y, m, d, hh, mm)
  const strength = calculateDayMasterStrength(natal).strength
  const birth = new Date(Date.UTC(y, m - 1, d, hh, mm))
  return { natal, strength, birth, hourAssumed: !birthTime }
}

// ─── get_bazi_reading payload ────────────────────────────────────────────────
export type BaziReadingTopic =
  | 'life_direction' | 'career' | 'wealth' | 'relationships' | 'dating_timing' | 'general'

const TOPIC_SECTIONS: Record<BaziReadingTopic, string[]> = {
  life_direction: ['LIFE_DIRECTION', 'USEFUL_GOD'],
  career: ['TEN_GODS', 'USEFUL_GOD', 'LIFE_DIRECTION'],
  wealth: ['TEN_GODS', 'USEFUL_GOD', 'LIFE_DIRECTION'],
  relationships: ['RELATIONSHIPS_DATING', 'TEN_GODS'],
  dating_timing: ['RELATIONSHIPS_DATING', 'LIFE_DIRECTION'],
  general: ['TEN_GODS', 'USEFUL_GOD'],
}

export interface BaziReadingInput {
  birthDate: string          // YYYY-MM-DD (decrypted)
  birthTime: string | null   // HH:MM or null
  gender: string
  topic: BaziReadingTopic
  question?: string
}

export function buildBaziReading(input: BaziReadingInput) {
  const { natal, strength, birth, hourAssumed } = computeChart(input.birthDate, input.birthTime)
  const now = new Date()
  const phases: PhasesResult = computePhases({
    dayElement: natal.dayElement as Element,
    strength,
    monthStem: natal.monthPillar.stem,
    monthBranch: natal.monthPillar.branch,
    yearStem: natal.yearPillar.stem,
    dayBranch: natal.dayPillar.branch,
    gender: input.gender || 'unknown',
    birth,
    now,
  })

  // Knowledge injection: topic sections + INTERACTIONS when a transit actually
  // interacts (clash/combine) with the natal chart + ANSWERING_STYLE always.
  const transitsInteract = phases.layers.some((l) => /clash|harmonis|combin/i.test(l.guidance))
  const sections = [...(TOPIC_SECTIONS[input.topic] ?? TOPIC_SECTIONS.general)]
  if (transitsInteract && !sections.includes('INTERACTIONS')) sections.push('INTERACTIONS')
  sections.push('ANSWERING_STYLE')

  const chart = chartSummary(natal, strength, hourAssumed)

  return {
    topic: input.topic,
    question: input.question ?? null,
    asOf: phases.asOf,
    chart,
    timing: {
      luckPillar: phases.luck.current
        ? {
            pillar: phases.luck.current.combined,
            element: phases.luck.current.element,
            branchElement: phases.luck.current.branchElement,
            activeHalf: phases.luck.activeHalf,
            startAge: { years: phases.luck.startAgeYears, months: phases.luck.startAgeMonths },
            yearsRemainingInPillar: Math.round(phases.luck.yearsRemainingInPillar * 10) / 10,
            direction: phases.luck.direction,
            arrivingTenGod: {
              stemHalf: tenGodOfStem(natal.dayMaster, phases.luck.current.stem).name,
            },
          }
        : { pillar: null, direction: phases.luck.direction, note: 'first luck pillar not yet started' },
      layers: phases.layers,
    },
    knowledge: getKnowledgeSections(sections),
    knowledgeSectionsIncluded: sections,
    guidance:
      'Compose the reading ONLY from the chart facts + timing verdicts above, interpreted through the knowledge sections. ' +
      'Follow SECTION: ANSWERING_STYLE strictly: four-beat shape (chart evidence cited by name → traditional interpretation → practical orientation → agency-preserving close); orientation not prediction; observe every sensitive-topic guardrail.',
  }
}

// ─── get_compatibility payload ───────────────────────────────────────────────
export type CompatibilityContext = 'dating' | 'business' | 'friendship'

export interface CompatibilityInput {
  userBirthDate: string
  userBirthTime: string | null
  userGender: string
  partnerBirthDate: string          // YYYY-MM-DD — computed on the fly, never stored
  partnerBirthTime?: string | null
  partnerGender?: string
  context?: CompatibilityContext
}

export function buildCompatibility(input: CompatibilityInput) {
  const user = computeChart(input.userBirthDate, input.userBirthTime)
  const partner = computeChart(input.partnerBirthDate, input.partnerBirthTime ?? null)

  const userChart = chartSummary(user.natal, user.strength, user.hourAssumed)
  const partnerChart = chartSummary(partner.natal, partner.strength, partner.hourAssumed)

  // Element exchange (factor 1): does each chart supply what the other needs?
  const strongElements = (counts: Record<string, number>): Element[] =>
    (Object.entries(counts) as [Element, number][]).filter(([, c]) => c >= 2).map(([el]) => el)
  const userSupplies = strongElements(user.natal.elementCounts).filter((el) =>
    partnerChart.favorableElements.includes(el))
  const partnerSupplies = strongElements(partner.natal.elementCounts).filter((el) =>
    userChart.favorableElements.includes(el))

  const dayBranchRel = branchRelation(user.natal.dayPillar.branch, partner.natal.dayPillar.branch)
  const yearBranchRel = branchRelation(user.natal.yearPillar.branch, partner.natal.yearPillar.branch)

  return {
    context: input.context ?? 'dating',
    note: "Partner chart computed on the fly from the provided birth data — NOT stored. Partner's hour pillar is low-confidence if no birth time was given.",
    user: userChart,
    partner: {
      ...partnerChart,
      gender: input.partnerGender ?? 'unspecified',
      birthDate: input.partnerBirthDate,
    },
    interactions: {
      dayStems: stemRelation(user.natal.dayMaster, partner.natal.dayMaster),
      partnerDayStemAsTenGodToUser: tenGodOfStem(user.natal.dayMaster, partner.natal.dayMaster).name,
      userDayStemAsTenGodToPartner: tenGodOfStem(partner.natal.dayMaster, user.natal.dayMaster).name,
      dayBranches: {
        user: user.natal.dayPillar.branch,
        partner: partner.natal.dayPillar.branch,
        ...dayBranchRel,
      },
      yearBranches: {
        user: user.natal.yearPillar.branch,
        partner: partner.natal.yearPillar.branch,
        ...yearBranchRel,
      },
      elementExchange: {
        userNeeds: userChart.favorableElements,
        partnerSuppliesUserNeeds: partnerSupplies,
        partnerNeeds: partnerChart.favorableElements,
        userSuppliesPartnerNeeds: userSupplies,
        mutualSupply: partnerSupplies.length > 0 && userSupplies.length > 0,
      },
    },
    knowledge: getKnowledgeSections(['COMPATIBILITY', 'RELATIONSHIPS_DATING', 'ANSWERING_STYLE']),
    knowledgeSectionsIncluded: ['COMPATIBILITY', 'RELATIONSHIPS_DATING', 'ANSWERING_STYLE'],
    guidance:
      'Compose a synastry reading from the two charts + interactions above using SECTION: COMPATIBILITY (profile not verdict; ' +
      'weight element exchange highest, then day-pillar interaction; year-branch relations lowest). Name at least one genuine strength ' +
      'and the friction axis with a management strategy. Never a bare percentage score, never advise for/against the specific partner. ' +
      'Follow SECTION: ANSWERING_STYLE throughout.',
  }
}
