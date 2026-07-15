'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'

/**
 * §4.4 funnel: fires `upgrade_viewed` once when a monetization surface mounts.
 * Renders nothing — safe to drop into a server-component page (e.g. /pricing)
 * without any visual change. `surface` distinguishes the entry point.
 */
export function UpgradeViewedTracker({ surface }: { surface: string }) {
  useEffect(() => {
    try { posthog.capture('upgrade_viewed', { surface }) } catch {}
  }, [surface])
  return null
}
