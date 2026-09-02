'use client'

/**
 * /dashboard/path — the Path view: decade → year → month → week → day guidance
 * from the user's own chart, rendered with HONEST per-layer confidence.
 *
 * Data: GET /api/phases (existing, authed, userId-scoped) — the 5 PhaseLayers
 * (verdict + confidence + one-line guidance), the active Luck Pillar, favorable
 * elements, and per-goal Ten-Gods taglines. This page is presentation only;
 * every claim on screen comes from the engine (src/lib/bazi-phases.ts).
 *
 * Positioning note (product): timing + energy-allocation guidance only. No
 * health/medical framing anywhere on this surface.
 */

import { useEffect, useState } from 'react'

const BG = '#F7F3EC'
const CARD = '#FFFFFF'
const INK = '#221F1A'
const MUTED = '#6B6257'
const GOLD = '#B08637'
const BORDER = '#E7DFD2'

interface PhaseLayer {
  key: 'decade' | 'year' | 'month' | 'week' | 'day'
  label: string
  basis: string
  pillar: string | null
  verdict: string
  confidence: 'high' | 'medium' | 'low' | 'derived'
  guidance: string
  focus?: { god: string; theme: string }
}

interface GoalTagline {
  goalId: string
  name: string
  domain: string
  tenGod: string
  verdict: string
  tagline: string
}

interface UpcomingMonth {
  termEn: string
  termName: string
  pillar: string
  startDate: string
  endDate: string | null
  current: boolean
  verdict: string
  focus?: { god: string; theme: string }
  note?: string | null
}

interface PhasesResponse {
  asOf: string
  dayMaster: string
  dayElement: string
  strength: string
  favorable: string[]
  unfavorable: string[]
  favorableBasis: string
  luckPillar: {
    pillar: string | null
    activeHalf?: 'stem' | 'branch'
    yearsRemaining?: number
    startAge?: { years: number; months: number }
  }
  layers: PhaseLayer[]
  upcomingMonths?: UpcomingMonth[]
  goalTaglines: GoalTagline[]
}

function fmtRange(start: string, end: string | null): string {
  const f = (iso: string) => {
    const d = new Date(iso + 'T00:00:00Z')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  }
  return end ? `${f(start)} – ${f(end)}` : `from ${f(start)}`
}

const CONFIDENCE_COPY: Record<PhaseLayer['confidence'], string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Soft tint',
  derived: 'Planning horizon',
}

const VERDICT_STYLE: Record<string, { bg: string; fg: string; word: string }> = {
  favorable: { bg: '#EAF3EA', fg: '#2F6B3A', word: 'Push' },
  supportive: { bg: '#EAF3EA', fg: '#2F6B3A', word: 'Push' },
  mixed: { bg: '#F6EFDD', fg: '#8A6D1F', word: 'Steady' },
  neutral: { bg: '#F1EDE6', fg: MUTED, word: 'Steady' },
  unfavorable: { bg: '#F7E9E6', fg: '#9A4A38', word: 'Consolidate' },
  challenging: { bg: '#F7E9E6', fg: '#9A4A38', word: 'Consolidate' },
}

function verdictChip(verdict: string) {
  const v = VERDICT_STYLE[verdict?.toLowerCase?.()] ?? VERDICT_STYLE.neutral
  return (
    <span style={{
      background: v.bg, color: v.fg, borderRadius: 999, padding: '2px 10px',
      fontSize: 11.5, fontWeight: 600, letterSpacing: 0.2, whiteSpace: 'nowrap',
    }}>
      {v.word}
    </span>
  )
}

export default function PathPage() {
  const [data, setData] = useState<PhasesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/phases')
      .then(async (r) => {
        if (r.status === 404) throw new Error('onboarding')
        if (!r.ok) throw new Error('failed')
        return r.json()
      })
      .then((j) => { if (!cancelled) { setData(j); setLoading(false) } })
      .catch((e) => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  const wrap: React.CSSProperties = {
    minHeight: '100vh', background: BG, color: INK,
    padding: '2rem 1.25rem 4rem', maxWidth: 780, margin: '0 auto',
  }

  if (loading) {
    return <main style={wrap}><p style={{ color: MUTED }}>Reading your chart…</p></main>
  }
  if (error === 'onboarding') {
    return (
      <main style={wrap}>
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>Your Path</h1>
        <p style={{ color: MUTED, lineHeight: 1.5 }}>
          Complete onboarding with your birth details to unlock decade, year and
          month guidance from your own chart.
        </p>
        <a href="/onboarding" style={{ color: GOLD, fontWeight: 600 }}>Finish onboarding →</a>
      </main>
    )
  }
  if (error || !data) {
    return <main style={wrap}><p style={{ color: MUTED }}>Couldn’t load your path right now — please refresh.</p></main>
  }

  const order: PhaseLayer['key'][] = ['decade', 'year', 'month', 'week', 'day']
  const layers = order
    .map((k) => data.layers.find((l) => l.key === k))
    .filter((l): l is PhaseLayer => Boolean(l))

  return (
    <main style={wrap}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, marginBottom: 6 }}>Your Path</h1>
        <p style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
          {data.dayMaster} day master · {data.strength} · favors{' '}
          {data.favorable.join(', ') || '—'}. Long horizons are the strong
          signal here; the day is only a tint.
        </p>
      </header>

      <section aria-label="Phases" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {layers.map((l) => (
          <article key={l.key} style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
            padding: '14px 16px',
            opacity: l.key === 'day' ? 0.85 : 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 15.5, margin: 0 }}>{l.label}</h2>
              {l.pillar && <span style={{ color: GOLD, fontWeight: 600, fontSize: 14 }}>{l.pillar}</span>}
              {verdictChip(l.verdict)}
              {l.focus && (
                <span style={{ fontSize: 11, fontWeight: 600, color: GOLD, border: `1px solid ${GOLD}55`, borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap' }}>
                  {l.focus.theme}
                </span>
              )}
              <span style={{ marginLeft: 'auto', color: MUTED, fontSize: 11.5 }}>
                {CONFIDENCE_COPY[l.confidence]}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>{l.guidance}</p>
            {l.key === 'decade' && data.luckPillar.pillar && (
              <p style={{ margin: '6px 0 0', color: MUTED, fontSize: 12.5 }}>
                Active pillar {data.luckPillar.pillar}
                {data.luckPillar.activeHalf ? `, ${data.luckPillar.activeHalf === 'stem' ? 'first' : 'second'} half` : ''}
                {typeof data.luckPillar.yearsRemaining === 'number' ? ` · ~${data.luckPillar.yearsRemaining} yrs remaining` : ''}
              </p>
            )}
            <p style={{ margin: '6px 0 0', color: MUTED, fontSize: 11.5 }}>{l.basis}</p>
          </article>
        ))}
      </section>

      {(data.upcomingMonths?.length ?? 0) > 0 && (
        <section aria-label="The months ahead" style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 17, marginBottom: 4 }}>The months ahead</h2>
          <p style={{ color: MUTED, fontSize: 12, margin: '0 0 10px' }}>
            Solar-month windows (流月) scored against your favorable elements — medium confidence.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.upcomingMonths!.map((m) => (
              <div key={m.startDate} style={{
                background: CARD, borderRadius: 10, padding: '9px 14px',
                border: m.current ? `1.5px solid ${GOLD}` : `1px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 110 }}>
                  {fmtRange(m.startDate, m.endDate)}
                </span>
                <span style={{ color: GOLD, fontSize: 13 }}>{m.pillar}</span>
                <span style={{ color: MUTED, fontSize: 12 }}>{m.termEn}</span>
                {m.current && (
                  <span style={{ color: MUTED, fontSize: 11, fontStyle: 'italic' }}>now</span>
                )}
                {m.focus && <span style={{ color: MUTED, fontSize: 11.5 }}>{m.focus.theme}</span>}
                <span style={{ marginLeft: 'auto' }}>{verdictChip(m.verdict)}</span>
                {m.note && (
                  <span style={{ flexBasis: '100%', color: MUTED, fontSize: 11.5, fontStyle: 'italic' }}>{m.note}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.goalTaglines.length > 0 && (
        <section aria-label="Goals against your path" style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 17, marginBottom: 4 }}>Your goals against this path</h2>
          {(() => {
            const monthGod = data.layers.find((l) => l.key === 'month')?.focus?.god
            const inSeason = monthGod ? data.goalTaglines.filter((g) => g.tenGod === monthGod).length : 0
            const theme = data.layers.find((l) => l.key === 'month')?.focus?.theme
            return monthGod ? (
              <p style={{ color: MUTED, fontSize: 12.5, margin: '0 0 10px' }}>
                {inSeason > 0
                  ? `This month's window favors ${theme} — your ${inSeason} matching goal${inSeason === 1 ? ' is' : 's are'} listed first.`
                  : `This month's window favors ${theme} — none of your current goals sit in that lane, so treat it as a supporting theme.`}
              </p>
            ) : null
          })()}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...data.goalTaglines]
              .sort((a, b) => {
                const monthGod = data.layers.find((l) => l.key === 'month')?.focus?.god
                return Number(b.tenGod === monthGod) - Number(a.tenGod === monthGod)
              })
              .map((g) => (
              <div key={g.goalId} style={{
                background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              }}>
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{g.name}</span>
                {verdictChip(g.verdict)}
                {g.tenGod === data.layers.find((l) => l.key === 'month')?.focus?.god && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: GOLD, border: `1px solid ${GOLD}66`, borderRadius: 999, padding: '1px 8px', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                    In season
                  </span>
                )}
                <span style={{ color: MUTED, fontSize: 12.5, flexBasis: '100%' }}>{g.tagline}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p style={{ marginTop: 28, color: MUTED, fontSize: 11.5, lineHeight: 1.5 }}>
        Orientation, not prediction. Timing and energy-allocation guidance from
        your chart — decade and year carry the most weight; use the day layer as
        a light tint only.
      </p>
    </main>
  )
}
