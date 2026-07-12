/**
 * /api/user/billing — read-only billing snapshot for the account hub's Billing
 * tab (plan, status, renewal date, life-report purchase). Clerk-authed,
 * userId-scoped. Upgrades/checkout are handled by /api/stripe/checkout from the
 * upgrade page; this route only reports current state.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getUserBilling } from '@/lib/subscription'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const billing = await getUserBilling(auth.userId)
    return NextResponse.json({
      plan: billing.plan,
      status: billing.status,
      currentPeriodEnd: billing.currentPeriodEnd ? billing.currentPeriodEnd.toISOString() : null,
      lifeReportPurchased: billing.lifeReportPurchased,
    })
  } catch {
    // Safe default — never break the Billing tab if the subscriptions table
    // read hiccups.
    return NextResponse.json({ plan: 'free', status: 'none', currentPeriodEnd: null, lifeReportPurchased: false })
  }
}
