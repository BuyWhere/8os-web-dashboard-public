'use client'

// OS-5894 / OS-5937: Clerk hosted <SignIn>/<SignUp> inputs often omit
// autocomplete, so Chrome warns "[DOM] Input elements should have
// autocomplete attributes (suggested: current-password)" at create time
// and password managers get weaker hints.
//
// Chrome logs the warning when the <input> is first inserted without the
// attribute, so a post-mount MutationObserver is too late to silence the
// console. We also wrap document.createElement so password/email inputs
// get autocomplete before Clerk appends them.
//
// Login passwords use current-password; signup passwords use new-password;
// email/identifier use email.

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

export function applyAutocomplete(input: HTMLInputElement, mode: ClerkAutocompleteMode): void {
  const next = desiredAutocomplete(input, mode)
  if (!next) return
  const current = input.getAttribute('autocomplete')
  if (current !== next) input.setAttribute('autocomplete', next)
  // OS-7905: Clerk paints identifier as type=text. VidMee and native
  // email keyboards look for input[type=email]. Pin the type once the
  // field is known to be an email identifier — password fields stay put.
  if (isEmailField(input) && input.type !== 'email' && input.type !== 'password') {
    try {
      input.type = 'email'
    } catch {
      input.setAttribute('type', 'email')
    }
  }
}

export function patchClerkAutocomplete(
  root: ParentNode = document,
  mode: ClerkAutocompleteMode = 'login'
): void {
  const inputs = root.querySelectorAll('input')
  inputs.forEach((el) => {
    if (!(el instanceof HTMLInputElement)) return
    applyAutocomplete(el, mode)
  })
}

function wrapCreateElement(mode: ClerkAutocompleteMode): () => void {
  if (typeof document === 'undefined') return () => {}
  const proto = Document.prototype
  const original = proto.createElement
  proto.createElement = function patchedCreateElement(
    this: Document,
    tagName: string,
    options?: ElementCreationOptions
  ) {
    const el = original.call(this, tagName, options)
    if (typeof tagName === 'string' && tagName.toLowerCase() === 'input' && el instanceof HTMLInputElement) {
      const apply = () => applyAutocomplete(el, mode)
      const origSet = el.setAttribute.bind(el)
      el.setAttribute = ((name: string, value: string) => {
        origSet(name, value)
        if (name === 'type' || name === 'name' || name === 'id') apply()
      }) as HTMLInputElement['setAttribute']
      const origType = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'type')
      if (origType?.set) {
        Object.defineProperty(el, 'type', {
          configurable: true,
          enumerable: origType.enumerable,
          get() {
            return origType.get?.call(el) ?? ''
          },
          set(v: string) {
            origType.set!.call(el, v)
            apply()
          },
        })
      }
      queueMicrotask(apply)
    }
    return el
  } as typeof original
  return () => {
    proto.createElement = original
  }
}

export function observeClerkAutocomplete(
  container: ParentNode,
  mode: ClerkAutocompleteMode
): () => void {
  const unwrap = wrapCreateElement(mode)
  patchClerkAutocomplete(container, mode)
  const mo = new MutationObserver(() => patchClerkAutocomplete(container, mode))
  mo.observe(container instanceof Element ? container : document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['name', 'type', 'id', 'autocomplete'],
  })
  return () => {
    mo.disconnect()
    unwrap()
  }
}
