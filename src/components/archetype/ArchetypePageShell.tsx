'use client'

import type { ReactNode } from 'react'
import { ArchetypeThemeProvider } from '@/components/archetype'

/**
 * Client wrapper that provides archetype skin theming for the archetype page.
 * Fetches the user's archetype and injects the matching CSS variable bundle.
 */
export function ArchetypePageShell({ children }: { children: ReactNode }) {
  return (
    <ArchetypeThemeProvider>
      {children}
    </ArchetypeThemeProvider>
  )
}
