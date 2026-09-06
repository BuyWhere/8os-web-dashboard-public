export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: 'calc(100vh - var(--header-height, 64px))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        color: 'var(--color-text-secondary, #5C5652)',
        background: 'var(--color-bg-primary, #F7F3EC)',
      }}
    >
      Loading…
    </div>
  )
}
