import { describe, it, expect } from 'vitest'
import { generateCoachingNudges, type DriftSignal } from '../coaching-engine'

describe('drift-engine coaching nudges', () => {
  it('generates a nudge per signal, sorted by severity priority', () => {
    const signals: DriftSignal[] = [
      {
        type: 'goal_abandonment',
        severity: 'low',
        goalName: 'Write book',
        message: 'low sev',
        evidence: {},
        detectedAt: '2026-07-26T00:00:00.000Z',
      },
      {
        type: 'priority_inversion',
        severity: 'high',
        goalName: 'Ship MVP',
        message: 'high sev',
        evidence: {},
        detectedAt: '2026-07-26T00:00:00.000Z',
      },
    ]

    const nudges = generateCoachingNudges(signals, 'user-1', 'pioneer')
    expect(nudges).toHaveLength(2)
    // high severity (priority 1) sorts before low (priority 3)
    expect(nudges[0].signalType).toBe('priority_inversion')
    expect(nudges[0].priority).toBe(1)
    expect(nudges[1].signalType).toBe('goal_abandonment')
    expect(nudges[1].priority).toBe(3)
  })

  it('adapts message tone to archetype (sage → supportive)', () => {
    const signal: DriftSignal = {
      type: 'streak_break',
      severity: 'medium',
      message: 'streak',
      evidence: {},
      detectedAt: '2026-07-26T00:00:00.000Z',
    }
    const nudges = generateCoachingNudges([signal], 'user-1', 'sage')
    expect(nudges[0].tone).toBe('supportive')
    expect(nudges[0].title).toBe('Missing Your Streak')
  })

  it('adapts message tone to archetype (pioneer → direct)', () => {
    const signal: DriftSignal = {
      type: 'streak_break',
      severity: 'medium',
      message: 'streak',
      evidence: {},
      detectedAt: '2026-07-26T00:00:00.000Z',
    }
    const nudges = generateCoachingNudges([signal], 'user-1', 'pioneer')
    expect(nudges[0].tone).toBe('direct')
    expect(nudges[0].title).toBe('Momentum Lost')
  })

  it('substitutes {goal} placeholder with goal name', () => {
    const signal: DriftSignal = {
      type: 'goal_abandonment',
      severity: 'high',
      goalName: 'Learn Rust',
      message: 'abandoned',
      evidence: {},
      detectedAt: '2026-07-26T00:00:00.000Z',
    }
    const nudges = generateCoachingNudges([signal], 'user-1', 'sage')
    expect(nudges[0].message).toContain('Learn Rust')
    expect(nudges[0].message).not.toContain('{goal}')
  })

  it('produces a nudge for each of the 6 signal types', () => {
    const types: DriftSignal['type'][] = [
      'goal_abandonment',
      'priority_inversion',
      'calendar_mismatch',
      'streak_break',
      'completion_rate_drop',
      'scope_creep',
    ]
    const signals: DriftSignal[] = types.map((type) => ({
      type,
      severity: 'medium',
      goalName: 'G',
      message: 'm',
      evidence: {},
      detectedAt: '2026-07-26T00:00:00.000Z',
    }))
    const nudges = generateCoachingNudges(signals, 'user-1', 'architect')
    expect(nudges).toHaveLength(6)
    const producedTypes = new Set(nudges.map((n) => n.signalType))
    for (const t of types) expect(producedTypes.has(t)).toBe(true)
  })
})
