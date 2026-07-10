'use client'

import { useEffect, useState } from 'react'
import { caldiyApi } from '@/lib/caldiy/client'
import type { CalDiyBooking } from '@/types/caldiy'

export default function UpcomingBookings() {
  const [calDiyUrl] = useState(() => process.env.NEXT_PUBLIC_CALDIY_URL || '')
  const [bookings, setBookings] = useState<CalDiyBooking[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!calDiyUrl) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await caldiyApi.bookings.list({ status: 'accepted', limit: 5 })
        if (!cancelled) setBookings(data.bookings || [])
      } catch {
        if (!cancelled) console.error('Failed to load Cal.diy bookings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [calDiyUrl])

  if (!calDiyUrl) return null

  return (
    <div
      style={{
        marginTop: '3rem',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '2rem',
      }}
    >
      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          marginBottom: '1rem',
        }}
      >
        Upcoming Bookings
      </h2>
      {loading ? (
        <p style={{ color: '#888', fontSize: '0.875rem' }}>Loading bookings...</p>
      ) : bookings.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {bookings.map((booking) => (
            <div
              key={booking.id}
              style={{
                padding: '1rem',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 500 }}>{booking.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>
                  {new Date(booking.startTime).toLocaleString()}
                </div>
              </div>
              <span
                style={{
                  padding: '0.25rem 0.75rem',
                  background:
                    booking.status === 'accepted'
                      ? 'rgba(34,197,94,0.2)'
                      : 'rgba(255,255,255,0.1)',
                  color: booking.status === 'accepted' ? '#22c55e' : '#999',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              >
                {booking.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: '#888', fontSize: '0.875rem' }}>
          No upcoming bookings. Configure Cal.diy to see your schedule here.
        </p>
      )}
      <div style={{ marginTop: '1rem' }}>
        <a
          href={`${calDiyUrl}/book`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '8px',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Book a Meeting
        </a>
      </div>
    </div>
  )
}
