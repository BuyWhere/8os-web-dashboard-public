import * as fs from 'fs'
import * as path from 'path'

describe('LoginClerkErrorBridge session cleanup (OS-5571)', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '../LoginClerkErrorBridge.tsx'),
    'utf8'
  )

  it('uses useAuth so a live session can disable the sign_ins watch', () => {
    expect(src).toContain("import { SignIn, useAuth } from '@clerk/nextjs'")
    expect(src).toContain('const { isLoaded, isSignedIn } = useAuth()')
  })

  it('skips installing the fetch patch once a session is established', () => {
    expect(src).toContain('if (sessionEstablishedRef.current) return')
    expect(src).toContain('signInWatchDisabled')
  })

  it('does not watch Clerk auth endpoints after sign-in', () => {
    expect(src).toMatch(/!signInWatchDisabled/)
    expect(src).toMatch(/!sessionEstablishedRef\.current/)
  })

  it('clears the inline 422 banner when a session exists', () => {
    expect(src).toContain('setBridgeError(null)')
    expect(src).toContain('signInWatchDisabled = true')
  })

  it('unmounts <SignIn> after a session is established so leftover polls stop', () => {
    expect(src).toContain('{!(isLoaded && isSignedIn) && (')
    expect(src).toContain('<SignIn')
  })
})
