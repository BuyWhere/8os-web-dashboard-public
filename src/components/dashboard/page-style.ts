import type { CSSProperties } from 'react'

export const pageShellStyle: CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  background: 'var(--skin-color-surface-alt, #F7F3EC)',
}

export const pageMainStyle: CSSProperties = {
  flex: 1,
  padding: '24px 32px',
  overflowY: 'auto',
}
