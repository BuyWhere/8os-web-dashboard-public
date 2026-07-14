/**
 * CapacityMeter — shows scheduled minutes vs. a daily budget, split by energy
 * tier. A horizontal stacked bar conveys how full each energy window is, with a
 * warning state when a tier exceeds its budget.
 */
'use client'

import {
  ENERGY_COLORS,
  ENERGY_LABELS,
  fmtDuration,
  type CapacityMeter as Capacity,
} from '@/types/today'

interface Props {
  capacity: Capacity
}

export function CapacityMeter({ capacity }: Props) {
  const tiers: Array<'green' | 'yellow' | 'red'> = ['green', 'yellow', 'red']
  const totalPct = Math.min(100, Math.round((capacity.totalScheduledMinutes / capacity.totalBudgetMinutes) * 100))
  const over = capacity.totalScheduledMinutes > capacity.totalBudgetMinutes

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--skin-color-text, #221F1A)' }}>
          Today&apos;s load
        </span>
        <span
          style={{
            fontSize: 12,
            color: over ? ENERGY_COLORS.red : 'var(--skin-color-text-muted, var(--color-text-muted))',
            fontWeight: 600,
          }}
        >
          {fmtDuration(capacity.totalScheduledMinutes)} / {fmtDuration(capacity.totalBudgetMinutes)}
        </span>
      </div>

      {/* Overall bar */}
      <div style={{ height: 8, borderRadius: 4, background: 'var(--color-bg-primary)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${totalPct}%`,
            height: '100%',
            background: over ? ENERGY_COLORS.red : ENERGY_COLORS[capacity.currentEnergy],
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Per-tier breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        {tiers.map((tier) => {
          const scheduled = capacity.scheduledMinutesByEnergy[tier] ?? 0
          const budget = capacity.budgetMinutesByEnergy[tier] ?? 1
          const pct = Math.min(100, Math.round((scheduled / budget) * 100))
          const tierOver = scheduled > budget
          return (
            <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, width: 48, color: ENERGY_COLORS[tier] }}>
                {ENERGY_LABELS[tier]}
              </span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--color-bg-primary)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: tierOver ? ENERGY_COLORS.red : ENERGY_COLORS[tier],
                    opacity: 0.8,
                  }}
                />
              </div>
              <span style={{ fontSize: 10, color: 'var(--skin-color-text-muted, var(--color-text-muted))', width: 64, textAlign: 'right' }}>
                {fmtDuration(scheduled)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
