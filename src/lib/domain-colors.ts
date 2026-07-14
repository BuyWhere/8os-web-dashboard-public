/**
 * Canonical life-domain colours + icons. Single source so the sidebar goal
 * dots, goal cards, calendar, and dashboard all agree (fixes the "blue dot vs
 * brown card" mismatch). Import from here instead of re-declaring per component.
 */
export const DOMAIN_COLORS: Record<string, string> = {
  career: '#6366f1',
  wealth: '#f59e0b',
  health: '#22c55e',
  relationships: '#ec4899',
  learning: '#3b82f6',
  legacy: '#8b5cf6',
}

export const DOMAIN_ICONS: Record<string, string> = {
  career: '💼', wealth: '💰', health: '💪', relationships: '❤️', learning: '📚', legacy: '🌟',
}

export function domainColor(domainId?: string | null): string {
  return (domainId && DOMAIN_COLORS[domainId]) || '#6366f1'
}
