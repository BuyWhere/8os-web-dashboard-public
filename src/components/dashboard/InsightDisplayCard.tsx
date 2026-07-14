'use client'

import { useMemo, useState } from 'react'

type InsightPriority = 'high' | 'medium' | 'low'
type FeedbackRating = 1 | -1 | null

const ARCHETYPE_STYLES: Record<string, {
  icon: string
  accent: string
  glow: string
  background: string
  label: string
}> = {
  pioneer: {
    icon: '◈',
    accent: 'var(--skin-color-primary, #34d399)',
    glow: 'var(--skin-glow-primary, rgba(52, 211, 153, 0.18))',
    background: 'var(--skin-gradient-card, linear-gradient(135deg, rgba(11, 26, 22, 0.98), rgba(9, 14, 18, 0.96)))',
    label: 'Momentum',
  },
  sage: {
    icon: '◌',
    accent: 'var(--skin-color-primary, #60a5fa)',
    glow: 'var(--skin-glow-primary, rgba(96, 165, 250, 0.18))',
    background: 'var(--skin-gradient-card, linear-gradient(135deg, rgba(10, 19, 34, 0.98), rgba(8, 12, 20, 0.96)))',
    label: 'Clarity',
  },
  catalyst: {
    icon: '✦',
    accent: 'var(--skin-color-primary, #f97316)',
    glow: 'var(--skin-glow-primary, rgba(249, 115, 22, 0.2))',
    background: 'var(--skin-gradient-card, linear-gradient(135deg, rgba(35, 16, 8, 0.98), rgba(20, 10, 8, 0.96)))',
    label: 'Charge',
  },
  architect: {
    icon: '▣',
    accent: 'var(--skin-color-primary, var(--color-accent))',
    glow: 'var(--skin-glow-primary, rgba(167, 139, 250, 0.2))',
    background: 'var(--skin-gradient-card, linear-gradient(135deg, rgba(20, 15, 35, 0.98), rgba(12, 10, 22, 0.96)))',
    label: 'Structure',
  },
  default: {
    icon: '◐',
    accent: 'var(--skin-color-primary, #f59e0b)',
    glow: 'var(--skin-glow-primary, rgba(245, 158, 11, 0.18))',
    background: 'var(--skin-gradient-card, linear-gradient(135deg, rgba(28, 22, 10, 0.98), rgba(12, 11, 8, 0.96)))',
    label: 'Signal',
  },
}

const PRIORITY_STYLES: Record<InsightPriority, {
  label: string
  color: string
  background: string
}> = {
  high: {
    label: 'High Priority',
    color: '#fca5a5',
    background: 'rgba(127, 29, 29, 0.42)',
  },
  medium: {
    label: 'Medium Priority',
    color: '#fcd34d',
    background: 'rgba(120, 53, 15, 0.42)',
  },
  low: {
    label: 'Low Priority',
    color: '#86efac',
    background: 'rgba(20, 83, 45, 0.38)',
  },
}

interface Props {
  insight: string
  date: string
  archetypeId: string
  archetypeName: string
  isFallback: boolean
  cached: boolean
  initialFeedback: FeedbackRating
  priority: InsightPriority
  priorityReason: string
}

export function InsightDisplayCard({
  insight,
  date,
  archetypeId,
  archetypeName,
  isFallback,
  cached,
  initialFeedback,
  priority,
  priorityReason,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackRating>(initialFeedback)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const style = ARCHETYPE_STYLES[archetypeId] ?? ARCHETYPE_STYLES.default
  const priorityStyle = PRIORITY_STYLES[priority]
  const needsExpansion = insight.length > 190

  const collapsedText = useMemo(() => {
    if (!needsExpansion) return insight
    const sentences = insight.split(/(?<=[.!?])\s+/)
    if (sentences.length > 1) return sentences.slice(0, 2).join(' ')
    return `${insight.slice(0, 190).trimEnd()}...`
  }, [insight, needsExpansion])

  async function submitFeedback(rating: 1 | -1) {
    if (submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/insights/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null
        throw new Error(body?.error ?? 'Failed to save feedback')
      }

      setFeedback(rating)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save feedback')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      style={{
        gridColumn: '1 / -1',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 18,
        border: `1px solid ${style.glow}`,
        background: style.background,
        boxShadow: `0 24px 80px -40px ${style.glow}`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 'auto -48px -72px auto',
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${style.glow} 0%, rgba(0, 0, 0, 0) 72%)`,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', padding: '22px 24px 20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
                padding: '5px 10px',
                borderRadius: 999,
                background: 'var(--color-bg-card)',
                color: style.accent,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              <span>{style.icon}</span>
              <span>{style.label} insight</span>
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 'var(--skin-typo-heading-weight)', color: 'var(--skin-color-text)' }}>
              Daily insight for {archetypeName}
            </h2>
            <p style={{ margin: '6px 0 0', color: 'var(--skin-color-text-secondary)', fontSize: 13 }}>
              {formatInsightDate(date)}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
            <Badge label={priorityStyle.label} color={priorityStyle.color} background={priorityStyle.background} />
            {cached && <Badge label="Cached" color="#93c5fd" background="rgba(30, 58, 138, 0.36)" />}
          </div>
        </div>

        <div
          style={{
            padding: '18px 18px 14px',
            borderRadius: 14,
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p style={{ margin: 0, color: 'var(--skin-color-text)', fontSize: 15, lineHeight: 1.7 }}>
            {expanded ? insight : collapsedText}
          </p>

          {needsExpansion && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              style={{
                marginTop: 12,
                padding: 0,
                border: 'none',
                background: 'transparent',
                color: style.accent,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {expanded ? 'Show less' : 'Read full insight'}
            </button>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginTop: 16,
          }}
        >
          <div>
            <div style={{ color: 'var(--skin-color-text-secondary)', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Why this priority
            </div>
            <div style={{ color: 'var(--skin-color-text-muted)', fontSize: 12 }}>
              {priorityReason}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#6b7280', fontSize: 12 }}>Was this useful?</span>
            <FeedbackButton
              label="Helpful"
              active={feedback === 1}
              disabled={submitting}
              onClick={() => submitFeedback(1)}
            />
            <FeedbackButton
              label="Off"
              active={feedback === -1}
              disabled={submitting}
              onClick={() => submitFeedback(-1)}
            />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 10, color: '#fca5a5', fontSize: 12 }}>
            {error}
          </div>
        )}
      </div>
    </section>
  )
}

function Badge({ label, color, background }: { label: string; color: string; background: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '6px 10px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.03em',
        background,
        color,
      }}
    >
      {label}
    </span>
  )
}

function FeedbackButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        borderRadius: 999,
        border: active ? '1px solid var(--color-text-secondary)' : '1px solid var(--color-border)',
        background: active ? 'var(--color-border)' : 'var(--color-bg-card)',
        color: active ? '#f3f4f6' : '#9ca3af',
        padding: '8px 12px',
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  )
}

/**
 * Deterministic date label for the insight card.
 *
 * `date` is a plain calendar day string (YYYY-MM-DD). Passing it to
 * `new Date(date)` parses it as UTC-midnight; formatting WITHOUT a fixed
 * `timeZone` then uses the runtime's local zone — which is the server's zone
 * during SSR and the browser's zone on hydration. When those differ the
 * rendered weekday/day text diverges, producing React hydration errors
 * (#418/#425 text-content mismatch) on the dashboard + briefing.
 *
 * Pinning `timeZone: 'UTC'` (matching how the string was parsed) makes the
 * server and client emit byte-identical text, eliminating the mismatch.
 */
function formatInsightDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
