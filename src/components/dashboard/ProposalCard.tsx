'use client'

/**
 * ProposalCard — the shared one-tap redirection surface (E-7, backlog §5).
 *
 * Renders a single OPEN redirection_proposals row as an operable card:
 *   - the starving goal's name + the engine's rationale
 *   - the concrete proposed slot, humanized ("Tomorrow 10:00–11:00")
 *   - Accept  → POST /api/redirections/:id/accept  (books the goal-linked block)
 *   - Decline → a one-tap reason picker (busy | wrong goal | not now) →
 *               POST /api/redirections/:id/decline
 *
 * Optimistic: the card dismisses itself immediately on Accept / Decline and
 * calls onResolved so the host surface can drop it from its list; a failed
 * request restores the card with an inline error. Archetype-skinned via the
 * same --skin-* CSS vars as the rest of the dashboard.
 *
 * Rendered under the AlignmentPanel verdict, in the retro redirection callout,
 * and (as a plain Accept button) by the inbox action renderer.
 */

import { useState } from 'react'
import posthog from 'posthog-js'

export interface Proposal {
  id: string
  goalId: string
  goalName: string
  rationale: string
  proposedSlotStart: string
  proposedSlotEnd: string
  status: string
  sourceKind: string
  createdAt: string
}

type DeclineReason = 'busy' | 'wrong_goal' | 'not_now'
const DECLINE_OPTIONS: { reason: DeclineReason; label: string }[] = [
  { reason: 'busy', label: 'Busy then' },
  { reason: 'wrong_goal', label: 'Wrong goal' },
  { reason: 'not_now', label: 'Not now' },
]

/** "Tomorrow 10:00–11:00" / "Mon 14:00–15:00" / "Today 09:00–10:00". */
export function formatSlot(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const now = new Date()
  const dayDiff = Math.round(
    (new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86400000,
  )
  let day: string
  if (dayDiff === 0) day = 'Today'
  else if (dayDiff === 1) day = 'Tomorrow'
  else day = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const hm = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${day} ${hm(start)}–${hm(end)}`
}

export function ProposalCard({
  proposal,
  onResolved,
  compact = false,
}: {
  proposal: Proposal
  onResolved?: (outcome: 'accepted' | 'declined') => void
  compact?: boolean
}) {
  const [busy, setBusy] = useState<null | 'accept' | 'decline'>(null)
  const [pickReason, setPickReason] = useState(false)
  const [done, setDone] = useState<null | 'accepted' | 'declined'>(null)
  const [error, setError] = useState<string | null>(null)

  async function accept() {
    if (busy) return
    setBusy('accept')
    setError(null)
    try {
      const res = await fetch(`/api/redirections/${proposal.id}/accept`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      if (res.ok || res.status === 409) {
        try {
          posthog.capture('redirection_accepted', {
            proposalId: proposal.id,
            goal: proposal.goalName,
            surface: proposal.sourceKind,
          })
        } catch { /* analytics best-effort */ }
        setDone('accepted')
        onResolved?.('accepted')
        return
      }
      setError('Could not book that block. Try again.')
    } catch {
      setError('Could not book that block. Try again.')
    } finally {
      setBusy(null)
    }
  }

  async function decline(reason: DeclineReason) {
    if (busy) return
    setBusy('decline')
    setError(null)
    try {
      const res = await fetch(`/api/redirections/${proposal.id}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ reason }),
      })
      if (res.ok) {
        try {
          posthog.capture('redirection_declined', {
            proposalId: proposal.id,
            goal: proposal.goalName,
            reason,
            surface: proposal.sourceKind,
          })
        } catch { /* analytics best-effort */ }
        setDone('declined')
        onResolved?.('declined')
        return
      }
      setError('Could not dismiss that. Try again.')
      setPickReason(false)
    } catch {
      setError('Could not dismiss that. Try again.')
      setPickReason(false)
    } finally {
      setBusy(null)
    }
  }

  if (done === 'accepted') {
    return (
      <div data-testid="proposal-card-accepted" style={wrap()}>
        <span style={{ fontSize: 13, color: '#4F7A52' }}>
          ✓ Booked — {formatSlot(proposal.proposedSlotStart, proposal.proposedSlotEnd)} on “{proposal.goalName}”.
        </span>
      </div>
    )
  }
  if (done === 'declined') {
    return (
      <div data-testid="proposal-card-declined" style={wrap()}>
        <span style={{ fontSize: 13, color: 'var(--skin-color-text-muted, var(--color-text-secondary))' }}>Dismissed — noted.</span>
      </div>
    )
  }

  return (
    <div data-testid="proposal-card" style={wrap()}>
      <div style={{ fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: 6 }}>
        One-tap redirection
      </div>
      {!compact && (
        <div style={{ fontSize: 13, color: 'var(--skin-color-text, #221F1A)', lineHeight: 1.5, marginBottom: 8 }}>
          {proposal.rationale}
        </div>
      )}
      <div data-testid="proposal-slot" style={{ fontSize: 13, color: 'var(--skin-color-text, #221F1A)', marginBottom: 12 }}>
        <strong>{proposal.goalName}</strong>
        {' · '}
        <span style={{ color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums' }}>
          {formatSlot(proposal.proposedSlotStart, proposal.proposedSlotEnd)}
        </span>
      </div>

      {!pickReason ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            data-testid="proposal-accept"
            onClick={accept}
            disabled={!!busy}
            style={primaryBtn(busy === 'accept')}
          >
            {busy === 'accept' ? 'Booking…' : 'Accept'}
          </button>
          <button
            data-testid="proposal-decline"
            onClick={() => setPickReason(true)}
            disabled={!!busy}
            style={secondaryBtn()}
          >
            Decline
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--skin-color-text-muted, var(--color-text-secondary))' }}>Why?</span>
          {DECLINE_OPTIONS.map((o) => (
            <button
              key={o.reason}
              data-testid={`proposal-decline-${o.reason}`}
              onClick={() => decline(o.reason)}
              disabled={!!busy}
              style={secondaryBtn()}
            >
              {o.label}
            </button>
          ))}
          <button onClick={() => setPickReason(false)} disabled={!!busy} style={ghostBtn()}>
            Cancel
          </button>
        </div>
      )}

      {error && <div style={{ marginTop: 8, fontSize: 11, color: '#B5502F' }}>{error}</div>}
    </div>
  )
}

function wrap(): React.CSSProperties {
  return {
    background: 'var(--skin-color-badge-bg, #FFFFFF)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--skin-radius-card, 10px)',
    padding: '12px 14px',
  }
}
function primaryBtn(loading: boolean): React.CSSProperties {
  return {
    background: 'var(--color-accent)',
    border: '1px solid var(--color-accent)',
    borderRadius: 'var(--skin-radius-button, 8px)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    padding: '7px 16px',
    cursor: loading ? 'default' : 'pointer',
    opacity: loading ? 0.6 : 1,
  }
}
function secondaryBtn(): React.CSSProperties {
  return {
    background: 'transparent',
    border: '1px solid var(--skin-button-secondary-border, var(--color-border))',
    borderRadius: 'var(--skin-radius-button, 8px)',
    color: 'var(--skin-button-secondary-text, var(--color-accent))',
    fontSize: 12,
    fontWeight: 600,
    padding: '7px 12px',
    cursor: 'pointer',
  }
}
function ghostBtn(): React.CSSProperties {
  return {
    background: 'transparent',
    border: 'none',
    color: 'var(--skin-color-text-muted, var(--color-text-muted))',
    fontSize: 11,
    padding: '7px 6px',
    cursor: 'pointer',
  }
}
