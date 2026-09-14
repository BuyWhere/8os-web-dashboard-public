/**
 * OS-7125 — Clerk icon-only OAuth buttons fail axe `button-name`.
 * Clerk's socialButtonsIconButton is an <button> wrapping an SVG with no
 * accessible name. Patch aria-label="Sign in with <Provider>" on each
 * unlabeled social button; MutationObserver covers Clerk's delayed mount.
 */

const SOCIAL_BTN_SEL =
  '.cl-socialButtons button, .cl-socialButtonsIconButton, .cl-socialButtonsBlockButton, button[class*="socialButtons"]'

const PROVIDER_RE =
  /(?:^|[^a-z0-9])(google|github|apple|microsoft|facebook|discord|linkedin|tiktok|twitter|gitlab|bitbucket|spotify|twitch|slack|dropbox|notion|hubspot|instagram|kakao|okta|saml)(?:[^a-z0-9]|$)/i

function titleize(id: string): string {
  if (id.toLowerCase() === 'github') return 'GitHub'
  if (id.toLowerCase() === 'linkedin') return 'LinkedIn'
  if (id.toLowerCase() === 'gitlab') return 'GitLab'
  if (id.toLowerCase() === 'okta') return 'Okta'
  if (id.toLowerCase() === 'saml') return 'SAML'
  if (id.toLowerCase() === 'x' || id.toLowerCase() === 'twitter') return 'X'
  return id.charAt(0).toUpperCase() + id.slice(1).toLowerCase()
}

function detectProvider(btn: HTMLElement): string | null {
  const hay = [
    btn.getAttribute('data-provider'),
    btn.getAttribute('data-strategy'),
    btn.className,
    btn.getAttribute('aria-label'),
    btn.getAttribute('title'),
    btn.textContent,
    ...Array.from(btn.querySelectorAll('img, svg, span')).flatMap((el) => [
      el.getAttribute('alt'),
      el.getAttribute('aria-label'),
      el.getAttribute('title'),
      el.getAttribute('data-provider'),
      el.className instanceof SVGAnimatedString
        ? el.className.baseVal
        : String(el.className ?? ''),
    ]),
  ]
    .filter(Boolean)
    .join(' ')
  const m = hay.match(PROVIDER_RE)
  return m ? titleize(m[1]) : null
}

function accessibleName(btn: HTMLElement): string {
  const labelledBy = btn.getAttribute('aria-labelledby')
  if (labelledBy) {
    const parts = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
      .filter(Boolean)
    if (parts.length) return parts.join(' ')
  }
  return (
    btn.getAttribute('aria-label')?.trim() ||
    btn.getAttribute('title')?.trim() ||
    (btn.textContent ?? '').replace(/\s+/g, ' ').trim()
  )
}

export function labelClerkOauthButtons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>(SOCIAL_BTN_SEL).forEach((btn) => {
    if (accessibleName(btn)) return
    const provider = detectProvider(btn)
    if (!provider) return
    btn.setAttribute('aria-label', `Sign in with ${provider}`)
  })
}

export function observeClerkOauthButtonNames(
  root: ParentNode = typeof document !== 'undefined' ? document.body : (undefined as unknown as ParentNode)
): () => void {
  if (typeof MutationObserver === 'undefined' || !root) return () => {}
  labelClerkOauthButtons(root)
  const mo = new MutationObserver(() => labelClerkOauthButtons(root))
  mo.observe(root as Node, { childList: true, subtree: true, attributes: true })
  return () => mo.disconnect()
}
