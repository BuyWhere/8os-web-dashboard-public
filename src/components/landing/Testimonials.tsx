'use client'

import { useEffect, useState } from 'react'

interface Testimonial {
  name: string
  role: string
  avatar: string
  content: string
  archetype: string
  rating: number
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Sarah Chen',
    role: 'Productivity Coach',
    avatar: 'SC',
    content:
      'This completely transformed how I approach my mornings. The AI understands my work style better than I do.',
    archetype: 'Strategic Commander',
    rating: 5,
  },
  {
    name: 'Marcus Rodriguez',
    role: 'Startup Founder',
    avatar: 'MR',
    content:
      'Finally a system that adapts to me, not the other way around. BaZi insights are surprisingly accurate.',
    archetype: 'Nurturing Creative',
    rating: 5,
  },
  {
    name: 'Emily Watson',
    role: 'Marketing Director',
    avatar: 'EW',
    content:
      "The scheduling intelligence is incredible. It knows exactly when I'm most productive and protects that time.",
    archetype: 'Steady Achiever',
    rating: 5,
  },
  {
    name: 'David Kim',
    role: 'Software Engineer',
    avatar: 'DK',
    content:
      'Built my entire task management around this. The archetype system actually gets my energy patterns.',
    archetype: 'Harmonizer Guardian',
    rating: 5,
  },
]

const ROTATION_MS = 5000

export default function Testimonials() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % TESTIMONIALS.length)
    }, ROTATION_MS)
    return () => clearInterval(interval)
  }, [])

  const t = TESTIMONIALS[index]

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '3rem 2rem',
        backdropFilter: 'blur(10px)',
        marginBottom: '3rem',
      }}
    >
      <h2
        style={{
          fontSize: '2rem',
          fontWeight: 700,
          marginBottom: '0.5rem',
          color: '#fff',
        }}
      >
        What People Are Saying
      </h2>
      <p
        style={{
          fontSize: '0.875rem',
          color: '#888',
          marginBottom: '2rem',
        }}
      >
        Join thousands who&apos;ve already built their personal operating system
      </p>
      <div
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '3rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '1rem',
          }}
        >
          {t.avatar}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.25rem',
            marginBottom: '1rem',
          }}
        >
          {[...Array(t.rating)].map((_, i) => (
            <span key={i} style={{ color: '#fbbf24', fontSize: '1rem' }}>
              ★
            </span>
          ))}
        </div>
        <p
          style={{
            fontSize: '1.125rem',
            color: '#ccc',
            lineHeight: 1.7,
            marginBottom: '1.5rem',
            fontStyle: 'italic',
          }}
        >
          &ldquo;{t.content}&rdquo;
        </p>
        <p
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#fff',
          }}
        >
          {t.name}
        </p>
        <p
          style={{
            fontSize: '0.875rem',
            color: '#888',
          }}
        >
          {t.role}
        </p>
        <div
          style={{
            display: 'inline-block',
            marginTop: '1rem',
            padding: '0.375rem 0.75rem',
            background: 'rgba(102, 126, 234, 0.15)',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            color: '#667eea',
            fontWeight: 500,
          }}
        >
          {t.archetype}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.5rem',
          marginTop: '2rem',
        }}
      >
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Go to testimonial ${i + 1}`}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              border: 'none',
              background: i === index ? '#667eea' : 'rgba(255,255,255,0.2)',
              cursor: 'pointer',
              padding: 0,
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>
    </div>
  )
}
