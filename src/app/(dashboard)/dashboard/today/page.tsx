/**
 * /dashboard/today — Today / Plan My Day (OS-2109)
 *
 * The operable morning screen. Consumes GET /api/dashboard/today for the full
 * energy-matched view (today's tasks ordered by energy, capacity meter, energy
 * timeline, current-energy-matched vs. deferred inbox) and renders reusable
 * components: TaskCard, EnergyTimeline, CapacityMeter, InboxList, QuickCapture.
 *
 * Mutations:
 *   POST /api/tasks/quick-capture (QuickCapture)
 *   POST /api/tasks/[id]/{snooze,reschedule} (TaskCard)
 *   POST /api/schedule (InboxList → Plan)
 *   PATCH /api/tasks/[id] (TaskCard → complete)
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { TaskCard } from '@/components/dashboard/TaskCard'
import { EnergyTimeline } from '@/components/dashboard/EnergyTimeline'
import { CapacityMeter } from '@/components/dashboard/CapacityMeter'
import { InboxList } from '@/components/dashboard/InboxList'
import { QuickCapture } from '@/components/dashboard/QuickCapture'
import { pageMainStyle, pageShellStyle } from '@/components/dashboard/page-style'
import { ENERGY_COLORS, ENERGY_LABELS, type TodayView } from '@/types/today'

const cardStyle: React.CSSProperties = {
  background: 'var(--skin-card-bg, #0d0d0d)',
  border: '1px solid var(--skin-color-border, #1a1a1a)',
  borderRadius: 'var(--skin-radius-card, 12px)',
  padding: 20,
}

export default function TodayPage() {
  const [data, setData] = useState<TodayView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/today', { cache: 'no-store' })
      if (!res.ok) throw new Error('Request failed')
      const json: TodayView = await res.json()
      setData(json)
    } catch {
      setError('Could not load your day. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div style={pageShellStyle}>
      <Sidebar />
      <main style={{ ...pageMainStyle, display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 80 }}>
        {error ? (
          <div style={{ ...cardStyle, color: ENERGY_COLORS.red, fontSize: 13 }}>{error}</div>
        ) : null}

        {loading ? (
          <div style={{ ...cardStyle, color: 'var(--skin-color-text-muted, #666)', fontSize: 13 }}>
            Loading your day…
          </div>
        ) : null}

        {data ? (
          <>
            {/* Header: date + current energy */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 'var(--skin-typo-heading-weight, 700)', color: 'var(--skin-color-text, var(--color-border))' }}>
                  Today
                </h1>
                <div style={{ fontSize: 12, color: 'var(--skin-color-text-muted, #888)', marginTop: 4 }}>
                  {data.todayDate}
                </div>
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: `${ENERGY_COLORS[data.currentEnergy]}1a`,
                  color: ENERGY_COLORS[data.currentEnergy],
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: ENERGY_COLORS[data.currentEnergy] }} />
                {data.currentHour}:00 · {ENERGY_LABELS[data.currentEnergy]} window
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 20, alignItems: 'start' }}>
              {/* Left column: today's tasks */}
              <section style={cardStyle}>
                <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--skin-color-text, var(--color-border))' }}>
                  Scheduled today
                </h2>
                {data.todayTasks.length === 0 ? (
                  <div style={{ color: 'var(--skin-color-text-muted, #666)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                    Nothing scheduled yet. Capture or plan a task below.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.todayTasks.map((t) => (
                      <TaskCard key={t.id} task={t} onChanged={load} />
                    ))}
                  </div>
                )}
              </section>

              {/* Right column: energy + capacity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <section style={cardStyle}>
                  <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--skin-color-text, var(--color-border))' }}>
                    Energy timeline
                  </h2>
                  <EnergyTimeline hourMap={data.hourMap} currentHour={data.currentHour} tasks={data.todayTasks} />
                </section>
                <section style={cardStyle}>
                  <CapacityMeter capacity={data.capacity} />
                </section>
              </div>
            </div>

            {/* Inbox — matched vs deferred */}
            <section style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--skin-color-text, var(--color-border))' }}>
                  Inbox
                </h2>
                <span style={{ fontSize: 11, color: 'var(--skin-color-text-muted, #888)' }}>
                  {data.inbox.matchedToCurrentEnergy.length} ready now · {data.inbox.deferredLowEnergy.length} deferred
                </span>
              </div>

              {data.inbox.matchedToCurrentEnergy.length > 0 ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: ENERGY_COLORS[data.currentEnergy], marginBottom: 8 }}>
                    Ready for your {ENERGY_LABELS[data.currentEnergy].toLowerCase()} window
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {data.inbox.matchedToCurrentEnergy.map((t) => (
                      <TaskCard key={t.id} task={{ ...t, scheduledAt: null }} onChanged={load} />
                    ))}
                  </div>
                </div>
              ) : null}

              {data.inbox.deferredLowEnergy.length > 0 ? (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: ENERGY_COLORS.red, marginBottom: 8 }}>
                    Needs higher energy
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: 0.7 }}>
                    {data.inbox.deferredLowEnergy.map((t) => (
                      <TaskCard key={t.id} task={{ ...t, scheduledAt: null }} compact onChanged={load} />
                    ))}
                  </div>
                </div>
              ) : null}

              {data.inbox.matchedToCurrentEnergy.length === 0 && data.inbox.deferredLowEnergy.length === 0 ? (
                <div style={{ color: 'var(--skin-color-text-muted, #666)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                  Inbox zero. Capture a task to get started.
                </div>
              ) : null}
            </section>
          </>
        ) : null}

        {/* Sticky quick-capture bar */}
        <div style={{ position: 'sticky', bottom: 0 }}>
          <QuickCapture onCaptured={load} />
        </div>
      </main>
    </div>
  )
}
