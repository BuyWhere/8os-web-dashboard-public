'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArchetypeRevealedTracker } from '@/components/ArchetypeRevealedTracker'
import { ARCHETYPES, getArchetypeById } from '@/lib/archetype'
import type { ArchetypeDefinition } from '@/lib/archetype'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'

// ─── Warm-editorial tokens ──────────────────────────────────────────────────
const CREAM = 'var(--color-bg-primary)'
const WHITE = 'var(--color-bg-card)'
const INK = 'var(--color-text-primary)'
const WARM_GRAY = 'var(--color-text-secondary)'
const MUTED = 'var(--color-text-muted)'
const GOLD = 'var(--color-accent)'
const HAIRLINE = 'var(--color-border)'
const TRACK = 'var(--color-border)'
const SERIF = 'var(--font-serif), Georgia, serif'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArchetypeData {
  archetypeId: string
  archetypeName: string
  confidence: number
  isHybrid: boolean
  hybridSecondary?: string
  dominantElements: string[]
  personalityVector: {
    systematic: number
    intuitive: number
    goalDriven: number
    processDriven: number
    dominantEnergy: string
    dominantStress: string
    leaderCharismatic: number
    leaderDemonstrative: number
    leaderSupportive: number
    leaderStrategic: number
    rechargeExtrovert: number
    rechargeIntrovert: number
    rechargeCreative: number
    rechargeKinesthetic: number
    futureFocused: number
  }
  bazi?: {
    dayMaster: string
    dayElement: string
    dayPolarity: string
    dominantElement: string
    pillars: { year: string; month: string; day: string; hour: string | null }
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ELEMENT_COLORS: Record<string, string> = {
  wood: '#4F7A52', fire: '#B5502F', earth: 'var(--color-accent)', metal: 'var(--color-text-muted)', water: '#3E6B8C',
}
const ELEMENT_ICONS: Record<string, string> = {
  wood: '🌱', fire: '🔥', earth: '🌍', metal: '⚙️', water: '🌊',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArchetypePage() {
  const router = useRouter()
  const [data, setData] = useState<ArchetypeData | null>(null)
  const [osConfig, setOsConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    async function load() {
      // 1. Try full OS config from os-generator (set by quiz page)
      try {
        const osConfigRaw = localStorage.getItem('8os_config')
        if (osConfigRaw) {
          const osConfig = JSON.parse(osConfigRaw)
          // Map os-generator response to the archetype display format
          const mapped: ArchetypeData = {
            archetypeId: osConfig.user.archetype.toLowerCase().replace(/\s+/g, '_'),
            archetypeName: osConfig.user.archetype,
            confidence: 1.0,
            isHybrid: false,
            dominantElements: [osConfig.user.bazi_element.toLowerCase()],
            personalityVector: {
              systematic: 5, intuitive: 5, goalDriven: 5, processDriven: 5,
              dominantEnergy: 'balanced', dominantStress: 'balanced',
              leaderCharismatic: 5, leaderDemonstrative: 5, leaderSupportive: 5, leaderStrategic: 5,
              rechargeExtrovert: 5, rechargeIntrovert: 5, rechargeCreative: 5, rechargeKinesthetic: 5,
              futureFocused: 5,
            },
            bazi: {
              dayMaster: '', dayElement: osConfig.user.bazi_element.toLowerCase(),
              dayPolarity: 'yang', dominantElement: osConfig.user.bazi_element.toLowerCase(),
              pillars: { year: '', month: '', day: '', hour: null },
            },
          }
          setData(mapped)
          setOsConfig(osConfig)
          setLoading(false)
          setTimeout(() => setRevealed(true), 100)
          return
        }
      } catch {}

      // 2. Try local archetype (backward compat)
      try {
        const cached = localStorage.getItem('8os_archetype')
        if (cached) {
          setData(JSON.parse(cached))
          setLoading(false)
          setTimeout(() => setRevealed(true), 100)
          return
        }
      } catch {}

      // 3. Fetch from server
      try {
        const res = await fetch('/api/onboarding/archetype')
        if (res.ok) {
          const json = await res.json()
          setData(json)
          setTimeout(() => setRevealed(true), 100)
        } else {
          setError('Could not load your archetype. Please complete the quiz first.')
        }
      } catch {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleContinue() {
    router.push('/onboarding/goals')
  }

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 2s linear infinite' }}>🌀</div>
          <p style={{ color: WARM_GRAY, fontSize: '0.95rem' }}>Revealing your archetype...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <p style={{ color: '#B5502F', marginBottom: '1rem' }}>{error || 'No archetype data found.'}</p>
          <button onClick={() => router.push('/onboarding/birth')} style={{ padding: '0.75rem 1.5rem', background: WHITE, border: `1px solid ${HAIRLINE}`, borderRadius: '8px', color: WARM_GRAY, cursor: 'pointer', fontWeight: 600 }}>
            ← Start over
          </button>
        </div>
      </div>
    )
  }

  const archDef = getArchetypeById(data.archetypeId)
  // Anchor the reveal in the warm palette; use the archetype's own hue only as a
  // subtle accent so the page stays on-brand even for off-palette definitions.
  const accent = archDef?.color ?? GOLD
  const shareUrl = typeof window === 'undefined'
    ? 'https://8os.ai/onboarding/archetype'
    : window.location.href
  const shareText = `I just got my 8os archetype: ${data.archetypeName}. Discover yours on 8os.ai.`

  const pv = data.personalityVector
  const dominantLeader = [
    ['Charismatic', pv.leaderCharismatic],
    ['Demonstrative', pv.leaderDemonstrative],
    ['Supportive', pv.leaderSupportive],
    ['Strategic', pv.leaderStrategic],
  ].sort((a, b) => (b[1] as number) - (a[1] as number))[0][0] as string

  const dominantRecharge = [
    ['Social', pv.rechargeExtrovert],
    ['Introspective', pv.rechargeIntrovert],
    ['Creative', pv.rechargeCreative],
    ['Kinesthetic', pv.rechargeKinesthetic],
  ].sort((a, b) => (b[1] as number) - (a[1] as number))[0][0] as string

  const handleShareOnX = () => {
    if (typeof window === 'undefined') return
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleCopyLink = async () => {
    if (typeof window === 'undefined') return
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: CREAM,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '3rem 1.5rem 6rem',
      opacity: revealed ? 1 : 0,
      transform: revealed ? 'translateY(0)' : 'translateY(8px)',
      transition: 'opacity 0.6s ease, transform 0.6s ease',
    }}>
      <ArchetypeRevealedTracker archetype={data.archetypeId} />
      <div style={{ maxWidth: 560, width: '100%' }}>

        {/* Shared step indicator */}
        <OnboardingProgress current="archetype" />

        {/* Payoff intro line */}
        <p style={{ textAlign: 'center', color: WARM_GRAY, fontSize: '0.95rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          Here&apos;s the result — the archetype your birth chart and answers point to. This shapes
          how your OS plans, prompts, and paces you.
        </p>

        {/* Archetype card — the reveal */}
        <div style={{
          padding: '2.75rem 2.25rem',
          background: WHITE,
          border: `1px solid ${HAIRLINE}`,
          borderRadius: '20px',
          textAlign: 'center',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(34, 31, 26, 0.06)',
        }}>
          {/* Soft accent wash */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 5,
            background: `linear-gradient(90deg, ${GOLD}, ${accent})`,
          }} />

          <div style={{ fontSize: '4rem', marginBottom: '1rem', position: 'relative' }}>
            {archDef?.icon ?? '🌀'}
          </div>

          <div style={{
            fontSize: '0.7rem',
            color: GOLD,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: '0.5rem',
            position: 'relative',
            fontWeight: 700,
          }}>
            Your Archetype
          </div>

          <h1 style={{
            fontFamily: SERIF,
            fontSize: '2.4rem',
            fontWeight: 600,
            color: INK,
            letterSpacing: '-0.02em',
            marginBottom: '0.6rem',
            position: 'relative',
            lineHeight: 1.05,
          }}>
            {data.archetypeName}
          </h1>

          <p style={{ color: GOLD, fontSize: '0.98rem', fontStyle: 'italic', marginBottom: '1rem', position: 'relative' }}>
            &ldquo;{archDef?.tagline}&rdquo;
          </p>

          <p style={{ color: WARM_GRAY, fontSize: '0.95rem', lineHeight: 1.65, position: 'relative', maxWidth: 420, margin: '0 auto' }}>
            {archDef?.description}
          </p>

          {/* Hybrid notice */}
          {data.isHybrid && data.hybridSecondary && (() => {
            const secondaryDef = getArchetypeById(data.hybridSecondary)
            return secondaryDef ? (
              <div style={{
                marginTop: '1.25rem',
                padding: '0.75rem 1rem',
                background: CREAM,
                border: `1px solid ${HAIRLINE}`,
                borderRadius: '10px',
                fontSize: '0.82rem',
                color: WARM_GRAY,
                position: 'relative',
              }}>
                Strong secondary: <span style={{ color: GOLD, fontWeight: 600 }}>{secondaryDef.name}</span>
              </div>
            ) : null
          })()}

          {/* Confidence */}
          <div style={{ marginTop: '1.5rem', position: 'relative' }}>
            <div style={{ fontSize: '0.68rem', color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 700 }}>
              Match Confidence
            </div>
            <div style={{ height: 5, background: TRACK, borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round(data.confidence * 100)}%`, background: GOLD, borderRadius: '999px' }} />
            </div>
            <div style={{ fontSize: '0.82rem', color: WARM_GRAY, marginTop: '0.35rem', fontWeight: 600 }}>
              {Math.round(data.confidence * 100)}%
            </div>
          </div>
        </div>

        {/* BaZi Pillars */}
        {data.bazi && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.7rem', color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: 700 }}>
              Your Four Pillars (八字)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: data.bazi.pillars.hour ? 'repeat(4,1fr)' : 'repeat(3,1fr)', gap: '0.5rem' }}>
              {[
                { label: 'Year', value: data.bazi.pillars.year },
                { label: 'Month', value: data.bazi.pillars.month },
                { label: 'Day', value: data.bazi.pillars.day },
                ...(data.bazi.pillars.hour ? [{ label: 'Hour', value: data.bazi.pillars.hour }] : []),
              ].map(p => (
                <div key={p.label} style={{
                  padding: '0.875rem',
                  background: WHITE,
                  border: `1px solid ${HAIRLINE}`,
                  borderRadius: '10px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.63rem', color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 700 }}>{p.label}</div>
                  <div style={{ fontFamily: SERIF, fontSize: '1.5rem', color: INK }}>{p.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personality breakdown */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.7rem', color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem', fontWeight: 700 }}>
            Personality Profile
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <DualBar label="Systematic" left={pv.systematic} leftLabel="Systematic" right={pv.intuitive} rightLabel="Intuitive" color={GOLD} />
            <DualBar label="Goal-Driven" left={pv.goalDriven} leftLabel="Goal-Driven" right={pv.processDriven} rightLabel="Process-Driven" color={GOLD} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <StatCard label="Peak Energy" value={capitalize(pv.dominantEnergy)} />
            <StatCard label="Under Stress" value={capitalize(pv.dominantStress)} />
            <StatCard label="Leadership" value={dominantLeader} />
            <StatCard label="Recharge" value={dominantRecharge} />
          </div>
        </div>

        {/* Dominant elements */}
        {data.dominantElements.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.7rem', color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: 700 }}>
              Dominant Elements
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {data.dominantElements.map(el => (
                <div key={el} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: `${ELEMENT_COLORS[el] ?? GOLD}15`,
                  border: `1px solid ${ELEMENT_COLORS[el] ?? GOLD}40`,
                  borderRadius: '999px',
                  fontSize: '0.85rem',
                  color: ELEMENT_COLORS[el] ?? WARM_GRAY,
                  fontWeight: 600,
                }}>
                  <span>{ELEMENT_ICONS[el] ?? '◇'}</span>
                  <span>{capitalize(el)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.7rem', color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: 700 }}>
            Share your reveal
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              onClick={handleShareOnX}
              style={{
                padding: '0.9rem 1rem',
                background: `${GOLD}14`,
                color: INK,
                border: `1px solid ${GOLD}45`,
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Share on X
            </button>
            <button
              onClick={handleCopyLink}
              style={{
                padding: '0.9rem 1rem',
                background: WHITE,
                color: INK,
                border: `1px solid ${HAIRLINE}`,
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Copy link
            </button>
          </div>
        </div>

        {/* OS Config — live from os-generator */}
        {osConfig && (
          <div style={{
            background: WHITE,
            border: `1px solid ${HAIRLINE}`,
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}>
            <h3 style={{ fontSize: '0.7rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '1rem', fontWeight: 700 }}>
              Your OS Profile
            </h3>

            {/* Tone */}
            {osConfig.tone && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.68rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Tone</div>
                <div style={{ fontSize: '0.9rem', color: INK, fontWeight: 500 }}>{osConfig.tone}</div>
              </div>
            )}

            {/* Workflow */}
            {osConfig.workflow_description?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.68rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontWeight: 700 }}>Workflow</div>
                {osConfig.workflow_description.map((w: string, i: number) => (
                  <div key={i} style={{ fontSize: '0.82rem', color: WARM_GRAY, marginBottom: '0.25rem', paddingLeft: '0.6rem', borderLeft: `2px solid ${GOLD}55` }}>
                    {w}
                  </div>
                ))}
              </div>
            )}

            {/* Buckets */}
            {osConfig.buckets?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.68rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontWeight: 700 }}>Your Buckets</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {osConfig.buckets.map((b: any) => (
                    <div key={b.id} style={{
                      background: CREAM,
                      border: `1px solid ${HAIRLINE}`,
                      borderRadius: '8px',
                      padding: '0.6rem',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '0.72rem', color: INK, fontWeight: 600 }}>{b.label}</div>
                      <div style={{ fontSize: '0.62rem', color: MUTED, marginTop: '0.2rem' }}>{b.initial_projects.length} projects</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Energy Hours */}
            {osConfig.energy_hours && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.68rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem', fontWeight: 700 }}>Peak Energy</div>
                <div style={{ fontSize: '0.82rem', color: WARM_GRAY }}>
                  {osConfig.energy_hours.peak_windows.join(' · ')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleContinue}
          style={{
            width: '100%',
            padding: '1rem',
            background: GOLD,
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '-0.01em',
          }}
        >
          Build my OS →
        </button>

        <p style={{ textAlign: 'center', color: MUTED, fontSize: '0.78rem', marginTop: '0.75rem' }}>
          Next: set your goals
        </p>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DualBar({ label, left, leftLabel, right, rightLabel, color }: {
  label: string
  left: number
  leftLabel: string
  right: number
  rightLabel: string
  color: string
}) {
  const leftPct = Math.round(left * 100)
  const dominant = left >= right ? leftLabel : rightLabel
  return (
    <div style={{ padding: '0.875rem', background: WHITE, border: `1px solid ${HAIRLINE}`, borderRadius: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
        <span style={{ color: left >= right ? color : MUTED, fontWeight: 600 }}>{leftLabel}</span>
        <span style={{ color: right > left ? color : MUTED, fontWeight: 600 }}>{rightLabel}</span>
      </div>
      <div style={{ height: 5, background: TRACK, borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${leftPct}%`,
          background: color,
          borderRadius: '999px',
        }} />
      </div>
      <div style={{ marginTop: '0.35rem', fontSize: '0.7rem', color: MUTED, textAlign: 'center' }}>
        {leftPct}% {dominant}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '0.75rem 1rem', background: WHITE, border: `1px solid ${HAIRLINE}`, borderRadius: '10px' }}>
      <div style={{ fontSize: '0.63rem', color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: '0.9rem', color: INK, fontWeight: 600 }}>{value}</div>
    </div>
  )
}

function capitalize(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}
