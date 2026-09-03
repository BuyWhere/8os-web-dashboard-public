'use client'

interface Props {
  progress: number  // 0-1
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
}

export function ProgressRing({ progress, size = 56, strokeWidth = 5, color = '#22c55e', label }: Props) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const dash = circumference * Math.min(Math.max(progress, 0), 1)

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e1e1e" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      {label && (
        <span style={{ fontSize: size < 48 ? '9px' : '11px', color: '#aaa', fontWeight: 600, zIndex: 1 }}>
          {label}
        </span>
      )}
    </div>
  )
}
