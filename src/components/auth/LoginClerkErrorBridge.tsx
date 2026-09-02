'use client'

import { SignIn, useAuth } from '@clerk/nextjs'
import { useEffect, useRef, useState, type FC } from 'react'
import {
  classifySignin422,
  extractEmailFromBody,
  EMAIL_FORMAT_MESSAGE,
  looksLikeEmail,
  type AuthBridgeKind,
} from './clerkEmailFormat'
import { observeClerkContinueArrows } from './clerkContinueArrow'

// OS-3647: Clerk's <SignIn> can return a 422 from /v1/client/sign_ins
// without rendering its built-in error banner. OS-5954: show an email-format
// message when the identifier is not a valid email.

const CLERK_SIGN_IN_HOST_RE = /^https:\/\/(?:[^/]+\.)?clerk\.(?:8os\.ai|accounts\.dev|com)$/
const CLERK_SIGN_IN_PATH_RE = /^\/v1\/client\/(?:sign_ins|sign_ups|verify)/

type Severity = 'error' | 'warning'

interface BridgeError {
  status: number
  message: string
  endpoint: string
  at: number
  kind?: AuthBridgeKind
}

/** Once a Clerk session exists, leftover SignIn POSTs must not be logged. */
let signInWatchDisabled = false

export function disableSignInBridgeWatch(): void {
  signInWatchDisabled = true
}

export function resetSignInBridgeWatchForTests(): void {
  signInWatchDisabled = false
}

function classify(
  status: number,
  payload?: unknown,
  requestEmail?: string | null
): { message: string; severity: Severity; kind: AuthBridgeKind } {
  if (status === 401 || status === 422) {
    const classified = classifySignin422(payload, requestEmail)
    return { ...classified, severity: 'warning' }
  }
  if (status === 429) {
    return {
      message: 'Too many attempts. Please wait a moment before trying again.',
      severity: 'warning',
      kind: 'generic',
    }
  }
  if (status >= 500) {
    return {
      message:
        "We're having trouble reaching the sign-in service right now. Please try again in a minute.",
      severity: 'error',
      kind: 'generic',
    }
  }
  return {
    message: 'Something went wrong signing you in. Please try again.',
    severity: 'error',
    kind: 'generic',
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
  const { isLoaded, isSignedIn } = useAuth()
  // OS-5571: Clerk keeps POSTing /v1/client/sign_ins after a session exists
  // (soft nav + leftover SignIn widget). Skip watch/log once signed in.
  const sessionEstablishedRef = useRef(false)
  if (isLoaded && isSignedIn) {
    sessionEstablishedRef.current = true
    signInWatchDisabled = true
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionEstablishedRef.current) return
    const stopArrowPatch = observeClerkContinueArrows(document.body)
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
      const watch =
        !signInWatchDisabled &&
        !sessionEstablishedRef.current &&
        isClerkAuthEndpoint(url) &&
        (method === 'POST' || method === 'PATCH' || method === 'PUT')

      let requestEmail: string | null = null
      if (watch && typeof init?.body === 'string') {
        requestEmail = extractEmailFromBody(init.body)
      }

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
        let payload: unknown = null
        try {
          payload = await response.clone().json()
        } catch {
          payload = null
        }
        const { message, severity, kind } = classify(response.status, payload, requestEmail)
        setBridgeError({ status: response.status, message, endpoint: url, at: Date.now(), kind })
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
      stopArrowPatch()
      if (window.fetch !== originalFetch) {
        // Only unwind our wrapper. Clerk (or another layer) may have wrapped
        // fetch after we did; blindly restoring would drop that wrapper.
        window.fetch = originalFetch
      }
    }
  }, [])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    sessionEstablishedRef.current = true
    signInWatchDisabled = true
    setBridgeError(null)
  }, [isLoaded, isSignedIn])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const root = document.querySelector('.login-auth') ?? document.body
    const onSubmit = (event: Event) => {
      const form = event.target
      if (!(form instanceof HTMLFormElement)) return
      const emailInput = form.querySelector<HTMLInputElement>(
        'input[name="identifier"], input[name="emailAddress"], input[type="email"]'
      )
      if (!emailInput) return
      const value = emailInput.value.trim()
      if (!value || looksLikeEmail(value)) return
      event.preventDefault()
      event.stopPropagation()
      setBridgeError({
        status: 422,
        message: EMAIL_FORMAT_MESSAGE,
        endpoint: 'client-email-format',
        at: Date.now(),
        kind: 'format',
      })
    }
    root.addEventListener('submit', onSubmit, true)
    return () => root.removeEventListener('submit', onSubmit, true)
  }, [])

  return (
    <div>
      {bridgeError && (
        <div
          role="alert"
          aria-live="polite"
          data-testid="clerk-sign-in-error"
          data-status={bridgeError.status}
          data-kind={bridgeError.kind ?? 'generic'}
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
                : bridgeError.kind === 'format'
                  ? 'Invalid email'
                  : bridgeError.status === 401 || bridgeError.status === 422
                    ? 'Invalid credentials'
                    : 'Sign-in error'}
          </strong>
          <span data-testid="clerk-sign-in-error-message">{bridgeError.message}</span>
        </div>
      )}
      {!(isLoaded && isSignedIn) && (
        <SignIn
          routing="hash"
          signUpUrl={signUpUrl ?? '/signup'}
          forceRedirectUrl={forceRedirectUrl ?? '/dashboard'}
          fallbackRedirectUrl={fallbackRedirectUrl}
          appearance={appearance}
        />
      )}
    </div>
  )
}

export default LoginClerkErrorBridge