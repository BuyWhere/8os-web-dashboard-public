import * as fs from 'fs'
import * as path from 'path'
import { labelClerkOauthButtons } from '../clerkOauthButtonNames'

type FakeEl = {
  className: string
  textContent: string
  attrs: Record<string, string>
  children: FakeEl[]
  getAttribute: (k: string) => string | null
  setAttribute: (k: string, v: string) => void
  querySelectorAll: (sel: string) => FakeEl[]
}

function el(className: string, attrs: Record<string, string> = {}, children: FakeEl[] = []): FakeEl {
  const node: FakeEl = {
    className,
    textContent: '',
    attrs: { ...attrs },
    children,
    getAttribute(k) {
      return this.attrs[k] ?? null
    },
    setAttribute(k, v) {
      this.attrs[k] = v
    },
    querySelectorAll() {
      return this.children
    },
  }
  return node
}

describe('clerkOauthButtonNames (OS-7125)', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '../clerkOauthButtonNames.ts'),
    'utf8'
  )

  it('sets aria-label Sign in with <provider>', () => {
    expect(src).toContain('Sign in with ${provider}')
  })

  it('is wired from login and signup Clerk bridges', () => {
    const login = fs.readFileSync(
      path.join(__dirname, '../LoginClerkErrorBridge.tsx'),
      'utf8'
    )
    const signup = fs.readFileSync(
      path.join(__dirname, '../SignupClerkErrorBridge.tsx'),
      'utf8'
    )
    expect(login).toContain('observeClerkOauthButtonNames')
    expect(signup).toContain('observeClerkOauthButtonNames')
  })

  it('labels icon-only Google/GitHub/Apple buttons and skips named ones', () => {
    const google = el('cl-socialButtonsIconButton cl-socialButtonsIconButton__google', {
      'data-provider': 'google',
    })
    const github = el('cl-socialButtonsIconButton', { 'data-strategy': 'oauth_github' })
    const apple = el('cl-socialButtonsIconButton cl-button__apple')
    const named = el('cl-socialButtonsBlockButton', {
      'aria-label': 'Continue with Google',
    })
    named.textContent = 'Continue with Google'

    const root = {
      querySelectorAll: () => [google, github, apple, named],
    } as unknown as ParentNode

    labelClerkOauthButtons(root)

    expect(google.getAttribute('aria-label')).toBe('Sign in with Google')
    expect(github.getAttribute('aria-label')).toBe('Sign in with GitHub')
    expect(apple.getAttribute('aria-label')).toBe('Sign in with Apple')
    expect(named.getAttribute('aria-label')).toBe('Continue with Google')
  })
})
