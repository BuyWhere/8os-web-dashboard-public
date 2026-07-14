/**
 * /settings/channels — delivery-channel settings (OS-2652).
 *
 * Shows the always-on web inbox + Telegram link status. "Link Telegram" calls
 * POST /api/telegram/link and renders the t.me/<bot>?start=<token> deep link
 * (or "Telegram not configured yet" when no bot username is set).
 *
 * NEW page on purpose — /settings/profile is owned by a concurrent build and
 * is not touched. Auth: /settings(.*) is Clerk-middleware-protected; data goes
 * through /api/telegram/link (requireAuth, userId-scoped).
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/dashboard/Sidebar'

interface ChannelStatus {
  webInbox: { enabled: boolean }
  telegram: { botConfigured: boolean; botUsername: string | null; linked: boolean }
}

interface LinkResponse {
  configured: boolean
  botUsername?: string
  deepLink?: string
  expiresAt?: string
  message?: string
}

const card: React.CSSProperties = {
  maxWidth: 640, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
  borderRadius: 12, padding: 20, marginBottom: 16,
}

export default function ChannelsSettingsPage() {
  const [status, setStatus] = useState<ChannelStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [linkRes, setLinkRes] = useState<LinkResponse | null>(null)
  const [linking, setLinking] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/telegram/link', { cache: 'no-store' })
      if (!res.ok) throw new Error(`status ${res.status}`)
      setStatus(await res.json())
    } catch (e) {
      console.error('Failed to load channel status:', e)
      setError('Could not load channel status. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function linkTelegram() {
    setLinking(true)
    setLinkRes(null)
    try {
      const res = await fetch('/api/telegram/link', { method: 'POST' })
      setLinkRes(await res.json())
    } catch {
      setLinkRes({ configured: false, message: 'Could not reach the link endpoint. Try again.' })
    } finally {
      setLinking(false)
    }
  }

  const tg = status?.telegram

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Sidebar goals={[]} />

      <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 24, maxWidth: 640 }}>
          <Link href="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 4 }}>← Dashboard</Link>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-serif), Georgia, serif' }}>Channels</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Where 8os reaches you, briefs, nudges and one-tap actions
          </p>
        </div>

        {error && (
          <div style={{ maxWidth: 640, background: '#FBEFE9', border: '1px solid #E3C4B6', borderRadius: 8, color: '#B5502F', padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Web inbox, always on */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>✉</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Web inbox</div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2 }}>
                Every message lands in your <Link href="/dashboard/inbox" style={{ color: 'var(--color-accent)' }}>in-app inbox</Link>, the channel of record.
              </div>
            </div>
            <span style={{ background: '#EAF1EA', border: '1px solid #4F7A5244', color: '#4F7A52', borderRadius: 8, fontSize: 11, fontWeight: 700, padding: '4px 10px' }}>
              ALWAYS ON
            </span>
          </div>
        </div>

        {/* Telegram */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>✈</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Telegram</div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2 }}>
                Get briefs in Telegram, capture tasks by texting the bot, act with one tap.
              </div>
            </div>
            {loading ? (
              <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>…</span>
            ) : tg?.linked ? (
              <span style={{ background: '#EAF1EA', border: '1px solid #4F7A5244', color: '#4F7A52', borderRadius: 8, fontSize: 11, fontWeight: 700, padding: '4px 10px' }}>
                LINKED ✓
              </span>
            ) : (
              <span style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: 8, fontSize: 11, fontWeight: 700, padding: '4px 10px' }}>
                NOT LINKED
              </span>
            )}
          </div>

          {!loading && !tg?.linked && (
            <div style={{ marginTop: 14 }}>
              {tg && !tg.botUsername ? (
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Telegram not configured yet.</div>
              ) : (
                <>
                  <button
                    onClick={linkTelegram}
                    disabled={linking}
                    style={{ background: 'var(--color-accent)', border: 'none', borderRadius: 8, color: '#FFFFFF', fontSize: 13, fontWeight: 600, padding: '9px 16px', cursor: 'pointer', opacity: linking ? 0.6 : 1 }}
                  >
                    {linking ? 'Generating link…' : 'Link Telegram'}
                  </button>
                  {tg && !tg.botConfigured && (
                    <div style={{ color: '#8a6d1a', fontSize: 12, marginTop: 8 }}>
                      The bot isn&apos;t live yet, the link will complete once Telegram is switched on.
                    </div>
                  )}
                </>
              )}

              {linkRes && (
                <div style={{ marginTop: 12, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '12px 14px', fontSize: 13 }}>
                  {linkRes.configured && linkRes.deepLink ? (
                    <>
                      <div style={{ color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                        Open this link in Telegram and press <b>Start</b> (expires in 10 minutes):
                      </div>
                      <a href={linkRes.deepLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)', wordBreak: 'break-all' }}>
                        {linkRes.deepLink}
                      </a>
                    </>
                  ) : (
                    <div style={{ color: 'var(--color-text-secondary)' }}>{linkRes.message ?? 'Telegram not configured yet'}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {!loading && tg?.linked && (
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 12 }}>
              Bot: @{tg.botUsername ?? '-'} · send it any to-do as plain text, or /brief, /shutdown, /align.
            </div>
          )}
        </div>

        <div style={{ maxWidth: 640, color: 'var(--color-text-muted)', fontSize: 12 }}>
          WhatsApp is on the roadmap, it plugs into the same delivery layer with zero changes to your setup.
        </div>
      </main>
    </div>
  )
}
