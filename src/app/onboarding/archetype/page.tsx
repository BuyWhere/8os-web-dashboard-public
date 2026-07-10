'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArchetypeRevealedTracker } from '@/components/ArchetypeRevealedTracker'
import { ARCHETYPES, getArchetypeById } from '@/lib/archetype'
import type { ArchetypeDefinition } from '@/lib/archetype'

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
  wood: '#22c55e', fire: '#f97316', earth: '#d97706', metal: '#94a3b8', water: '#3b82f6',
}
const ELEMENT_ICONS: Record<string, string> = {
  wood: '🌱', fire: '🔥', earth: '🌍', metal: '⚙️', water: '🌊',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArchetypePage() {
  const router = useRouter()
  const [data, setData] = useState<ArchetypeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    async function load() {
      // Try localStorage first (set by quiz page after calculation)
      try {
        const cached = localStorage.getItem('8os_archetype')
        if (cached) {
          setData(JSON.parse(cached))
          setLoading(false)
          setTimeout(() => setRevealed(true), 100)
          return
        }
      } catch {}

      // Fetch from server
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
      <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 2s linear infinite' }}>🌀</div>
          <p style={{ color: '#999', fontSize: '0.9rem' }}>Computing your archetype...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <p style={{ color: '#f97316', marginBottom: '1rem' }}>{error || 'No archetype data found.'}</p>
          <button onClick={() => router.push('/onboarding/birth')} style={{ padding: '0.75rem 1.5rem', background: '#111', border: '1px solid #222', borderRadius: '8px', color: '#aaa', cursor: 'pointer' }}>
            ← Start over
          </button>
        </div>
      </div>
    )
  }

  const archDef = getArchetypeById(data.archetypeId)
  const secondaryDef = data.hybridSecondary ? getArchetypeById(data.hybridSecondary) : null
  const color = archDef?.color ?? '#a855f7'
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
      background: '#080808',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '3rem 1.5rem 6rem',
      opacity: revealed ? 1 : 0,
      transition: 'opacity 0.6s ease',
    }}>
      <ArchetypeRevealedTracker archetype={data.archetypeId} />
      <div style={{ maxWidth: 560, width: '100%' }}>

        {/* Archetype card */}
        <div style={{
          padding: '2.5rem',
          background: `${color}08`,
          border: `1px solid ${color}30`,
          borderRadius: '20px',
          textAlign: 'center',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Glow */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: `${color}10`,
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }} />

          <div style={{ fontSize: '4rem', marginBottom: '1rem', position: 'relative' }}>
            {archDef?.icon ?? '🌀'}
          </div>

          <div style={{
            fontSize: '0.7rem',
            color: color,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '0.5rem',
            position: 'relative',
          }}>
            Your Archetype
          </div>

          <h1 style={{
            fontSize: '2.25rem',
            fontWeight: 800,
            color: '#ededed',
            letterSpacing: '-0.03em',
            marginBottom: '0.5rem',
            position: 'relative',
          }}>
            {data.archetypeName}
          </h1>

          <p style={{ color: color, fontSize: '0.95rem', fontStyle: 'italic', marginBottom: '1rem', position: 'relative' }}>
            &ldquo;{archDef?.tagline}&rdquo;
          </p>

          <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.6, position: 'relative' }}>
            {archDef?.description}
          </p>

          {/* Hybrid notice */}
          {data.isHybrid && secondaryDef && (
            <div style={{
              marginTop: '1.25rem',
              padding: '0.75rem 1rem',
              background: '#0a0a0a',
              border: '1px solid #1e1e1e',
              borderRadius: '10px',
              fontSize: '0.8rem',
              color: '#888',
              position: 'relative',
            }}>
              Strong secondary: <span style={{ color: secondaryDef.color }}>{secondaryDef.name}</span>
            </div>
          )}

          {/* Confidence */}
          <div style={{ marginTop: '1.25rem', position: 'relative' }}>
            <div style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Match Confidence
            </div>
            <div style={{ height: 4, background: '#1a1a1a', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round(data.confidence * 100)}%`, background: color, borderRadius: '999px' }} />
            </div>
            <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.35rem' }}>
              {Math.round(data.confidence * 100)}%
            </div>
          </div>
        </div>

        {/* BaZi Pillars */}
        {data.bazi && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
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
                  background: '#0f0f0f',
                  border: '1px solid #1e1e1e',
                  borderRadius: '10px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{p.label}</div>
                  <div style={{ fontSize: '1.5rem', color: '#ededed' }}>{p.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personality breakdown */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Personality Profile
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <DualBar label="Systematic" left={pv.systematic} leftLabel="Systematic" right={pv.intuitive} rightLabel="Intuitive" color={color} />
            <DualBar label="Goal-Driven" left={pv.goalDriven} leftLabel="Goal-Driven" right={pv.processDriven} rightLabel="Process-Driven" color={color} />
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
            <div style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Dominant Elements
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {data.dominantElements.map(el => (
                <div key={el} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: `${ELEMENT_COLORS[el] ?? '#555'}15`,
                  border: `1px solid ${ELEMENT_COLORS[el] ?? '#555'}40`,
                  borderRadius: '999px',
                  fontSize: '0.85rem',
                  color: ELEMENT_COLORS[el] ?? '#aaa',
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
          <div style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Share your reveal
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              onClick={handleShareOnX}
              style={{
                padding: '0.9rem 1rem',
                background: `${color}16`,
                color: '#ededed',
                border: `1px solid ${color}40`,
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
                background: '#0f0f0f',
                color: '#ededed',
                border: '1px solid #1e1e1e',
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

        {/* CTA */}
        <button
          onClick={handleContinue}
          style={{
            width: '100%',
            padding: '1rem',
            background: color,
            color: '#000',
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

        <p style={{ textAlign: 'center', color: '#333', fontSize: '0.75rem', marginTop: '0.75rem' }}>
          Next: Define your goals and domains
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
    <div style={{ padding: '0.875rem', background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
        <span style={{ color: left >= right ? color : '#444', fontWeight: 600 }}>{leftLabel}</span>
        <span style={{ color: right > left ? color : '#444', fontWeight: 600 }}>{rightLabel}</span>
      </div>
      <div style={{ height: 4, background: '#1a1a1a', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
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
      <div style={{ marginTop: '0.35rem', fontSize: '0.7rem', color: '#888', textAlign: 'center' }}>
        {leftPct}% {dominant}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '0.75rem 1rem', background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '10px' }}>
      <div style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', color: '#ccc', fontWeight: 600 }}>{value}</div>
    </div>
  )
}

function capitalize(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}
