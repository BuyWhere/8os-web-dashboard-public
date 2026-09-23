import * as fs from 'fs'
import * as path from 'path'

describe('signup visible fallback (OS-5655)', () => {
  const bridge = fs.readFileSync(
    path.join(__dirname, '../SignupClerkErrorBridge.tsx'),
    'utf8'
  )
  const page = fs.readFileSync(
    path.join(__dirname, '../../../app/(auth)/signup/[[...sign-up]]/page.tsx'),
    'utf8'
  )

  it('keeps a native email skeleton in initial HTML while Clerk hydrates', () => {
    expect(bridge).toContain('<SignupEmailSkeleton />')
    expect(bridge).toContain('data-testid="signup-email-skeleton"')
    expect(bridge).toContain('data-testid="signup-email-input"')
    expect(bridge).toContain('placeholder="Enter your email address"')
    expect(bridge).toContain('type="email"')
  })

  it('does not unmount the native type=email field after Clerk hydrates (OS-7905)', () => {
    expect(bridge).not.toContain('if (clerkReady) return null')
    expect(bridge).toContain('clerk.type = \'email\'')
  })

  it('still renders the Clerk SignUp widget after the fallback', () => {
    expect(bridge).toContain('<SignUp')
    expect(bridge).toContain('routing="path"')
    expect(bridge).toContain('path="/signup"')
  })

  it('wraps the auth region in the bordered signup card', () => {
    expect(page).toContain('className="signup-auth-card"')
    expect(page).toContain('<SignupClerkErrorBridge')
  })

  it('ships a server-rendered type=email in the signup page (OS-7905)', () => {
    expect(page).toContain('className="signup-ssr-email"')
    expect(page).toContain('type="email"')
    expect(page).toContain('data-testid="signup-email-input"')
  })
})
