export default function Loading() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D0D0F',
      color: '#ededed',
      padding: '4rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(102, 126, 234, 0.3)',
        borderTopColor: '#667eea',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
