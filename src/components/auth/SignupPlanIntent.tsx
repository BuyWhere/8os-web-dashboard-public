'use client'

import { useEffect, useState } from 'react'

const PLAN_LABEL: Record<string, string> = {
  pro: 'Pro',
  'agent-connect': 'Agent Connect',
}

/**
 * Surfaces the paid-plan intent carried from /pricing CTAs (?plan=pro|agent-connect).
 * Clerk hash-routing can drop search params, so we also persist to sessionStorage.
 */
export function SignupPlanIntent() {
  const [plan, setPlan] = useState<string | null>(null)

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const fromQuery = params.get('plan')
      if (fromQuery && PLAN_LABEL[fromQuery]) {
        sessionStorage.setItem('8os.plan', fromQuery)
        setPlan(fromQuery)
        return
      }
      const stored = sessionStorage.getItem('8os.plan')
      if (stored && PLAN_LABEL[stored]) setPlan(stored)
    } catch {
      // sessionStorage can throw in locked-down browsers; banner is optional.
    }
  }, [])

  if (!plan) return null
  const label = PLAN_LABEL[plan]
  return (
    <p
      data-testid="signup-plan-intent"
      style={{
        margin: '0 0 1rem',
        padding: '0.7rem 0.9rem',
        borderRadius: 10,
        background: 'rgba(176, 134, 55, 0.12)',
        color: '#221F1A',
        fontSize: '0.92rem',
        lineHeight: 1.4,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      Sign in is required before checkout. After you create an account, you can continue with {label}.
    </p>
  )
}
