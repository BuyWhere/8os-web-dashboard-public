'use client'

/**
 * AlignmentPanel — dashboard surface for the Alignment Engine (OS-2542 step 3).
 *
 * Renders the weekly alignment verdict from GET /api/alignment:
 *   - headline + topRedirection nudge
 *   - per-goal bars: actual attention share vs the priority-implied expected
 *     share, momentum arrows (fed ↑ / flat → / starving ↓), in-season badge
 *   - the unaligned bucket
 *   - priority re-ranking (up/down) → POST /api/alignment/rank (replace-all)
 *   - a receipts expander that fetches ?debug=1 on first open and shows the
 *     classified evidence (source, date, goal, weight, rationale)
 *
 * Archetype-skinned via the same --skin-* CSS vars the rest of the dashboard
 * uses. Degrades gracefully: any API error renders a quiet unavailable card —
 * this panel must never take the dashboard down.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ProposalCard, type Proposal } from '@/components/dashboard/ProposalCard'

type Momentum = 'fed' | 'flat' | 'starving'

interface PerGoal {
  goalId: string
  name: string
  domain: string
  rank: number
  share: number
  expectedShare: number
  minutes: number
  actions: number
  mentions: number
  momentum: Momentum
  inSeason: boolean | null
}

interface Receipt {
  attributionId?: string
  sourceType: string
  sourceDate: string
  goalId?: string | null
  goal: string | null
  weight: string
  minutes: number
  rationale: string
  confidence?: number | null
  userOverride?: boolean
}

interface DebugAttribution {
  id?: string
  sourceType: string
  sourceDate: string
  goalId: string | null
  weight: string
  minutes: number
  rationale: string
  confidence?: number | null
  userOverride?: boolean
  correctedGoalId?: string | null
}

interface AlignmentPayload {
  windowDays?: number
  daily?: { headline: string; unalignedShare: number | null }
  weekly?: {
    headline: string
    topRedirection: string
    perGoal: PerGoal[]
    unalignedShare: number
    receipts: Receipt[]
  }
  redirection?: Proposal | null
  attributions?: DebugAttribution[]
  correctionRate?: number
  error?: string
}

const MOMENTUM_META: Record<Momentum, { arrow: string; color: string; label: string }> = {
  fed: { arrow: '↑', color: '#22c55e', label: 'fed' },
  flat: { arrow: '→', color: '#9ca3af', label: 'flat' },
  starving: { arrow: '↓', color: '#f59e0b', label: 'starving' },
}

const DOMAIN_ICONS: Record<string, string> = {
  career: '💼', wealth: '💰', health: '💪', relationships: '❤️', learning: '📚', legacy: '🌟',
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function Card({ children, gapPx }: { children: React.ReactNode; gapPx: number }) {
  return (
    <div
      data-testid="alignment-panel"
      style={{
        background: 'var(--skin-card-bg, #FFFFFF)',
        border: '1px solid var(--skin-card-border, var(--color-border))',
        borderRadius: 'var(--skin-radius-card, 12px)',
        padding: 20,
        marginBottom: gapPx,
      }}
    >
      {children}
    </div>
  )
}

export function AlignmentPanel({ gapPx = 20 }: { gapPx?: number }) {
  const [data, setData] = useState<AlignmentPayload | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [ranking, setRanking] = useState(false)
  const [rankMsg, setRankMsg] = useState<string | null>(null)

  // Receipts expander — the debug payload is fetched lazily on first open.
  const [receiptsOpen, setReceiptsOpen] = useState(false)
  const [debugAtts, setDebugAtts] = useState<DebugAttribution[] | null>(null)
  const [debugLoading, setDebugLoading] = useState(false)
  const debugFetched = useRef(false)

  // E-8 corrections: the receipt being reassigned (its attribution id) + a busy flag.
  const [correctingId, setCorrectingId] = useState<string | null>(null)
  const [correctionBusy, setCorrectionBusy] = useState(false)
  const [correctMsg, setCorrectMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/alignment', { cache: 'no-store', credentials: 'same-origin' })
      if (!res.ok) {
        setState('error')
        return
      }
      const payload = (await res.json()) as AlignmentPayload
      if (!payload?.weekly?.perGoal) {
        setState('error')
        return
      }
      setData(payload)
      setProposal(payload.redirection ?? null)
      setState('ready')
    } catch (e) {
      console.error('[alignment-panel] load failed:', e)
      setState('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function toggleReceipts() {
    const next = !receiptsOpen
    setReceiptsOpen(next)
    if (next && !debugFetched.current) {
      debugFetched.current = true
      setDebugLoading(true)
      try {
        const res = await fetch('/api/alignment?debug=1', { cache: 'no-store', credentials: 'same-origin' })
        if (res.ok) {
          const payload = (await res.json()) as AlignmentPayload
          setDebugAtts(Array.isArray(payload.attributions) ? payload.attributions.slice(0, 20) : [])
        } else {
          setDebugAtts([])
        }
      } catch (e) {
        console.error('[alignment-panel] debug fetch failed:', e)
        setDebugAtts([])
      } finally {
        setDebugLoading(false)
      }
    }
  }

  // Move a goal up/down in the priority order and persist the FULL new order
  // (replace-all semantics on POST /api/alignment/rank), then refetch so the
  // expected-share curve + momentum recompute against the new priorities.
  async function move(goalId: string, dir: -1 | 1) {
    if (ranking || !data?.weekly) return
    const ordered = [...data.weekly.perGoal].sort((a, b) => a.rank - b.rank)
    const idx = ordered.findIndex((g) => g.goalId === goalId)
    const swap = idx + dir
    if (idx === -1 || swap < 0 || swap >= ordered.length) return
    ;[ordered[idx], ordered[swap]] = [ordered[swap], ordered[idx]]
    setRanking(true)
    setRankMsg(null)
    try {
      const res = await fetch('/api/alignment/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ rankings: ordered.map((g, i) => ({ goalId: g.goalId, rank: i + 1 })) }),
      })
      if (res.ok) {
        await load()
        setRankMsg('Priorities updated.')
      } else {
        setRankMsg('Could not save the new order.')
      }
    } catch (e) {
      console.error('[alignment-panel] re-rank failed:', e)
      setRankMsg('Could not save the new order.')
    } finally {
      setRanking(false)
    }
  }

  // E-8: reassign a receipt to a different goal (or mark it unaligned). Sets a
  // sticky human override server-side, then refetches so the verdict + ledger
  // re-score against the correction. Also refreshes the debug attribution list
  // so the receipt row shows the new goal immediately.
  async function correct(attributionId: string, correctedGoalId: string | null) {
    if (correctionBusy) return
    setCorrectionBusy(true)
    setCorrectMsg(null)
    try {
      const res = await fetch('/api/alignment/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ attributionId, correctedGoalId }),
      })
      if (res.ok) {
        setCorrectingId(null)
        // Force the debug list to refetch on next open (goal changed).
        debugFetched.current = false
        setDebugAtts(null)
        await load()
        // Re-open receipts fetch if the expander is open.
        if (receiptsOpen) {
          debugFetched.current = true
          try {
            const dres = await fetch('/api/alignment?debug=1', { cache: 'no-store', credentials: 'same-origin' })
            if (dres.ok) {
              const p = (await dres.json()) as AlignmentPayload
              setDebugAtts(Array.isArray(p.attributions) ? p.attributions.slice(0, 20) : [])
            }
          } catch { /* non-fatal */ }
        }
        setCorrectMsg('Reassigned — the verdict has been re-scored.')
      } else {
        setCorrectMsg('Could not save that correction.')
      }
    } catch (e) {
      console.error('[alignment-panel] correction failed:', e)
      setCorrectMsg('Could not save that correction.')
    } finally {
      setCorrectionBusy(false)
    }
  }

  if (state === 'loading') {
    return (
      <Card gapPx={gapPx}>
        <h2 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 'var(--skin-typo-heading-weight, 700)' as never, color: 'var(--skin-color-text, #221F1A)' }}>
          Alignment
        </h2>
        <div style={{ color: 'var(--skin-color-text-muted, var(--color-text-muted))', fontSize: 13 }}>Reading your attention ledger…</div>
      </Card>
    )
  }

  if (state === 'error' || !data?.weekly) {
    return (
      <Card gapPx={gapPx}>
        <h2 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 'var(--skin-typo-heading-weight, 700)' as never, color: 'var(--skin-color-text, #221F1A)' }}>
          Alignment
        </h2>
        <div style={{ color: 'var(--skin-color-text-muted, var(--color-text-muted))', fontSize: 13 }}>
          The alignment view is unavailable right now — the rest of your dashboard is unaffected. It retries the next time you load this page.
        </div>
      </Card>
    )
  }

  const { weekly } = data
  const goals = [...weekly.perGoal].sort((a, b) => a.rank - b.rank)
  const maxShare = Math.max(0.0001, ...goals.map((g) => Math.max(g.share, g.expectedShare)), weekly.unalignedShare)

  return (
    <Card gapPx={gapPx}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 'var(--skin-typo-heading-weight, 700)' as never, color: 'var(--skin-color-text, #221F1A)' }}>
          Alignment · last {data.windowDays ?? 7} days
        </h2>
        <span style={{ fontSize: 11, color: 'var(--skin-color-text-muted, var(--color-text-muted))' }}>attention vs stated priorities</span>
      </div>

      {/* Verdict headline + redirection nudge */}
      <p data-testid="alignment-headline" style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--skin-color-text, #221F1A)', lineHeight: 1.55 }}>
        {weekly.headline}
      </p>
      <p data-testid="alignment-redirection" style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--skin-color-accent, var(--color-accent))', lineHeight: 1.5 }}>
        ↪ {weekly.topRedirection}
      </p>

      {/* E-7: one-tap redirection — book the starving-#1 goal's block */}
      {proposal && (
        <div style={{ marginBottom: 16 }}>
          <ProposalCard proposal={proposal} onResolved={() => setProposal(null)} />
        </div>
      )}

      {/* Per-goal bars, in priority order */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {goals.map((g, i) => {
          const m = MOMENTUM_META[g.momentum] ?? MOMENTUM_META.flat
          return (
            <div key={g.goalId} data-testid="alignment-goal-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, minWidth: 0 }}>
                <span style={{ fontSize: 11, color: 'var(--skin-color-text-muted, var(--color-text-muted))', width: 22, flexShrink: 0 }}>#{g.rank}</span>
                <span title={`momentum: ${m.label}`} style={{ color: m.color, fontSize: 13, fontWeight: 700, width: 14, flexShrink: 0 }}>{m.arrow}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--skin-color-text, #221F1A)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {DOMAIN_ICONS[g.domain] ?? ''} {g.name}
                </span>
                {g.inSeason === true && (
                  <span style={{ flexShrink: 0, fontSize: 10, padding: '1px 7px', borderRadius: 10, background: '#E9F0E5', border: '1px solid #4F7A5244', color: '#4F7A52' }}>
                    in season
                  </span>
                )}
                {g.inSeason === false && (
                  <span style={{ flexShrink: 0, fontSize: 10, padding: '1px 7px', borderRadius: 10, background: 'var(--skin-color-badge-bg, var(--color-bg-primary))', color: 'var(--skin-color-text-muted, var(--color-text-muted))' }}>
                    off season
                  </span>
                )}
                <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--skin-color-text-muted, var(--color-text-muted))', fontVariantNumeric: 'tabular-nums' }}>
                  {pct(g.share)} <span style={{ color: 'var(--skin-color-text-muted, var(--color-text-muted))' }}>/ {pct(g.expectedShare)} expected</span>
                </span>
                <span style={{ display: 'inline-flex', gap: 2, flexShrink: 0 }}>
                  <button
                    aria-label={`Move ${g.name} up in priority`}
                    onClick={() => move(g.goalId, -1)}
                    disabled={ranking || i === 0}
                    style={{ background: 'var(--skin-color-badge-bg, var(--color-bg-primary))', border: '1px solid var(--skin-card-border, var(--color-border))', borderRadius: 5, color: i === 0 ? 'var(--color-text-muted)' : 'var(--skin-color-text, #221F1A)', fontSize: 10, width: 20, height: 18, lineHeight: '14px', padding: 0, cursor: ranking || i === 0 ? 'default' : 'pointer' }}
                  >▲</button>
                  <button
                    aria-label={`Move ${g.name} down in priority`}
                    onClick={() => move(g.goalId, 1)}
                    disabled={ranking || i === goals.length - 1}
                    style={{ background: 'var(--skin-color-badge-bg, var(--color-bg-primary))', border: '1px solid var(--skin-card-border, var(--color-border))', borderRadius: 5, color: i === goals.length - 1 ? 'var(--color-text-muted)' : 'var(--skin-color-text, #221F1A)', fontSize: 10, width: 20, height: 18, lineHeight: '14px', padding: 0, cursor: ranking || i === goals.length - 1 ? 'default' : 'pointer' }}
                  >▼</button>
                </span>
              </div>
              {/* actual-share bar with an expected-share marker */}
              <div style={{ position: 'relative', height: 7, borderRadius: 4, background: 'var(--skin-color-badge-bg, var(--color-bg-primary))', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (g.share / maxShare) * 100)}%`, height: '100%', borderRadius: 4, background: m.color, opacity: 0.85 }} />
                <div
                  title={`expected ${pct(g.expectedShare)}`}
                  style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min(99, (g.expectedShare / maxShare) * 100)}%`, width: 2, background: 'var(--skin-color-text, #221F1A)', opacity: 0.7 }}
                />
              </div>
            </div>
          )
        })}

        {/* Unaligned bucket */}
        <div data-testid="alignment-unaligned">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--skin-color-text-muted, var(--color-text-muted))', width: 22, flexShrink: 0 }}>·</span>
            <span style={{ width: 14, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 12, color: 'var(--skin-color-text-muted, var(--color-text-muted))' }}>Unaligned (not pointed at any goal)</span>
            <span style={{ fontSize: 11, color: 'var(--skin-color-text-muted, var(--color-text-muted))', fontVariantNumeric: 'tabular-nums' }}>{pct(weekly.unalignedShare)}</span>
            <span style={{ width: 42, flexShrink: 0 }} />
          </div>
          <div style={{ height: 7, borderRadius: 4, background: 'var(--skin-color-badge-bg, var(--color-bg-primary))', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (weekly.unalignedShare / maxShare) * 100)}%`, height: '100%', borderRadius: 4, background: 'var(--color-text-muted)', opacity: 0.7 }} />
          </div>
        </div>
      </div>

      {rankMsg && <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--skin-color-accent, var(--color-accent))' }}>{rankMsg}</p>}

      {/* Receipts expander */}
      <div style={{ marginTop: 14, borderTop: '1px solid var(--skin-card-border, var(--color-border))', paddingTop: 10 }}>
        <button
          onClick={toggleReceipts}
          data-testid="alignment-receipts-toggle"
          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--skin-color-primary, var(--color-accent))', fontSize: 12, cursor: 'pointer' }}
        >
          {receiptsOpen ? '▾ Hide receipts' : '▸ Show receipts (why the engine thinks so)'}
        </button>
        {receiptsOpen && (() => {
          // Prefer the fuller ?debug=1 attribution list (fetched on expand);
          // fall back to the receipts already in the base payload. E-8: each
          // item carries its attribution id so it can be reassigned.
          const goalNames = new Map(goals.map((g) => [g.goalId, g.name]))
          const items: Receipt[] =
            debugAtts && debugAtts.length > 0
              ? debugAtts.map((a) => {
                  const effGoalId = a.userOverride
                    ? a.correctedGoalId ?? null
                    : (a.weight === 'direct' || a.weight === 'supporting') ? a.goalId : null
                  return {
                    attributionId: a.id,
                    sourceType: a.sourceType,
                    sourceDate: String(a.sourceDate).slice(0, 10),
                    goalId: effGoalId,
                    goal: effGoalId ? goalNames.get(effGoalId) ?? null : null,
                    weight: a.weight,
                    minutes: a.minutes,
                    rationale: a.rationale,
                    confidence: a.confidence ?? null,
                    userOverride: a.userOverride,
                  }
                })
              : weekly.receipts
          return (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {debugLoading && <div style={{ fontSize: 12, color: 'var(--skin-color-text-muted, var(--color-text-muted))' }}>Loading evidence…</div>}
              {!debugLoading && items.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--skin-color-text-muted, var(--color-text-muted))' }}>No classified evidence in the window yet.</div>
              )}
              {!debugLoading && items.slice(0, 12).map((r, i) => {
                const isEditing = !!r.attributionId && correctingId === r.attributionId
                return (
                  <div key={`r-${r.attributionId ?? i}`} data-testid="alignment-receipt" style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--skin-color-badge-bg, var(--color-bg-primary))', border: '1px solid var(--skin-card-border, var(--color-border))' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <div style={{ flex: 1, fontSize: 10, color: 'var(--skin-color-text-muted, var(--color-text-muted))', marginBottom: 2 }}>
                        {r.sourceDate} · {r.sourceType}{r.minutes > 0 ? ` · ${r.minutes}min` : ''} · <span style={{ color: r.goal ? '#4F7A52' : 'var(--color-text-secondary)' }}>{r.goal ? `→ ${r.goal} (${r.weight})` : `unaligned (${r.weight})`}</span>
                        {typeof r.confidence === 'number' ? <span style={{ color: 'var(--skin-color-text-muted, var(--color-text-muted))' }}> · {Math.round(r.confidence * 100)}% conf</span> : null}
                        {r.userOverride ? <span style={{ color: 'var(--color-accent)' }}> · you</span> : null}
                      </div>
                      {r.attributionId && !isEditing && (
                        <button
                          data-testid="alignment-receipt-reassign"
                          onClick={() => { setCorrectMsg(null); setCorrectingId(r.attributionId as string) }}
                          disabled={correctionBusy}
                          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--skin-color-primary, var(--color-accent))', fontSize: 10, cursor: 'pointer', flexShrink: 0 }}
                        >reassign</button>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--skin-color-text, #221F1A)', lineHeight: 1.45 }}>{r.rationale}</div>
                    {isEditing && (
                      <div data-testid="alignment-reassign-sheet" style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'var(--skin-color-text-muted, var(--color-text-muted))' }}>Reassign to:</span>
                        {goals.map((g) => (
                          <button
                            key={g.goalId}
                            onClick={() => correct(r.attributionId as string, g.goalId)}
                            disabled={correctionBusy || r.goalId === g.goalId}
                            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, cursor: correctionBusy ? 'default' : 'pointer', background: r.goalId === g.goalId ? '#E9F0E5' : 'var(--skin-color-badge-bg, var(--color-bg-primary))', border: '1px solid var(--skin-card-border, var(--color-border))', color: 'var(--skin-color-text, #221F1A)' }}
                          >{g.name}</button>
                        ))}
                        <button
                          onClick={() => correct(r.attributionId as string, null)}
                          disabled={correctionBusy || !r.goalId}
                          style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, cursor: correctionBusy ? 'default' : 'pointer', background: 'var(--skin-color-badge-bg, var(--color-bg-primary))', border: '1px solid var(--skin-card-border, var(--color-border))', color: 'var(--color-text-secondary)' }}
                        >unaligned</button>
                        <button
                          onClick={() => setCorrectingId(null)}
                          disabled={correctionBusy}
                          style={{ fontSize: 10, padding: '2px 6px', background: 'none', border: 'none', color: 'var(--skin-color-text-muted, var(--color-text-muted))', cursor: 'pointer' }}
                        >cancel</button>
                      </div>
                    )}
                  </div>
                )
              })}
              {correctMsg && <div style={{ fontSize: 10, color: 'var(--skin-color-accent, var(--color-accent))' }}>{correctMsg}</div>}
              {!debugLoading && items.length > 12 && (
                <div style={{ fontSize: 10, color: 'var(--skin-color-text-muted, var(--color-text-muted))' }}>
                  {items.length} classified items in the window (showing 12).
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </Card>
  )
}
