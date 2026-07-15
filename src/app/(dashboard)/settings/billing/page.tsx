'use client'

/**
 * /settings/billing — the Billing tab of the unified account hub.
 *
 * Shows the current plan/status/renewal (read-only, via /api/user/billing) and
 * links into the existing Stripe upgrade flow (/dashboard/upgrade). Keeps
 * account IA coherent: billing is reachable from the profile dropdown and the
 * account tabs, not a separate hidden surface.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { SettingsTabs } from '@/components/SettingsTabs'

interface Billing {
  plan: 'free' | 'pro'
  status: string
  currentPeriodEnd: string | null
  lifeReportPurchased: boolean
}

const card: React.CSSProperties = {
  maxWidth: 640,
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
}
const row: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid var(--color-border)',
  fontSize: 14,
}
const btn: React.CSSProperties = {
  display: 'inline-block',
  background: 'var(--color-accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 18px',
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
  cursor: 'pointer',
}

export default function BillingPage() {
  const [billing, setBilling] = useState<Billing | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/billing')
      .then((r) => r.json())
      .then(setBilling)
      .catch(() => setBilling({ plan: 'free', status: 'none', currentPeriodEnd: null, lifeReportPurchased: false }))
      .finally(() => setLoading(false))
  }, [])

  const isPro = billing?.plan === 'pro'

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Sidebar goals={[]} />
      <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 720 }}>
          <SettingsTabs active="/settings/billing" />

          <section style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px', color: 'var(--color-text-primary)' }}>
              Your plan
            </h2>
            {loading ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading…</p>
            ) : (
              <>
                <div style={row}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Plan</span>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--color-text-primary)' }}>
                    {isPro ? 'Pro' : 'Free'}
                  </span>
                </div>
                <div style={row}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Status</span>
                  <span style={{ textTransform: 'capitalize', color: 'var(--color-text-primary)' }}>{billing?.status ?? 'none'}</span>
                </div>
                {billing?.currentPeriodEnd && (
                  <div style={row}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{isPro ? 'Renews' : 'Ends'}</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{new Date(billing.currentPeriodEnd).toLocaleDateString()}</span>
                  </div>
                )}
                <div style={{ ...row, borderBottom: 'none' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Full BaZi Life Report</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{billing?.lifeReportPurchased ? 'Purchased' : 'Not purchased'}</span>
                </div>
              </>
            )}
          </section>

          <section style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px', color: 'var(--color-text-primary)' }}>
              {isPro ? 'Manage your subscription' : 'Upgrade to Pro'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 14px' }}>
              {isPro
                ? 'Change your plan or add the Full BaZi Life Report.'
                : 'Unlock the full 8os experience, Pro is $18/mo or $119/yr.'}
            </p>
            <Link href="/dashboard/upgrade" style={btn}>
              {isPro ? 'Manage plan' : 'View plans'}
            </Link>
          </section>
        </div>
      </main>
    </div>
  )
}
