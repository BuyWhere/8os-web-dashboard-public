import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Archetype Explorer — 8os',
  description: 'Explore all 8os archetypes and discover which one matches your personality and energy patterns.',
};

const archetypes = [
  {
    name: 'Strategic Commander',
    element: 'Metal',
    color: '#94a3b8',
    traits: ['Decisive', 'Structured', 'Goal-driven', 'Analytical'],
    desc: 'You see the battlefield before others do. You plan, execute, and deliver with precision.',
    peak: 'Early morning and late evening',
  },
  {
    name: 'Nurturing Creative',
    element: 'Wood',
    color: '#4ade80',
    traits: ['Innovative', 'Adaptive', 'Empathetic', 'Visionary'],
    desc: 'Ideas flow through you naturally. You grow best when given space to explore and create.',
    peak: 'Mid-morning creative windows',
  },
  {
    name: 'Steady Achiever',
    element: 'Fire',
    color: '#fb923c',
    traits: ['Ambitious', 'Energetic', 'Charismatic', 'Action-oriented'],
    desc: 'You burn bright and move fast. Your enthusiasm is contagious and your output is prolific.',
    peak: 'Late morning to afternoon',
  },
  {
    name: 'Harmonizer Guardian',
    element: 'Water',
    color: '#60a5fa',
    traits: ['Collaborative', 'Intuitive', 'Patient', 'Diplomatic'],
    desc: 'You bring people together. Your strength is in creating the conditions for others to thrive.',
    peak: 'Afternoon and early evening',
  },
  {
    name: 'Earth Anchor',
    element: 'Earth',
    color: '#d97706',
    traits: ['Reliable', 'Methodical', 'Grounded', 'Practical'],
    desc: 'You are the foundation. Steady, consistent, and trustworthy — you build things that last.',
    peak: 'Consistent throughout the day',
  },
];

export default function ArchetypeExplorerPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#ededed',
      padding: '4rem 2rem',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Link href="/" style={{ color: '#667eea', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← Back to 8os
        </Link>

        <div style={{ textAlign: 'center', marginTop: '2rem', marginBottom: '4rem' }}>
          <div style={{
            display: 'inline-block',
            padding: '0.375rem 1rem',
            background: 'rgba(102, 126, 234, 0.15)',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#667eea',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '1rem',
          }}>
            38M+ Configurations
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>
            Archetype Explorer
          </h1>
          <p style={{ color: '#888', fontSize: '1.125rem', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto' }}>
            Every 8os is built on a BaZi-derived archetype. These are the five core patterns —
            your exact configuration is a unique blend.
          </p>
        </div>

        <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '4rem' }}>
          {archetypes.map((a) => (
            <div key={a.name} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '2rem',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '1rem',
              alignItems: 'start',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ededed', margin: 0 }}>
                    {a.name}
                  </h2>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    background: `${a.color}22`,
                    border: `1px solid ${a.color}44`,
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: a.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {a.element}
                  </span>
                </div>
                <p style={{ color: '#bbb', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                  {a.desc}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {a.traits.map((t) => (
                    <span key={t} style={{
                      padding: '0.25rem 0.625rem',
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      color: '#aaa',
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
                <p style={{ color: '#666', fontSize: '0.8rem' }}>
                  ⚡ Peak hours: {a.peak}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          background: 'rgba(102, 126, 234, 0.08)',
          border: '1px solid rgba(102, 126, 234, 0.2)',
          borderRadius: '16px',
          padding: '2.5rem',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Discover Your Archetype
          </h2>
          <p style={{ color: '#888', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Your exact archetype is a unique blend determined by your BaZi birth chart.
            Generate yours in 90 seconds — free.
          </p>
          <Link href="/onboarding" style={{
            display: 'inline-block',
            padding: '1rem 2rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '1rem',
            fontWeight: 700,
          }}>
            Generate My Life OS — Free
          </Link>
        </div>
      </div>
    </main>
  );
}
