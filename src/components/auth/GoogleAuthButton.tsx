'use client'

interface Props {
  href: string
  label: string
}

export function GoogleAuthButton({ href, label }: Props) {
  return (
    <a href={href} style={styles.button}>
      <span style={styles.icon}>G</span>
      <span>{label}</span>
    </a>
  )
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg-card)',
    color: 'var(--color-text-primary)',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '600',
  },
  icon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.5rem',
    height: '1.5rem',
    borderRadius: '999px',
    background: 'var(--color-accent)',
    color: '#FFFFFF',
    fontSize: '0.85rem',
    fontWeight: '700',
  },
}
