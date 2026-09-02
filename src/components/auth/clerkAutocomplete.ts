'use client'

// OS-5894: Clerk hosted <SignIn>/<SignUp> inputs often omit autocomplete, so
// Chrome warns "[DOM] Input elements should have autocomplete attributes
// (suggested: current-password)" and password managers get weaker hints.
// Patch after mount + on DOM mutations. Login passwords use current-password;
// signup passwords use new-password; email/identifier use email.

export type ClerkAutocompleteMode = 'login' | 'signup'

function isEmailField(input: HTMLInputElement): boolean {
  const name = (input.getAttribute('name') || input.getAttribute('id') || '').toLowerCase()
  const type = (input.type || '').toLowerCase()
  const autocomplete = (input.getAttribute('autocomplete') || '').toLowerCase()
  if (type === 'email') return true
  if (name.includes('email') || name.includes('identifier') || name.includes('username')) return true
  if (autocomplete === 'username' || autocomplete === 'email') return true
  return false
}

function isPasswordField(input: HTMLInputElement): boolean {
  const name = (input.getAttribute('name') || input.getAttribute('id') || '').toLowerCase()
  const type = (input.type || '').toLowerCase()
  if (type === 'password') return true
  return name.includes('password')
}

function desiredAutocomplete(input: HTMLInputElement, mode: ClerkAutocompleteMode): string | null {
  if (isPasswordField(input)) {
    const name = (input.getAttribute('name') || input.getAttribute('id') || '').toLowerCase()
    if (name.includes('confirm')) return 'new-password'
    return mode === 'signup' ? 'new-password' : 'current-password'
  }
  if (isEmailField(input)) return 'email'
  return null
}

export function patchClerkAutocomplete(
  root: ParentNode = document,
  mode: ClerkAutocompleteMode = 'login'
): void {
  const inputs = root.querySelectorAll('input')
  inputs.forEach((el) => {
    if (!(el instanceof HTMLInputElement)) return
    const next = desiredAutocomplete(el, mode)
    if (!next) return
    const current = el.getAttribute('autocomplete')
    if (current === next) return
    el.setAttribute('autocomplete', next)
  })
}

export function observeClerkAutocomplete(
  container: ParentNode,
  mode: ClerkAutocompleteMode
): () => void {
  patchClerkAutocomplete(container, mode)
  const mo = new MutationObserver(() => patchClerkAutocomplete(container, mode))
  mo.observe(container instanceof Element ? container : document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['name', 'type', 'id', 'autocomplete'],
  })
  return () => mo.disconnect()
}
