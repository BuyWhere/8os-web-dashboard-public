'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

function PostHogPageView() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) {
      // Note: we capture only the pathname here, not the search params.
      // Including useSearchParams() here forced a Suspense boundary at the
      // layout level which bailed out server-rendering the entire page
      // content (see OS-1056). The trade-off: query string changes without
      // a pathname change are no longer tracked as separate pageviews.
      // Acceptable for the launch — most of the site uses Link navigation
      // which changes the pathname.
      const url = typeof window !== 'undefined' ? window.origin + pathname : pathname
      posthog.capture('$pageview', { $current_url: url })
    }
  }, [pathname])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!token) return

    posthog.init(token, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      // Pillar 1: autocapture clicks, forms, inputs automatically
      autocapture: true,
      person_profiles: 'identified_only',
      capture_pageview: false, // manual pageviews via PostHogPageView
      capture_pageleave: true,
      // Pillar 2: Session Replay — full behavioral capture
      session_recording: {
        maskAllInputs: true,
        // Capture network requests/responses for debugging
        recordCrossOriginIframes: false,
        networkPayloadCapture: { recordBody: true, recordHeaders: true },
        consoleLogRecordingEnabled: true,
        // Filter bot noise: sessions shorter than 5s are discarded
        minimumDurationMilliseconds: 5000,
      },
      // Pillar 3: Error Tracking — capture unhandled exceptions automatically
      capture_exceptions: true,
    })

    // Pillar 4: Web Vitals — report CLS, FCP, FID, LCP, TTFB as PostHog events
    if (typeof window !== 'undefined') {
      import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
        const report = ({ name, value, id }: { name: string; value: number; id: string }) => {
          posthog.capture('$web_vitals', { name, value, id })
        }
        onCLS(report)
        onFCP(report)
        onLCP(report)
        onTTFB(report)
        onINP(report)
      }).catch(() => {/* web-vitals optional */})
    }
  }, [])

  const token = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!token) return <>{children}</>

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  )
}
