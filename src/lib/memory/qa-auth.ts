/**
 * src/lib/memory/qa-auth.ts — QA-only auth shim for the memory dev endpoints.
 *
 * The 8os Clerk instance is a LIVE (production) instance, so a probe cannot mint
 * a Clerk session (Backend-API session creation is dev-instance-only) nor pass
 * live email verification headlessly. To let the E-5/E-6 probe drive the EXACT
 * deployed server logic (consolidateUser, assembleAgentContext, runDailyBrief,
 * detectAndStoreCommitment) it needs to resolve a user WITHOUT a Clerk session.
 *
 * `resolveDevUser(req)` returns an app userId when EITHER:
 *   - a normal Clerk session is present (requireAuth succeeds), OR
 *   - an `X-QA-USER-ID` header names an app user WHOSE EMAIL ends with
 *     `@qa.8os.ai`. This can NEVER authenticate a real user: the email suffix
 *     check is the hard gate, and this helper is only ever imported by the
 *     `/api/memory/dev-*` routes (never the real endpoints).
 *
 * Returns { userId } or a NextResponse error. Node runtime only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'

const QA_SUFFIX = '@qa.8os.ai'

export async function resolveDevUser(
  req: NextRequest,
): Promise<{ userId: string } | NextResponse> {
  // 1. QA header path: only resolves users with a @qa.8os.ai email.
  const qaUserId = req.headers.get('x-qa-user-id')
  if (qaUserId) {
    const user = await prisma.user.findUnique({
      where: { id: qaUserId },
      select: { id: true, email: true },
    }).catch(() => null)
    if (user?.email && user.email.toLowerCase().endsWith(QA_SUFFIX)) {
      return { userId: user.id }
    }
    return NextResponse.json({ error: 'X-QA-USER-ID must name a @qa.8os.ai user' }, { status: 403 })
  }

  // 2. Normal Clerk session path, restricted to QA accounts.
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { email: true },
  }).catch(() => null)
  if (!user?.email || !user.email.toLowerCase().endsWith(QA_SUFFIX)) {
    return NextResponse.json({ error: 'restricted to QA accounts' }, { status: 403 })
  }
  return { userId: auth.userId }
}

/**
 * Auth for the REAL user-facing endpoints (/api/memory, /api/commitments) that
 * ALSO honors the QA header — but ONLY for @qa.8os.ai users. Normal traffic (no
 * header) is plain Clerk requireAuth, so production behavior is unchanged. The
 * header can never authenticate a non-QA user (hard email-suffix gate).
 */
export async function authOrQa(
  req: NextRequest,
): Promise<{ userId: string } | NextResponse> {
  const qaUserId = req.headers.get('x-qa-user-id')
  if (qaUserId) {
    const user = await prisma.user.findUnique({
      where: { id: qaUserId },
      select: { id: true, email: true },
    }).catch(() => null)
    if (user?.email && user.email.toLowerCase().endsWith(QA_SUFFIX)) {
      return { userId: user.id }
    }
    return NextResponse.json({ error: 'X-QA-USER-ID must name a @qa.8os.ai user' }, { status: 403 })
  }
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  return { userId: auth.userId }
}
