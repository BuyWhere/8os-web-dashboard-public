/**
 * "Your Phases" — compact 5-layer BaZi phase panel for the dashboard.
 * Server component: receives precomputed phase data (no client JS needed).
 * Archetype-skinned via the same --skin-* CSS variables the rest of the dashboard uses.
 *
 * Layers (owner): Couple-of-years (大运) / Year (流年) / Month (流月) / Week (derived) / Day (日).
 * Honesty: confidence badge per layer; the week is explicitly labelled a derivation.
 */
import type { PhaseLayer, Verdict, Confidence } from '@/lib/bazi-phases'

const VERDICT_COLOR: Record<Verdict, string> = {
  favorable: '#22c55e',
  unfavorable: '#f59e0b',
  neutral: 'var(--color-text-secondary)',
}
const VERDICT_LABEL: Record<Verdict, string> = {
  favorable: 'Favorable',
  unfavorable: 'Headwind',
  neutral: 'Neutral',
}
const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'high confidence',
  medium: 'medium confidence',
  low: 'soft tint',
  derived: 'derived horizon',
}

export interface PhasesPanelData {
  asOf: string
  favorable: string[]
  unfavorable: string[]
  luckPillar: { pillar: string | null; activeHalf?: string; yearsRemaining?: number; direction: string }
  layers: PhaseLayer[]
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

export function PhasesPanel({ data, gapPx = 20 }: { data: PhasesPanelData; gapPx?: number }) {
  return (
    <div
      style={{
        background: 'var(--skin-card-bg)',
        border: '1px solid var(--skin-card-border)',
        borderRadius: 'var(--skin-radius-card)',
        padding: 20,
        marginBottom: gapPx,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 'var(--skin-typo-heading-weight)', color: 'var(--skin-color-text)' }}>
          Your Phases
        </h2>
        <span style={{ fontSize: 11, color: 'var(--skin-color-text-muted)' }}>
          favorable: {data.favorable.map(cap).join(', ') || '-'} · as of {data.asOf}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.layers.map((L) => (
          <div
            key={L.key}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              paddingLeft: 12,
              borderLeft: `3px solid ${VERDICT_COLOR[L.verdict]}`,
            }}
          >
            <div style={{ minWidth: 96, flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--skin-color-text)' }}>{L.label}</div>
              <div style={{ fontSize: 10, color: 'var(--skin-color-text-muted)' }}>
                {L.pillar ?? 'planning'} · {CONFIDENCE_LABEL[L.confidence]}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                  color: VERDICT_COLOR[L.verdict],
                  marginRight: 6,
                }}
              >
                {VERDICT_LABEL[L.verdict]}
              </span>
              <span style={{ fontSize: 12, color: 'var(--skin-color-text-secondary)', lineHeight: 1.45 }}>
                {L.guidance}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, fontSize: 10, color: 'var(--skin-color-text-muted)', fontStyle: 'italic' }}>
        Grounded in traditional BaZi (Luck Pillar 大运, annual 流年, monthly 流月, daily 日 transits).
        The week is an 8os planning horizon, not a pillar.
      </div>
    </div>
  )
}
