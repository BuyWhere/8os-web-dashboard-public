'use client'

/**
 * AssistantPanel Component
 * Client-side wrapper for the assistant (coach) chat panel.
 * Provides expand/collapse + a warm, labeled "Ask your coach" launcher
 * present on every authenticated page.
 */

import { useState, useEffect } from 'react'
import AssistantChat from './AssistantChat'

const GOLD = '#B08637'
const GOLD_DARK = '#98722C'

// Coach glyph — a warm chat/spark, reads as "your coach", not a generic +.
const CoachIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <path d="M12 8.5v4M10 10.5h4" />
  </svg>
)

export default function AssistantPanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const savedState = localStorage.getItem('assistant-expanded')
    if (savedState === 'true') setIsExpanded(true)
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) localStorage.setItem('assistant-expanded', String(isExpanded))
  }, [isExpanded, isLoaded])

  if (!isLoaded) return null

  return (
    <div
      className={`fixed right-0 top-0 h-full transition-all duration-300 z-50 ${
        isExpanded ? 'w-96' : 'w-0'
      }`}
    >
      {/* Coach launcher — warm gold pill with a label, on every app page */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          aria-label="Ask your 8os coach"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '12px 18px',
            borderRadius: 999,
            background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DARK} 100%)`,
            color: '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14.5,
            fontWeight: 600,
            fontFamily: 'var(--font-sans), system-ui, -apple-system, sans-serif',
            boxShadow: '0 8px 24px rgba(176, 134, 55, 0.34)',
            transition: 'transform 0.15s, box-shadow 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(176, 134, 55, 0.42)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(176, 134, 55, 0.34)' }}
        >
          <CoachIcon size={18} />
          <span>Ask your coach</span>
        </button>
      )}

      {/* Chat Panel */}
      {isExpanded && (
        <div
          className="h-full shadow-2xl"
          style={{ background: '#FFFFFF', borderLeft: '1px solid #E7DFD2' }}
        >
          <AssistantChat
            isExpanded={isExpanded}
            onToggleExpand={() => setIsExpanded(false)}
          />
        </div>
      )}
    </div>
  )
}
