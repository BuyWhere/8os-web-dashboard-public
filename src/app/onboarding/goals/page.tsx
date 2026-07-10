'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DOMAINS } from '@/lib/domains'
import { getOnboardingState, saveOnboardingState } from '@/lib/storage'
import type { DomainId } from '@/lib/types'

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
      background: '#080808',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '3rem 1.5rem',
    }}>
      {/* Header */}
      <div style={{ maxWidth: 680, width: '100%', marginBottom: '3rem', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#111',
          border: '1px solid #1e1e1e',
          borderRadius: '999px',
          padding: '0.375rem 1rem',
          marginBottom: '2rem',
          fontSize: '0.75rem',
          color: '#888',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          <span style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
          Step 1 of 6 — Goal Domains
        </div>

        <h1 style={{
          fontSize: 'clamp(1.75rem, 5vw, 2.75rem)',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          marginBottom: '1rem',
          color: '#ededed',
        }}>
          What areas of your life<br />are you forging?
        </h1>
        <p style={{ color: '#888', fontSize: '1rem', lineHeight: 1.6 }}>
          Select 1–5 domains. Your OS will generate goals, projects, and tasks around them.
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
                background: isSelected ? `${domain.color}15` : isHovered ? '#141414' : '#0f0f0f',
                border: `1px solid ${isSelected ? domain.color : isHovered ? '#2a2a2a' : '#1a1a1a'}`,
                borderRadius: '12px',
                padding: '1.25rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isSelected ? `0 0 20px ${domain.color}20` : 'none',
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
                fontSize: '1rem',
                fontWeight: 600,
                color: isSelected ? domain.color : '#ededed',
                marginBottom: '0.25rem',
                letterSpacing: '-0.01em',
              }}>
                {domain.label}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#999', lineHeight: 1.4 }}>
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
        <div style={{ fontSize: '0.875rem', color: '#888' }}>
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
            padding: '0.875rem',
            background: selected.length > 0 ? '#ededed' : '#1a1a1a',
            color: selected.length > 0 ? '#080808' : '#333',
            border: 'none',
            borderRadius: '10px',
            fontSize: '0.9375rem',
            fontWeight: 600,
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
