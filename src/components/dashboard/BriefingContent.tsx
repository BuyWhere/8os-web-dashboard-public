'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DashboardPageStyles, ErrorCard, LoadingMessage, SectionCard, SkeletonBlock } from './page-state'

interface BriefingPayload {
  todayDate: string
  archetype: {
    archetypeId: string
    archetypeName: string
  } | null
  insight: {
    content: string
    date: string
    isFallback: boolean
  }
  todayTasks: Array<{
    id: string
    name: string
    priority: string
    status: string
    scheduledAt: string | null
    duration: number | null
  }>
  upcomingEvents: Array<{
    id: string
    title: string
    startAt: string
    color: string | null
  }>
  goals: Array<{
    id: string
    name: string
    progress: number
  }>
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: BriefingPayload }

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
}

function getArchetypeIcon(archetypeId?: string) {
  if (archetypeId === 'pioneer') return '🌱'
  if (archetypeId === 'sage') return '🌊'
  if (archetypeId === 'catalyst') return '🔥'
  if (archetypeId === 'architect') return '⚙️'
  return '✨'
}

export function BriefingSkeleton({ showSlowMessage }: { showSlowMessage: boolean }) {
  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 800 }}>
      <LoadingMessage>
        {showSlowMessage ? 'Generating your briefing...' : 'Loading your briefing...'}
      </LoadingMessage>

      <SectionCard accent="#E7DFD2">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <SkeletonBlock width={24} height={24} radius={999} />
          <div>
            <SkeletonBlock width={132} height={14} style={{ marginBottom: 6 }} />
            <SkeletonBlock width={168} height={11} />
          </div>
        </div>
        <SkeletonBlock width="96%" height={14} style={{ marginBottom: 10 }} />
        <SkeletonBlock width="92%" height={14} style={{ marginBottom: 10 }} />
        <SkeletonBlock width="84%" height={14} />
      </SectionCard>

      <SectionCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <SkeletonBlock width={112} height={16} />
          <SkeletonBlock width={80} height={12} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: '#F7F3EC', border: '1px solid #E7DFD2' }}>
              <SkeletonBlock width={8} height={8} radius={999} />
              <div style={{ flex: 1 }}>
                <SkeletonBlock width="52%" height={13} style={{ marginBottom: 6 }} />
                <SkeletonBlock width="28%" height={11} />
              </div>
              <SkeletonBlock width={56} height={20} radius={999} />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

export function BriefingContent() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [requestKey, setRequestKey] = useState(0)
  const [showSlowMessage, setShowSlowMessage] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const slowTimer = window.setTimeout(() => setShowSlowMessage(true), 2000)

    async function load() {
      setState({ status: 'loading' })
      setShowSlowMessage(false)

      try {
        const response = await fetch('/api/dashboard/briefing', {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          setState({
            status: 'error',
            message: payload?.error ?? 'We could not generate your briefing right now.',
          })
          return
        }

        const data = (await response.json()) as BriefingPayload
        setState({ status: 'ready', data })
      } catch (error) {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Network request failed.',
        })
      } finally {
        window.clearTimeout(slowTimer)
      }
    }

    void load()

    return () => {
      controller.abort()
      window.clearTimeout(slowTimer)
    }
  }, [requestKey])

  // Before the client fetch resolves, render a stable placeholder rather than
  // `new Date()` — a fresh Date formatted without a fixed timeZone diverges
  // between the SSR render (server zone) and hydration (browser zone), which
  // is a classic React hydration mismatch (#418/#425). The real, server-
  // computed `todayDate` string arrives with the payload and is deterministic.
  const todayDate = useMemo(() => {
    if (state.status === 'ready') return state.data.todayDate
    return 'Today'
  }, [state])

  if (state.status === 'loading') {
    return (
      <>
        <DashboardPageStyles />
        <div style={{ marginBottom: 28 }}>
          <Link href="/dashboard" style={{ color: '#8A8175', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Dashboard</Link>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Daily Briefing</h1>
          <p style={{ margin: '4px 0 0', color: '#8A8175', fontSize: 14 }}>{todayDate}</p>
        </div>
        <BriefingSkeleton showSlowMessage={showSlowMessage} />
      </>
    )
  }

  if (state.status === 'error') {
    return (
      <>
        <DashboardPageStyles />
        <div style={{ marginBottom: 28 }}>
          <Link href="/dashboard" style={{ color: '#8A8175', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Dashboard</Link>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Daily Briefing</h1>
          <p style={{ margin: '4px 0 0', color: '#8A8175', fontSize: 14 }}>{todayDate}</p>
        </div>
        <ErrorCard
          title="Could not load your daily briefing"
          message={state.message}
          actionLabel="Try again"
          onAction={() => setRequestKey((value) => value + 1)}
        />
      </>
    )
  }

  const { data } = state

  return (
    <>
      <DashboardPageStyles />
      <div style={{ marginBottom: 28 }}>
        <Link href="/dashboard" style={{ color: '#8A8175', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Dashboard</Link>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Daily Briefing</h1>
        <p style={{ margin: '4px 0 0', color: '#8A8175', fontSize: 14 }}>{data.todayDate}</p>
      </div>

      <div style={{ display: 'grid', gap: 20, maxWidth: 800 }}>
        <SectionCard accent="#B08637">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 20 }}>{getArchetypeIcon(data.archetype?.archetypeId)}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Today&apos;s Insight</div>
              <div style={{ color: '#8A8175', fontSize: 11 }}>
                {data.archetype?.archetypeName ?? 'Personalized'} · {data.insight.date}
              </div>
            </div>
          </div>
          <p style={{ color: '#221F1A', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            {data.insight.content}
          </p>
        </SectionCard>

        <SectionCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Today&apos;s Tasks</h2>
            <span style={{ color: '#8A8175', fontSize: 12 }}>{data.todayTasks.length} scheduled</span>
          </div>
          {data.todayTasks.length === 0 ? (
            <div style={{ color: '#8A8175', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
              No tasks scheduled for today.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.todayTasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#F7F3EC',
                    border: '1px solid #E7DFD2',
                    opacity: task.status === 'done' ? 0.5 : 1,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: PRIORITY_COLORS[task.priority] ?? '#8A8175',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: task.status === 'done' ? '#8A8175' : '#221F1A',
                        textDecoration: task.status === 'done' ? 'line-through' : 'none',
                      }}
                    >
                      {task.name}
                    </div>
                    {task.scheduledAt && (
                      <div style={{ fontSize: 11, color: '#8A8175', marginTop: 1 }}>
                        {new Date(task.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        {task.duration ? ` · ${task.duration}m` : ''}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      padding: '2px 7px',
                      borderRadius: 4,
                      fontSize: 10,
                      background: task.status === 'done' ? '#F7F3EC' : '#F7F3EC',
                      color: task.status === 'done' ? '#8A8175' : '#6B6257',
                    }}
                  >
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {data.upcomingEvents.length > 0 && (
          <SectionCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Upcoming Events</h2>
              <Link href="/calendar" style={{ color: '#B08637', fontSize: 12, textDecoration: 'none' }}>Calendar →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#F7F3EC',
                    border: '1px solid #E7DFD2',
                  }}
                >
                  <div style={{ width: 3, height: 32, borderRadius: 2, background: event.color ?? '#B08637', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, color: '#221F1A' }}>{event.title}</div>
                    <div style={{ fontSize: 11, color: '#8A8175', marginTop: 1 }}>
                      {new Date(event.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {data.goals.length > 0 && (
          <SectionCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Active Goals</h2>
              <Link href="/goals" style={{ color: '#B08637', fontSize: 12, textDecoration: 'none' }}>View all →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.goals.map((goal) => (
                <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#221F1A', marginBottom: 4 }}>{goal.name}</div>
                    <div style={{ height: 4, background: '#E7DFD2', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${goal.progress * 100}%`, background: '#B08637', borderRadius: 2 }} />
                    </div>
                  </div>
                  <span style={{ color: '#8A8175', fontSize: 12, flexShrink: 0 }}>{Math.round(goal.progress * 100)}%</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </>
  )
}
