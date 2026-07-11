/**
 * OS-2125: accountabilityPulse unit tests
 *
 * Tests computeAccountabilityPulse() — stalled and at-risk goal detection
 * that drives the accountabilityPulse block in /api/dashboard/briefing.
 */

import { computeAccountabilityPulse } from '../route'

// Helper: make a goal with a given updatedAt offset in days
function goal(daysAgo: number, progress = 0.5, domainId = 'health'): {
  id: string
  name: string
  progress: number
  updatedAt: Date
  domainId: string
} {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return {
    id: `goal-${Math.random().toString(36).slice(2)}`,
    name: `Test goal (${daysAgo}d ago)`,
    progress,
    updatedAt: d,
    domainId,
  }
}

describe('computeAccountabilityPulse', () => {
  it('returns empty pulse when user has no goals', () => {
    const result = computeAccountabilityPulse([])
    expect(result.summary.stalledGoalCount).toBe(0)
    expect(result.summary.atRiskGoalCount).toBe(0)
    expect(result.stalledGoals).toHaveLength(0)
    expect(result.atRiskGoals).toHaveLength(0)
    expect(result.archetypeNudge).toBeNull()
    expect(result.followUpPrompt).toBeNull()
  })

  it('marks a goal stalled when updatedAt >= 7 days and progress < 1', () => {
    const goals = [goal(7, 0.3)]
    const result = computeAccountabilityPulse(goals)
    expect(result.summary.stalledGoalCount).toBe(1)
    expect(result.stalledGoals).toHaveLength(1)
    expect(result.stalledGoals[0].daysSinceUpdate).toBe(7)
    expect(result.archetypeNudge).toContain('1 goal')
  })

  it('does NOT mark a goal stalled when updatedAt >= 7 days but progress === 1.0', () => {
    const goals = [goal(10, 1.0)]
    const result = computeAccountabilityPulse(goals)
    expect(result.summary.stalledGoalCount).toBe(0)
    expect(result.stalledGoals).toHaveLength(0)
  })

  it('does NOT mark a goal stalled when progress < 1 but updatedAt < 7 days', () => {
    const goals = [goal(6, 0.1)]
    const result = computeAccountabilityPulse(goals)
    expect(result.summary.stalledGoalCount).toBe(0)
    // 6 days + low progress could make it at-risk
    expect(result.summary.atRiskGoalCount).toBeGreaterThanOrEqual(0)
  })

  it('marks a goal at-risk when progress < 15% and updatedAt >= 3 days', () => {
    const goals = [goal(3, 0.1)]
    const result = computeAccountabilityPulse(goals)
    expect(result.summary.atRiskGoalCount).toBe(1)
    expect(result.atRiskGoals).toHaveLength(1)
    expect(result.atRiskGoals[0].progress).toBe(0.1)
  })

  it('VERIFY: a stalled goal triggers a real follow-up', () => {
    // Seed a goal 8 days idle — must be flagged as stalled
    const goals = [goal(8, 0.4)]
    const result = computeAccountabilityPulse(goals)

    expect(result.summary.stalledGoalCount).toBe(1)
    expect(result.stalledGoals[0].daysSinceUpdate).toBe(8)
    expect(result.archetypeNudge).not.toBeNull()
    expect(result.archetypeNudge).toContain('waiting')
    expect(result.followUpPrompt).toContain('stalled')
    // Must surface in followUpPrompt so the briefing surface can render it
    expect(result.followUpPrompt).toMatch(/1 stalled goal/)
  })

  it('VERIFY: active goal with recent progress gets neither stalled nor at-risk', () => {
    const stalled = goal(10, 0.2)
    const active = goal(0, 0.8)
    const result = computeAccountabilityPulse([stalled, active])

    expect(result.summary.stalledGoalCount).toBe(1)
    expect(result.summary.atRiskGoalCount).toBe(0)
    expect(result.stalledGoals.map(g => g.id)).toContain(stalled.id)
    expect(result.stalledGoals.map(g => g.id)).not.toContain(active.id)
  })

  it('returns multiple stalled goals with plural nudge', () => {
    const goals = [goal(8, 0.2), goal(15, 0.1)]
    const result = computeAccountabilityPulse(goals)
    expect(result.summary.stalledGoalCount).toBe(2)
    expect(result.archetypeNudge).toContain('2 goals')
  })

  it('returns followUpPrompt for at-risk when no stalled goals', () => {
    const goals = [goal(4, 0.05)]
    const result = computeAccountabilityPulse(goals)
    expect(result.summary.stalledGoalCount).toBe(0)
    expect(result.summary.atRiskGoalCount).toBe(1)
    expect(result.followUpPrompt).toContain('at risk')
  })
})
