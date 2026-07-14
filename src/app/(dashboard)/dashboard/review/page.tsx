/**
 * /dashboard/review — Weekly Review + Preview ritual
 *
 * The highest-leverage planner habit (PART C of BAZI-PHASES-AND-PLANNER-RESEARCH):
 * a weekly REVIEW of the last 7 days + a PREVIEW of the next 7 framed by the
 * active month pillar (流月) — the "week" planning horizon that inherits the
 * month theme (doc §A.5; explicitly an 8os derivation, NOT a fake pillar).
 *
 * Reuses verified endpoints only:
 *   GET   /api/review   → real review numbers + phase-framed preview (one call;
 *                         itself composed from the same prisma queries as
 *                         /api/dashboard, /api/tasks and the /api/phases engine)
 *   GET   /api/goals    → active goals for the "set this week's focus" picker
 *   PATCH /api/tasks/[id] (via the focus action — reschedules a chosen task into
 *                          the coming week using the existing scheduler)
 *   POST  /api/schedule → place the focus task into the next 7 days
 *   POST  /api/journal  → persist the weekly reflection (kind=weekly_reflection)
 *   GET   /api/journal  → recent past weekly reflections
 *
 * No energy UI. No new scheduling logic.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { QuickAdd } from '@/components/dashboard/QuickAdd'

const DOMAIN_COLORS: Record<string, string> = {
  career: '#6366f1', wealth: '#f59e0b', health: '#22c55e',
  relationships: '#ec4899', learning: '#3b82f6', legacy: '#8b5cf6',
}
const DOMAIN_ICONS: Record<string, string> = {
  career: '💼', wealth: '💰', health: '💪', relationships: '❤️', learning: '📚', legacy: '🌟',
}
const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#6b7280',
}
const VERDICT_COLORS: Record<string, string> = {
  favorable: '#22c55e', unfavorable: '#f59e0b', neutral: '#9ca3af',
}

interface TaskLite { id: string; name: string; domain: string | null; priority: string; status?: string; scheduledAt?: string | null; completedAt?: string | null }
interface GoalDelta { goalId: string; name: string; domain: string; progress: number; completedThisWeek: number; favorableNow: boolean | null; verdict: string | null; tagline: string | null }
interface FavGoal { goalId: string; name: string; domain: string; tagline: string | null }
interface ReviewData {
  asOf: string
  window: { from: string; to: string }
  review: {
    completedCount: number
    plannedCount: number
    completionRate: number | null
    completed: TaskLite[]
    carryOver: TaskLite[]
    carryOverCount: number
    goalDeltas: GoalDelta[]
  }
  reflection: { persisted: boolean; prompt: string }
  preview: {
    available: boolean
    reason?: string
    weekFrame?: string
    monthPillar?: string | null
    monthBasis?: string
    monthVerdict?: string
    monthGuidance?: string
    weekGuidance?: string
    weekBasis?: string
    favorable?: string[]
    unfavorable?: string[]
    favorableGoals?: FavGoal[]
  }
}
interface Goal { id: string; domainId: string; name: string; progress: number }
interface JournalEntryLite { id: string; content: string; kind: string; entryDate: string; createdAt: string }

// Alignment Engine verdict (OS-2542) — weekly headline + per-goal momentum.
interface AlignmentPerGoal {
  goalId: string; name: string; domain: string; rank: number
  share: number; expectedShare: number
  momentum: 'fed' | 'flat' | 'starving'
  inSeason: boolean | null
}
interface AlignmentData {
  headline: string
  topRedirection: string
  unalignedShare: number
  perGoal: AlignmentPerGoal[]
}
const MOMENTUM_META: Record<string, { arrow: string; color: string }> = {
  fed: { arrow: '↑', color: '#22c55e' },
  flat: { arrow: '→', color: '#9ca3af' },
  starving: { arrow: '↓', color: '#f59e0b' },
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ReviewPage() {
  const [data, setData] = useState<ReviewData | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Reflection — persisted to the journal (kind=weekly_reflection)
  const [reflection, setReflection] = useState('')
  const [reflectionSaving, setReflectionSaving] = useState(false)
  const [reflectionMsg, setReflectionMsg] = useState<string | null>(null)
  const [pastReflections, setPastReflections] = useState<JournalEntryLite[]>([])

  // "Set this week's focus" — reschedule a chosen task into the next 7 days.
  const [focusTaskId, setFocusTaskId] = useState('')
  const [focusBusy, setFocusBusy] = useState(false)
  const [focusMsg, setFocusMsg] = useState<string | null>(null)

  // Alignment verdict (OS-2542) — strictly best-effort: any failure leaves it
  // null and the review page renders exactly as before.
  const [alignment, setAlignment] = useState<AlignmentData | null>(null)

  const loadAlignment = useCallback(async () => {
    try {
      const res = await fetch('/api/alignment', { cache: 'no-store', credentials: 'same-origin' })
      if (!res.ok) return
      const a = await res.json()
      if (typeof a?.weekly?.headline === 'string' && Array.isArray(a?.weekly?.perGoal)) {
        setAlignment({
          headline: a.weekly.headline,
          topRedirection: typeof a.weekly.topRedirection === 'string' ? a.weekly.topRedirection : '',
          unalignedShare: typeof a.weekly.unalignedShare === 'number' ? a.weekly.unalignedShare : 0,
          perGoal: a.weekly.perGoal,
        })
      }
    } catch (e) {
      console.error('[review] alignment fetch failed (non-fatal):', e)
    }
  }, [])

  const load = useCallback(async () => {
    try {
      const [rRes, gRes, jRes] = await Promise.all([
        fetch('/api/review', { cache: 'no-store' }),
        fetch('/api/goals?status=active', { cache: 'no-store' }),
        fetch('/api/journal?kind=weekly_reflection&limit=3', { cache: 'no-store' }),
      ])
      const r = await rRes.json()
      setData(r)
      try {
        const j = await jRes.json()
        setPastReflections(Array.isArray(j) ? j : [])
      } catch { setPastReflections([]) }
      const g = await gRes.json()
      setGoals(Array.isArray(g) ? g.map((x: Goal) => ({ id: x.id, domainId: x.domainId, name: x.name, progress: x.progress })) : [])
    } catch (e) {
      console.error('Failed to load weekly review:', e)
      setError('Could not load your weekly review. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(); loadAlignment() }, [load, loadAlignment])

  // Set this week's focus: place a carry-over / backlog task into the coming week
  // via the existing scheduler (searchDays=7), then refresh.
  async function setFocus() {
    if (!focusTaskId || focusBusy) return
    setFocusBusy(true)
    setFocusMsg(null)
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: focusTaskId, searchFrom: new Date().toISOString(), searchDays: 7 }),
      })
      if (res.ok) {
        setFocusMsg('Focus set — placed into the coming week.')
        setFocusTaskId('')
        await load()
      } else {
        const body = await res.json().catch(() => ({}))
        setFocusMsg(typeof body?.error === 'string' ? body.error : 'No free slot found in the next 7 days.')
      }
    } catch (e) {
      console.error('Failed to set focus:', e)
      setFocusMsg('Could not set focus. Try again.')
    } finally {
      setFocusBusy(false)
    }
  }

  // Persist this week's reflection as a JournalEntry (kind=weekly_reflection).
  async function saveReflection() {
    const content = reflection.trim()
    if (!content || reflectionSaving) return
    setReflectionSaving(true)
    setReflectionMsg(null)
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, kind: 'weekly_reflection' }),
      })
      if (res.ok) {
        setReflection('')
        setReflectionMsg('Saved to your journal.')
        // §4.4: `weekly_review_completed` — the user finished + saved the weekly review.
        try { posthog.capture('weekly_review_completed', { length: content.length }) } catch {}
        try {
          const j = await (await fetch('/api/journal?kind=weekly_reflection&limit=3', { cache: 'no-store' })).json()
          setPastReflections(Array.isArray(j) ? j : [])
        } catch { /* list refresh is best-effort */ }
      } else {
        setReflectionMsg('Could not save the reflection. Try again.')
      }
    } catch (e) {
      console.error('Failed to save reflection:', e)
      setReflectionMsg('Could not save the reflection. Try again.')
    } finally {
      setReflectionSaving(false)
    }
  }

  const sidebarGoals = goals.map((g) => ({ id: g.id, domainId: g.domainId, name: g.name, progress: g.progress }))

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
        <Sidebar goals={[]} />
        <main style={{ flex: 1, padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--color-text-muted)' }}>Loading your week…</div>
        </main>
        <QuickAdd />
      </div>
    )
  }

  const rev = data?.review
  const prev = data?.preview
  const rate = rev?.completionRate
  const weekLabel = data ? `${fmtDate(data.window.from)} – ${fmtDate(data.window.to)}` : ''

  // Candidate tasks for "set focus": carry-over tasks (the unfinished ones).
  const focusCandidates = rev?.carryOver ?? []

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Sidebar goals={sidebarGoals} />

      <main style={{ flex: 1, padding: '24px 24px', overflowY: 'auto', maxWidth: '100%', overflowX: 'hidden' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Dashboard</Link>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-serif), Georgia, serif' }}>Weekly Review &amp; Preview</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>
            Look back at the last 7 days · plan the next 7 with your month theme
          </p>
        </div>

        {error && (
          <div style={{ background: '#FBEFE9', border: '1px solid #E3C4B6', borderRadius: 8, color: '#B5502F', padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>

          {/* ─────────────── REVIEW (last 7 days) ─────────────── */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif), Georgia, serif' }}>Review · last 7 days</h2>
              <p style={{ margin: '0 0 16px', color: 'var(--color-text-muted)', fontSize: 12 }}>{weekLabel}</p>

              {/* Completed vs planned */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#4F7A52' }}>{rev?.completedCount ?? 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>completed</div>
                </div>
                <div style={{ flex: 1, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)' }}>{rev?.plannedCount ?? 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>planned</div>
                </div>
                <div style={{ flex: 1, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-accent)' }}>{rate != null ? `${rate}%` : '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>completion</div>
                </div>
              </div>

              {/* Carry-over */}
              <div>
                <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Carry-over <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>({rev?.carryOverCount ?? 0} unfinished)</span>
                </h3>
                {(!rev || rev.carryOver.length === 0) ? (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '8px 0' }}>Nothing carried over — clean week.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {rev.carryOver.slice(0, 12).map((t) => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: PRIORITY_COLORS[t.priority] ?? 'var(--color-text-muted)' }} />
                        <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                        {t.domain && <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{DOMAIN_ICONS[t.domain] ?? ''}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Goal progress deltas */}
            <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Goal progress this week</h3>
              {(!rev || rev.goalDeltas.length === 0) ? (
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No active goals yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {rev.goalDeltas.map((g) => (
                    <div key={g.goalId}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: DOMAIN_COLORS[g.domain] ?? '#666' }} />
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                        <span style={{ fontSize: 11, color: g.completedThisWeek > 0 ? '#4F7A52' : 'var(--color-text-muted)' }}>
                          {g.completedThisWeek > 0 ? `+${g.completedThisWeek} done` : 'no change'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{Math.round(g.progress * 100)}%</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round(g.progress * 100)}%`, height: '100%', background: DOMAIN_COLORS[g.domain] ?? '#666' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alignment (OS-2542): the weekly verdict + per-goal momentum.
                Best-effort — the section is simply absent if the API errors. */}
            {alignment && (
              <div data-testid="review-alignment-section" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Alignment</h3>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.55 }}>{alignment.headline}</p>
                {alignment.topRedirection && (
                  <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--color-accent)', lineHeight: 1.5 }}>↪ {alignment.topRedirection}</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[...alignment.perGoal].sort((a, b) => a.rank - b.rank).map((g) => {
                    const m = MOMENTUM_META[g.momentum] ?? MOMENTUM_META.flat
                    return (
                      <div key={g.goalId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', width: 20, flexShrink: 0 }}>#{g.rank}</span>
                        <span style={{ color: m.color, fontSize: 13, fontWeight: 700, width: 14, flexShrink: 0 }} title={`momentum: ${g.momentum}`}>{m.arrow}</span>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: DOMAIN_COLORS[g.domain] ?? 'var(--color-text-muted)' }} />
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                        {g.inSeason === true && (
                          <span style={{ flexShrink: 0, fontSize: 10, padding: '1px 7px', borderRadius: 10, background: '#EAF1EA', border: '1px solid #4F7A5244', color: '#4F7A52' }}>in season</span>
                        )}
                        <span style={{ fontSize: 11, color: m.color, flexShrink: 0 }}>{g.momentum}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                          {Math.round(g.share * 100)}% / {Math.round(g.expectedShare * 100)}%
                        </span>
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
                    <span style={{ width: 20, flexShrink: 0 }} />
                    <span style={{ width: 14, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-secondary)' }}>Unaligned attention</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(alignment.unalignedShare * 100)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Reflection — saved to the journal (kind=weekly_reflection) */}
            <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Reflection</h3>
              <p style={{ margin: '0 0 10px', color: 'var(--color-text-secondary)', fontSize: 13 }}>{data?.reflection.prompt}</p>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Write your reflection…"
                rows={4}
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)', fontSize: 13, padding: '10px 12px', resize: 'vertical', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={saveReflection}
                  disabled={!reflection.trim() || reflectionSaving}
                  style={{
                    background: 'var(--color-accent)', border: 'none', borderRadius: 8, color: '#FFFFFF',
                    padding: '9px 16px', fontSize: 12, fontWeight: 600,
                    cursor: !reflection.trim() || reflectionSaving ? 'default' : 'pointer',
                    opacity: !reflection.trim() || reflectionSaving ? 0.6 : 1,
                  }}
                >
                  {reflectionSaving ? 'Saving…' : 'Save reflection'}
                </button>
                {reflectionMsg && <span style={{ fontSize: 12, color: 'var(--color-accent)' }}>{reflectionMsg}</span>}
              </div>

              {pastReflections.length > 0 && (
                <div style={{ marginTop: 16, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                    Recent weekly reflections · <Link href="/dashboard/journal" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>open journal →</Link>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {pastReflections.map((r) => (
                      <div key={r.id} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 3 }}>
                          {new Date(r.entryDate).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' })}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                          {r.content.length > 180 ? `${r.content.slice(0, 180)}…` : r.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ─────────────── PREVIEW (next 7 days) ─────────────── */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif), Georgia, serif' }}>Preview · next 7 days</h2>

              {!prev?.available ? (
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{prev?.reason ?? 'Phase preview unavailable.'}</div>
              ) : (
                <>
                  {/* Month-pillar-framed week line */}
                  <div style={{ background: 'linear-gradient(135deg, var(--color-bg-primary) 0%, #FFFFFF 100%)', border: `1px solid ${(VERDICT_COLORS[prev.monthVerdict ?? 'neutral'])}44`, borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: VERDICT_COLORS[prev.monthVerdict ?? 'neutral'] }}>{prev.weekFrame}</span>
                      {prev.monthPillar && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>· month pillar {prev.monthPillar}</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>{prev.monthGuidance}</p>
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{prev.weekGuidance}</p>
                    <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--color-text-muted)' }}>{prev.weekBasis}</p>
                  </div>

                  {/* Favorable elements */}
                  {prev.favorable && prev.favorable.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Favorable elements now: </span>
                      {prev.favorable.map((el) => (
                        <span key={el} style={{ display: 'inline-block', marginRight: 6, padding: '2px 8px', borderRadius: 12, background: '#EAF1EA', border: '1px solid #4F7A5244', color: '#4F7A52', fontSize: 11 }}>{el}</span>
                      ))}
                    </div>
                  )}

                  {/* Goals in favorable domains */}
                  <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Goals favored this week</h3>
                  {(prev.favorableGoals && prev.favorableGoals.length > 0) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {prev.favorableGoals.map((g) => (
                        <div key={g.goalId} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: DOMAIN_COLORS[g.domain] ?? 'var(--color-text-muted)' }} />
                            <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 600 }}>{g.name}</span>
                          </div>
                          {g.tagline && <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>{g.tagline}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                      No active goals sit in a currently-favorable domain. Use a steady-effort goal as this week's focus.
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Set this week's focus */}
            <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Set this week&apos;s focus</h3>
              <p style={{ margin: '0 0 12px', color: 'var(--color-text-secondary)', fontSize: 12 }}>
                Pick a carry-over task to schedule into the coming week.
              </p>
              {focusCandidates.length === 0 ? (
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No carry-over tasks to focus — you&apos;re clear. Add one with ⌘K.</div>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <select
                    value={focusTaskId}
                    onChange={(e) => setFocusTaskId(e.target.value)}
                    style={{ flex: 1, minWidth: 180, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)', fontSize: 13, padding: '9px 12px' }}
                  >
                    <option value="">Choose a task…</option>
                    {focusCandidates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={setFocus}
                    disabled={!focusTaskId || focusBusy}
                    style={{ background: 'var(--color-accent)', border: 'none', borderRadius: 8, color: '#FFFFFF', padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: !focusTaskId || focusBusy ? 'default' : 'pointer', opacity: !focusTaskId || focusBusy ? 0.6 : 1 }}
                  >
                    {focusBusy ? '…' : '✦ Set focus'}
                  </button>
                </div>
              )}
              {focusMsg && <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--color-accent)' }}>{focusMsg}</p>}
            </div>
          </section>
        </div>
      </main>

      <QuickAdd />
    </div>
  )
}
