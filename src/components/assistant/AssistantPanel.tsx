'use client'

/**
 * CoachPanel (exported as AssistantPanel for a drop-in swap)
 *
 * ONE unified "Coach" for 8os:
 *  - A persistent gold launcher pill fixed bottom-right on every logged-in
 *    page. It stays reachable AT ALL TIMES.
 *  - A sleek, warm-editorial pop-up anchored bottom-right (NOT a docked
 *    white box). Compact by default (~380x580), expandable to a large,
 *    near-fullscreen surface for heavy use, and collapsible back.
 *
 * Persistent-launcher fix: the launcher toggles the pop-up open. When open,
 * the launcher morphs into a small "close" affordance in the SAME spot, so
 * the Coach is never lost. The pop-up itself also has its own header close.
 */

import { useState, useEffect, useCallback } from 'react'
import { Fraunces } from 'next/font/google'
import AssistantChat from './AssistantChat'

const fraunces = Fraunces({ subsets: ['latin'], weight: ['600'], variable: '--font-serif-coach', display: 'swap' })

const GOLD = '#B08637'
const GOLD_DARK = '#98722C'

const CoachIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <path d="M12 8.5v4M10 10.5h4" />
  </svg>
)

const CloseIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export default function AssistantPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLarge, setIsLarge] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('coach-open') === 'true') setIsOpen(true)
    if (localStorage.getItem('coach-large') === 'true') setIsLarge(true)
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) localStorage.setItem('coach-open', String(isOpen))
  }, [isOpen, isLoaded])

  useEffect(() => {
    if (isLoaded) localStorage.setItem('coach-large', String(isLarge))
  }, [isLarge, isLoaded])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  const toggleSize = useCallback(() => setIsLarge((v) => !v), [])

  if (!isLoaded) return null

  return (
    <div className={fraunces.variable}>
      {/* Persistent launcher — always rendered, toggles the pop-up. */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? 'Close Coach' : 'Open Coach'}
        aria-expanded={isOpen}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 2147483000,
          display: 'flex',
          alignItems: 'center',
          gap: isOpen ? 0 : 9,
          padding: isOpen ? 0 : '12px 18px',
          width: isOpen ? 52 : 'auto',
          height: isOpen ? 52 : 'auto',
          justifyContent: 'center',
          borderRadius: 999,
          background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DARK} 100%)`,
          color: '#FFFFFF',
          border: 'none',
          cursor: 'pointer',
          fontSize: 14.5,
          fontWeight: 600,
          fontFamily: 'var(--font-sans), system-ui, -apple-system, sans-serif',
          boxShadow: '0 8px 24px rgba(176, 134, 55, 0.34)',
          transition: 'transform 0.15s, box-shadow 0.15s, padding 0.2s, gap 0.2s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(176, 134, 55, 0.42)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(176, 134, 55, 0.34)' }}
      >
        {isOpen ? <CloseIcon size={20} /> : (<><CoachIcon size={18} /><span>Coach</span></>)}
      </button>

      {/* Coach pop-up — anchored bottom-right, expandable. */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Coach"
          style={{
            position: 'fixed',
            zIndex: 2147482000,
            right: 24,
            bottom: isLarge ? 24 : 92,
            width: isLarge ? 'min(760px, calc(100vw - 48px))' : 'min(380px, calc(100vw - 32px))',
            height: isLarge ? 'min(860px, calc(100vh - 48px))' : 'min(580px, calc(100vh - 132px))',
            background: '#FFFFFF',
            border: '1px solid #E7DFD2',
            borderRadius: 18,
            boxShadow: '0 24px 60px rgba(34, 31, 26, 0.22), 0 4px 12px rgba(34, 31, 26, 0.08)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.24s ease, height 0.24s ease, bottom 0.24s ease',
          }}
        >
          <AssistantChat
            isLarge={isLarge}
            onToggleSize={toggleSize}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
