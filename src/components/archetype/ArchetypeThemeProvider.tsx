'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { ARCHETYPE_SKINS, DEFAULT_SKIN, buildSkinCss, type ArchetypeSkin } from '@/lib/archetype-skins'

// ── Context ──────────────────────────────────────────────────────────────

interface ArchetypeThemeContextValue {
  /** The active archetype skin definition. */
  skin: ArchetypeSkin
  /** The raw archetype ID (e.g. "pioneer", "builder"). */
  archetypeId: string | null
  /** True while the skin is being resolved (first paint). */
  isLoading: boolean
  /** Override the archetype skin (for preview / compare mode). */
  setArchetypeId: (id: string | null) => void
}

const ArchetypeThemeContext = createContext<ArchetypeThemeContextValue>({
  skin: DEFAULT_SKIN,
  archetypeId: null,
  isLoading: true,
  setArchetypeId: () => {},
})

export function useArchetypeTheme() {
  return useContext(ArchetypeThemeContext)
}

// ── Provider ─────────────────────────────────────────────────────────────

interface ArchetypeThemeProviderProps {
  children: ReactNode
  /** Optional initial archetype ID from the server (avoids FOUC). */
  initialArchetypeId?: string | null
  /** API endpoint to fetch the user's archetype. Defaults to /api/onboarding/archetype. */
  endpoint?: string
}

export function ArchetypeThemeProvider({
  children,
  initialArchetypeId = null,
  endpoint = '/api/onboarding/archetype',
}: ArchetypeThemeProviderProps) {
  const [archetypeId, setArchetypeId] = useState<string | null>(initialArchetypeId)
  const [isLoading, setIsLoading] = useState(!initialArchetypeId)

  // Resolve the skin from the archetype ID
  const skin = ARCHETYPE_SKINS.find((s) => s.id === archetypeId) ?? DEFAULT_SKIN

  // Fetch archetype from API if not provided server-side
  useEffect(() => {
    if (initialArchetypeId) return // already known

    const controller = new AbortController()

    async function fetchArchetype() {
      setIsLoading(true)
      try {
        const res = await fetch(endpoint, {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        })

        if (res.status === 404) {
          // No archetype calculated yet — use default
          setArchetypeId(null)
          return
        }

        if (!res.ok) {
          // Fall back to default
          setArchetypeId(null)
          return
        }

        const data = (await res.json()) as { archetypeId?: string }
        setArchetypeId(data.archetypeId ?? null)
      } catch {
        if (!controller.signal.aborted) {
          setArchetypeId(null)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void fetchArchetype()
    return () => controller.abort()
  }, [endpoint, initialArchetypeId])

  // Build and inject the <style> block for this skin
  const css = buildSkinCss(skin)

  // Wrap setArchetypeId to also reset loading state when called externally
  const handleSetArchetypeId = useCallback((id: string | null) => {
    setArchetypeId(id)
    setIsLoading(false)
  }, [])

  return (
    <ArchetypeThemeContext.Provider
      value={{ skin, archetypeId, isLoading, setArchetypeId: handleSetArchetypeId }}
    >
      {/*
       * Apply the skin as a data attribute on the wrapper element.
       * The CSS is defined in a per-skin <style> block keyed by archetype ID.
       */}
      <div data-archetype-skin={skin.id}>
        <style>{css}</style>
        {children}
      </div>
    </ArchetypeThemeContext.Provider>
  )
}

// ── Skin class names for legacy components that use className-based theming ──
// Maps new archetype system IDs → the old theme classes from types/archetype.ts

export const SKIN_THEME_CLASSES: Record<string, string> = {
  pioneer: 'theme-pioneer',
  sage: 'theme-sage',
  catalyst: 'theme-catalyst',
  architect: 'theme-architect',
  nurturer: 'theme-nurturer',
  innovator: 'theme-innovator',
  sentinel: 'theme-sentinel',
  mystic: 'theme-mystic',
  builder: 'theme-builder',
  hybrid_explorer: 'theme-hybrid-explorer',
}

export function getSkinThemeClass(archetypeId: string | null | undefined): string {
  if (!archetypeId) return ''
  return SKIN_THEME_CLASSES[archetypeId] ?? ''
}
