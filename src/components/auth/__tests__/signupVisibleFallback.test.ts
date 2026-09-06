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
})
