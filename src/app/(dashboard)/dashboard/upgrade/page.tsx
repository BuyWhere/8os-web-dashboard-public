/**
 * /dashboard/upgrade — authed upgrade page.
 *
 * Shows Free / Pro ($18/mo, $119/yr) / Full BaZi Life Report ($59) and POSTs to
 * /api/stripe/checkout to start a Stripe Checkout Session. Archetype-skinned via
 * the same CSS custom properties the rest of the dashboard uses. Soft-sell only —
 * no feature is hard-gated yet.
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'

type PlanKey = 'pro_monthly' | 'pro_yearly' | 'life_report'

function useCheckout() {
  const [loading, setLoading] = useState<PlanKey | null>(null)
  const [error, setError] = useState<string | null>(null)
  async function go(plan: PlanKey) {
    setLoading(plan)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Unable to start checkout. Please try again.')
        setLoading(null)
        return
      }
      window.location.href = data.url as string
    } catch {
      setError('Network error. Please try again.')
      setLoading(null)
    }
  }
  return { loading, error, go }
}

const card: React.CSSProperties = {
  border: '1px solid var(--skin-color-border, var(--color-border))',
  borderRadius: 16,
  padding: '28px 24px',
  background: 'var(--skin-color-surface, #FFFFFF)',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
}

const primaryBtn: React.CSSProperties = {
  padding: '12px 16px',
  borderRadius: 10,
  border: 'none',
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
  background: 'var(--skin-color-accent, var(--color-accent))',
  color: '#fff',
}

const ghostBtn: React.CSSProperties = {
  ...primaryBtn,
  background: 'transparent',
  color: 'var(--skin-color-accent, var(--color-accent))',
  border: '1px solid var(--skin-color-accent, var(--color-accent))',
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14, color: 'var(--color-text-secondary)', listStyle: 'none' }}>
      <span style={{ color: '#4F7A52', fontWeight: 700 }}>✓</span>
      <span>{children}</span>
    </li>
  )
}

export default function UpgradePage() {
  const { loading, error, go } = useCheckout()
  const [yearly, setYearly] = useState(false)

  // §4.4: `upgrade_viewed` — top of the monetization funnel (authed upgrade page).
  useEffect(() => {
    try { posthog.capture('upgrade_viewed', { surface: 'dashboard_upgrade' }) } catch {}
  }, [])

  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 24px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <p style={{ letterSpacing: 2, textTransform: 'uppercase', fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
          Upgrade
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '8px 0 6px', fontFamily: 'var(--font-serif), Georgia, serif' }}>Unlock your full Live OS</h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          Start free. Go Pro when your goals need the full engine, or get your one-time deep report.
        </p>
      </div>

      {/* Monthly / yearly toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
        <button
          onClick={() => setYearly(false)}
          style={{ ...(!yearly ? primaryBtn : ghostBtn), padding: '8px 16px', fontSize: 13 }}
        >
          Monthly
        </button>
        <button
          onClick={() => setYearly(true)}
          style={{ ...(yearly ? primaryBtn : ghostBtn), padding: '8px 16px', fontSize: 13 }}
        >
          Yearly · save 38%
        </button>
      </div>

      {error && (
        <p style={{ textAlign: 'center', color: '#B5502F', marginBottom: 16 }}>{error}</p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
        }}
      >
        {/* Free */}
        <div style={card}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Free</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>The gateway</p>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800 }}>
            $0<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--color-text-secondary)' }}> /forever</span>
          </div>
          <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <Check>Your archetype &amp; birth chart</Check>
            <Check>Basic task &amp; calendar tools</Check>
            <Check>Community access</Check>
          </ul>
          <Link href="/dashboard" style={{ ...ghostBtn, textAlign: 'center', textDecoration: 'none' }}>
            Current plan
          </Link>
        </div>

        {/* Pro */}
        <div style={{ ...card, borderColor: 'var(--skin-color-accent, var(--color-accent))', boxShadow: '0 0 0 1px var(--skin-color-accent, var(--color-accent))' }}>
          <div>
            <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#fff', background: 'var(--skin-color-accent, var(--color-accent))', borderRadius: 999, padding: '2px 10px', marginBottom: 8 }}>
              Most popular
            </div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Pro</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>The full live OS</p>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800 }}>
            {yearly ? '$119' : '$18'}
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--color-text-secondary)' }}> {yearly ? '/year' : '/month'}</span>
          </div>
          <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <Check>AI journaling &amp; reflection</Check>
            <Check>Goal therapy &amp; alignment engine</Check>
            <Check>Advanced timing recommendations</Check>
            <Check>Monthly personalized report</Check>
            <Check>Priority support</Check>
          </ul>
          <button
            onClick={() => go(yearly ? 'pro_yearly' : 'pro_monthly')}
            disabled={loading !== null}
            style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading === 'pro_monthly' || loading === 'pro_yearly' ? 'Redirecting…' : 'Upgrade to Pro'}
          </button>
        </div>

        {/* Life Report */}
        <div style={card}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Full BaZi Life Report</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>One-time deep dive</p>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800 }}>
            $59<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--color-text-secondary)' }}> once</span>
          </div>
          <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <Check>Complete BaZi natal analysis</Check>
            <Check>Luck-pillar life timeline</Check>
            <Check>Element balance &amp; strategy</Check>
            <Check>Downloadable PDF report</Check>
          </ul>
          <button
            onClick={() => go('life_report')}
            disabled={loading !== null}
            style={{ ...ghostBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading === 'life_report' ? 'Redirecting…' : 'Get the report'}
          </button>
        </div>
      </div>

      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12, marginTop: 28 }}>
        Secure checkout by Stripe. Cancel anytime.
      </p>
    </main>
  )
}
