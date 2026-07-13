import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFamousProfileBySlug, getFamousProfiles } from '@/lib/content/famous';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const profiles = getFamousProfiles();
  return profiles.map((profile) => ({
    slug: profile.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = getFamousProfileBySlug(slug);
  
  if (!profile) {
    return { title: 'Famous Archetype Not Found' };
  }
  
  return {
    title: `${profile.name} — Famous Archetype | 8os.ai`,
    description: `Discover ${profile.name}'s BaZi archetype: ${profile.archetype.replace('_', ' ')}. ${profile.trait}`,
    alternates: {
      canonical: `/archetypes/famous/${profile.slug}`,
    },
    openGraph: {
      title: `${profile.name} — Famous Archetype | 8os.ai`,
      description: `Discover ${profile.name}'s BaZi archetype: ${profile.archetype.replace('_', ' ')}. ${profile.trait}`,
      url: `https://8os.ai/archetypes/famous/${profile.slug}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${profile.name} — Famous Archetype | 8os.ai`,
      description: `Discover ${profile.name}'s BaZi archetype: ${profile.archetype.replace('_', ' ')}. ${profile.trait}`,
    },
  };
}

const ARCHETYPE_META = {
  strategic_commander: {
    label: 'Strategic Commander',
    element: 'Metal / Wood',
    tagline: 'Decisive. Visionary. Built to lead.',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.08)',
  },
  nurturing_creative: {
    label: 'Nurturing Creative',
    element: 'Fire / Wood',
    tagline: 'Expressive. Empathic. Transformative.',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
  },
  harmonizer_guardian: {
    label: 'Harmonizer Guardian',
    element: 'Water / Earth',
    tagline: 'Relational. Diplomatic. Deeply human.',
    color: '#22d3ee',
    bg: 'rgba(34,211,238,0.08)',
  },
  steady_achiever: {
    label: 'Steady Achiever',
    element: 'Earth / Metal',
    tagline: 'Disciplined. Reliable. Built for the long game.',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
  },
};

const ELEMENT_SYMBOL: Record<string, string> = {
  Metal: '⚙️',
  Wood: '🌿',
  Fire: '🔥',
  Earth: '⛰️',
  Water: '🌊',
};

export default async function FamousProfilePage({ params }: Props) {
  const { slug } = await params;
  const profile = getFamousProfileBySlug(slug);
  
  if (!profile) {
    notFound();
  }
  
  const meta = ARCHETYPE_META[profile.archetype];
  
  return (
    <div style={pageStyle}>
      <div style={innerStyle}>
        <Link href="/archetypes/famous" style={backLinkStyle}>← Back to Famous Archetypes</Link>
        
        <header style={headerStyle}>
          <div style={avatarStyle}>{profile.name.charAt(0)}</div>
          <h1 style={nameStyle}>{profile.name}</h1>
          <p style={bornStyle}>{profile.born.slice(0, 4)} · {profile.knownFor}</p>
          
          <div style={badgesStyle}>
            <span style={{ ...badgeStyle, background: `${meta.color}22`, color: meta.color }}>
              {ELEMENT_SYMBOL[profile.element]} {meta.label}
            </span>
            <span style={elementBadgeStyle}>
              {meta.element} Energy
            </span>
          </div>
        </header>
        
        <div style={contentStyle}>
          <section style={{ ...sectionStyle, background: meta.bg, borderColor: `${meta.color}22` }}>
            <h2 style={{ ...sectionTitleStyle, color: meta.color }}>Core Trait</h2>
            <p style={traitStyle}>&ldquo;{profile.trait}&rdquo;</p>
          </section>
          
          <section style={{ ...sectionStyle, background: 'rgba(0,0,0,0.2)' }}>
            <h2 style={sectionTitleStyle}>Famous Quote</h2>
            <blockquote style={quoteStyle}>&ldquo;{profile.quote}&rdquo;</blockquote>
          </section>
          
          <section style={{ ...sectionStyle, background: 'rgba(0,0,0,0.2)' }}>
            <h2 style={sectionTitleStyle}>Why They Embody the Archetype</h2>
            <p style={descriptionStyle}>{profile.whyTheyEmbody}</p>
          </section>
          
          <section style={{ ...sectionStyle, background: meta.bg, borderColor: `${meta.color}22` }}>
            <h2 style={{ ...sectionTitleStyle, color: meta.color }}>Archetype Profile</h2>
            <p style={descriptionStyle}>{meta.tagline}</p>
            <p style={elementDetailStyle}>Element: {meta.element}</p>
          </section>
        </div>
        
        <div style={ctaStyle}>
          <h2 style={ctaTitleStyle}>Discover Your Archetype</h2>
          <p style={ctaDescStyle}>
            Take 90 seconds and find out which leaders, artists, and innovators share your BaZi blueprint.
          </p>
          <Link href="/onboarding" style={ctaBtnStyle}>Get Your Free Archetype →</Link>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = { background: '#060608', color: '#f8fafc', minHeight: '100vh' };
const innerStyle: React.CSSProperties = { maxWidth: '700px', margin: '0 auto', padding: '3rem 1.5rem' };
const backLinkStyle: React.CSSProperties = { display: 'inline-block', marginBottom: '2rem', color: 'rgba(248,250,252,0.6)', textDecoration: 'none', fontSize: '0.9rem' };
const headerStyle: React.CSSProperties = { textAlign: 'center', marginBottom: '3rem' };
const avatarStyle: React.CSSProperties = { width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 700, margin: '0 auto 1.5rem' };
const nameStyle: React.CSSProperties = { margin: '0 0 0.5rem', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.04em' };
const bornStyle: React.CSSProperties = { margin: 0, fontSize: '1rem', color: 'rgba(248,250,252,0.6)' };
const badgesStyle: React.CSSProperties = { display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' };
const badgeStyle: React.CSSProperties = { padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600 };
const elementBadgeStyle: React.CSSProperties = { padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(255,255,255,0.1)', color: 'rgba(248,250,252,0.8)' };

const contentStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1.5rem' };
const sectionStyle: React.CSSProperties = { padding: '1.5rem', borderRadius: '16px', border: '1px solid' };
const sectionTitleStyle: React.CSSProperties = { margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, color: 'rgba(248,250,252,0.9)' };
const traitStyle: React.CSSProperties = { margin: 0, fontSize: '1.1rem', color: 'rgba(248,250,252,0.8)', fontStyle: 'italic', lineHeight: 1.6 };
const quoteStyle: React.CSSProperties = { margin: 0, fontSize: '1.2rem', color: 'rgba(248,250,252,0.9)', fontStyle: 'italic', lineHeight: 1.6, borderLeft: '3px solid rgba(124,58,237,0.5)', paddingLeft: '1.5rem' };
const descriptionStyle: React.CSSProperties = { margin: 0, fontSize: '1rem', color: 'rgba(248,250,252,0.7)', lineHeight: 1.7 };
const elementDetailStyle: React.CSSProperties = { margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'rgba(248,250,252,0.5)' };

const ctaStyle: React.CSSProperties = { textAlign: 'center', padding: '3rem 2rem', borderRadius: '24px', border: '1px solid rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.06)', marginTop: '2rem' };
const ctaTitleStyle: React.CSSProperties = { margin: '0 0 0.75rem', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, letterSpacing: '-0.03em' };
const ctaDescStyle: React.CSSProperties = { margin: '0 0 1.5rem', fontSize: '1rem', color: 'rgba(248,250,252,0.6)' };
const ctaBtnStyle: React.CSSProperties = { display: 'inline-block', padding: '0.85rem 1.75rem', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', boxShadow: '0 8px 24px rgba(124,58,237,0.4)' };
