'use client'

// OS-5811: Clerk's Continue CTA appends a raw Unicode ▶ that fonts and
// screen readers handle inconsistently. Replace it with a decorative SVG.

const PLAY_GLYPH_RE = /[▶▷►▸▵]/g

const SVG_MARKUP =
  '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" data-os-continue-arrow="true">' +
  '<path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>'

function isPrimarySubmit(el: Element): el is HTMLButtonElement {
  if (!(el instanceof HTMLButtonElement)) return false
  if (el.type !== 'submit' && !el.className.includes('formButtonPrimary')) return false
  return true
}

function patchButton(btn: HTMLButtonElement) {
  if (btn.dataset.osContinueArrow === '1') {
    // Re-strip if Clerk re-rendered the glyph into a text node.
    const stillGlyph = Array.from(btn.childNodes).some(
      (n) => n.nodeType === Node.TEXT_NODE && /[▶▷►▸▵]/.test(n.textContent || '')
    )
    if (!stillGlyph && btn.querySelector('svg[data-os-continue-arrow]')) return
  }

  for (const node of Array.from(btn.childNodes)) {
    if (node.nodeType !== Node.TEXT_NODE) continue
    const text = node.textContent || ''
    if (!/[▶▷►▸▵]/.test(text)) continue
    const cleaned = text.replace(PLAY_GLYPH_RE, '').replace(/\s+$/, '')
    if (cleaned.length === 0) {
      node.remove()
    } else {
      node.textContent = cleaned + ' '
    }
  }

  btn.querySelectorAll('svg:not([data-os-continue-arrow])').forEach((svg) => {
    const cls = (svg.getAttribute('class') || '').toLowerCase()
    if (cls.includes('arrow') || svg.getAttribute('aria-hidden') === 'true') {
      // Don't remove provider icons; Clerk's continue arrow is typically a tiny
      // chevron with no provider class. Keep social SVGs (they live on other buttons).
      if (btn.className.includes('formButtonPrimary') || btn.type === 'submit') {
        if (cls.includes('arrow') || cls.includes('icon')) svg.remove()
      }
    }
  })

  if (!btn.querySelector('svg[data-os-continue-arrow]')) {
    btn.insertAdjacentHTML('beforeend', SVG_MARKUP)
  }
  btn.dataset.osContinueArrow = '1'
}

export function patchClerkContinueArrows(root: ParentNode = document) {
  const candidates = root.querySelectorAll(
    'button.cl-formButtonPrimary, .cl-formButtonPrimary, button[type="submit"]'
  )
  candidates.forEach((el) => {
    if (isPrimarySubmit(el) || (el instanceof HTMLElement && el.className.includes('formButtonPrimary'))) {
      patchButton(el as HTMLButtonElement)
    }
  })
}

export function observeClerkContinueArrows(container: ParentNode): () => void {
  patchClerkContinueArrows(container)
  const mo = new MutationObserver(() => patchClerkContinueArrows(container))
  mo.observe(container instanceof Element ? container : document.body, {
    subtree: true,
    childList: true,
    characterData: true,
  })
  return () => mo.disconnect()
}
