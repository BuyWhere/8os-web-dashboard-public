/**
 * /dashboard/annual — the Phase-E Annual (Lì Chūn) surface (backlog §3.4 / §6).
 *
 * The Lì Chūn playbook is delivered proactively at the year-turn; this is its
 * interactive home: the year-pillar reading, last year's story, and the Life
 * Report preview (first 2 pages) + $59 upsell. It reuses the existing Stripe
 * one-time Life Report checkout (POST /api/stripe/checkout { plan:'life_report' }).
 * NEW page. Auth: /dashboard(.*) is Clerk-middleware-protected.
 */
'use client'

import { useEffect, useState } from 'react'

interface Preview {
  pages: Array<{ page: number; title: string; body: string }>
  fullReportPriceUsd: number
  offered: boolean
  yearPillar: string | null
}

const card: React.CSSProperties = {
  maxWidth: 680, background: 'var(--color-bg-primary)', border: '1px solid #1a1a1a', borderRadius: 12, padding: 22, marginBottom: 16,
}
const btn: React.CSSProperties = {
  background: '#d4a000', color: 'var(--color-bg-primary)', border: 'none', borderRadius: 8,
  padding: '11px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
}

export default function AnnualPage() {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/inbox?playbook=annual')
        if (res.ok) {
          const rows = await res.json().catch(() => [])
          const latest = Array.isArray(rows) ? rows.find((r) => r?.meta?.lifeReportPreview) : null
          const m = latest?.meta
          if (m?.lifeReportPreview) {
            setPreview({
              pages: m.lifeReportPreview.pages,
              fullReportPriceUsd: m.lifeReportPreview.fullReportPriceUsd,
              offered: !!m.lifeReportOffered,
              yearPillar: m.yearPillar ?? null,
            })
          }
        }
      } catch { /* best-effort */ }
    })()
  }, [])

  const buy = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'life_report' }),
      })
      const { url } = await res.json().catch(() => ({ url: null }))
      if (url) window.location.href = url
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#000' }}>
      <main style={{ flex: 1, padding: '32px 40px', color: '#e5e5e5' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Lì Chūn, your year ahead</h1>
        <p style={{ color: '#71717a', fontSize: 14, marginBottom: 24 }}>
          The solar new year is the moment to read the year ahead and reset your goals.
          {preview?.yearPillar ? ` This year reads through ${preview.yearPillar}.` : ''}
        </p>

        {preview?.pages?.map((p) => (
          <div key={p.page} style={card}>
            <div style={{ fontSize: 12, color: '#71717a', marginBottom: 6 }}>Page {p.page}</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>{p.title}</div>
            <div style={{ color: '#d4d4d8', fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{p.body}</div>
          </div>
        ))}

        {preview?.offered && (
          <div style={{ ...card, borderColor: '#d4a000' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              Your full Life Report, ${preview.fullReportPriceUsd}
            </div>
            <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 14 }}>
              All four pillars, your ten-year map, and your year-by-year fortune, the same honest, receipts-first method.
            </p>
            <button style={btn} disabled={busy} onClick={buy}>
              {busy ? 'Opening checkout…' : `Unlock the full report ($${preview.fullReportPriceUsd})`}
            </button>
          </div>
        )}

        {!preview && (
          <p style={{ color: '#71717a', fontSize: 13 }}>
            Your year-ahead reading arrives in your inbox at Lì Chūn (early February).
          </p>
        )}
      </main>
    </div>
  )
}
