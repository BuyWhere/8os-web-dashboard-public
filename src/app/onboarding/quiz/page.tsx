'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { QUESTIONS, getSkipQuestions } from '@/lib/quiz'
import type { QuizQuestion } from '@/lib/quiz'
import posthog from 'posthog-js'

// ─── Local Storage ────────────────────────────────────────────────────────────

const LS_KEY = '8os_quiz_progress'

function saveProgress(answers: Record<number, string>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(answers)) } catch {}
}

function loadProgress(): Record<number, string> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type OptionKey = 'a' | 'b' | 'c' | 'd'

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuizPage() {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [skipSet, setSkipSet] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const touchStartX = useRef<number | null>(null)

  // Active (non-skipped) questions
  const activeQuestions = QUESTIONS.filter(q => !skipSet.has(q.id))
  const current: QuizQuestion | undefined = activeQuestions[currentIdx]
  const isLast = currentIdx === activeQuestions.length - 1
  const totalActive = activeQuestions.length

  // ─── Load saved progress & detect BaZi from localStorage ─────────────────

  useEffect(() => {
    const saved = loadProgress()
    setAnswers(saved)

    // Load BaZi element counts from onboarding state if available
    try {
      const onboardingRaw = localStorage.getItem('8os_bazi_result')
      if (onboardingRaw) {
        const bazi = JSON.parse(onboardingRaw)
        if (bazi.elementCounts) {
          setSkipSet(getSkipQuestions(bazi.elementCounts))
        }
      }
    } catch {}
  }, [])

  // ─── Keyboard support (1-4 keys, arrows, backspace) ──────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return
      const keyMap: Record<string, OptionKey> = { '1': 'a', '2': 'b', '3': 'c', '4': 'd' }

      if (keyMap[e.key]) {
        handleAnswer(keyMap[e.key])
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        handleBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, currentIdx, answers])

  // ─── Touch / swipe ────────────────────────────────────────────────────────

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (dx > 60) handleBack()
    // No swipe-forward — must explicitly pick answer
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function handleBack() {
    if (currentIdx > 0) setCurrentIdx(i => i - 1)
  }

  async function handleAnswer(key: OptionKey) {
    if (!current || transitioning) return

    const newAnswers = { ...answers, [current.id]: key }
    setAnswers(newAnswers)
    saveProgress(newAnswers)

    // Persist to server
    setSaving(true)
    try {
      await fetch('/api/onboarding/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: current.id, answer: key }),
      })
    } catch {}
    setSaving(false)

    // Animate transition
    setTransitioning(true)
    setTimeout(() => {
      if (isLast) {
        finishQuiz()
      } else {
        setCurrentIdx(i => i + 1)
        setTransitioning(false)
      }
    }, 250)
  }

  async function finishQuiz() {
    // Calculate archetype on server
    try {
      const res = await fetch('/api/onboarding/archetype', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        // Cache result locally
        try {
          localStorage.setItem('8os_archetype', JSON.stringify(data))
          if (data?.archetypeId) {
            localStorage.setItem('8os_archetype_id', data.archetypeId)
            sessionStorage.setItem('8os_archetype_id', data.archetypeId)
          }
        } catch {}
        if (data?.archetypeId) {
          posthog.capture('quiz_completed', { archetype: data.archetypeId })
        }
      }
    } catch {}

    // Clear quiz progress
    try { localStorage.removeItem(LS_KEY) } catch {}
    router.push('/onboarding/archetype')
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!current) {
    // All skipped or empty
    return (
      <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#888' }}>
          <p>Calculating your archetype...</p>
        </div>
      </div>
    )
  }

  const progress = ((currentIdx) / totalActive) * 100
  const currentAnswer = answers[current.id]
  const OPTION_KEYS: OptionKey[] = ['a', 'b', 'c', 'd']

  return (
    <div
      style={{ minHeight: '100vh', background: '#080808', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 1.5rem' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div style={{ maxWidth: 560, width: '100%' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#111',
            border: '1px solid #1e1e1e',
            borderRadius: '999px',
            padding: '0.375rem 1rem',
            fontSize: '0.75rem',
            color: '#888',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            <span style={{ width: 6, height: 6, background: '#a855f7', borderRadius: '50%', display: 'inline-block' }} />
            {saving ? 'Saving...' : `Q${currentIdx + 1} of ${totalActive}`}
          </div>

          {/* Progress bar */}
          <div style={{ flex: 1, marginLeft: '1rem', height: 3, background: '#1a1a1a', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: '#a855f7', borderRadius: '999px', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Question */}
        <div style={{ opacity: transitioning ? 0 : 1, transition: 'opacity 0.2s ease' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#ededed',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
            marginBottom: '2rem',
            minHeight: '4rem',
          }}>
            {current.text}
          </h2>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {current.options.map((opt, i) => {
              const isSelected = currentAnswer === opt.key
              return (
                <button
                  key={opt.key}
                  onClick={() => handleAnswer(opt.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem 1.25rem',
                    background: isSelected ? '#a855f720' : '#0f0f0f',
                    border: `1px solid ${isSelected ? '#a855f7' : '#1e1e1e'}`,
                    borderRadius: '12px',
                    color: isSelected ? '#d8b4fe' : '#aaa',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.9375rem',
                    lineHeight: 1.4,
                    transition: 'all 0.15s',
                    width: '100%',
                  }}
                >
                  {/* Key hint */}
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '6px',
                    background: isSelected ? '#a855f740' : '#1a1a1a',
                    border: `1px solid ${isSelected ? '#a855f7' : '#222'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: isSelected ? '#d8b4fe' : '#444',
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <span>{opt.text}</span>
                </button>
              )
            })}
          </div>

          {/* Keyboard hint */}
          <p style={{ color: '#333', fontSize: '0.7rem', marginTop: '1.5rem', textAlign: 'center', letterSpacing: '0.05em' }}>
            Press 1–4 to answer · ← to go back · swipe right to go back
          </p>

          {/* Back button */}
          {currentIdx > 0 && (
            <button
              onClick={handleBack}
              style={{
                display: 'block',
                margin: '1rem auto 0',
                padding: '0.5rem 1.5rem',
                background: 'transparent',
                border: '1px solid #1e1e1e',
                borderRadius: '8px',
                color: '#888',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              ← Previous
            </button>
          )}
        </div>

        {/* Skip info if any questions skipped */}
        {skipSet.size > 0 && (
          <div style={{ marginTop: '2rem', padding: '0.75rem 1rem', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px' }}>
            <p style={{ color: '#888', fontSize: '0.75rem', margin: 0 }}>
              Your BaZi chart revealed strong signals — {skipSet.size} question{skipSet.size > 1 ? 's' : ''} skipped
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
