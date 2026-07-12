'use client'

/**
 * ThemeProvider — client theme state for the whole app.
 *
 * - Reads the persisted choice from localStorage on mount (the inline boot
 *   script in the root layout already applied it pre-paint, so there is no
 *   flash; this just syncs React state to what's already on <html>).
 * - Applies data-theme + colorScheme on <html> whenever the resolved theme
 *   changes, and live-updates when choice === 'system' and the OS flips.
 * - Persists the choice to localStorage AND (best-effort) to the user-prefs
 *   API so the preference follows the account across devices.
 *
 * Consumers use useTheme() to read { choice, resolved } and call setTheme().
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  type ThemeChoice,
  type ResolvedTheme,
  THEME_STORAGE_KEY,
  isThemeChoice,
  resolveTheme,
} from '@/lib/theme'

interface ThemeContextValue {
  choice: ThemeChoice
  resolved: ResolvedTheme
  setTheme: (choice: ThemeChoice) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function prefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readStoredChoice(): ThemeChoice {
  if (typeof window === 'undefined') return 'system'
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeChoice(v) ? v : 'system'
  } catch {
    return 'system'
  }
}

function apply(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', resolved)
  document.documentElement.style.colorScheme = resolved
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start from 'system' for SSR-stable markup; the boot script already set the
  // real value on <html>, and the mount effect below reconciles React state.
  const [choice, setChoice] = useState<ThemeChoice>('system')
  const [systemDark, setSystemDark] = useState<boolean>(false)

  // On mount: pick up the persisted choice + current OS preference.
  useEffect(() => {
    setChoice(readStoredChoice())
    setSystemDark(prefersDark())
  }, [])

  // Live-follow the OS preference (matters only when choice === 'system').
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  const resolved = useMemo(() => resolveTheme(choice, systemDark), [choice, systemDark])

  // Keep <html> in sync with the resolved theme.
  useEffect(() => {
    apply(resolved)
  }, [resolved])

  const setTheme = useCallback((next: ThemeChoice) => {
    setChoice(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* private mode / storage disabled — in-memory only */
    }
    // Best-effort account-level persist; ignore failures (signed-out, offline).
    void fetch('/api/user/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: next }),
    }).catch(() => {})
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ choice, resolved, setTheme }),
    [choice, resolved, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    // Safe fallback so a stray consumer never crashes the tree.
    return {
      choice: 'system',
      resolved: 'light',
      setTheme: () => {},
    }
  }
  return ctx
}
