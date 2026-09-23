'use client';

import { useEffect, useState } from 'react';
import {
  ARCHETYPE_NAMES_BY_ID,
  ARCHETYPE_THEME_CLASSES,
  MOCK_ARCHETYPES,
  type ArchetypeElement,
  type ArchetypeId,
} from '@/types/archetype';
import styles from './ArchetypesPageClient.module.css';

const ARCHETYPE_ORDER: ArchetypeId[] = [
  'strategic_commander',
  'nurturing_creative',
  'harmonizer_guardian',
  'steady_achiever',
];

const DEFAULT_ARCHETYPE_ID: ArchetypeId = 'strategic_commander';

const ELEMENT_EMOJIS: Record<ArchetypeElement, string> = {
  Metal: '⚙️',
  Wood: '🌿',
  Fire: '🔥',
  Earth: '⛰️',
  Water: '🌊',
};

function isArchetypeId(value: string): value is ArchetypeId {
  return value in ARCHETYPE_THEME_CLASSES;
}

function getActiveArchetypeId(): ArchetypeId | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedValues = [
    window.localStorage.getItem('8os_archetype_id'),
    window.sessionStorage.getItem('8os_archetype_id'),
  ];

  for (const value of storedValues) {
    if (value && isArchetypeId(value)) {
      return value;
    }
  }

  return null;
}

export default function ArchetypesPageClient() {
  const [activeArchetypeId, setActiveArchetypeId] = useState<ArchetypeId | null>(null);

  useEffect(() => {
    const syncActiveArchetype = () => {
      setActiveArchetypeId(getActiveArchetypeId());
    };

    syncActiveArchetype();
    window.addEventListener('storage', syncActiveArchetype);

    return () => {
      window.removeEventListener('storage', syncActiveArchetype);
    };
  }, []);

  const activeLabel = activeArchetypeId
    ? ARCHETYPE_NAMES_BY_ID[activeArchetypeId]
    : ARCHETYPE_NAMES_BY_ID[DEFAULT_ARCHETYPE_ID];

  return (
    <main style={pageStyle}>
      <div style={backdropGlowStyle} aria-hidden="true" />

      <section style={heroStyle}>
        <p style={eyebrowStyle}>Archetype Comparison</p>
        <h1 style={titleStyle}>See all four 8os archetypes side by side.</h1>
        <p style={subtitleStyle}>
          Each profile maps a different operating rhythm. Compare the dominant element, core
          strengths, and working style before you commit to a daily cadence.
        </p>
        <div style={statusPillStyle}>
          {activeArchetypeId ? `Active archetype: ${activeLabel}` : 'No active archetype saved yet'}
        </div>
        {!activeArchetypeId && (
          <a href="/quiz" style={ctaButtonStyle}>
            Take the Assessment
          </a>
        )}
      </section>

      <section className={styles.grid}>
        {ARCHETYPE_ORDER.map((archetypeId) => {
          const archetypeName = ARCHETYPE_NAMES_BY_ID[archetypeId];
          const archetype = MOCK_ARCHETYPES[archetypeName];
          const isActive = archetypeId === activeArchetypeId;

          return (
            <article
              key={archetypeId}
              className={ARCHETYPE_THEME_CLASSES[archetypeId]}
              style={{
                ...cardStyle,
                ...(isActive ? activeCardStyle : null),
              }}
            >
              <div style={cardHeaderStyle}>
                <div style={elementBadgeStyle}>
                  <span aria-hidden="true" style={elementEmojiStyle}>
                    {ELEMENT_EMOJIS[archetype.element]}
                  </span>
                  <span>{archetype.element}</span>
                </div>
                {isActive ? <span style={yourArchetypeBadgeStyle} className="your-archetype-badge">Your Archetype</span> : null}
              </div>

              <div style={nameBlockStyle}>
                <h2 style={cardTitleStyle}>{archetype.name}</h2>
                <p style={taglineStyle}>{archetype.tagline}</p>
              </div>

              <p style={descriptionStyle}>{archetype.description}</p>

              <div style={dividerStyle} />

              <div style={strengthsBlockStyle}>
                <h3 style={sectionTitleStyle}>Key strengths</h3>
                <ul style={strengthListStyle}>
                  {archetype.strengths.slice(0, 3).map((strength) => (
                    <li key={strength} style={strengthItemStyle}>
                      <span style={strengthBulletStyle} aria-hidden="true">
                        ●
                      </span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  position: 'relative',
  minHeight: '100%',
  padding: '3rem 1.25rem 4rem',
  color: 'var(--archetype-text)',
};

const backdropGlowStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(circle at top, color-mix(in srgb, var(--archetype-primary) 16%, transparent) 0%, transparent 58%)',
  pointerEvents: 'none',
};

const heroStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  maxWidth: '840px',
  margin: '0 auto 2rem',
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.82rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--archetype-primary)',
};

const titleStyle: React.CSSProperties = {
  margin: '0.9rem 0 1rem',
  fontSize: 'clamp(2.2rem, 5vw, 4.2rem)',
  lineHeight: 1,
  letterSpacing: '-0.05em',
  color: 'var(--archetype-text)',
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  maxWidth: '680px',
  fontSize: '1rem',
  lineHeight: 1.75,
  color: 'var(--archetype-text-muted)',
};

const statusPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  marginTop: '1.25rem',
  alignItems: 'center',
  gap: '0.45rem',
  borderRadius: '999px',
  border: '1px solid color-mix(in srgb, var(--archetype-primary) 35%, transparent)',
  background: 'color-mix(in srgb, var(--archetype-primary) 12%, rgba(8, 8, 8, 0.9))',
  color: 'var(--archetype-primary)',
  padding: '0.55rem 0.9rem',
  fontSize: '0.82rem',
  fontWeight: 600,
};

const ctaButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  marginTop: '1.5rem',
  padding: '0.85rem 1.75rem',
  borderRadius: '999px',
  background: '#E8B86D', // 8os brand gold — always high-contrast, independent of archetype CSS vars
  color: '#1A1B4B', // indigo text on gold: 8.7:1 AA pass
  fontSize: '1rem',
  fontWeight: 700,
  textDecoration: 'none',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  cursor: 'pointer',
};

const cardStyle: React.CSSProperties = {
  borderRadius: '28px',
  border: '1px solid var(--archetype-border)',
  background: 'linear-gradient(180deg, var(--archetype-surface) 0%, color-mix(in srgb, var(--archetype-surface) 82%, #050505) 100%)',
  padding: '1.35rem',
  boxShadow: '0 22px 48px rgba(0, 0, 0, 0.18)',
};

const activeCardStyle: React.CSSProperties = {
  borderColor: 'color-mix(in srgb, var(--archetype-primary) 55%, var(--archetype-border))',
  boxShadow: '0 28px 64px color-mix(in srgb, var(--archetype-primary) 12%, rgba(0, 0, 0, 0.2))',
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
};

const elementBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.45rem',
  borderRadius: '999px',
  border: '1px solid var(--archetype-border-strong)',
  background: 'var(--archetype-surface-soft)',
  padding: '0.45rem 0.8rem',
  color: 'var(--archetype-text-muted)',
  fontSize: '0.84rem',
};

const elementEmojiStyle: React.CSSProperties = {
  fontSize: '0.95rem',
};

const yourArchetypeBadgeStyle: React.CSSProperties = {
  borderRadius: '999px',
  background: 'var(--archetype-primary)',
  color: '#060606',
  padding: '0.4rem 0.78rem',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

const nameBlockStyle: React.CSSProperties = {
  marginTop: '1.1rem',
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.7rem',
  lineHeight: 1.05,
  letterSpacing: '-0.04em',
  color: 'var(--archetype-text)',
};

const taglineStyle: React.CSSProperties = {
  margin: '0.55rem 0 0',
  fontSize: '0.96rem',
  color: 'var(--archetype-primary)',
  fontWeight: 600,
};

const descriptionStyle: React.CSSProperties = {
  margin: '1rem 0 0',
  color: 'var(--archetype-text-muted)',
  lineHeight: 1.75,
  fontSize: '0.96rem',
};

const dividerStyle: React.CSSProperties = {
  height: '1px',
  margin: '1.15rem 0',
  background: 'linear-gradient(90deg, transparent 0%, var(--archetype-border) 16%, var(--archetype-border) 84%, transparent 100%)',
};

const strengthsBlockStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.82rem',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--archetype-text-faint)',
};

const strengthListStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'grid',
  gap: '0.65rem',
};

const strengthItemStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.7rem',
  alignItems: 'flex-start',
  color: 'var(--archetype-text)',
  lineHeight: 1.6,
};

const strengthBulletStyle: React.CSSProperties = {
  color: 'var(--archetype-primary)',
  fontSize: '0.75rem',
  marginTop: '0.32rem',
};
