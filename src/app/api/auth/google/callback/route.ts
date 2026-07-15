import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { setAuthCookies } from '@/lib/auth/cookies'
import { createSession } from '@/lib/auth/session'
import { appUrl } from '@/lib/app-url'
import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  getGoogleFlowCookieName,
  getGoogleFlowCookieOptions,
  getGoogleOauthErrorRedirect,
  getOauthAccountExpiry,
  sanitizeNextPath,
  verifyGoogleOauthFlowToken,
} from '@/lib/auth/google'

function clearOauthFlowCookie(res: NextResponse) {
  res.cookies.set(getGoogleFlowCookieName(), '', {
    ...getGoogleFlowCookieOptions(),
    maxAge: 0,
  })
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const oauthError = req.nextUrl.searchParams.get('error')
  const fallbackNext = sanitizeNextPath(req.nextUrl.searchParams.get('next'), '/login')

  if (oauthError) {
    return NextResponse.redirect(new URL(getGoogleOauthErrorRedirect(fallbackNext, oauthError), req.url))
  }

  const cookieValue = req.cookies.get(getGoogleFlowCookieName())?.value
  if (!code || !state || !cookieValue) {
    return NextResponse.redirect(new URL(getGoogleOauthErrorRedirect(fallbackNext, 'Missing Google OAuth state'), req.url))
  }

  try {
    const flow = await verifyGoogleOauthFlowToken(cookieValue, state)
    const tokenResponse = await exchangeGoogleCode(code)
    const profile = await fetchGoogleUserInfo(tokenResponse.access_token)

    if (!profile.email || !profile.email_verified) {
      throw new Error('Google account must have a verified email')
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? undefined
    const userAgent = req.headers.get('user-agent') ?? undefined
    const oauthAccountExpiry = getOauthAccountExpiry(tokenResponse.expires_in)

    let userId: string
    if (flow.mode === 'link') {
      if (!flow.userId) throw new Error('Missing account linking context')

      const targetUser = await prisma.user.findUnique({
        where: { id: flow.userId },
        include: { oauthAccounts: true },
      })
      if (!targetUser) throw new Error('Target user not found')

      const existingOauth = await prisma.oauthAccount.findUnique({
        where: {
          provider_providerUid: {
            provider: 'google',
            providerUid: profile.sub,
          },
        },
      })

      if (existingOauth && existingOauth.userId !== targetUser.id) {
        throw new Error('That Google account is already linked to another user')
      }

      if (targetUser.email && targetUser.email !== profile.email) {
        throw new Error('Current account email does not match this Google identity')
      }

      const emailOwner = await prisma.user.findUnique({ where: { email: profile.email } })
      if (emailOwner && emailOwner.id !== targetUser.id) {
        throw new Error('That email already belongs to another account')
      }

      await prisma.$transaction(async (tx: typeof prisma) => {
        await tx.user.update({
          where: { id: targetUser.id },
          data: {
            email: targetUser.email ?? profile.email,
            emailVerified: true,
          },
        })

        await tx.oauthAccount.upsert({
          where: {
            provider_providerUid: {
              provider: 'google',
              providerUid: profile.sub,
            },
          },
          update: {
            userId: targetUser.id,
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
            expiresAt: oauthAccountExpiry,
          },
          create: {
            userId: targetUser.id,
            provider: 'google',
            providerUid: profile.sub,
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
            expiresAt: oauthAccountExpiry,
          },
        })
      })

      userId = targetUser.id
    } else {
      const existingOauth = await prisma.oauthAccount.findUnique({
        where: {
          provider_providerUid: {
            provider: 'google',
            providerUid: profile.sub,
          },
        },
        include: { user: true },
      })

      if (existingOauth) {
        await prisma.oauthAccount.update({
          where: { id: existingOauth.id },
          data: {
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
            expiresAt: oauthAccountExpiry,
          },
        })
        userId = existingOauth.userId
      } else {
        const existingUser = await prisma.user.findUnique({ where: { email: profile.email } })

        if (existingUser) {
          await prisma.$transaction(async (tx: typeof prisma) => {
            await tx.user.update({
              where: { id: existingUser.id },
              data: { emailVerified: true },
            })

            await tx.oauthAccount.create({
              data: {
                userId: existingUser.id,
                provider: 'google',
                providerUid: profile.sub,
                accessToken: tokenResponse.access_token,
                refreshToken: tokenResponse.refresh_token,
                expiresAt: oauthAccountExpiry,
              },
            })
          })
          userId = existingUser.id
        } else {
          const createdUser = await prisma.user.create({
            data: {
              email: profile.email,
              emailVerified: true,
              oauthAccounts: {
                create: {
                  provider: 'google',
                  providerUid: profile.sub,
                  accessToken: tokenResponse.access_token,
                  refreshToken: tokenResponse.refresh_token,
                  expiresAt: oauthAccountExpiry,
                },
              },
            },
          })
          userId = createdUser.id
        }
      }
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    const { accessToken, refreshToken } = await createSession(user, { ipAddress: ip, userAgent })
    const redirectPath = flow.mode === 'link'
      ? sanitizeNextPath(flow.next, '/settings/profile')
      : flow.next === '/dashboard' || flow.next === '/settings/profile'
        ? (user.onboardingDone ? flow.next : '/onboarding')
        : flow.next

    const response = NextResponse.redirect(appUrl(redirectPath))
    setAuthCookies(response, accessToken, refreshToken)
    clearOauthFlowCookie(response)
    return response
  } catch (error) {
    console.error('[google oauth] callback failed', error)
    const response = NextResponse.redirect(
      new URL(getGoogleOauthErrorRedirect('/login', 'Google sign-in failed'), req.url),
    )
    clearOauthFlowCookie(response)
    return response
  }
}
