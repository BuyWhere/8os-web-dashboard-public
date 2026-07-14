'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getDayMaster, STEM_NAMES_EN, STEM_ELEMENT, STEM_POLARITY } from '@/lib/bazi'
import type { Stem } from '@/lib/bazi'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'

// ─── Types ────────────────────────────────────────────────────────────────────

type Gender = 'male' | 'female' | 'nonbinary'

interface LocationResult {
  city: string
  country: string
  lat?: number
  lng?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseLocationFromText(text: string): LocationResult | null {
  const parts = text.split(',').map(s => s.trim())
  if (parts.length >= 2) {
    return { city: parts[0], country: parts[parts.length - 1] }
  }
  if (parts.length === 1 && parts[0].length > 0) {
    return { city: parts[0], country: '' }
  }
  return null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ELEMENT_COLORS: Record<string, string> = {
  wood: '#4F7A52',
  fire: '#B5502F',
  earth: 'var(--color-accent)',
  metal: 'var(--color-text-muted)',
  water: '#3E6B8C',
}

const ELEMENT_ICONS: Record<string, string> = {
  wood: '🌱', fire: '🔥', earth: '🌍', metal: '⚙️', water: '🌊',
}

const GENDER_OPTIONS: { id: Gender; label: string; icon: string }[] = [
  { id: 'male', label: 'Male', icon: '♂' },
  { id: 'female', label: 'Female', icon: '♀' },
  { id: 'nonbinary', label: 'Non-binary', icon: '⚧' },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ─── Warm-editorial tokens ──────────────────────────────────────────────────
const CREAM = 'var(--color-bg-primary)'
const WHITE = 'var(--color-bg-card)'
const INK = 'var(--color-text-primary)'
const WARM_GRAY = 'var(--color-text-secondary)'
const MUTED = 'var(--color-text-muted)'
const GOLD = 'var(--color-accent)'
const GOLD_DARK = 'var(--color-accent)'
const HAIRLINE = 'var(--color-border)'
const SERIF = 'var(--font-serif), Georgia, serif'

// ─── Component ────────────────────────────────────────────────────────────────

export default function BirthPage() {
  const router = useRouter()

  // Date
  const [year, setYear] = useState<number>(1990)
  const [month, setMonth] = useState<number>(1)
  const [day, setDay] = useState<number>(1)

  // Time (optional)
  const [timeKnown, setTimeKnown] = useState(false)
  const [hour, setHour] = useState<number>(12)
  const [minute, setMinute] = useState<number>(0)

  // Timezone — auto-detect
  const [timezone, setTimezone] = useState<string>('')

  // Gender
  const [gender, setGender] = useState<Gender | null>(null)

  // Location
  const [locationQuery, setLocationQuery] = useState('')
  const [location, setLocation] = useState<LocationResult | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState('')

  // GDPR
  const [gdprAccepted, setGdprAccepted] = useState(false)

  // BaZi preview
  const [dayMasterStem, setDayMasterStem] = useState<Stem | null>(null)

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // ─── Effects ───────────────────────────────────────────────────────────────

  // Auto-detect timezone
  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    } catch {
      setTimezone('UTC')
    }
  }, [])

  // Client-side Day Master preview
  useEffect(() => {
    if (year >= 1920 && year <= 2026 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      try {
        const stem = getDayMaster(year, month, day)
        setDayMasterStem(stem)
      } catch {
        setDayMasterStem(null)
      }
    } else {
      setDayMasterStem(null)
    }
  }, [year, month, day])

  // ─── Days in month ─────────────────────────────────────────────────────────

  const daysInMonth = new Date(year, month, 0).getDate()
  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // ─── IP Geolocation fallback ───────────────────────────────────────────────

  async function detectLocationFromIP() {
    setLocationLoading(true)
    setLocationError('')
    try {
      const res = await fetch('https://ipapi.co/json/')
      const data = await res.json()
      const loc: LocationResult = {
        city: data.city ?? 'Unknown',
        country: data.country_name ?? 'Unknown',
        lat: data.latitude,
        lng: data.longitude,
      }
      setLocation(loc)
      setLocationQuery(`${loc.city}, ${loc.country}`)
    } catch {
      setLocationError('Could not detect location automatically')
    } finally {
      setLocationLoading(false)
    }
  }

  // Simple location parsing from text input
  function parseLocationFromText(text: string): LocationResult | null {
    const parts = text.split(',').map(s => s.trim())
    if (parts.length >= 2) {
      return { city: parts[0], country: parts[parts.length - 1] }
    }
    if (parts.length === 1 && parts[0].length > 0) {
      return { city: parts[0], country: '' }
    }
    return null
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!gender || !gdprAccepted) return
    setSubmitting(true)
    setError('')

    const birthDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const birthTime = timeKnown ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` : null
    const parsedLocation = location ?? (locationQuery ? parseLocationFromText(locationQuery) : null)

    try {
      const res = await fetch('/api/onboarding/birth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate,
          birthTime,
          birthTimezone: timezone || null,
          gender,
          birthLocation: parsedLocation,
          gdprAccepted,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Failed to save birth data')
        return
      }

      // Cache BaZi result for quiz skip logic
      const responseData = await res.json()
      try {
        localStorage.setItem('8os_bazi_result', JSON.stringify(responseData.bazi))
      } catch {}

      router.push('/onboarding/quiz')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = gender !== null && gdprAccepted && year >= 1920 && year <= 2026

  // ─── UI ────────────────────────────────────────────────────────────────────

  const dmColor = dayMasterStem ? ELEMENT_COLORS[STEM_ELEMENT[dayMasterStem]] : GOLD
  const dmElement = dayMasterStem ? STEM_ELEMENT[dayMasterStem] : null
  const dmPolarity = dayMasterStem ? STEM_POLARITY[dayMasterStem] : null

  const inputStyle = {
    padding: '0.85rem 1rem',
    background: WHITE,
    border: `1px solid ${HAIRLINE}`,
    borderRadius: '10px',
    color: INK,
    fontSize: '0.9375rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23B08637' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    paddingRight: '2.5rem',
  }

  const labelStyle = {
    display: 'block' as const,
    fontSize: '0.72rem',
    color: MUTED,
    marginBottom: '0.5rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    fontWeight: 700,
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: CREAM,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '3rem 1.5rem 6rem',
    }}>
      <div style={{ maxWidth: 560, width: '100%' }}>

        {/* Shared step indicator */}
        <OnboardingProgress current="birth" />

        {/* Headline */}
        <h1 style={{ fontFamily: SERIF, fontSize: '2.1rem', fontWeight: 500, color: INK, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '0.6rem' }}>
          When were you born?
        </h1>
        <p style={{ color: WARM_GRAY, marginBottom: '2.5rem', lineHeight: 1.6, fontSize: '1rem' }}>
          We use your exact birth moment to compute your BaZi chart — the Chinese Four-Pillar
          system that maps your natural energy. It stays private, encrypted, and is used only to
          personalize your OS.
        </p>

        {/* Card wrapper */}
        <div style={{ background: WHITE, border: `1px solid ${HAIRLINE}`, borderRadius: '16px', padding: '1.75rem 1.5rem' }}>

        {/* Date picker */}
        <section style={{ marginBottom: '2rem' }}>
          <label style={labelStyle}>Birth Date</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '0.75rem' }}>
            {/* Day */}
            <select
              value={day}
              onChange={e => setDay(Number(e.target.value))}
              style={selectStyle}
            >
              {dayOptions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Month */}
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              style={selectStyle}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>

            {/* Year */}
            <input
              type="number"
              min={1920}
              max={2026}
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              style={inputStyle}
              placeholder="Year"
            />
          </div>

          {/* Year range hint */}
          {(year < 1920 || year > 2026) && (
            <p style={{ color: '#B5502F', fontSize: '0.8rem', marginTop: '0.4rem' }}>
              Year must be between 1920 and 2026
            </p>
          )}
        </section>

        {/* Day Master Preview */}
        {dayMasterStem && dmElement && dmPolarity && (
          <div style={{
            padding: '1.25rem',
            background: `${dmColor}12`,
            border: `1px solid ${dmColor}40`,
            borderRadius: '12px',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <div style={{ fontSize: '2rem' }}>{ELEMENT_ICONS[dmElement]}</div>
            <div>
              <div style={{ fontSize: '0.68rem', color: dmColor, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 700 }}>
                Day Master Preview
              </div>
              <div style={{ fontFamily: SERIF, fontSize: '1.25rem', fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}>
                {dayMasterStem} — {STEM_NAMES_EN[dayMasterStem]}
              </div>
              <div style={{ fontSize: '0.85rem', color: WARM_GRAY, marginTop: '0.1rem' }}>
                {dmPolarity.charAt(0).toUpperCase() + dmPolarity.slice(1)} {dmElement.charAt(0).toUpperCase() + dmElement.slice(1)}
              </div>
            </div>
          </div>
        )}

        {/* Birth Time */}
        <section style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Birth Time</label>
            <button
              onClick={() => setTimeKnown(t => !t)}
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: timeKnown ? GOLD : WARM_GRAY,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {timeKnown ? '✓ Time known' : 'I know my birth time'}
            </button>
          </div>

          {timeKnown ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ ...labelStyle, marginBottom: '0.35rem' }}>Hour</label>
                <select value={hour} onChange={e => setHour(Number(e.target.value))} style={selectStyle}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom: '0.35rem' }}>Minute</label>
                <select value={minute} onChange={e => setMinute(Number(e.target.value))} style={selectStyle}>
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <p style={{ color: WARM_GRAY, fontSize: '0.85rem', padding: '0.85rem 1rem', background: CREAM, border: `1px solid ${HAIRLINE}`, borderRadius: '10px', margin: 0, lineHeight: 1.5 }}>
              We&apos;ll use 12:00 noon for now — add your exact birth time for a more precise chart.
            </p>
          )}

          {/* Timezone */}
          {timezone && (
            <p style={{ color: MUTED, fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Timezone auto-detected: {timezone}
            </p>
          )}
        </section>

        {/* Gender */}
        <section style={{ marginBottom: '2rem' }}>
          <label style={labelStyle}>Gender</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {GENDER_OPTIONS.map(g => {
              const active = gender === g.id
              return (
                <button
                  key={g.id}
                  onClick={() => setGender(g.id)}
                  style={{
                    padding: '0.875rem',
                    background: active ? `${GOLD}14` : WHITE,
                    border: `1px solid ${active ? GOLD : HAIRLINE}`,
                    borderRadius: '10px',
                    color: active ? GOLD_DARK : WARM_GRAY,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{g.icon}</span>
                  <span>{g.label}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Birth Location */}
        <section style={{ marginBottom: '2rem' }}>
          <label style={labelStyle}>Birth Location</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={locationQuery}
              onChange={e => {
                setLocationQuery(e.target.value)
                setLocation(null)
              }}
              onBlur={() => {
                if (locationQuery && !location) {
                  const parsed = parseLocationFromText(locationQuery)
                  if (parsed) setLocation(parsed)
                }
              }}
              placeholder="City, Country (e.g. Shanghai, China)"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={detectLocationFromIP}
              disabled={locationLoading}
              style={{
                padding: '0.75rem 1rem',
                background: WHITE,
                border: `1px solid ${HAIRLINE}`,
                borderRadius: '10px',
                color: WARM_GRAY,
                cursor: locationLoading ? 'wait' : 'pointer',
                fontSize: '1rem',
                whiteSpace: 'nowrap',
              }}
              title="Detect from IP"
            >
              {locationLoading ? '...' : '📍'}
            </button>
          </div>
          {locationError && <p style={{ color: '#B5502F', fontSize: '0.8rem', marginTop: '0.4rem' }}>{locationError}</p>}
          {location && (
            <p style={{ color: '#4F7A52', fontSize: '0.8rem', marginTop: '0.4rem', fontWeight: 600 }}>
              ✓ {location.city}, {location.country}
              {location.lat && location.lng ? ` (${location.lat.toFixed(2)}, ${location.lng.toFixed(2)})` : ''}
            </p>
          )}
          <p style={{ color: MUTED, fontSize: '0.75rem', marginTop: '0.35rem' }}>
            Optional — used to refine timezone and seasonal calculations
          </p>
        </section>

        {/* GDPR */}
        <section style={{ marginBottom: '1.75rem' }}>
          <div
            onClick={() => setGdprAccepted(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.875rem',
              padding: '1rem',
              background: CREAM,
              border: `1px solid ${gdprAccepted ? `${GOLD}55` : HAIRLINE}`,
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 18,
              height: 18,
              border: `1.5px solid ${gdprAccepted ? GOLD : '#C7BBA6'}`,
              borderRadius: '4px',
              background: gdprAccepted ? GOLD : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '0.1rem',
            }}>
              {gdprAccepted && <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>✓</span>}
            </div>
            <p style={{ fontSize: '0.8rem', color: WARM_GRAY, lineHeight: 1.6, margin: 0 }}>
              I consent to 8os storing my birth data securely. This data is encrypted at rest with AES-256 and is used solely to compute my personalized operating system. I can request deletion at any time.
            </p>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div style={{ padding: '0.75rem 1rem', background: '#B5502F12', border: '1px solid #B5502F40', borderRadius: '10px', color: '#B5502F', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          style={{
            width: '100%',
            padding: '1rem',
            background: canSubmit ? GOLD : '#E3D8C4',
            color: canSubmit ? '#fff' : '#A99A82',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            letterSpacing: '-0.01em',
            transition: 'all 0.15s',
          }}
        >
          {submitting ? 'Calculating your chart...' : 'Continue to the quiz →'}
        </button>
        {!canSubmit && (
          <p style={{ textAlign: 'center', color: MUTED, fontSize: '0.75rem', marginTop: '0.7rem' }}>
            {!gender ? 'Select a gender and accept the consent to continue' : 'Accept the consent above to continue'}
          </p>
        )}
        </div>
      </div>
    </div>
  )
}
