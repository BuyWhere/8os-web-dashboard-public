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
  DEFAULT_THEME_CHOICE,
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
  if (typeof window === 'undefined') return DEFAULT_THEME_CHOICE
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeChoice(v) ? v : DEFAULT_THEME_CHOICE
  } catch {
    return DEFAULT_THEME_CHOICE
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
  const [choice, setChoice] = useState<ThemeChoice>(DEFAULT_THEME_CHOICE)
  const [systemDark, setSystemDark] = useState<boolean>(false)
  // `tick` re-resolves the time-of-day for choice === 'auto'. It starts at 0
  // (SSR-stable) and advances on a timer once mounted.
  const [tick, setTick] = useState<number>(0)

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

  // For 'auto', re-check the clock every minute so the theme flips at the
  // day/night boundary (06:00 / 18:00 local) without a reload. Cheap.
  useEffect(() => {
    if (choice !== 'auto') return
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [choice])

  const resolved = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => resolveTheme(choice, systemDark, new Date()),
    [choice, systemDark, tick],
  )

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
      choice: DEFAULT_THEME_CHOICE,
      resolved: 'light',
      setTheme: () => {},
    }
  }
  return ctx
}
