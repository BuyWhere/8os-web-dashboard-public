import { groupGoalsByHorizon, normalizeHorizon } from '../horizons'

describe('normalizeHorizon', () => {
  it('keeps a valid horizon', () => {
    expect(normalizeHorizon('quarterly')).toBe('quarterly')
  })
  it('falls back to yearly when missing', () => {
    expect(normalizeHorizon(undefined)).toBe('yearly')
    expect(normalizeHorizon(null)).toBe('yearly')
  })
})

describe('groupGoalsByHorizon', () => {
  const goals = [
    { id: 'q', name: 'Q goal' },
    { id: 'y', name: 'Y goal', horizon: 'yearly' },
  ]

  it('uses the hydrate map so missing Prisma fields still group correctly', () => {
    const map = new Map<string, string>([['q', 'quarterly'], ['y', 'yearly']])
    const grouped = groupGoalsByHorizon(goals, map)
    expect(grouped.get('quarterly')?.map((g) => g.id)).toEqual(['q'])
    expect(grouped.get('yearly')?.map((g) => g.id)).toEqual(['y'])
  })

  it('does not dump quarterly goals into yearly when horizon is omitted on the object', () => {
    const grouped = groupGoalsByHorizon(goals) // no map, no field on q
    expect(grouped.get('yearly')?.map((g) => g.id)).toEqual(['q', 'y'])
    expect(grouped.get('quarterly')).toEqual([])
  })

  it('prefers the hydrate map over a stale object field', () => {
    const stale = [{ id: 'q', horizon: 'yearly' }]
    const map = new Map<string, string>([['q', 'quarterly']])
    const grouped = groupGoalsByHorizon(stale, map)
    expect(grouped.get('quarterly')?.map((g) => g.id)).toEqual(['q'])
    expect(grouped.get('yearly')).toEqual([])
  })
})
