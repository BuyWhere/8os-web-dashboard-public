'use client'

import { SignUp, useSignUp } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FC } from 'react'
import {
  classifySignup422,
  extractEmailFromBody,
  EMAIL_FORMAT_MESSAGE,
  looksLikeEmail,
  type AuthBridgeKind,
} from './clerkEmailFormat'

// OS-4316: Clerk's <SignUp> can return 4xx errors from /v1/client/sign_ups
// without a clear inline error. OS-5954: distinguish email-format 422s from
// identifier-exists so users see "Please enter a valid email address."

const CLERK_SIGN_UP_HOST_RE = /^https:\/\/(?:[^/]+\.)?clerk\.(?:8os\.ai|accounts\.dev|com)$/
const CLERK_SIGN_UP_PATH_RE = /^\/v1\/client\/(?:sign_ups|verify)/

type Severity = 'error' | 'warning'

interface BridgeError {
  status: number
  message: string
  endpoint: string
  at: number
  kind?: AuthBridgeKind
}

function classify(
  status: number,
  payload?: unknown,
  requestEmail?: string | null
): { message: string; severity: Severity; kind: AuthBridgeKind } {
  if (status === 422) {
    const classified = classifySignup422(payload, requestEmail)
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
        "We're having trouble reaching the sign-up service right now. Please try again in a minute.",
      severity: 'error',
      kind: 'generic',
    }
  }
  return {
    message: 'Something went wrong creating your account. Please try again.',
    severity: 'error',
    kind: 'generic',
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
  forceRedirectUrl: _forceRedirectUrl,
  fallbackRedirectUrl,
}) => {
  const [bridgeError, setBridgeError] = useState<BridgeError | null>(null)
  const { isLoaded, signUp, setActive } = useSignUp()
  const router = useRouter()
  const advancing = useRef(false)

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

      let requestEmail: string | null = null
      if (watch) {
        const rawBody = init?.body ?? (input instanceof Request ? undefined : undefined)
        if (typeof rawBody === 'string') {
          requestEmail = extractEmailFromBody(rawBody)
        }
      }

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

      if (watch && response.ok) {
        try {
          window.dispatchEvent(new CustomEvent('8os:clerk-signup-write', { detail: { url, status: response.status } }))
        } catch {
          /* ignore */
        }
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
        console.warn('[clerk-sign-up-bridge] upstream error', {
          status: response.status,
          endpoint: url,
          severity,
          kind,
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

  async function advanceIfStuck() {
    if (advancing.current) return
    if (!isLoaded || !signUp) return

    const status = signUp.status
    const unverified = signUp.unverifiedFields ?? []
    const needsEmail =
      status === 'missing_requirements' && unverified.includes('email_address')

    if (needsEmail) {
      const path = window.location.pathname
      const hash = window.location.hash || ''
      if (!path.includes('verify-email') && !hash.includes('verify-email')) {
        router.replace('/signup/verify-email-address')
      }
      return
    }

    if (status === 'complete' && signUp.createdSessionId) {
      advancing.current = true
      try {
        await setActive({ session: signUp.createdSessionId })
        router.replace('/onboarding')
      } catch (err) {
        advancing.current = false
        console.warn('[clerk-sign-up-bridge] setActive failed', err)
      }
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onWrite = () => {
      window.setTimeout(() => {
        void advanceIfStuck()
      }, 250)
    }
    window.addEventListener('8os:clerk-signup-write', onWrite)
    return () => window.removeEventListener('8os:clerk-signup-write', onWrite)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, signUp?.status, signUp?.id])

  useEffect(() => {
    void advanceIfStuck()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, signUp?.status, signUp?.createdSessionId, signUp?.unverifiedFields?.join(',')])

  // OS-5954: intercept submit before Clerk's type=text email field hits the API.
  // Clerk widgets often use type="text" so browser native email validation never fires.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const root = document.querySelector('.signup-auth') ?? document.body
    const onSubmit = (event: Event) => {
      const form = event.target
      if (!(form instanceof HTMLFormElement)) return
      const emailInput = form.querySelector<HTMLInputElement>(
        'input[name="emailAddress"], input[name="identifier"], input[type="email"]'
      )
      if (!emailInput) return
      const value = emailInput.value.trim()
      if (!value || looksLikeEmail(value)) {
        return
      }
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
          data-testid="clerk-sign-up-error"
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
                  : bridgeError.status === 422
                    ? 'Account creation issue'
                    : 'Sign-up error'}
          </strong>
          <span data-testid="clerk-sign-up-error-message">{bridgeError.message}</span>
        </div>
      )}
      <SignUp
        routing="path"
        path="/signup"
        signInUrl={signInUrl ?? '/login'}
        fallbackRedirectUrl={fallbackRedirectUrl ?? '/onboarding'}
        appearance={appearance}
      />
    </div>
  )
}

export default SignupClerkErrorBridge
