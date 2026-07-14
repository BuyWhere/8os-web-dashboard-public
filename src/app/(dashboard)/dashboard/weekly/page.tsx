/**
 * /dashboard/weekly — the Phase-E Weekly surface (backlog §3.4 / §5).
 *
 * The weekly review is delivered proactively (heartbeat → inbox), but this is
 * its interactive home: the shareable verdict card + the E-10 goal-hygiene
 * confrontation (<GoalHygieneCard/>). NEW page — the existing /dashboard/review
 * (owned by an earlier build) is untouched; this focuses on the Phase-E rhythm
 * artifacts. Auth: /dashboard(.*) is Clerk-middleware-protected.
 */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { GoalHygieneCard } from '@/components/dashboard/GoalHygieneCard'

interface VerdictCard {
  headline: string
  week: string
  trackedMinutes: number
  topGoal: { name: string; sharePct: number; momentum: string } | null
  monthPillar: string | null
}

const card: React.CSSProperties = {
  maxWidth: 640, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20, marginBottom: 16,
}

export default function WeeklyPage() {
  const [verdict, setVerdict] = useState<VerdictCard | null>(null)

  useEffect(() => {
    // The verdict card is emitted with the weekly inbox message; surface the
    // most recent one if present.
    void (async () => {
      try {
        const res = await fetch('/api/inbox?playbook=weekly')
        if (res.ok) {
          const rows = await res.json().catch(() => [])
          const latest = Array.isArray(rows) ? rows.find((r) => r?.meta?.verdictCard) : null
          if (latest?.meta?.verdictCard) setVerdict(latest.meta.verdictCard)
        }
      } catch { /* best-effort */ }
    })()
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px 40px', color: 'var(--color-text-primary)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6, fontFamily: 'var(--font-serif), Georgia, serif' }}>Your week</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 24 }}>
          A verdict on the week behind and a focus for the week ahead — framed by your solar month.
        </p>

        {verdict && (
          <div style={card}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{verdict.headline}</div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
              {verdict.trackedMinutes} tracked minutes
              {verdict.topGoal ? ` · top goal “${verdict.topGoal.name}” at ${verdict.topGoal.sharePct}% (${verdict.topGoal.momentum})` : ''}
              {verdict.monthPillar ? ` · month pillar ${verdict.monthPillar}` : ''}
            </div>
          </div>
        )}

        {/* E-10 goal-hygiene confrontation lives here. */}
        <GoalHygieneCard />

        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
          Your full weekly review, with next week&apos;s #1 focus block, arrives in your{' '}
          <Link href="/dashboard/inbox" style={{ color: 'var(--color-accent)' }}>inbox</Link> on Sunday evening.
        </p>
      </main>
    </div>
  )
}
