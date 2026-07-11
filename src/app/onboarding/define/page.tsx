'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DOMAINS, getDomain } from '@/lib/domains'
import { getOnboardingState, saveOnboardingState } from '@/lib/storage'
import type { DomainId, GoalDefinition, CheckMethod } from '@/lib/types'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'

// ─── Warm-editorial tokens ──────────────────────────────────────────────────
const CREAM = '#F7F3EC'
const WHITE = '#FFFFFF'
const INK = '#221F1A'
const WARM_GRAY = '#6B6257'
const MUTED = '#8A8175'
const GOLD = '#B08637'
const HAIRLINE = '#E7DFD2'
const TRACK = '#EAE1D2'
const SERIF = 'var(--font-serif), Georgia, serif'

const CHECK_METHODS: { id: CheckMethod; label: string; icon: string; description: string }[] = [
  { id: 'binary', label: 'Binary', icon: '✅', description: 'Done or not done' },
  { id: 'numeric', label: 'Numeric', icon: '📊', description: 'Track a number' },
  { id: 'time', label: 'Time-based', icon: '⏱', description: 'Hours or minutes' },
  { id: 'streak', label: 'Streak', icon: '🔥', description: 'Consecutive days' },
  { id: 'milestone', label: 'Milestone', icon: '🏁', description: 'Step-by-step' },
]

export default function DefinePage() {
  const router = useRouter()
  const [domains, setDomains] = useState<DomainId[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [goals, setGoals] = useState<Partial<Record<DomainId, GoalDefinition>>>({})
  const [suggestion, setSuggestion] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  // Current domain
  const currentDomain = domains[currentIndex] ? getDomain(domains[currentIndex]) : null
  const currentGoal: GoalDefinition = goals[domains[currentIndex]] ?? {
    domainId: domains[currentIndex] ?? 'career',
    name: '',
    definition: '',
    checkMethod: currentDomain?.defaultCheckMethod ?? 'binary',
    checkConfig: {},
  }

  useEffect(() => {
    const state = getOnboardingState()
    if (state.selectedDomains.length === 0) {
      router.push('/onboarding/goals')
      return
    }
    setDomains(state.selectedDomains)
    setGoals(state.goals)
  }, [])

  useEffect(() => {
    if (nameRef.current) nameRef.current.focus()
    setSuggestion('')
  }, [currentIndex])

  function updateGoal(patch: Partial<GoalDefinition>) {
    const domainId = domains[currentIndex]
    setGoals(prev => ({
      ...prev,
      [domainId]: { ...currentGoal, ...patch, domainId },
    }))
  }

  function handleNameChange(value: string) {
    updateGoal({ name: value })
    // Suggest from domain suggestions
    if (value.length >= 2 && currentDomain) {
      const match = currentDomain.suggestions.find(s =>
        s.toLowerCase().startsWith(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
      )
      setSuggestion(match ? match.slice(value.length) : '')
    } else {
      setSuggestion('')
    }
  }

  function acceptSuggestion() {
    if (suggestion && currentGoal.name) {
      updateGoal({ name: currentGoal.name + suggestion })
      setSuggestion('')
    }
  }

  function handleNext() {
    const domainId = domains[currentIndex]
    if (!currentGoal.name.trim()) return

    const updatedGoals = {
      ...goals,
      [domainId]: { ...currentGoal, domainId },
    }
    setGoals(updatedGoals)

    if (currentIndex < domains.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      saveOnboardingState({ goals: updatedGoals })
      router.push('/onboarding/projects')
    }
  }

  function handleBack() {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1)
    } else {
      router.push('/onboarding/goals')
    }
  }

  if (!currentDomain) return null

  const domain = currentDomain
  const isLast = currentIndex === domains.length - 1

  const inputBase = {
    width: '100%',
    padding: '0.875rem 1rem',
    background: WHITE,
    border: `1px solid ${HAIRLINE}`,
    borderRadius: '10px',
    color: INK,
    fontSize: '0.9375rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }
  const fieldLabel = {
    display: 'block' as const,
    fontSize: '0.72rem',
    color: MUTED,
    marginBottom: '0.5rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    fontWeight: 700,
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
      <OnboardingProgress current="define" />

      {/* Header */}
      <div style={{ maxWidth: 560, width: '100%', marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h1 style={{ fontFamily: SERIF, fontSize: '1.7rem', fontWeight: 500, color: INK, letterSpacing: '-0.02em', marginBottom: '0.4rem', lineHeight: 1.15 }}>
            Turn each domain into a real goal
          </h1>
          <p style={{ color: WARM_GRAY, fontSize: '0.95rem', lineHeight: 1.6 }}>
            Name what you want and how you&apos;ll know you&apos;re making progress. We&apos;ll do this
            one domain at a time — pick a measure that fits.
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          gap: '1rem',
        }}>
          <div style={{
            fontSize: '0.72rem',
            color: WARM_GRAY,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Domain {currentIndex + 1} of {domains.length}
          </div>

          {/* Domain progress dots */}
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {domains.map((d, i) => {
              const dm = getDomain(d)
              return (
                <div
                  key={d}
                  style={{
                    width: i === currentIndex ? 20 : 8,
                    height: 8,
                    borderRadius: '999px',
                    background: i <= currentIndex ? (dm?.color ?? GOLD) : TRACK,
                    transition: 'all 0.3s ease',
                  }}
                />
              )
            })}
          </div>
        </div>

        {/* Domain header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1.25rem',
          background: `${domain.color}12`,
          border: `1px solid ${domain.color}35`,
          borderRadius: '12px',
        }}>
          <div style={{ fontSize: '2.5rem' }}>{domain.icon}</div>
          <div>
            <div style={{ fontSize: '0.68rem', color: domain.color, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.2rem', fontWeight: 700 }}>
              {domain.label}
            </div>
            <div style={{ fontFamily: SERIF, fontSize: '1.25rem', fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}>
              What&apos;s your {domain.label.toLowerCase()} goal?
            </div>
          </div>
        </div>
      </div>

      {/* Goal form */}
      <div style={{ maxWidth: 560, width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Goal name */}
        <div>
          <label style={fieldLabel}>Goal Name</label>
          <div style={{ position: 'relative' }}>
            <input
              ref={nameRef}
              type="text"
              value={currentGoal.name}
              onChange={e => handleNameChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Tab' && suggestion) {
                  e.preventDefault()
                  acceptSuggestion()
                }
              }}
              placeholder={domain.suggestions[0]}
              style={{
                ...inputBase,
                fontSize: '1rem',
                border: `1px solid ${currentGoal.name ? domain.color + '66' : HAIRLINE}`,
                transition: 'border-color 0.15s',
              }}
            />
            {/* Ghost suggestion */}
            {suggestion && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                padding: '0.875rem 1rem',
                fontSize: '1rem',
                color: 'transparent',
                pointerEvents: 'none',
                userSelect: 'none',
              }}>
                <span style={{ color: 'transparent' }}>{currentGoal.name}</span>
                <span style={{ color: '#C7BBA6' }}>{suggestion}</span>
                <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: MUTED, background: CREAM, padding: '0.1rem 0.3rem', borderRadius: '4px', border: `1px solid ${HAIRLINE}` }}>tab</span>
              </div>
            )}
          </div>
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {domain.suggestions.slice(0, 3).map(s => (
              <button
                key={s}
                onClick={() => { updateGoal({ name: s }); setSuggestion('') }}
                style={{
                  padding: '0.3rem 0.7rem',
                  background: WHITE,
                  border: `1px solid ${HAIRLINE}`,
                  borderRadius: '999px',
                  color: WARM_GRAY,
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Goal definition */}
        <div>
          <label style={fieldLabel}>{domain.promptHint}</label>
          <textarea
            value={currentGoal.definition}
            onChange={e => updateGoal({ definition: e.target.value })}
            placeholder="Be specific — what does success look like in 12 months?"
            rows={3}
            style={{
              ...inputBase,
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
          />
        </div>

        {/* Check method */}
        <div>
          <label style={fieldLabel}>How will you measure this?</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
            {CHECK_METHODS.map(m => {
              const isActive = currentGoal.checkMethod === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => updateGoal({ checkMethod: m.id })}
                  style={{
                    padding: '0.75rem 0.5rem',
                    background: isActive ? `${domain.color}18` : WHITE,
                    border: `1px solid ${isActive ? domain.color : HAIRLINE}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{m.icon}</div>
                  <div style={{ fontSize: '0.62rem', color: isActive ? domain.color : WARM_GRAY, fontWeight: 700, letterSpacing: '0.02em' }}>
                    {m.label}
                  </div>
                </button>
              )
            })}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: MUTED, textAlign: 'center' }}>
            {CHECK_METHODS.find(m => m.id === currentGoal.checkMethod)?.description}
          </div>
        </div>

        {/* Check config: numeric/time target */}
        {(currentGoal.checkMethod === 'numeric' || currentGoal.checkMethod === 'time') && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ ...fieldLabel, textTransform: 'none', letterSpacing: 0 }}>Target</label>
              <input
                type="number"
                value={currentGoal.checkConfig.target ?? ''}
                onChange={e => updateGoal({ checkConfig: { ...currentGoal.checkConfig, target: Number(e.target.value) } })}
                placeholder="e.g. 100"
                style={inputBase}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ ...fieldLabel, textTransform: 'none', letterSpacing: 0 }}>Unit</label>
              <input
                type="text"
                value={currentGoal.checkConfig.unit ?? ''}
                onChange={e => updateGoal({ checkConfig: { ...currentGoal.checkConfig, unit: e.target.value } })}
                placeholder={currentGoal.checkMethod === 'time' ? 'hours' : 'books, pounds, $...'}
                style={inputBase}
              />
            </div>
          </div>
        )}

        {/* Streak target */}
        {currentGoal.checkMethod === 'streak' && (
          <div>
            <label style={{ ...fieldLabel, textTransform: 'none', letterSpacing: 0 }}>
              Target streak (days)
            </label>
            <input
              type="number"
              value={currentGoal.checkConfig.target ?? 365}
              onChange={e => updateGoal({ checkConfig: { target: Number(e.target.value) } })}
              style={inputBase}
            />
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            onClick={handleBack}
            style={{
              padding: '0.875rem 1.5rem',
              background: WHITE,
              border: `1px solid ${HAIRLINE}`,
              borderRadius: '10px',
              color: WARM_GRAY,
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ←
          </button>
          <button
            onClick={handleNext}
            disabled={!currentGoal.name.trim()}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: currentGoal.name.trim() ? GOLD : '#E3D8C4',
              color: currentGoal.name.trim() ? '#fff' : '#A99A82',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.9375rem',
              fontWeight: 700,
              cursor: currentGoal.name.trim() ? 'pointer' : 'not-allowed',
              letterSpacing: '-0.01em',
            }}
          >
            {isLast ? 'Generate projects with ARCHIE →' : `Next: ${getDomain(domains[currentIndex + 1])?.label} →`}
          </button>
        </div>
      </div>
    </div>
  )
}
