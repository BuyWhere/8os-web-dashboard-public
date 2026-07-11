/**
 * EnergyTimeline — 24-hour bar of the user's archetype energy hourMap.
 * Each hour is a vertical bar colored green/yellow/red; the current hour is
 * highlighted. Tasks can be overlaid as dots at their scheduled hour.
 */
'use client'

import { ENERGY_COLORS, type EnergyLevel, type TodayTask } from '@/types/today'

interface Props {
  hourMap: Record<number, EnergyLevel>
  currentHour: number
  tasks?: TodayTask[]
}

export function EnergyTimeline({ hourMap, currentHour, tasks = [] }: Props) {
  const hours = Array.from({ length: 24 }, (_, h) => h)
  // Group task start hours for dot overlay
  const tasksByHour = new Map<number, number>()
  for (const t of tasks) {
    if (!t.scheduledAt) continue
    const h = new Date(t.scheduledAt).getHours()
    tasksByHour.set(h, (tasksByHour.get(h) ?? 0) + 1)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 64 }}>
        {hours.map((h) => {
          const level = hourMap[h] ?? 'red'
          const isNow = h === currentHour
          const count = tasksByHour.get(h) ?? 0
          return (
            <div
              key={h}
              title={`${h}:00 · ${level}${count ? ` · ${count} task${count > 1 ? 's' : ''}` : ''}`}
              style={{
                flex: 1,
                minWidth: 0,
                height: level === 'green' ? '100%' : level === 'yellow' ? '66%' : '38%',
                background: ENERGY_COLORS[level],
                opacity: isNow ? 1 : 0.45,
                borderRadius: '2px 2px 0 0',
                position: 'relative',
                outline: isNow ? '1px solid #fff' : 'none',
                outlineOffset: '1px',
              }}
            >
              {count > 0 ? (
                <span
                  style={{
                    position: 'absolute',
                    top: -8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: '#fff',
                  }}
                />
              ) : null}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--skin-color-text-muted, #666)' }}>
        <span>12a</span>
        <span>6a</span>
        <span>12p</span>
        <span>6p</span>
        <span>12a</span>
      </div>
    </div>
  )
}
