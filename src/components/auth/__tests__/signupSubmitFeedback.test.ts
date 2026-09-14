import * as fs from 'fs'
import * as path from 'path'

describe('signup submit feedback (OS-7127)', () => {
  const bridge = fs.readFileSync(
    path.join(__dirname, '../SignupClerkErrorBridge.tsx'),
    'utf8'
  )

  it('renders a pending status banner so Continue is never a silent no-op', () => {
    expect(bridge).toContain('data-testid="clerk-sign-up-pending"')
    expect(bridge).toContain('Creating your account')
    expect(bridge).toContain("role=\"status\"")
  })

  it('reloads the Clerk SignUp resource after a successful write', () => {
    expect(bridge).toContain('.reload')
    expect(bridge).toContain('signup-pending-timeout')
  })

  it('surfaces setActive failure instead of a silent re-enable', () => {
    expect(bridge).toContain('could not start your session')
  })
})
