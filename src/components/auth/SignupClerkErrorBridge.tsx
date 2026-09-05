'use client'

import { SignUp, useSignUp } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FC } from 'react'
import {
  classifySignup422,
  extractEmailFromBody,
  EMAIL_FORMAT_MESSAGE,
  looksLikeEmail,
  signupRequiredFieldMessage,
  type AuthBridgeKind,
} from './clerkEmailFormat'
import { observeClerkContinueArrows } from './clerkContinueArrow'
import { observeClerkAutocomplete } from './clerkAutocomplete'

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
  const lastInternalErrorText = useRef('')
  const bannerRef = useRef<HTMLDivElement | null>(null)
  const lastBannerAt = useRef<number>(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stopArrowPatch = observeClerkContinueArrows(document.body)
    const stopAutocomplete = observeClerkAutocomplete(document.body, 'signup')
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
      stopArrowPatch()
      stopAutocomplete()
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

  // OS-6340: Clerk's SignUp widget renders internal error text inside its
  // iframe-less shadow DOM as `.cl-formFieldErrorText`, `.cl-alert`, and a
  // generic `.cl-internal-error` variant. Sometimes our fetch patch catches
  // the upstream call and we own the banner; sometimes Clerk renders an alert
  // on its own (e.g., retry-exhausted, captcha-required) without going through
  // fetch at all. Mirror any visible Clerk-internal error text into our banner
  // so the user always sees one error — not a silent widget re-render.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const root = document.querySelector('.signup-auth') ?? document.body
    const collectInternalError = (): { text: string; kind: AuthBridgeKind } | null => {
      const candidates = root.querySelectorAll<HTMLElement>(
        '.cl-formFieldErrorText, .cl-formFieldError, .cl-alert, .cl-internal-error, [data-clerk-error], [role="alert"]'
      )
      // Skip our own banner — its text is already authoritative.
      for (const el of Array.from(candidates)) {
        if (el.closest('[data-testid="clerk-sign-up-error"]')) continue
        const txt = (el.textContent ?? '').trim()
        if (!txt) continue
        const lower = txt.toLowerCase()
        const kind: AuthBridgeKind =
          lower.includes('password') ? 'password' :
          lower.includes('already') || lower.includes('exists') ? 'exists' :
          lower.includes('valid email') || lower.includes('invalid email') ? 'format' :
          'generic'
        return { text: txt, kind }
      }
      return null
    }

    const tryMirror = () => {
      const found = collectInternalError()
      const text = found?.text ?? ''
      if (text === lastInternalErrorText.current) return
      lastInternalErrorText.current = text
      if (!text) return
      setBridgeError((prev) => {
        // Don't clobber an existing explicit fetch-patch error within the same tick.
        if (prev && Date.now() - prev.at < 250) return prev
        return {
          status: prev?.status ?? 422,
          message: text,
          endpoint: 'clerk-internal-render',
          at: Date.now(),
          kind: found?.kind ?? prev?.kind ?? 'generic',
        }
      })
    }

    tryMirror()
    const observer = new MutationObserver(() => tryMirror())
    observer.observe(root, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // OS-5954 / OS-5915: intercept submit + Continue click. Clerk's type=text
  // fields skip native required/email validation, so empty Continue is a no-op.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const root = document.querySelector('.signup-auth') ?? document.body

    const readFields = (scope: ParentNode) => {
      const emailInput = scope.querySelector<HTMLInputElement>(
        'input[name="emailAddress"], input[name="identifier"], input[type="email"]'
      )
      const passwordInput = scope.querySelector<HTMLInputElement>(
        'input[name="password"], input[type="password"]'
      )
      return { emailInput, passwordInput }
    }

    const markInvalid = (el: HTMLInputElement | null, invalid: boolean) => {
      if (!el) return
      el.setAttribute('aria-invalid', invalid ? 'true' : 'false')
      el.style.outline = invalid ? '2px solid #B45309' : ''
      el.style.outlineOffset = invalid ? '1px' : ''
    }

    const applyClientValidation = (event: Event, scope: ParentNode): boolean => {
      const { emailInput, passwordInput } = readFields(scope)
      if (!emailInput && !passwordInput) return false
      const email = emailInput?.value ?? ''
      const password = passwordInput?.value ?? ''
      const required = signupRequiredFieldMessage({ email, password })
      if (required) {
        event.preventDefault()
        event.stopPropagation()
        markInvalid(emailInput, !email.trim())
        markInvalid(passwordInput, !password.trim())
        setBridgeError({
          status: 422,
          message: required,
          endpoint: 'client-required-fields',
          at: Date.now(),
          kind: 'required',
        })
        return true
      }
      markInvalid(emailInput, false)
      markInvalid(passwordInput, false)
      if (emailInput && !looksLikeEmail(email.trim())) {
        event.preventDefault()
        event.stopPropagation()
        markInvalid(emailInput, true)
        setBridgeError({
          status: 422,
          message: EMAIL_FORMAT_MESSAGE,
          endpoint: 'client-email-format',
          at: Date.now(),
          kind: 'format',
        })
        return true
      }
      return false
    }

    const onSubmit = (event: Event) => {
      const form = event.target
      if (!(form instanceof HTMLFormElement)) return
      applyClientValidation(event, form)
    }

    const onClick = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const button = target.closest('button')
      if (!button) return
      const isContinue =
        button.type === 'submit' ||
        button.classList.contains('cl-formButtonPrimary') ||
        /continue/i.test(button.textContent ?? '')
      if (!isContinue) return
      const form = button.closest('form') ?? root
      applyClientValidation(event, form)
    }

    root.addEventListener('submit', onSubmit, true)
    root.addEventListener('click', onClick, true)
    return () => {
      root.removeEventListener('submit', onSubmit, true)
      root.removeEventListener('click', onClick, true)
    }
  }, [])

  // OS-6340: when an error fires, scroll the banner into view so it can't be
  // missed below the fold on tall forms. Also clear any leftover Clerk-internal
  // .cl-formFieldErrorText so the user sees ONE source of truth.
  useEffect(() => {
    if (!bridgeError || typeof window === 'undefined') return
    if (bridgeError.at === lastBannerAt.current) return
    lastBannerAt.current = bridgeError.at
    requestAnimationFrame(() => {
      const el = bannerRef.current
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  }, [bridgeError])

  return (
    <div>
      {/* OS-5944: Clerk <SignUp> is client-only. First HTML (and first
          interaction before widget hydrate) has no input[name=email], so
          VidMee/automation miss the field and users see a layout shift.
          Keep a native email input in the document until Clerk paints its
          own field, then hide the skeleton. Same name/id/autocomplete as
          Clerk's identifier so first-load fill is robust. */}
      <SignupEmailSkeleton />
      {bridgeError && (
        <div
          ref={bannerRef}
          role="alert"
          aria-live="polite"
          data-testid="clerk-sign-up-error"
          data-status={bridgeError.status}
          data-kind={bridgeError.kind ?? 'generic'}
          style={{
            margin: '0 auto 1rem auto',
            maxWidth: 480,
            padding: '0.875rem 1rem 0.875rem 1.1rem',
            borderRadius: 10,
            border: '1px solid #B45309',
            borderLeft: '4px solid #B45309',
            background: '#FFF6EC',
            color: '#5C2F0E',
            fontSize: 14,
            lineHeight: 1.45,
            boxShadow: '0 2px 8px rgba(180,83,9,0.10)',
          }}
        >
          <strong data-testid="clerk-sign-up-error-heading" style={{ display: 'block', marginBottom: 2, color: '#5C2F0E', fontSize: 14 }}>
            {bridgeError.status === 0
              ? 'Connection problem'
              : bridgeError.status === 429
                ? 'Slow down'
                : bridgeError.kind === 'required'
                  ? 'Missing information'
                  : bridgeError.kind === 'format'
                  ? 'Invalid email'
                  : bridgeError.kind === 'password'
                    ? 'Password issue'
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

function SignupEmailSkeleton() {
  const [clerkReady, setClerkReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const root = document.querySelector('.signup-auth') ?? document.body
    const clerkEmail = () =>
      root.querySelector<HTMLInputElement>(
        'input.cl-formFieldInput, input[name="emailAddress"], input[name="identifier"]'
      )
    const handoff = () => {
      const clerk = clerkEmail()
      if (!clerk) return false
      const skeleton = root.querySelector<HTMLInputElement>(
        'input[data-testid="signup-email-input"]'
      )
      if (skeleton?.value && !clerk.value) {
        clerk.value = skeleton.value
        clerk.dispatchEvent(new Event('input', { bubbles: true }))
        clerk.dispatchEvent(new Event('change', { bubbles: true }))
      }
      // Stable selector for automation after Clerk hydrates (OS-5944).
      if (!clerk.getAttribute('name') || clerk.getAttribute('name') === 'emailAddress') {
        clerk.setAttribute('data-email-alias', 'email')
      }
      setClerkReady(true)
      return true
    }
    if (handoff()) return
    const observer = new MutationObserver(() => {
      if (handoff()) observer.disconnect()
    })
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  if (clerkReady) return null

  return (
    <div
      data-testid="signup-email-skeleton"
      aria-hidden={false}
      style={{ padding: '24px 24px 0' }}
    >
      <label
        htmlFor="email"
        style={{
          display: 'block',
          color: '#000000',
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="Enter your email address"
        aria-label="Email address"
        data-testid="signup-email-input"
        style={{
          width: '100%',
          minHeight: 44,
          boxSizing: 'border-box',
          border: '1px solid #4A4A4A',
          boxShadow: '0 0 0 1px #4A4A4A',
          borderRadius: 12,
          padding: '0 12px',
          fontSize: 15,
          color: '#221F1A',
          background: '#FFFFFF',
        }}
      />
    </div>
  )
}

export default SignupClerkErrorBridge
