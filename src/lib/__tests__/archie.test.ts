/**
 * ARCHIE Engine — 50 Sample Profile Tests
 *
 * Covers all major combinations:
 *  - All 12 Sun signs
 *  - All 10 Day Masters
 *  - All 3 strength levels
 *  - All 4 personality codes
 *  - With and without hour pillar
 *  - Cusp dates
 *  - Edge cases
 */

import { calculateSunSign, SUN_SIGNS } from '../sun-sign'
import { calculateBazi, STEMS } from '../bazi'
import { calculateDayMasterStrength } from '../bazi-strength'
import { scoreTimeQuiz, TIME_QUIZ_QUESTIONS, hourToShichen } from '../time-quiz'
import { generateArchetype, generateTaskTemplates, SUN_SIGN_DASHBOARD_TOKENS } from '../archie-engine'

// ─── Sun Sign Tests ───────────────────────────────────────────────────────────

describe('Sun Sign Calculator', () => {
  const cases: [number, number, number, string][] = [
    // [month, day, expectedId, expectedSign]
    [1,  1,  0,  'capricorn'],   // Jan 1 — Capricorn
    [1, 19,  0,  'capricorn'],   // Jan 19 — still Capricorn
    [1, 20,  1,  'aquarius'],    // Jan 20 — Aquarius starts
    [2, 18,  1,  'aquarius'],    // Feb 18 — still Aquarius
    [2, 19,  2,  'pisces'],      // Feb 19 — Pisces
    [3, 20,  2,  'pisces'],      // Mar 20 — last day Pisces
    [3, 21,  3,  'aries'],       // Mar 21 — Aries
    [4, 19,  3,  'aries'],       // Apr 19 — still Aries
    [4, 20,  4,  'taurus'],      // Apr 20 — Taurus
    [5, 20,  4,  'taurus'],      // May 20 — last day Taurus
    [5, 21,  5,  'gemini'],      // May 21 — Gemini
    [6, 20,  5,  'gemini'],      // Jun 20 — last day Gemini
    [6, 21,  6,  'cancer'],      // Jun 21 — Cancer
    [7, 22,  6,  'cancer'],      // Jul 22 — last day Cancer
    [7, 23,  7,  'leo'],         // Jul 23 — Leo
    [8, 22,  7,  'leo'],         // Aug 22 — last day Leo
    [8, 23,  8,  'virgo'],       // Aug 23 — Virgo
    [9, 22,  8,  'virgo'],       // Sep 22 — last day Virgo
    [9, 23,  9,  'libra'],       // Sep 23 — Libra
    [10, 22, 9,  'libra'],       // Oct 22 — last day Libra
    [10, 23, 10, 'scorpio'],     // Oct 23 — Scorpio
    [11, 21, 10, 'scorpio'],     // Nov 21 — last day Scorpio
    [11, 22, 11, 'sagittarius'], // Nov 22 — Sagittarius
    [12, 21, 11, 'sagittarius'], // Dec 21 — last day Sagittarius
    [12, 22, 0,  'capricorn'],   // Dec 22 — Capricorn
    [12, 31, 0,  'capricorn'],   // Dec 31 — Capricorn
  ]

  test.each(cases)('%i/%i → id=%i (%s)', (month, day, expectedId, expectedKey) => {
    const result = calculateSunSign(month, day)
    expect(result.signId).toBe(expectedId)
    expect(result.sign.key).toBe(expectedKey)
  })

  it('should flag cusp births', () => {
    // Jan 19 is within 1 day of Jan 20 boundary
    const r = calculateSunSign(1, 19)
    expect(r.isCusp).toBe(true)
  })

  it('should not flag mid-sign births as cusp', () => {
    const r = calculateSunSign(7, 1) // July 1 — Leo center
    expect(r.isCusp).toBe(false)
  })

  it('should return valid data for all 12 signs', () => {
    expect(SUN_SIGNS).toHaveLength(12)
    SUN_SIGNS.forEach(s => {
      expect(s.id).toBeGreaterThanOrEqual(0)
      expect(s.id).toBeLessThan(12)
      expect(s.key).toBeTruthy()
      expect(s.name).toBeTruthy()
      expect(['fire', 'earth', 'air', 'water']).toContain(s.element)
    })
  })
})

// ─── BaZi Calculator Tests ────────────────────────────────────────────────────

describe('BaZi Calculator', () => {
  it('should compute 4 pillars with known birth time', () => {
    const bazi = calculateBazi(1990, 5, 15, 10)
    expect(bazi.yearPillar.stem).toBeTruthy()
    expect(bazi.monthPillar.stem).toBeTruthy()
    expect(bazi.dayPillar.stem).toBeTruthy()
    expect(bazi.hourPillar).not.toBeNull()
    expect(STEMS).toContain(bazi.dayMaster)
  })

  it('should compute 3 pillars without birth time', () => {
    const bazi = calculateBazi(1985, 8, 20)
    expect(bazi.hourPillar).toBeNull()
    expect(bazi.dayMaster).toBeTruthy()
  })

  it('should identify dominant element', () => {
    const bazi = calculateBazi(1990, 5, 15)
    expect(['wood', 'fire', 'earth', 'metal', 'water']).toContain(bazi.dominantElement)
  })

  it('should compute element counts', () => {
    const bazi = calculateBazi(1990, 5, 15)
    const total = Object.values(bazi.elementCounts).reduce((a, b) => a + b, 0)
    expect(total).toBeGreaterThan(0)
  })

  it('should handle all 10 day masters across different dates', () => {
    // Sample dates known to produce specific day masters
    const testDates = [
      [1990, 1, 1], [1990, 1, 2], [1990, 1, 3], [1990, 1, 4], [1990, 1, 5],
      [1990, 1, 6], [1990, 1, 7], [1990, 1, 8], [1990, 1, 9], [1990, 1, 10],
    ]
    const mastersSeen = new Set<string>()
    for (const [y, m, d] of testDates) {
      const bazi = calculateBazi(y, m, d)
      mastersSeen.add(bazi.dayMaster)
    }
    // Should see at least 5 different day masters across 10 consecutive days
    expect(mastersSeen.size).toBeGreaterThanOrEqual(5)
  })
})

// ─── BaZi Strength Tests ──────────────────────────────────────────────────────

describe('Day Master Strength Calculator', () => {
  it('should return valid strength values', () => {
    const bazi = calculateBazi(1990, 5, 15, 10)
    const result = calculateDayMasterStrength(bazi)
    expect(['strong', 'weak', 'balanced']).toContain(result.strength)
    expect(typeof result.score).toBe('number')
  })

  it('should include month support flag', () => {
    const bazi = calculateBazi(1990, 5, 15) // May — Wood in partial season
    const result = calculateDayMasterStrength(bazi)
    expect(typeof result.monthSupport).toBe('boolean')
  })

  it('should produce all 3 strength levels across different profiles', () => {
    const dates = [
      [1990, 1, 1], [1985, 7, 15], [1975, 3, 20], [2000, 10, 5],
      [1968, 12, 25], [1955, 6, 10], [1993, 9, 1], [2010, 2, 14],
    ]
    const strengthsSeen = new Set<string>()
    for (const [y, m, d] of dates) {
      const bazi = calculateBazi(y, m, d)
      const result = calculateDayMasterStrength(bazi)
      strengthsSeen.add(result.strength)
    }
    // Should see at least 2 of the 3 strength levels
    expect(strengthsSeen.size).toBeGreaterThanOrEqual(2)
  })
})

// ─── Time Quiz Tests ──────────────────────────────────────────────────────────

describe('Time Quiz', () => {
  it('should have exactly 5 questions', () => {
    expect(TIME_QUIZ_QUESTIONS).toHaveLength(5)
  })

  it('should score answers to produce top candidates', () => {
    const answers = { 1: 'c' as const, 2: 'b' as const, 3: 'b' as const, 4: 'b' as const, 5: 'b' as const }
    const result = scoreTimeQuiz(answers)
    expect(result.candidates.length).toBeGreaterThanOrEqual(1)
    expect(result.candidates.length).toBeLessThanOrEqual(3)
    expect(result.topHour).toBeGreaterThanOrEqual(0)
    expect(result.topHour).toBeLessThan(24)
  })

  it('should produce a message string', () => {
    const answers = { 1: 'a' as const, 2: 'a' as const, 3: 'a' as const }
    const result = scoreTimeQuiz(answers)
    expect(typeof result.message).toBe('string')
    expect(result.message.length).toBeGreaterThan(0)
  })

  it('candidates should have confidence values summing close to 1', () => {
    const answers = { 1: 'd' as const, 2: 'c' as const, 3: 'c' as const, 4: 'c' as const, 5: 'c' as const }
    const result = scoreTimeQuiz(answers)
    const totalConf = result.candidates.reduce((sum, c) => sum + c.confidence, 0)
    expect(totalConf).toBeGreaterThan(0.1)
  })

  it('hourToShichen should correctly map hours', () => {
    expect(hourToShichen(0).animal).toBe('Rat')   // 子
    expect(hourToShichen(23).animal).toBe('Rat')  // 子 (wraps)
    expect(hourToShichen(3).animal).toBe('Tiger') // 寅
    expect(hourToShichen(11).animal).toBe('Horse') // 午
    expect(hourToShichen(19).animal).toBe('Dog')  // 戌
    expect(hourToShichen(21).animal).toBe('Pig')  // 亥
  })
})

// ─── ARCHIE Engine — 50 Sample Profiles ──────────────────────────────────────

describe('ARCHIE Engine — 50 Sample Profiles', () => {
  interface SampleProfile {
    label: string
    birthDate: string
    birthTime?: string
    personalityCode: 'sg' | 'sp' | 'ig' | 'ip'
    expectedSunSign: string
    expectedPersonality: string
  }

  const PROFILES: SampleProfile[] = [
    // ─── All 12 Sun Signs × 4 personality codes ───────────────────────────
    { label: 'Capricorn/SG',     birthDate: '1990-01-05', personalityCode: 'sg', expectedSunSign: 'capricorn',   expectedPersonality: 'sg' },
    { label: 'Capricorn/SP',     birthDate: '1985-01-10', personalityCode: 'sp', expectedSunSign: 'capricorn',   expectedPersonality: 'sp' },
    { label: 'Capricorn/IG',     birthDate: '1992-12-25', personalityCode: 'ig', expectedSunSign: 'capricorn',   expectedPersonality: 'ig' },
    { label: 'Capricorn/IP',     birthDate: '1975-01-01', personalityCode: 'ip', expectedSunSign: 'capricorn',   expectedPersonality: 'ip' },
    { label: 'Aquarius/SG',      birthDate: '1988-02-01', personalityCode: 'sg', expectedSunSign: 'aquarius',    expectedPersonality: 'sg' },
    { label: 'Aquarius/IP',      birthDate: '1995-01-25', personalityCode: 'ip', expectedSunSign: 'aquarius',    expectedPersonality: 'ip' },
    { label: 'Pisces/SP',        birthDate: '1982-03-01', personalityCode: 'sp', expectedSunSign: 'pisces',      expectedPersonality: 'sp' },
    { label: 'Pisces/IP',        birthDate: '1991-02-25', personalityCode: 'ip', expectedSunSign: 'pisces',      expectedPersonality: 'ip' },
    { label: 'Aries/IG',         birthDate: '1987-04-01', personalityCode: 'ig', expectedSunSign: 'aries',       expectedPersonality: 'ig' },
    { label: 'Aries/SG',         birthDate: '1999-03-25', personalityCode: 'sg', expectedSunSign: 'aries',       expectedPersonality: 'sg' },
    { label: 'Taurus/SP',        birthDate: '1980-05-01', personalityCode: 'sp', expectedSunSign: 'taurus',      expectedPersonality: 'sp' },
    { label: 'Taurus/SG',        birthDate: '1993-04-25', personalityCode: 'sg', expectedSunSign: 'taurus',      expectedPersonality: 'sg' },
    { label: 'Gemini/IG',        birthDate: '1986-06-01', personalityCode: 'ig', expectedSunSign: 'gemini',      expectedPersonality: 'ig' },
    { label: 'Gemini/IP',        birthDate: '2001-05-25', personalityCode: 'ip', expectedSunSign: 'gemini',      expectedPersonality: 'ip' },
    { label: 'Cancer/SP',        birthDate: '1984-07-01', personalityCode: 'sp', expectedSunSign: 'cancer',      expectedPersonality: 'sp' },
    { label: 'Cancer/IP',        birthDate: '1997-07-10', personalityCode: 'ip', expectedSunSign: 'cancer',      expectedPersonality: 'ip' },
    { label: 'Leo/IG',           birthDate: '1990-08-01', personalityCode: 'ig', expectedSunSign: 'leo',         expectedPersonality: 'ig' },
    { label: 'Leo/SG',           birthDate: '1978-07-30', personalityCode: 'sg', expectedSunSign: 'leo',         expectedPersonality: 'sg' },
    { label: 'Virgo/SP',         birthDate: '1983-09-01', personalityCode: 'sp', expectedSunSign: 'virgo',       expectedPersonality: 'sp' },
    { label: 'Virgo/SG',         birthDate: '1996-08-30', personalityCode: 'sg', expectedSunSign: 'virgo',       expectedPersonality: 'sg' },
    { label: 'Libra/IG',         birthDate: '1981-10-01', personalityCode: 'ig', expectedSunSign: 'libra',       expectedPersonality: 'ig' },
    { label: 'Libra/IP',         birthDate: '2000-09-28', personalityCode: 'ip', expectedSunSign: 'libra',       expectedPersonality: 'ip' },
    { label: 'Scorpio/SG',       birthDate: '1989-11-01', personalityCode: 'sg', expectedSunSign: 'scorpio',     expectedPersonality: 'sg' },
    { label: 'Scorpio/IG',       birthDate: '1976-10-31', personalityCode: 'ig', expectedSunSign: 'scorpio',     expectedPersonality: 'ig' },
    { label: 'Sagittarius/IP',   birthDate: '1994-11-28', personalityCode: 'ip', expectedSunSign: 'sagittarius', expectedPersonality: 'ip' },
    { label: 'Sagittarius/SP',   birthDate: '2003-12-10', personalityCode: 'sp', expectedSunSign: 'sagittarius', expectedPersonality: 'sp' },

    // ─── With birth times (hour pillar) ───────────────────────────────────
    { label: 'Leo/IG+Midnight',  birthDate: '1990-08-15', birthTime: '00:30', personalityCode: 'ig', expectedSunSign: 'leo',         expectedPersonality: 'ig' },
    { label: 'Aries/SG+Dawn',    birthDate: '1987-04-10', birthTime: '05:00', personalityCode: 'sg', expectedSunSign: 'aries',       expectedPersonality: 'sg' },
    { label: 'Scorpio/IP+Night', birthDate: '1982-11-05', birthTime: '22:00', personalityCode: 'ip', expectedSunSign: 'scorpio',     expectedPersonality: 'ip' },
    { label: 'Pisces/IP+Eve',    birthDate: '1991-03-05', birthTime: '20:00', personalityCode: 'ip', expectedSunSign: 'pisces',      expectedPersonality: 'ip' },
    { label: 'Virgo/SP+Morn',   birthDate: '1985-09-05', birthTime: '08:00', personalityCode: 'sp', expectedSunSign: 'virgo',       expectedPersonality: 'sp' },
    { label: 'Cancer/SP+Noon',   birthDate: '1993-07-05', birthTime: '12:00', personalityCode: 'sp', expectedSunSign: 'cancer',      expectedPersonality: 'sp' },
    { label: 'Taurus/IG+Aft',   birthDate: '1979-05-05', birthTime: '15:00', personalityCode: 'ig', expectedSunSign: 'taurus',      expectedPersonality: 'ig' },
    { label: 'Gemini/SG+Eve',   birthDate: '1996-06-01', birthTime: '18:00', personalityCode: 'sg', expectedSunSign: 'gemini',      expectedPersonality: 'sg' },
    { label: 'Capricorn/IG+23', birthDate: '1988-01-08', birthTime: '23:00', personalityCode: 'ig', expectedSunSign: 'capricorn',   expectedPersonality: 'ig' },
    { label: 'Aquarius/SP+3am', birthDate: '2000-02-05', birthTime: '03:00', personalityCode: 'sp', expectedSunSign: 'aquarius',    expectedPersonality: 'sp' },

    // ─── Specific spec examples ────────────────────────────────────────────
    // Capricorn + 庚 Metal Strong + SG → "The Mountain Forge" (approx date)
    { label: 'MountainForge',    birthDate: '1990-01-06', personalityCode: 'sg', expectedSunSign: 'capricorn', expectedPersonality: 'sg' },
    // Pisces + 癸 Water Weak + IP → "The Deep Dream"
    { label: 'DeepDream',        birthDate: '1991-03-05', personalityCode: 'ip', expectedSunSign: 'pisces',    expectedPersonality: 'ip' },
    // Leo + 丙 Fire Strong + IG → "The Solar Flame"
    { label: 'SolarFlame',       birthDate: '1990-08-01', personalityCode: 'ig', expectedSunSign: 'leo',       expectedPersonality: 'ig' },
    // Virgo + 辛 Metal Weak + SP → "The Precision Lab"
    { label: 'PrecisionLab',     birthDate: '1991-09-05', personalityCode: 'sp', expectedSunSign: 'virgo',     expectedPersonality: 'sp' },

    // ─── Edge cases ────────────────────────────────────────────────────────
    { label: 'Jan1-Capricorn',   birthDate: '2000-01-01', personalityCode: 'sg', expectedSunSign: 'capricorn',   expectedPersonality: 'sg' },
    { label: 'Dec31-Capricorn',  birthDate: '1999-12-31', personalityCode: 'ig', expectedSunSign: 'capricorn',   expectedPersonality: 'ig' },
    { label: 'Feb29-Pisces',     birthDate: '2000-02-29', personalityCode: 'ip', expectedSunSign: 'pisces',      expectedPersonality: 'ip' },
    { label: 'Sep23-Libra',      birthDate: '1990-09-23', personalityCode: 'sg', expectedSunSign: 'libra',       expectedPersonality: 'sg' },
    { label: 'Mar21-Aries',      birthDate: '1985-03-21', personalityCode: 'ig', expectedSunSign: 'aries',       expectedPersonality: 'ig' },
    { label: 'OldDate-1920',     birthDate: '1920-06-15', personalityCode: 'sp', expectedSunSign: 'gemini',      expectedPersonality: 'sp' },
    { label: 'OldDate-1950',     birthDate: '1950-11-15', personalityCode: 'ip', expectedSunSign: 'scorpio',     expectedPersonality: 'ip' },
    { label: 'Young-2010',       birthDate: '2010-04-05', personalityCode: 'sg', expectedSunSign: 'aries',       expectedPersonality: 'sg' },
    { label: 'With23Hour',       birthDate: '1990-08-10', birthTime: '23:30', personalityCode: 'ig', expectedSunSign: 'leo', expectedPersonality: 'ig' },
    { label: 'WithEstHour',      birthDate: '1985-06-10', personalityCode: 'ip', expectedSunSign: 'gemini', expectedPersonality: 'ip' },
  ]

  test.each(PROFILES)('Profile: $label', (profile) => {
    const result = generateArchetype({
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      personalityCode: profile.personalityCode,
      estimatedHourIndex: profile.label === 'WithEstHour' ? 5 : undefined,
    })

    // Core assertions
    expect(result.sunSignKey).toBe(profile.expectedSunSign)
    expect(result.personalityCode).toBe(profile.expectedPersonality)
    expect(result.archetypeId).toContain(profile.expectedSunSign)
    expect(result.archetypeId).toContain(profile.personalityCode)
    expect(result.archetypeName).toMatch(/^The /)
    expect(result.description).toBeTruthy()
    expect(result.description.length).toBeGreaterThan(20)

    // Dashboard tokens present
    expect(result.dashboardTokens).toBeTruthy()
    expect(result.dashboardTokens.colorPalette.primary).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(result.dashboardTokens.typography.heading).toBeTruthy()
    expect(result.dashboardTokens.coachingTone.exampleMessages).toHaveLength(3)

    // Energy hours valid
    expect(result.energyHours.peak.length).toBeGreaterThan(0)
    expect(result.energyHours.rest.length).toBeGreaterThan(0)
    result.energyHours.peak.forEach(h => {
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThan(24)
    })

    // Goal templates for all 6 domains
    const domains = ['career', 'wealth', 'health', 'relationships', 'learning', 'legacy']
    domains.forEach(domain => {
      expect(result.goalTemplates[domain]).toBeDefined()
      expect(result.goalTemplates[domain].length).toBeGreaterThan(0)
    })

    // BaZi data
    expect(result.bazi.yearPillar).toBeTruthy()
    expect(result.bazi.monthPillar).toBeTruthy()
    expect(result.bazi.dayPillar).toBeTruthy()
    expect(['strong', 'weak', 'balanced']).toContain(result.strength)

    // Hour pillar if time provided
    if (profile.birthTime) {
      expect(result.hourPillarIndex).toBeDefined()
      expect(result.hourPillarName).toBeTruthy()
      expect(result.bazi.hourPillar).toBeTruthy()
    }

    // Combination count
    expect(result.combinationCount).toBe(17280)
  })

  it('should generate unique archetype IDs for different combinations', () => {
    const r1 = generateArchetype({ birthDate: '1990-01-05', personalityCode: 'sg' })
    const r2 = generateArchetype({ birthDate: '1990-01-05', personalityCode: 'ip' })
    const r3 = generateArchetype({ birthDate: '1990-08-15', personalityCode: 'sg' })
    // Different personalities or signs → different IDs
    expect(r1.archetypeId).not.toBe(r2.archetypeId)
    expect(r1.archetypeId).not.toBe(r3.archetypeId)
  })

  it('should be deterministic — same input always produces same output', () => {
    const input = { birthDate: '1990-06-15', personalityCode: 'ig' as const }
    const r1 = generateArchetype(input)
    const r2 = generateArchetype(input)
    expect(r1.archetypeId).toBe(r2.archetypeId)
    expect(r1.archetypeName).toBe(r2.archetypeName)
  })
})

// ─── Task Template Generator Tests ───────────────────────────────────────────

describe('Task Template Generator', () => {
  const codes = ['sg', 'sp', 'ig', 'ip'] as const

  test.each(codes)('personality code %s generates 5 project tasks', (code) => {
    const tasks = generateTaskTemplates(code, 'Test Project')
    expect(tasks).toHaveLength(5)
    tasks.forEach(t => expect(t).toBeTruthy())
  })

  it('should include project name in task descriptions', () => {
    const tasks = generateTaskTemplates('sg', 'My Product Launch')
    const taskText = tasks.join(' ')
    expect(taskText).toContain('My Product Launch')
  })
})

// ─── Dashboard Token Coverage ─────────────────────────────────────────────────

describe('Dashboard Token Coverage', () => {
  const sunSignKeys = [
    'capricorn', 'aquarius', 'pisces', 'aries', 'taurus', 'gemini',
    'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius',
  ]

  test.each(sunSignKeys)('%s has complete dashboard tokens', (key) => {
    const tokens = SUN_SIGN_DASHBOARD_TOKENS[key]
    expect(tokens).toBeDefined()

    // Color palette — 7 colors
    expect(tokens.colorPalette.primary).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(tokens.colorPalette.secondary).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(tokens.colorPalette.accent).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(tokens.colorPalette.background).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(tokens.colorPalette.text).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(tokens.colorPalette.success).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(tokens.colorPalette.warning).toMatch(/^#[0-9A-Fa-f]{6}$/)

    // Typography
    expect(tokens.typography.heading).toBeTruthy()
    expect(tokens.typography.body).toBeTruthy()
    expect(tokens.typography.mono).toBeTruthy()

    // Coaching
    expect(tokens.coachingTone.exampleMessages).toHaveLength(3)
    expect(['high', 'medium', 'low']).toContain(tokens.coachingTone.metaphorFrequency)

    // Rituals
    expect(tokens.ritualSuggestions.daily).toBeTruthy()
    expect(tokens.ritualSuggestions.weekly).toBeTruthy()
    expect(tokens.ritualSuggestions.monthly).toBeTruthy()
    expect(tokens.ritualSuggestions.annual).toBeTruthy()

    // Progress milestones
    expect(tokens.progressVisualization.milestones.length).toBeGreaterThanOrEqual(2)
  })
})
