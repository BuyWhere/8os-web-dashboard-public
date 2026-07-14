/**
 * /dashboard/inbox — the web-inbox channel's messages page (OS-2652).
 *
 * Reverse-chron list of inbox_messages (deliveries from the channel layer),
 * unread emphasis, click/mark-read, mark-all-read. Auth: /dashboard(.*) is
 * Clerk-middleware-protected; data goes through /api/inbox/messages
 * (requireAuth, userId-scoped). Same client-page pattern as /dashboard/journal.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'
import { Sidebar } from '@/components/dashboard/Sidebar'

interface InboxAction { id: string; label: string }
interface InboxMessage {
  id: string
  title: string | null
  body: string
  actions: InboxAction[]
  read: boolean
  createdAt: string
  meta?: { playbook?: string } | null
}

function fmtWhen(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function InboxPage() {
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)
  const [actionState, setActionState] = useState<Record<string, 'busy' | 'done' | 'error'>>({})
  // Which messages are expanded to show their full body (accordion).
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox/messages?limit=100', { cache: 'no-store' })
      if (!res.ok) throw new Error(`inbox ${res.status}`)
      const data = await res.json()
      setMessages(Array.isArray(data.messages) ? data.messages : [])
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0)
    } catch (e) {
      console.error('Failed to load inbox:', e)
      setError('Could not load your inbox. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // E-7: one-tap accept of a redirection proposal delivered as an inbox action.
  async function acceptRedirection(actionId: string, proposalId: string) {
    setActionState((s) => ({ ...s, [actionId]: 'busy' }))
    try {
      const res = await fetch(`/api/redirections/${proposalId}/accept`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      if (res.ok || res.status === 409) {
        setActionState((s) => ({ ...s, [actionId]: 'done' }))
      } else {
        setActionState((s) => ({ ...s, [actionId]: 'error' }))
      }
    } catch {
      setActionState((s) => ({ ...s, [actionId]: 'error' }))
    }
  }

  // E-6 (§3.3): commitment follow-up choices delivered as inbox actions
  // (cm:<id>:done | cm:<id>:renegotiate | cm:<id>:drop). Mirrors the rp:* pattern.
  async function commitmentAction(actionId: string, commitmentId: string, verb: string) {
    const payload: Record<string, unknown> = { id: commitmentId }
    if (verb === 'done') payload.status = 'done'
    else if (verb === 'renegotiate') {
      const nd = prompt('New date for this commitment (YYYY-MM-DD):')
      if (!nd || !/^\d{4}-\d{2}-\d{2}$/.test(nd.trim())) return
      payload.status = 'renegotiate'
      payload.dueDate = nd.trim()
    } else if (verb === 'drop') {
      payload.status = 'drop'
      const why = prompt("Optional: one line on why you're dropping this.") || ''
      payload.dropReason = why.trim()
    }
    setActionState((s) => ({ ...s, [actionId]: 'busy' }))
    try {
      const res = await fetch('/api/commitments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      })
      setActionState((s) => ({ ...s, [actionId]: res.ok ? 'done' : 'error' }))
    } catch {
      setActionState((s) => ({ ...s, [actionId]: 'error' }))
    }
  }

  // Open/close an item's full body. Opening also marks it read.
  function toggleExpand(m: InboxMessage) {
    const willOpen = !expanded[m.id]
    setExpanded((s) => ({ ...s, [m.id]: willOpen }))
    if (willOpen && !m.read) markRead([m.id])
  }

  async function markRead(ids: string[] | 'all') {
    setMarking(true)
    // §4.4: `brief_opened` — fire for each daily_brief message transitioning
    // unread→read (the "opened" signal that pairs with server `brief_delivered`).
    try {
      const targets = messages.filter(
        (m) => !m.read && m.meta?.playbook === 'daily_brief' && (ids === 'all' || ids.includes(m.id)),
      )
      for (const m of targets) posthog.capture('brief_opened', { message_id: m.id })
    } catch {}
    try {
      const res = await fetch('/api/inbox/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids === 'all' ? { all: true } : { ids }),
      })
      if (res.ok) {
        setMessages((ms) => ms.map((m) => (ids === 'all' || ids.includes(m.id) ? { ...m, read: true } : m)))
        setUnreadCount((c) => (ids === 'all' ? 0 : Math.max(0, c - ids.length)))
      }
    } catch { /* best-effort */ } finally {
      setMarking(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
        <Sidebar goals={[]} />
        <main style={{ flex: 1, padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--color-text-secondary)' }}>Opening your inbox…</div>
        </main>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Sidebar goals={[]} />

      <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 24, maxWidth: 720, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <Link href="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Dashboard</Link>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-serif), Georgia, serif' }}>
              Inbox{unreadCount > 0 && (
                <span style={{ marginLeft: 10, verticalAlign: 'middle', background: 'var(--color-accent)', color: '#fff', borderRadius: 10, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>
                  {unreadCount} unread
                </span>
              )}
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>
              Briefs, nudges and channel messages, the web inbox is always on
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markRead('all')}
              disabled={marking}
              style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-secondary)', fontSize: 12, padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Mark all read
            </button>
          )}
        </div>

        {error && (
          <div style={{ maxWidth: 720, background: '#B5502F18', border: '1px solid #B5502F44', borderRadius: 8, color: '#B5502F', padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {!error && messages.length === 0 && (
          <div style={{ maxWidth: 720, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 28, color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Nothing here yet. Daily briefs and nudges will land in this inbox, and in Telegram once you
            {' '}<Link href="/settings/channels" style={{ color: 'var(--color-accent)' }}>link a channel</Link>.
          </div>
        )}

        <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((m) => {
            const isOpen = !!expanded[m.id]
            return (
            <div
              key={m.id}
              onClick={() => toggleExpand(m)}
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(m) }
              }}
              style={{
                background: 'var(--color-surface, #FFFFFF)',
                border: '1px solid var(--color-border, var(--color-border))',
                borderLeft: m.read ? '2px solid var(--color-border, var(--color-border))' : '2px solid var(--color-accent, var(--color-accent))',
                borderRadius: 12,
                padding: '14px 16px',
                cursor: 'pointer',
                opacity: m.read ? 0.85 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                {!m.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-accent, var(--color-accent))', flexShrink: 0, alignSelf: 'center' }} />}
                <div style={{ fontSize: 14, fontWeight: m.read ? 500 : 700, flex: 1 }}>
                  {m.title || 'Message'}
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>{fmtWhen(m.createdAt)}</div>
                <span
                  aria-hidden
                  style={{
                    color: 'var(--color-text-muted)', fontSize: 12, flexShrink: 0, marginLeft: 2,
                    transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease',
                  }}
                >
                  ›
                </span>
              </div>
              <div
                style={{
                  color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 6, whiteSpace: 'pre-wrap',
                  ...(isOpen
                    ? { maxHeight: 360, overflowY: 'auto' as const }
                    : {
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                      }),
                }}
              >
                {m.body}
              </div>
              {!isOpen && m.body.length > 120 && (
                <div style={{ color: 'var(--color-accent, var(--color-accent))', fontSize: 12, fontWeight: 600, marginTop: 4 }}>
                  Read more
                </div>
              )}
              {m.actions.length > 0 && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}
                >
                  {m.actions.map((a) => {
                    // E-7: an action id shaped rp:<proposalId>:accept books the
                    // proposed redirection block via the same endpoint as web/Telegram.
                    const rp = /^rp:([^:]+):accept$/.exec(a.id)
                    if (rp) {
                      const proposalId = rp[1]
                      const st = actionState[a.id]
                      return (
                        <button
                          key={a.id}
                          data-testid="inbox-redirection-accept"
                          disabled={st === 'busy' || st === 'done'}
                          onClick={() => acceptRedirection(a.id, proposalId)}
                          style={{
                            background: st === 'done' ? '#4F7A5218' : 'var(--color-accent)',
                            border: '1px solid ' + (st === 'done' ? '#4F7A5244' : 'var(--color-accent)'),
                            borderRadius: 8,
                            color: st === 'done' ? '#4F7A52' : '#fff',
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '6px 12px',
                            cursor: st === 'busy' || st === 'done' ? 'default' : 'pointer',
                          }}
                        >
                          {st === 'busy' ? 'Booking…' : st === 'done' ? '✓ Booked' : st === 'error' ? 'Try again' : a.label}
                        </button>
                      )
                    }
                    // E-6: commitment follow-up — done / renegotiate / drop.
                    const cm = /^cm:([^:]+):(done|renegotiate|drop)$/.exec(a.id)
                    if (cm) {
                      const commitmentId = cm[1]
                      const verb = cm[2]
                      const st = actionState[a.id]
                      const doneColor = verb === 'done' ? '#4F7A52' : verb === 'drop' ? 'var(--color-text-secondary)' : 'var(--color-accent)'
                      return (
                        <button
                          key={a.id}
                          data-testid="inbox-commitment-action"
                          disabled={st === 'busy' || st === 'done'}
                          onClick={() => commitmentAction(a.id, commitmentId, verb)}
                          style={{
                            background: st === 'done' ? '#4F7A5218' : '#FFFFFF',
                            border: '1px solid ' + (st === 'done' ? '#4F7A5244' : doneColor + '66'),
                            borderRadius: 8,
                            color: st === 'done' ? '#4F7A52' : doneColor,
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '6px 12px',
                            cursor: st === 'busy' || st === 'done' ? 'default' : 'pointer',
                          }}
                        >
                          {st === 'busy' ? '…' : st === 'done' ? '✓' : st === 'error' ? 'Try again' : a.label}
                        </button>
                      )
                    }
                    return (
                      <span
                        key={a.id}
                        title="One-tap actions arrive in Phase C"
                        style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-accent)', fontSize: 12, padding: '6px 12px' }}
                      >
                        {a.label}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
