import { NextRequest, NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db/prisma"

/**
 * require-auth — the single, real auth gate for user-facing API routes.
 *
 * As of the 2026-07-10 Clerk-consolidation fix, this resolves the CLERK session
 * to an app `User.id`, lazily provisioning the app-user row on first authed
 * request (the Clerk webhook is a best-effort mirror; it may be inactive if
 * CLERK_WEBHOOK_SECRET is unset, so we never depend on it for correctness).
 *
 * Compatibility:
 *  - Return shape `{ ok, userId, sessionId }` is unchanged, so every existing
 *    caller (`const auth = await requireAuth(req); if (auth instanceof NextResponse) return auth`)
 *    keeps working. `sessionId` is now the Clerk session id.
 *  - The QA `X-QA-USER-ID` header path is preserved verbatim so QA probes that
 *    depend on it (see src/lib/memory/qa-auth.ts) keep functioning. The header
 *    only ever resolves an existing app user id; it can never mint a session.
 */

const QA_SUFFIX = "@qa.8os.ai"

/**
 * Resolve a Clerk user id to an app User.id, creating/linking the row if needed.
 * Exported so server components / lazy paths can share the exact same logic.
 */
export async function resolveAppUserId(clerkUserId: string): Promise<string> {
  // 1. Already linked?
  const existing = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  })
  if (existing) return existing.id

  // 2. Look up the Clerk profile so we can link-by-email or create with email.
  let primaryEmail: string | null = null
  try {
    const cc = await clerkClient()
    const clerkUser = await cc.users.getUser(clerkUserId)
    primaryEmail =
      clerkUser.emailAddresses?.find(
        (e) => e.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ??
      clerkUser.emailAddresses?.[0]?.emailAddress ??
      null
  } catch (err) {
    console.error("[require-auth] clerkClient.getUser failed:", err)
  }

  // 3. Link a pre-existing app user with the same email (migration case).
  if (primaryEmail) {
    const byEmail = await prisma.user.findUnique({
      where: { email: primaryEmail },
      select: { id: true, clerkUserId: true },
    })
    if (byEmail) {
      if (!byEmail.clerkUserId) {
        await prisma.user
          .update({ where: { id: byEmail.id }, data: { clerkUserId } })
          .catch(() => {})
      }
      return byEmail.id
    }
  }

  // 4. Create a fresh app user. Race-safe: if a concurrent request (or the
  //    webhook) created it first, fall back to reading it.
  try {
    const created = await prisma.user.create({
      data: { clerkUserId, email: primaryEmail },
      select: { id: true },
    })
    return created.id
  } catch {
    const raced = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    })
    if (raced) return raced.id
    if (primaryEmail) {
      const racedByEmail = await prisma.user.findUnique({
        where: { email: primaryEmail },
        select: { id: true },
      })
      if (racedByEmail) return racedByEmail.id
    }
    throw new Error("could not provision app user for clerk id " + clerkUserId)
  }
}

/**
 * Extract and verify the caller identity.
 * Returns { ok, userId, sessionId } on success, or a NextResponse error to
 * return immediately.
 */
export async function requireAuth(
  req: NextRequest,
): Promise<{ ok: true; userId: string; sessionId: string } | NextResponse> {
  // QA header path (preserved). Only resolves an existing @qa.8os.ai app user.
  const qaUserId = req.headers.get("x-qa-user-id")
  if (qaUserId) {
    const user = await prisma.user
      .findUnique({ where: { id: qaUserId }, select: { id: true, email: true } })
      .catch(() => null)
    if (user?.email && user.email.toLowerCase().endsWith(QA_SUFFIX)) {
      return { ok: true, userId: user.id, sessionId: "qa" }
    }
    return NextResponse.json(
      { error: "X-QA-USER-ID must name a @qa.8os.ai user" },
      { status: 403 },
    )
  }

  // Real Clerk session path.
  const { userId: clerkUserId, sessionId } = await auth()
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const appUserId = await resolveAppUserId(clerkUserId)
    return { ok: true, userId: appUserId, sessionId: sessionId ?? "clerk" }
  } catch (err) {
    console.error("[require-auth] failed to resolve app user:", err)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
