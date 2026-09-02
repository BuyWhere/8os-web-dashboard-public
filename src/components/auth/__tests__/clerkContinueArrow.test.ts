import * as fs from 'fs'
import * as path from 'path'

describe('clerkContinueArrow (OS-5811)', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '../clerkContinueArrow.ts'),
    'utf8'
  )

  it('strips Unicode play/triangle glyphs from Continue copy', () => {
    expect(src).toMatch(/PLAY_GLYPH_RE = \/\[[^\]]*▶[^\]]*\]\/g/)
  })

  it('injects a decorative SVG with aria-hidden', () => {
    expect(src).toContain('aria-hidden="true"')
    expect(src).toContain('data-os-continue-arrow')
    expect(src).toContain('<svg')
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
    expect(login).toContain('observeClerkContinueArrows')
    expect(signup).toContain('observeClerkContinueArrows')
  })
})
