'use client'

import { SignUp } from '@clerk/nextjs'
import { useEffect, useState, type FC } from 'react'

// OS-4316: Clerk's <SignUp> can return 4xx errors from /v1/client/sign_ups
// (e.g. email_already_exists 422, rate limit 429) without rendering a clear
// inline error. This wrapper catches upstream errors from Clerk's sign-up
// endpoints and surfaces a user-friendly message above the widget, matching
// the LoginClerkErrorBridge pattern from OS-3647.

const CLERK_SIGN_UP_HOST_RE = /^https:\/\/(?:[^/]+\.)?clerk\.(?:8os\.ai|accounts\.dev|com)$/
const CLERK_SIGN_UP_PATH_RE = /^\/v1\/client\/(?:sign_ups|verify)/

type Severity = 'error' | 'warning'

interface BridgeError {
  status: number
  message: string
  endpoint: string
  at: number
}

function classify(status: number): { message: string; severity: Severity } {
  if (status === 422) {
    return {
      message:
        "We couldn't create your account with those details. The email may already be in use — try logging in, or use a different email address.",
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
        "We're having trouble reaching the sign-up service right now. Please try again in a minute.",
      severity: 'error',
    }
  }
  return {
    message: 'Something went wrong creating your account. Please try again.',
    severity: 'error',
  }
}

interface SignupClerkErrorBridgeProps {
  appearance?: React.ComponentProps<typeof SignUp>['appearance']
  signInUrl?: string
  forceRedirectUrl?: string
  fallbackRedirectUrl?: string
}

export const SignupClerkErrorBridge: FC<SignupClerkErrorBridgeProps> = ({
  appearance,
  signInUrl,
  forceRedirectUrl,
  fallbackRedirectUrl,
}) => {
  const [bridgeError, setBridgeError] = useState<BridgeError | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const originalFetch = window.fetch.bind(window)

    const isClerkSignUpEndpoint = (url: string): boolean => {
      try {
        const parsed = new URL(url, window.location.origin)
        if (!CLERK_SIGN_UP_HOST_RE.test(parsed.origin)) return false
        return CLERK_SIGN_UP_PATH_RE.test(parsed.pathname)
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
      const watch = isClerkSignUpEndpoint(url) && (method === 'POST' || method === 'PATCH' || method === 'PUT')

      let response: Response
      try {
        response = await originalFetch(input as any, init)
      } catch (err) {
        if (watch) {
          const message = 'Network error reaching the sign-up service. Check your connection and try again.'
          setBridgeError({ status: 0, message, endpoint: url, at: Date.now() })
          console.warn('[clerk-sign-up-bridge] network error', { endpoint: url, error: String(err) })
        }
        throw err
      }

      if (watch && response.status >= 400) {
        const { message, severity } = classify(response.status)
        setBridgeError({ status: response.status, message, endpoint: url, at: Date.now() })
        console.warn('[clerk-sign-up-bridge] upstream error', {
          status: response.status,
          endpoint: url,
          severity,
        })
        try {
          if (typeof window !== 'undefined' && (window as any).posthog?.capture) {
            ;(window as any).posthog.capture('clerk_sign_up_upstream_error', {
              status: response.status,
              endpoint: url,
              severity,
            })
          }
        } catch {
          /* analytics is best-effort */
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
          data-testid="clerk-sign-up-error"
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
                : bridgeError.status === 422
                  ? 'Account creation issue'
                  : 'Sign-up error'}
          </strong>
          <span>{bridgeError.message}</span>
        </div>
      )}
      <SignUp
        routing="hash"
        signInUrl={signInUrl ?? '/login'}
        forceRedirectUrl={forceRedirectUrl ?? '/onboarding'}
        fallbackRedirectUrl={fallbackRedirectUrl}
        appearance={appearance}
      />
    </div>
  )
}

export default SignupClerkErrorBridge
