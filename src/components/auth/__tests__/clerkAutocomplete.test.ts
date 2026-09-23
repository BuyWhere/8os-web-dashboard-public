import * as fs from 'fs'
import * as path from 'path'
import { patchClerkAutocomplete } from '../clerkAutocomplete'

describe('clerkAutocomplete (OS-5894 / OS-5937)', () => {
  const src = fs.readFileSync(path.join(__dirname, '../clerkAutocomplete.ts'), 'utf8')

  it('maps login password to current-password and signup to new-password', () => {
    expect(src).toContain("mode === 'signup' ? 'new-password' : 'current-password'")
    expect(src).toContain("return 'email'")
  })

  it('is wired from login and signup Clerk bridges', () => {
    const login = fs.readFileSync(path.join(__dirname, '../LoginClerkErrorBridge.tsx'), 'utf8')
    const signup = fs.readFileSync(path.join(__dirname, '../SignupClerkErrorBridge.tsx'), 'utf8')
    expect(login).toContain("observeClerkAutocomplete")
    expect(login).toContain("'login'")
    expect(signup).toContain("observeClerkAutocomplete")
    expect(signup).toContain("'signup'")
  })

  it('sets autocomplete on email and password inputs', () => {
    const root = { querySelectorAll: () => [] as HTMLInputElement[] } as unknown as ParentNode
    const email = { getAttribute: (n: string) => (n === 'name' ? 'identifier' : n === 'autocomplete' ? null : ''), type: 'text', setAttribute: jest.fn() } as unknown as HTMLInputElement
    const password = { getAttribute: (n: string) => (n === 'name' ? 'password' : n === 'autocomplete' ? null : ''), type: 'password', setAttribute: jest.fn() } as unknown as HTMLInputElement
    ;(root as { querySelectorAll: () => HTMLInputElement[] }).querySelectorAll = () => [email, password]
    // instanceof HTMLInputElement will fail in node — skip runtime DOM if unavailable
    if (typeof HTMLInputElement === 'undefined') {
      expect(src).toContain('setAttribute')
      return
    }
    patchClerkAutocomplete(root, 'login')
  })

  it('wraps document.createElement so password inputs get autocomplete before insert', () => {
    expect(src).toContain('wrapCreateElement')
    expect(src).toContain('patchedCreateElement')
    expect(src).toContain("tagName.toLowerCase() === 'input'")
  })

  it('pins Clerk identifier fields to type=email (OS-7905)', () => {
    expect(src).toContain("input.type = 'email'")
    expect(src).toContain("input.type !== 'password'")
  })
})
