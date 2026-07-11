/**
 * Archetype Skin Definitions — WARM EDITORIAL
 *
 * The base app chrome is warm editorial (cream / white / ink / gold) and is
 * SHARED across every skin. A sun-sign / archetype skin only contributes a
 * subtle personal ACCENT (primary / accent / icon / badge / gradients) on top
 * of that warm base — it must never repaint the whole app dark.
 *
 * This keeps the logged-in app clean, warm and light (matching the redesigned
 * landing) while still giving each user a personal highlight color.
 *
 * Token categories are unchanged so existing components keep working:
 *   --skin-color-*  --skin-gradient-*  --skin-typo-*  --skin-radius-*
 *   --skin-glow-*   --skin-card-*      --skin-button-*
 */

export interface ArchetypeSkin {
  id: string
  name: string
  variables: Record<string, string>
}

// ── Warm editorial palette (matches the landing) ─────────────────────────
const INK = '#221F1A'
const GRAY = '#6B6257'
const MUTED = '#8A8175'
const CREAM = '#F7F3EC'
const SURFACE = '#FFFFFF'
const CARD_HOVER = '#FBF7F0'
const HAIRLINE = '#E7DFD2'
const HAIRLINE_STRONG = '#D9CFBE'

// ── Shared warm base tokens — identical for every skin ───────────────────
const BASE: Record<string, string> = {
  // Neutral warm surfaces / text / borders (NOT overridden by skins)
  '--skin-color-surface': SURFACE,
  '--skin-color-surface-alt': CREAM,
  '--skin-color-text': INK,
  '--skin-color-text-secondary': GRAY,
  '--skin-color-text-muted': MUTED,
  '--skin-color-border': HAIRLINE,
  '--skin-color-border-strong': HAIRLINE_STRONG,

  '--skin-card-bg': SURFACE,
  '--skin-card-border': HAIRLINE,
  '--skin-card-hover-bg': CARD_HOVER,
  '--skin-card-hover-border': '#E1D4BC',

  '--skin-gradient-hero': `linear-gradient(135deg, #FBF7F0 0%, #F2E9D6 100%)`,

  '--skin-typo-heading-weight': '600',
  '--skin-typo-heading-scale': '1.0',
  '--skin-typo-body-weight': '400',
  '--skin-typo-letter-spacing': '0',

  '--skin-radius-card': '16px',
  '--skin-radius-button': '10px',
  '--skin-radius-pill': '999px',
  '--skin-radius-input': '10px',

  '--skin-divider': HAIRLINE,
}

// Backwards-compat export (was previously the radius bundle).
const SHARED = {
  '--skin-radius-card': '16px',
  '--skin-radius-button': '10px',
  '--skin-radius-pill': '999px',
  '--skin-radius-input': '10px',
}

/**
 * Build a full skin from a single earthy accent color. The accent tints only
 * the highlight tokens; the warm base handles everything structural.
 *
 * @param accent  main accent (buttons, active states, rings)
 * @param soft    a lighter tint of the accent for badges / secondary buttons
 * @param badgeBg very light accent wash for badge backgrounds
 * @param badgeTx readable dark accent for badge text
 */
function skin(
  id: string,
  name: string,
  accent: string,
  soft: string,
  badgeBg: string,
  badgeTx: string,
): ArchetypeSkin {
  return {
    id,
    name,
    variables: {
      ...BASE,
      '--skin-color-primary': accent,
      '--skin-color-primary-muted': soft,
      '--skin-color-accent': accent,
      '--skin-color-badge-bg': badgeBg,
      '--skin-color-badge-text': badgeTx,

      '--skin-gradient-card': `linear-gradient(135deg, ${SURFACE} 0%, ${CARD_HOVER} 100%)`,
      '--skin-gradient-button': `linear-gradient(135deg, ${accent} 0%, ${badgeTx} 100%)`,

      '--skin-glow-primary': '0 8px 24px rgba(34, 31, 26, 0.05)',
      '--skin-glow-hover': '0 12px 30px rgba(34, 31, 26, 0.08)',

      '--skin-button-primary-bg': accent,
      '--skin-button-primary-text': '#FFFFFF',
      '--skin-button-primary-hover': badgeTx,
      '--skin-button-secondary-bg': badgeBg,
      '--skin-button-secondary-text': badgeTx,
      '--skin-button-secondary-border': HAIRLINE,

      '--skin-icon-color': accent,
      '--skin-badge-color': badgeTx,
    },
  }
}

// ── Archetype skins — earthy accents that sit well on cream ───────────────
// Each keeps the archetype's character (green, blue, orange, …) but muted to
// a warm editorial register so it never reads neon / dark.
export const ARCHETYPE_SKINS: ArchetypeSkin[] = [
  skin('pioneer',        'The Pioneer',         '#4F7A52', '#DCE6D6', '#E7EFE0', '#3C5C3E'),
  skin('sage',           'The Sage',            '#3F6C8E', '#D6E2EA', '#E0EAF0', '#2F5169'),
  skin('catalyst',       'The Catalyst',        '#B5652F', '#F0DCC8', '#F5E7D6', '#8A4A20'),
  skin('architect',      'The Architect',       '#6B6257', '#E2DCD1', '#EDE7DC', '#4A443B'),
  skin('nurturer',       'The Nurturer',        '#A07A2A', '#EDE0C4', '#F2E9D6', '#7A5A1E'),
  skin('innovator',      'The Innovator',       '#7E5A94', '#E6DAEC', '#EEE4F0', '#5E4270'),
  skin('sentinel',       'The Sentinel',        '#5A6472', '#DEE2E7', '#E9ECEF', '#3F4753'),
  skin('mystic',         'The Mystic',          '#5B5C99', '#DCDDEC', '#E6E7F0', '#42436F'),
  skin('builder',        'The Builder',         '#B08637', '#EEDFC4', '#F2E9D6', '#7A5A1E'),
  skin('hybrid_explorer','The Hybrid Explorer', '#3E8494', '#D3E6E9', '#DFEDEF', '#2C6069'),
]

/**
 * Build a single CSS string from an archetype skin, merging in shared tokens.
 */
export function buildSkinCss(skin: ArchetypeSkin): string {
  const vars = { ...SHARED, ...skin.variables }
  const rules = Object.entries(vars)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n')
  return `[data-archetype-skin="${skin.id}"] {\n${rules}\n}`
}

/**
 * Get a skin definition by archetype ID.
 */
export function getSkinById(id: string): ArchetypeSkin | undefined {
  return ARCHETYPE_SKINS.find((s) => s.id === id)
}

/**
 * Default fallback skin (Sage) when no matching skin is found.
 */
export const DEFAULT_SKIN: ArchetypeSkin = ARCHETYPE_SKINS[1]!
