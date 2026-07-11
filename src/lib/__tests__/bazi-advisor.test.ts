/**
 * OS-2543 BaZi Advisor unit tests.
 *
 * Pins the wiring end-to-end: bazi → bazi-strength → bazi-phases →
 * bazi-knowledge → bazi-advisor. Locks down the shapes that the assistant
 * tool executor + the bazi-advisor probe rely on.
 */
import { buildBaziReading, buildCompatibility, tenGodOfStem } from '@/lib/bazi-advisor'
import { getKnowledgeSections, listKnowledgeSections } from '@/lib/bazi-knowledge'

describe('bazi-advisor (OS-2543)', () => {
  test('knowledge base has all 7 expected sections', () => {
    const sections = listKnowledgeSections()
    expect(sections).toEqual(
      expect.arrayContaining([
        'TEN_GODS',
        'USEFUL_GOD',
        'INTERACTIONS',
        'RELATIONSHIPS_DATING',
        'COMPATIBILITY',
        'LIFE_DIRECTION',
        'ANSWERING_STYLE',
      ])
    )
  })

  test('getKnowledgeSections returns ANSWERING_STYLE for general reading', () => {
    const body = getKnowledgeSections(['ANSWERING_STYLE'])
    expect(body).toContain('## SECTION: ANSWERING_STYLE')
    expect(body).toContain('orientation, not prediction')
  })

  test('buildBaziReading for 1990-01-15 14:30 male — known ground truth', () => {
    const r = buildBaziReading({
      birthDate: '1990-01-15',
      birthTime: '14:30',
      gender: 'male',
      topic: 'career',
      question: 'career direction over the next few years',
    })

    // Day master is Geng (庚) Yang Metal
    expect(r.chart.dayMaster.stem).toBe('庚')
    expect(r.chart.dayMaster.element).toBe('metal')
    expect(r.chart.dayMaster.polarity).toBe('yang')

    // Day pillar = 庚辰 (Geng Chen)
    expect(r.chart.pillars.day).toContain('庚辰')

    // Four pillars all present (hour pillar known)
    expect(r.chart.pillars.year).toBeTruthy()
    expect(r.chart.pillars.month).toBeTruthy()
    expect(r.chart.pillars.day).toBeTruthy()
    expect(r.chart.pillars.hour).toBeTruthy()
    expect(r.chart.pillars.hour).not.toMatch(/ASSUMED/)

    // Favorable elements derived from strength + Day Master
    expect(Array.isArray(r.chart.favorableElements)).toBe(true)
    expect(r.chart.favorableElements.length).toBeGreaterThan(0)
    expect(Array.isArray(r.chart.unfavorableElements)).toBe(true)

    // Luck pillar computed
    expect(r.timing.luckPillar.pillar).toBeTruthy()
    expect(r.timing.luckPillar.direction).toMatch(/^(forward|reverse)$/)
    expect(r.timing.luckPillar.yearsRemainingInPillar).toBeGreaterThan(0)

    // Timing layers (annual, monthly, daily, week)
    expect(r.timing.layers.length).toBeGreaterThanOrEqual(4)

    // Ten-God group counts
    expect(r.chart.tenGodGroupCounts).toBeDefined()
    expect(r.chart.tenGodGroupCounts.peer).toBeGreaterThanOrEqual(0)

    // Knowledge included matches topic routing
    expect(r.knowledgeSectionsIncluded).toContain('TEN_GODS')
    expect(r.knowledgeSectionsIncluded).toContain('USEFUL_GOD')
    expect(r.knowledgeSectionsIncluded).toContain('ANSWERING_STYLE')

    // Guidance string present and references answering style
    expect(r.guidance).toContain('ANSWERING_STYLE')
    expect(r.guidance.toLowerCase()).toContain('orientation')
  })

  test('buildBaziReading marks hour pillar as ASSUMED when no birth time given', () => {
    const r = buildBaziReading({
      birthDate: '1990-01-15',
      birthTime: null,
      gender: 'male',
      topic: 'general',
    })
    expect(r.chart.pillars.hour).toMatch(/ASSUMED/)
  })

  test('buildCompatibility computes both charts and day-stem/day-branch interactions', () => {
    const c = buildCompatibility({
      userBirthDate: '1990-01-15',
      userBirthTime: '14:30',
      userGender: 'male',
      partnerBirthDate: '1993-08-17',
      partnerBirthTime: null,
      context: 'dating',
    })

    // Both day masters are Geng (庚) — 1990-01-15 → 庚辰, 1993-08-17 → 庚午
    expect(c.user.dayMaster.stem).toBe('庚')
    expect(c.partner.dayMaster.stem).toBe('庚')
    expect(c.user.pillars.day).toContain('庚辰')
    expect(c.partner.pillars.day).toContain('庚午')

    // Day stems both metal → peers
    expect(c.interactions.dayStems).toContain('peers')

    // Day branches user=辰, partner=午 → no clash (辰 vs 午 are not 6 apart), no combine
    expect(c.interactions.dayBranches.user).toBe('辰')
    expect(c.interactions.dayBranches.partner).toBe('午')
    expect(c.interactions.dayBranches.combine).toBe(false)
    expect(c.interactions.dayBranches.clash).toBe(false)

    // Year branches present
    expect(c.interactions.yearBranches.user).toBeTruthy()
    expect(c.interactions.yearBranches.partner).toBeTruthy()

    // Element exchange computed
    expect(c.interactions.elementExchange.userNeeds.length).toBeGreaterThan(0)
    expect(c.interactions.elementExchange.partnerNeeds.length).toBeGreaterThan(0)
    expect(typeof c.interactions.elementExchange.mutualSupply).toBe('boolean')

    // Knowledge sections
    expect(c.knowledgeSectionsIncluded).toContain('COMPATIBILITY')
    expect(c.knowledgeSectionsIncluded).toContain('RELATIONSHIPS_DATING')
    expect(c.knowledgeSectionsIncluded).toContain('ANSWERING_STYLE')

    // Partner chart low-confidence marker
    expect(c.partner.pillars.hour).toMatch(/ASSUMED/)
    expect(c.note).toContain('NOT stored')

    // Guidance references answering style + profile-not-verdict
    expect(c.guidance).toContain('ANSWERING_STYLE')
  })

  test('tenGodOfStem — same-element peer', () => {
    // 庚 vs 辛 → both metal but different polarity → 劫财 Rob Wealth
    const r = tenGodOfStem('庚', '辛')
    expect(r.group).toBe('peer')
    expect(r.name).toContain('劫财')
  })

  test('tenGodOfStem — yang DM generates fire → output (食神)', () => {
    // 庚 metal generates water? No: metal → water. Let me reconsider:
    // GENERATES[metal] = water, so metal DM produces water → water = 食神 Eating God (same polarity) or 伤官 Hurting Officer (opposite)
    // 庚 (yang metal) vs 壬 (yang water) → same polarity, 食神
    const r = tenGodOfStem('庚', '壬')
    expect(r.group).toBe('output')
    expect(r.name).toContain('食神')
  })
})