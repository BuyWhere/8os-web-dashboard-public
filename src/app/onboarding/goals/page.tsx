'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DOMAINS } from '@/lib/domains'
import { getOnboardingState, saveOnboardingState } from '@/lib/storage'
import type { DomainId } from '@/lib/types'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'

// ─── Warm-editorial tokens ──────────────────────────────────────────────────
const CREAM = 'var(--color-bg-primary)'
const WHITE = 'var(--color-bg-card)'
const INK = 'var(--color-text-primary)'
const WARM_GRAY = 'var(--color-text-secondary)'
const MUTED = 'var(--color-text-muted)'
const GOLD = 'var(--color-accent)'
const HAIRLINE = 'var(--color-border)'
const SERIF = 'var(--font-serif), Georgia, serif'

export default function GoalsPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<DomainId[]>([])
  const [hovered, setHovered] = useState<DomainId | null>(null)

  useEffect(() => {
    const state = getOnboardingState()
    if (state.selectedDomains.length > 0) {
      setSelected(state.selectedDomains)
    }
  }, [])

  function toggle(id: DomainId) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(d => d !== id)
      if (prev.length >= 5) return prev
      return [...prev, id]
    })
  }

  function handleContinue() {
    if (selected.length === 0) return
    saveOnboardingState({ selectedDomains: selected })
    router.push('/onboarding/define')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: CREAM,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '3rem 1.5rem 5rem',
    }}>
      {/* Shared step indicator */}
      <OnboardingProgress current="goals" />

      {/* Header */}
      <div style={{ maxWidth: 680, width: '100%', marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: SERIF,
          fontSize: 'clamp(1.75rem, 5vw, 2.6rem)',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          marginBottom: '1rem',
          color: INK,
        }}>
          What areas of your life <br />are you focused on?
        </h1>
        <p style={{ color: WARM_GRAY, fontSize: '1rem', lineHeight: 1.6, maxWidth: 460, margin: '0 auto' }}>
          Pick 1–5 domains that matter most right now. Your OS builds goals, projects, and daily
          tasks around exactly these — nothing you don&apos;t choose.
        </p>
      </div>

      {/* Domain Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1rem',
        maxWidth: 680,
        width: '100%',
        marginBottom: '2.5rem',
      }}>
        {DOMAINS.map((domain) => {
          const isSelected = selected.includes(domain.id)
          const isHovered = hovered === domain.id
          const orderIndex = selected.indexOf(domain.id)

          return (
            <button
              key={domain.id}
              onClick={() => toggle(domain.id)}
              onMouseEnter={() => setHovered(domain.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                position: 'relative',
                background: isSelected ? `${domain.color}12` : WHITE,
                border: `1px solid ${isSelected ? domain.color : isHovered ? 'var(--color-border)' : HAIRLINE}`,
                borderRadius: '14px',
                padding: '1.25rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isSelected ? `0 6px 20px ${domain.color}22` : '0 1px 2px rgba(34,31,26,0.03)',
              }}
            >
              {/* Order badge */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  width: 20,
                  height: 20,
                  background: domain.color,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: '#fff',
                }}>
                  {orderIndex + 1}
                </div>
              )}

              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{domain.icon}</div>
              <div style={{
                fontFamily: SERIF,
                fontSize: '1.05rem',
                fontWeight: 600,
                color: isSelected ? domain.color : INK,
                marginBottom: '0.25rem',
                letterSpacing: '-0.01em',
              }}>
                {domain.label}
              </div>
              <div style={{ fontSize: '0.78rem', color: WARM_GRAY, lineHeight: 1.45 }}>
                {domain.description}
              </div>
            </button>
          )
        })}
      </div>

      {/* Counter + CTA */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        maxWidth: 680,
        width: '100%',
      }}>
        <div style={{ fontSize: '0.875rem', color: MUTED, fontWeight: 500 }}>
          {selected.length === 0
            ? 'Select at least 1 domain'
            : selected.length === 5
            ? '5 domains selected (maximum)'
            : `${selected.length} domain${selected.length > 1 ? 's' : ''} selected · ${5 - selected.length} more allowed`}
        </div>

        <button
          onClick={handleContinue}
          disabled={selected.length === 0}
          style={{
            width: '100%',
            padding: '1rem',
            background: selected.length > 0 ? GOLD : '#E3D8C4',
            color: selected.length > 0 ? '#fff' : '#A99A82',
            border: 'none',
            borderRadius: '12px',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
            letterSpacing: '-0.01em',
          }}
        >
          Define my goals →
        </button>
      </div>
    </div>
  )
}
