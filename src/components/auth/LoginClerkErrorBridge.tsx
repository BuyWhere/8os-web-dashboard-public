'use client'

import { SignIn } from '@clerk/nextjs'
import { useEffect, useState, type FC } from 'react'

// OS-3647: Clerk's <SignIn> can return a 422 from /v1/client/sign_ins
// (e.g. when the first factor rejects) without rendering its built-in
// error banner. This wrapper catches any 4xx response from Clerk's
// sign_in/attempt endpoints and surfaces a clear inline error above the
// widget, so users get a real message instead of a silent broken form.
//
// The 422 is also demoted from console.error → console.warn so the
// devtools "Failed to load resource" noise is replaced with a structured
// analytics event.

const CLERK_SIGN_IN_HOST_RE = /^https:\/\/(?:[^/]+\.)?clerk\.(?:8os\.ai|accounts\.dev|com)$/
const CLERK_SIGN_IN_PATH_RE = /^\/v1\/client\/(?:sign_ins|sign_ups|verify)/

type Severity = 'error' | 'warning'

interface BridgeError {
  status: number
  message: string
  endpoint: string
  at: number
}

function classify(status: number): { message: string; severity: Severity } {
  if (status === 401 || status === 422) {
    return {
      message:
        "We couldn't sign you in with those details. Double-check your email and password, then try again.",
      severity: 'warning',
    }
  }
  if (status === 429) {
    return {
      message: 'Too many attempts. Please wait a moment before trying again.',
      severity: 'warning',
    }
  }
  if (status >= 500) {
    return {
      message:
        "We're having trouble reaching the sign-in service right now. Please try again in a minute.",
      severity: 'error',
    }
  }
  return {
    message: 'Something went wrong signing you in. Please try again.',
    severity: 'error',
  }
}

interface LoginClerkErrorBridgeProps {
  // Passed straight through to <SignIn>
  appearance?: React.ComponentProps<typeof SignIn>['appearance']
  signUpUrl?: string
  forceRedirectUrl?: string
  fallbackRedirectUrl?: string
}

export const LoginClerkErrorBridge: FC<LoginClerkErrorBridgeProps> = ({
  appearance,
  signUpUrl,
  forceRedirectUrl,
  fallbackRedirectUrl,
}) => {
  const [bridgeError, setBridgeError] = useState<BridgeError | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const originalFetch = window.fetch.bind(window)

    const isClerkAuthEndpoint = (url: string): boolean => {
      try {
        const parsed = new URL(url, window.location.origin)
        if (!CLERK_SIGN_IN_HOST_RE.test(parsed.origin)) return false
        return CLERK_SIGN_IN_PATH_RE.test(parsed.pathname)
      } catch {
        return false
      }
    }

    window.fetch = async function patchedFetch(
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
      const watch = isClerkAuthEndpoint(url) && (method === 'POST' || method === 'PATCH' || method === 'PUT')

      let response: Response
      try {
        response = await originalFetch(input as any, init)
      } catch (err) {
        if (watch) {
          const message = 'Network error reaching the sign-in service. Check your connection and try again.'
          setBridgeError({ status: 0, message, endpoint: url, at: Date.now() })
          // Replace noisy devtools "Failed to load resource" with a structured warn
          console.warn('[clerk-sign-in-bridge] network error', { endpoint: url, error: String(err) })
        }
        throw err
      }

      if (watch && response.status >= 400) {
        const { message, severity } = classify(response.status)
        setBridgeError({ status: response.status, message, endpoint: url, at: Date.now() })
        // Demote devtools noise to a structured warn with status + endpoint context
        console.warn('[clerk-sign-in-bridge] upstream error', {
          status: response.status,
          endpoint: url,
          severity,
        })
        try {
          if (typeof window !== 'undefined' && (window as any).posthog?.capture) {
            ;(window as any).posthog.capture('clerk_sign_in_upstream_error', {
              status: response.status,
              endpoint: url,
              severity,
            })
          }
        } catch {
          /* analytics is best-effort */
        }
        // Server-side observability: best-effort POST to /api/auth/sign-in-health
        // (does not block sign-in flow, network-only failure mode is silent)
        try {
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            // skip — device offline
          } else {
            void fetch('/api/auth/sign-in-health', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ status: response.status, endpoint: url }),
              keepalive: true,
            }).catch(() => undefined)
          }
        } catch {
          /* monitoring is best-effort */
        }
      }
      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return (
    <div>
      {bridgeError && (
        <div
          role="alert"
          aria-live="polite"
          data-testid="clerk-sign-in-error"
          data-status={bridgeError.status}
          style={{
            margin: '0 auto 1rem auto',
            maxWidth: 420,
            padding: '0.75rem 1rem',
            borderRadius: 10,
            border: '1px solid #E0BFA0',
            background: '#FFF6EC',
            color: '#7A3F12',
            fontSize: 14,
            lineHeight: 1.4,
            boxShadow: '0 1px 2px rgba(122,63,18,0.06)',
          }}
        >
          <strong style={{ display: 'block', marginBottom: 2, color: '#5C2F0E' }}>
            {bridgeError.status === 0
              ? 'Connection problem'
              : bridgeError.status === 429
                ? 'Slow down'
                : bridgeError.status === 401 || bridgeError.status === 422
                  ? 'Invalid credentials'
                  : 'Sign-in error'}
          </strong>
          <span>{bridgeError.message}</span>
        </div>
      )}
      <SignIn
        routing="hash"
        signUpUrl={signUpUrl ?? '/signup'}
        forceRedirectUrl={forceRedirectUrl ?? '/dashboard'}
        fallbackRedirectUrl={fallbackRedirectUrl}
        appearance={appearance}
      />
    </div>
  )
}

export default LoginClerkErrorBridge