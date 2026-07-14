/**
 * /dashboard/insights — the §4.4 owner metrics "dashboard of record".
 *
 * OWNER-GATED: resolveOwner() decides; non-owners get notFound() (404, no hint
 * the route exists). Renders WAU-aligned, RAR, Passive Coverage, attribution
 * correction rate, ritual completion by cadence, Telegram-linked %, and funnel
 * conversion by step — all computed live from the DB (owner-metrics.ts). Steps
 * that can only come from PostHog are labelled "PostHog-sourced".
 *
 * This is a NEW standalone page: intentionally plain (no skin/theme imports) so
 * it does not touch the concurrent sun-sign skin work. Server component.
 */
import { notFound } from 'next/navigation'
import { resolveOwner } from '@/lib/auth/owner'
import { computeOwnerMetrics } from '@/lib/metrics/owner-metrics'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function pct(x: number | null): string {
  return x === null ? '-' : `${(x * 100).toFixed(1)}%`
}

const wrap: React.CSSProperties = { maxWidth: 960, margin: '0 auto', padding: '40px 24px 80px', color: 'var(--color-border)' }
const card: React.CSSProperties = { background: '#111', border: '1px solid #222', borderRadius: 12, padding: '18px 20px', marginBottom: 16 }
const label: React.CSSProperties = { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#888', margin: '0 0 6px' }
const big: React.CSSProperties = { fontSize: 30, fontWeight: 700, margin: 0 }
const sub: React.CSSProperties = { fontSize: 13, color: '#888', margin: '4px 0 0' }
const th: React.CSSProperties = { textAlign: 'left', fontSize: 12, color: '#888', padding: '6px 8px', borderBottom: '1px solid #222' }
const td: React.CSSProperties = { fontSize: 14, padding: '6px 8px', borderBottom: '1px solid #1a1a1a' }

export default async function OwnerInsightsPage() {
  const owner = await resolveOwner()
  if (!owner.isOwner) notFound()

  const m = await computeOwnerMetrics(7)

  return (
    <main style={wrap}>
      <p style={{ ...label, marginBottom: 4 }}>Owner · Dashboard of Record</p>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 24px' }}>8os Metrics, last {m.windowDays} days</h1>

      {/* Headline metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 8 }}>
        <div style={card}>
          <p style={label}>WAU (aligned)</p>
          <p style={big}>{m.wauAligned}</p>
          <p style={sub}>of {m.totalUsers} total users</p>
        </div>
        <div style={card}>
          <p style={label}>Redirection Acceptance (RAR)</p>
          <p style={big}>{pct(m.rar.rate)}</p>
          <p style={sub}>{m.rar.accepted} accepted / {m.rar.decided} decided</p>
        </div>
        <div style={card}>
          <p style={label}>Passive Coverage</p>
          <p style={big}>{pct(m.passiveCoverage.rate)}</p>
          <p style={sub}>{m.passiveCoverage.passive} passive / {m.passiveCoverage.tracked} tracked min</p>
        </div>
        <div style={card}>
          <p style={label}>Attribution Correction Rate</p>
          <p style={big}>{pct(m.correction.rate)}</p>
          <p style={sub}>{m.correction.overrides} overrides / {m.correction.total} attributions · target &lt;10%</p>
        </div>
        <div style={card}>
          <p style={label}>Telegram-linked</p>
          <p style={big}>{pct(m.telegramLinkedPct.rate)}</p>
          <p style={sub}>{m.telegramLinkedPct.linked} of {m.telegramLinkedPct.total} users</p>
        </div>
      </div>

      {/* Ritual completion by cadence */}
      <div style={card}>
        <p style={label}>Ritual completion by cadence</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
          <thead>
            <tr><th style={th}>Cadence</th><th style={th}>Done</th><th style={th}>Scheduled</th><th style={th}>Rate</th></tr>
          </thead>
          <tbody>
            {m.ritualsByCadence.map((r) => (
              <tr key={r.kind}>
                <td style={td}>{r.kind}</td>
                <td style={td}>{r.done}</td>
                <td style={td}>{r.total}</td>
                <td style={td}>{pct(r.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Funnel conversion by step */}
      <div style={card}>
        <p style={label}>Funnel conversion by step</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
          <thead>
            <tr><th style={th}>Step</th><th style={th}>Count</th><th style={th}>Source</th></tr>
          </thead>
          <tbody>
            {m.funnel.map((f) => (
              <tr key={f.step}>
                <td style={td}>{f.step}</td>
                <td style={td}>{f.count === null ? '-' : f.count}</td>
                <td style={{ ...td, color: f.posthogSourced ? '#c9a227' : '#4FAE6F' }}>
                  {f.posthogSourced ? 'PostHog-sourced' : 'DB'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ ...sub, marginTop: 10 }}>
          Early funnel steps (reveal/birth/quiz/archetype views) are captured in PostHog only; the
          taxonomy events feed a PostHog funnel. DB-derivable steps are computed live here.
        </p>
      </div>
    </main>
  )
}
