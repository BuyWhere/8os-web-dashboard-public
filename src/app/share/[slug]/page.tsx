import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

/**
 * Share cards — /share/[archetype-slug]
 *
 * OS-4562: implements the RSC handler for the share route that archetype
 * detail pages (and the FAQ + changelog) link to. Five canonical slugs
 * mirror the `archetypeSlug` field in src/app/archetypes/[slug]/page.tsx.
 * Each card surfaces: archetype name, element, tagline, traits, and a
 * CTA to discover your own archetype.
 */

interface ArchetypeShareCard {
  slug: string;
  archetype: string;
  element: string;
  elementEmoji: string;
  elementColor: string;
  tagline: string;
  description: string;
  traits: string[];
  exampleSign: string;
  exampleElement: string;
}

const SHARE_CARDS: Record<string, ArchetypeShareCard> = {
  'strategic-commander': {
    slug: 'strategic-commander',
    archetype: 'Strategic Commander',
    element: 'Metal',
    elementEmoji: '⚙️',
    elementColor: 'var(--color-element-metal, #8A8B8E)',
    tagline: 'The Architect Who Builds Empires',
    description: 'Strategic Commanders combine decisive action with structural precision. Where others see obstacles, they see inefficiencies to eliminate. They earn trust through reliability, not charisma, and build systems that outlast the builder.',
    traits: ['Unmatched long-range planning and execution', 'Decisive under pressure without panic', 'Builds systems that outlast the builder', 'Earns trust through reliability, not charisma'],
    exampleSign: 'Capricorn',
    exampleElement: 'Geng Metal',
  },
  'nurturing-creative': {
    slug: 'nurturing-creative',
    archetype: 'Nurturing Creative',
    element: 'Water',
    elementEmoji: '🌊',
    elementColor: 'var(--color-element-water, #4A7BA8)',
    tagline: 'The Strategist Who Sees What Others Miss',
    description: 'Nurturing Creatives combine ambitious structure with deep perception. They don\'t just plan — they sense what the plan misses. They synthesize across vast domains and build long-term with emotional intelligence others lack.',
    traits: ['Pattern recognition is extraordinary', 'Ambitious but intuitive; adjusts when others execute broken plans', 'Deep synthesizer across vast domains', 'Builds long-term with emotional intelligence others lack'],
    exampleSign: 'Capricorn',
    exampleElement: 'Ren Water',
  },
  'visionary-builder': {
    slug: 'visionary-builder',
    archetype: 'Visionary Builder',
    element: 'Fire',
    elementEmoji: '🔥',
    elementColor: 'var(--color-element-fire, #C95A3C)',
    tagline: 'The Revolutionary Who Builds the Future',
    description: 'Visionary Builders see structural solutions to problems others accept as fixed. They inspire collective action and combine innovation with genuine warmth — a rare combination in visionary types.',
    traits: ['Sees structural solutions others accept as fixed', 'Inspires collective action', 'Combines innovation with genuine warmth', 'High creative output when mission is clear'],
    exampleSign: 'Aquarius',
    exampleElement: 'Bing Fire',
  },
  'steady-achiever': {
    slug: 'steady-achiever',
    archetype: 'Steady Achiever',
    element: 'Wood',
    elementEmoji: '🌿',
    elementColor: 'var(--color-element-wood, #5C8A4A)',
    tagline: 'The Adaptive Builder',
    description: 'Steady Achievers build systematically toward long-range goals. Principled without being rigid, they adapt strategy while holding mission and attract collaborators who share values, not just goals.',
    traits: ['Builds systematically toward long-range goals', 'Principled without being rigid', 'Inspires through depth and consistency', 'Attracts collaborators who share values'],
    exampleSign: 'Gemini',
    exampleElement: 'Yi Wood',
  },
  'harmonizer-guardian': {
    slug: 'harmonizer-guardian',
    archetype: 'Harmonizer Guardian',
    element: 'Earth',
    elementEmoji: '🏔️',
    elementColor: 'var(--color-element-earth, #A88454)',
    tagline: 'The Generous Leader Who Holds It Together',
    description: 'Harmonizer Guardians lead with both warmth and authority. They hold the centre during group volatility and are trusted implicitly by those who experience their consistency.',
    traits: ['Leads with both warmth and authority', 'Holds the centre during group volatility', 'Creative and generous', 'Trusted implicitly by those they serve'],
    exampleSign: 'Leo',
    exampleElement: 'Wu Earth',
  },
};

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.keys(SHARE_CARDS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const card = SHARE_CARDS[slug];
  if (!card) return { title: 'Archetype Not Found' };

  return {
    title: `${card.archetype} | 8os.ai`,
    description: card.description,
    alternates: {
      canonical: `/share/${card.slug}`,
    },
    openGraph: {
      title: `${card.archetype} — ${card.tagline}`,
      description: card.description,
      url: `https://8os.ai/share/${card.slug}`,
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${card.archetype} — ${card.tagline}`,
      description: card.description,
    },
  };
}

export default async function ShareCardPage({ params }: Props) {
  const { slug } = await params;
  const card = SHARE_CARDS[slug];
  if (!card) notFound();

  return (
    <main
      data-share-slug={card.slug}
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: '56px 24px 80px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header card — distinct archetype-tinted surface */}
        <div
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 16,
            padding: '40px 32px',
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          {/* 8os wordmark above the card so the share page is self-identifying */}
          <Link
            href="/"
            style={{
              display: 'inline-block',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
              letterSpacing: '0.04em',
              marginBottom: 24,
            }}
          >
            8os
          </Link>

          {/* Element + archetype badges */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                background: `${card.elementColor}15`,
                border: `1px solid ${card.elementColor}30`,
                color: card.elementColor,
                borderRadius: 20,
                padding: '4px 14px',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {card.elementEmoji} {card.element}
            </span>
            <span
              style={{
                background: 'var(--color-accent-soft)',
                border: '1px solid var(--color-accent-soft)',
                color: 'var(--color-accent)',
                borderRadius: 20,
                padding: '4px 14px',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {card.archetype}
            </span>
          </div>

          <h1
            style={{
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              marginBottom: 8,
              color: 'var(--color-text-primary)',
              lineHeight: 1.1,
            }}
          >
            {card.archetype}
          </h1>
          <p
            style={{
              fontSize: 18,
              color: 'var(--color-text-muted)',
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            {card.tagline}
          </p>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: 15,
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {card.description}
          </p>
        </div>

        {/* Traits — WCAG AA: text-muted is 5.74:1 on dark, 5.04:1 on light */}
        <div
          style={{
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--color-accent)',
              marginBottom: 14,
            }}
          >
            Defining Traits
          </h2>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {card.traits.map((trait, i) => (
              <li
                key={i}
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
              >
                <span
                  style={{
                    color: 'var(--color-accent)',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  ✓
                </span>
                <span
                  style={{
                    color: 'var(--color-text-muted)',
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  {trait}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA — warm tint, matches archetype detail page CTA style */}
        <div
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: 32,
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          <h3
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              marginBottom: 10,
            }}
          >
            Discover Your Archetype
          </h3>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 15,
              marginBottom: 20,
            }}
          >
            90 seconds. No birth time required. Free.
          </p>
          <Link
            href="/onboarding"
            style={{
              display: 'inline-block',
              background: 'var(--color-accent)',
              color: 'var(--color-on-accent)',
              padding: '12px 28px',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Get My Archetype →
          </Link>
        </div>

        {/* Example mapping — anchors the archetype to a real sign/element combo */}
        <p
          style={{
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: 13,
            marginBottom: 24,
          }}
        >
          Example: {card.exampleSign} × {card.exampleElement} → {card.archetype}
        </p>

        {/* Footer links */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
            justifyContent: 'center',
            fontSize: 14,
          }}
        >
          <Link
            href="/archetypes"
            style={{
              color: 'var(--color-text-primary)',
              textDecoration: 'none',
            }}
          >
            All Archetypes →
          </Link>
          <Link
            href="/quiz"
            style={{
              color: 'var(--color-text-primary)',
              textDecoration: 'none',
            }}
          >
            Take the Quiz →
          </Link>
          <Link
            href="/"
            style={{
              color: 'var(--color-text-primary)',
              textDecoration: 'none',
            }}
          >
            About 8os →
          </Link>
        </div>
      </div>
    </main>
  );
}
