'use client'

/**
 * /dashboard/retro — "Your last 30 days" retro-alignment verdict (E-2).
 *
 * Fetches GET /api/retro (first call runs the bounded backfill — can take a
 * few seconds; we show honest progress copy) and renders:
 *   - headline + share-vs-priority bars (same visual grammar as AlignmentPanel)
 *   - starving #1-priority callout, top-unaligned-sink callout
 *   - the one redirection, passive-coverage line
 *   - a "Share your verdict" card: OG image via /api/og/retro (goal names +
 *     percentages ONLY — nothing else leaves the account) + copy-link button
 *
 * PostHog (§4.4 taxonomy): retro_verdict_viewed on render,
 * retro_card_shared on copy, redirection_proposed when one is surfaced.
 *
 * Same client-page pattern as /dashboard/journal: Sidebar + main column;
 * every data call is Clerk-authed and userId-scoped server-side. Any API
 * error renders a quiet unavailable card — never an error boundary.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { QuickAdd } from '@/components/dashboard/QuickAdd'
import { ProposalCard, type Proposal } from '@/components/dashboard/ProposalCard'

interface RetroGoalShare {
  goalId: string
  name: string
  domain: string
  rank: number
  sharePct: number
  expectedSharePct: number
  minutes: number
  actions: number
  mentions: number
  momentum: 'fed' | 'flat' | 'starving'
}

interface RetroVerdict {
  asOf: string
  windowDays: number
  hasData: boolean
  headline: string
  perGoal: RetroGoalShare[]
  unalignedSharePct: number
  topFed: { goalId: string; name: string; sharePct: number } | null
  starvingPriority: { goalId: string; name: string; rank: number; sharePct: number; expectedSharePct: number } | null
  topUnalignedSink: { title: string; minutes: number; occurrences: number; sharePct: number } | null
  passiveCoveragePct: number
  redirection: string
  totals: { trackedMinutes: number; passiveMinutes: number; attributedItems: number }
  redirectionProposal?: Proposal | null
}

const MOMENTUM_META: Record<string, { arrow: string; color: string }> = {
  fed: { arrow: '↑', color: '#22c55e' },
  flat: { arrow: '→', color: '#9ca3af' },
  starving: { arrow: '↓', color: '#f59e0b' },
}

const DOMAIN_ICONS: Record<string, string> = {
  career: '💼', wealth: '💰', health: '💪', relationships: '❤️', learning: '📚', legacy: '🌟',
}

function fmtMinutes(m: number): string {
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r > 0 ? `${h}h ${r}min` : `${h}h`
}

function Callout({ color, title, children }: { color: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 10, background: `${color}10`, border: `1px solid ${color}44` }}>
      <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.55 }}>{children}</div>
    </div>
  )
}

export default function RetroPage() {
  const [verdict, setVerdict] = useState<RetroVerdict | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [sidebarGoals, setSidebarGoals] = useState<{ id: string; domainId: string; name: string; progress: number }[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const tracked = useRef(false)

  const load = useCallback(async () => {
    try {
      const [rRes, gRes] = await Promise.all([
        // First call may run the bounded backfill server-side — allow it time.
        fetch('/api/retro?days=30', { cache: 'no-store', credentials: 'same-origin' }),
        fetch('/api/goals?status=active', { cache: 'no-store', credentials: 'same-origin' }),
      ])
      try {
        const g = await gRes.json()
        if (Array.isArray(g)) {
          setSidebarGoals(g.map((x: { id: string; domainId: string; name: string; progress: number }) => ({
            id: x.id, domainId: x.domainId, name: x.name, progress: x.progress,
          })))
        }
      } catch { /* sidebar goals are cosmetic */ }
      if (!rRes.ok) {
        setState('error')
        return
      }
      const v = (await rRes.json()) as RetroVerdict
      if (!v || !Array.isArray(v.perGoal)) {
        setState('error')
        return
      }
      setVerdict(v)
      setState('ready')
      if (!tracked.current) {
        tracked.current = true
        posthog.capture('retro_verdict_viewed', {
          windowDays: v.windowDays,
          hasData: v.hasData,
          goals: v.perGoal.length,
          passiveCoveragePct: v.passiveCoveragePct,
        })
        if (v.hasData && v.starvingPriority && v.redirection) {
          posthog.capture('redirection_proposed', {
            surface: 'retro',
            goal: v.starvingPriority.name,
            rank: v.starvingPriority.rank,
          })
        }
      }
    } catch (e) {
      console.error('[retro] load failed:', e)
      setState('error')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function shareUrl(v: RetroVerdict): string {
    const p = new URLSearchParams()
    p.set('headline', 'My last 30 days')
    if (v.topFed) p.set('top', `${v.topFed.name} · ${v.topFed.sharePct}%`)
    if (v.starvingPriority) p.set('starving', `${v.starvingPriority.name} · ${v.starvingPriority.sharePct}%`)
    if (v.topUnalignedSink) p.set('sink', `${v.topUnalignedSink.title} · ${v.topUnalignedSink.sharePct}%`)
    if (v.passiveCoveragePct > 0) p.set('passive', String(v.passiveCoveragePct))
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://8os.ai'
    return `${origin}/api/og/retro?${p.toString()}`
  }

  async function copyShareLink() {
    if (!verdict) return
    const url = shareUrl(verdict)
    try {
      await navigator.clipboard.writeText(url)
      setCopied('Link copied, paste it anywhere.')
    } catch {
      setCopied(url) // clipboard blocked: show the URL so it is still shareable
    }
    posthog.capture('retro_card_shared', {
      windowDays: verdict.windowDays,
      hasTopFed: !!verdict.topFed,
      hasStarving: !!verdict.starvingPriority,
      hasSink: !!verdict.topUnalignedSink,
    })
  }

  const shell = (content: React.ReactNode) => (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Sidebar goals={sidebarGoals} />
      <main style={{ flex: 1, padding: '24px 32px', maxWidth: 860 }}>{content}</main>
      <QuickAdd />
    </div>
  )

  if (state === 'loading') {
    return shell(
      <div style={{ paddingTop: 80, textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, color: 'var(--color-text-primary)', marginBottom: 10, fontFamily: 'var(--font-serif), Georgia, serif' }}>Your last 30 days</h1>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
          Reading your attention ledger… the first run classifies your last 30 days of
          calendar, tasks and notes, so it can take a little while. Worth it.
        </div>
      </div>,
    )
  }

  if (state === 'error' || !verdict) {
    return shell(
      <div style={{ paddingTop: 80 }}>
        <h1 style={{ fontSize: 22, color: 'var(--color-text-primary)', marginBottom: 10, fontFamily: 'var(--font-serif), Georgia, serif' }}>Your last 30 days</h1>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
          The retro view is unavailable right now, refresh to try again. The rest of your
          dashboard is unaffected. <Link href="/dashboard" style={{ color: 'var(--color-accent)' }}>Back to dashboard</Link>
        </div>
      </div>,
    )
  }

  const goals = [...verdict.perGoal].sort((a, b) => a.rank - b.rank)
  const maxPct = Math.max(1, ...goals.map((g) => Math.max(g.sharePct, g.expectedSharePct)), verdict.unalignedSharePct)

  return shell(
    <div data-testid="retro-page">
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, color: 'var(--color-text-primary)', margin: '0 0 6px', letterSpacing: '-0.02em', fontFamily: 'var(--font-serif), Georgia, serif' }}>Your last 30 days</h1>
        <p data-testid="retro-headline" style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{verdict.headline}</p>
      </div>

      {!verdict.hasData && (
        <div style={{ padding: '16px 18px', borderRadius: 12, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
          There is nothing to look back on yet, connect a calendar, finish a task or journal a
          line and this page turns into your attention verdict.{' '}
          <Link href="/settings/sources" style={{ color: 'var(--color-accent)' }}>Connect a source →</Link>
        </div>
      )}

      {verdict.hasData && (
        <>
          {/* Share-vs-priority bars (AlignmentPanel visual grammar) */}
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif), Georgia, serif' }}>Where your attention went</h2>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>share vs stated priority · {fmtMinutes(verdict.totals.trackedMinutes)} tracked</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {goals.map((g) => {
                const m = MOMENTUM_META[g.momentum] ?? MOMENTUM_META.flat
                return (
                  <div key={g.goalId} data-testid="retro-goal-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, minWidth: 0 }}>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', width: 22, flexShrink: 0 }}>#{g.rank}</span>
                      <span style={{ color: m.color, fontSize: 13, fontWeight: 700, width: 14, flexShrink: 0 }}>{m.arrow}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {DOMAIN_ICONS[g.domain] ?? ''} {g.name}
                      </span>
                      <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                        {g.sharePct}% <span style={{ color: 'var(--color-text-muted)' }}>/ {g.expectedSharePct}% expected</span>
                      </span>
                    </div>
                    <div style={{ position: 'relative', height: 7, borderRadius: 4, background: 'var(--color-bg-primary)', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (g.sharePct / maxPct) * 100)}%`, height: '100%', borderRadius: 4, background: m.color, opacity: 0.85 }} />
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min(99, (g.expectedSharePct / maxPct) * 100)}%`, width: 2, background: '#221F1A', opacity: 0.7 }} />
                    </div>
                  </div>
                )
              })}
              {/* Unaligned bucket */}
              <div data-testid="retro-unaligned">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', width: 22, flexShrink: 0 }}>·</span>
                  <span style={{ width: 14, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-secondary)' }}>Unaligned (not pointed at any goal)</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{verdict.unalignedSharePct}%</span>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: 'var(--color-bg-primary)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (verdict.unalignedSharePct / maxPct) * 100)}%`, height: '100%', borderRadius: 4, background: 'var(--color-text-muted)', opacity: 0.7 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Callouts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {verdict.starvingPriority && (
              <div data-testid="retro-starving">
                <Callout color="#f59e0b" title={`Starving priority, #${verdict.starvingPriority.rank}`}>
                  <strong>“{verdict.starvingPriority.name}”</strong> got {verdict.starvingPriority.sharePct}% of your
                  attention against an expected {verdict.starvingPriority.expectedSharePct}% for its priority.
                </Callout>
              </div>
            )}
            {verdict.topUnalignedSink && (
              <div data-testid="retro-sink">
                <Callout color="var(--color-text-muted)" title="Top unaligned sink">
                  <strong>“{verdict.topUnalignedSink.title}”</strong> absorbed{' '}
                  {fmtMinutes(verdict.topUnalignedSink.minutes)} across {verdict.topUnalignedSink.occurrences}{' '}
                  {verdict.topUnalignedSink.occurrences === 1 ? 'block' : 'blocks'},{' '}
                  {verdict.topUnalignedSink.sharePct}% of everything tracked, pointed at no goal.
                </Callout>
              </div>
            )}
            {verdict.redirection && (
              <div data-testid="retro-redirection">
                <Callout color="var(--color-accent)" title="One redirection">
                  <div style={{ marginBottom: verdict.redirectionProposal ? 10 : 0 }}>↪ {verdict.redirection}</div>
                  {verdict.redirectionProposal && (
                    <ProposalCard
                      proposal={verdict.redirectionProposal}
                      onResolved={() => setVerdict((v) => (v ? { ...v, redirectionProposal: null } : v))}
                    />
                  )}
                </Callout>
              </div>
            )}
          </div>

          {/* Passive coverage */}
          <p data-testid="retro-passive" style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 20px', lineHeight: 1.6 }}>
            {verdict.passiveCoveragePct > 0
              ? <>{verdict.passiveCoveragePct}% of these minutes were tracked <strong style={{ color: 'var(--color-text-primary)' }}>passively</strong> from your connected calendar, no manual logging.</>
              : <>None of this came from a connected calendar yet, <Link href="/settings/sources" style={{ color: 'var(--color-accent)' }}>connect one</Link> and the picture fills itself in.</>}
          </p>

          {/* Share card */}
          <div data-testid="retro-share-card" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif), Georgia, serif' }}>Share your verdict</h2>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              A card with your goal names and percentages, nothing else leaves your account.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shareUrl(verdict)}
              alt="Your last 30 days, shareable verdict card"
              style={{ width: '100%', maxWidth: 560, borderRadius: 10, border: '1px solid var(--color-border)', display: 'block', marginBottom: 12 }}
            />
            <button
              data-testid="retro-copy-link"
              onClick={() => void copyShareLink()}
              style={{ padding: '9px 18px', background: 'var(--color-accent)', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Copy share link
            </button>
            {copied && <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--color-accent)', wordBreak: 'break-all' }}>{copied}</p>}
          </div>
        </>
      )}
    </div>,
  )
}
