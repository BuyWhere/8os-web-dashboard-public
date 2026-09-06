import Link from 'next/link';
import type { Metadata } from 'next';
import { SidebarNav } from '@/components/SidebarNav';

export const metadata: Metadata = {
  title: 'Features, 8os',
  description: 'Discover the features that make 8os the most personalized productivity system on Earth.',
};

const features = [
  {
    icon: '🔮',
    title: 'BaZi Archetype Engine',
    desc: 'Your birth chart generates one of 17,280 possible configurations. No two operating systems are alike.',
  },
  {
    icon: '🤖',
    title: 'A Coach That Acts',
    desc: 'Not a chatbot. Your Coach remembers you across sessions, knows your goals and chart, and actually creates the tasks, events and plans you talk about.',
  },
  {
    icon: '🌅',
    title: 'Proactive Morning Brief',
    desc: 'Your Coach reaches out first: a morning brief with your Big 3, timing for the day, and what you committed to, delivered in the same conversation.',
  },
  {
    icon: '🎯',
    title: 'Goal & Project Management',
    desc: 'Goals across Career, Wealth, Health, Relationships, Learning and Legacy, organised by time horizon from this week to five years out.',
  },
  {
    icon: '📅',
    title: 'Smart Scheduling',
    desc: 'One tap places any task into your best free slot around your meetings and energy windows. Fell behind? Replan every overdue task at once.',
  },
  {
    icon: '🎙️',
    title: 'Voice Journal That Organises You',
    desc: 'Talk freely. 8os remembers what matters and turns what you said into tasks, calendar events and people to reach out to, confirmed by you in one pass.',
  },
  {
    icon: '🔁',
    title: 'A Calendar That Works Both Ways',
    desc: 'Two-way Google Calendar sync, tasks you can check off right on the grid, repeats, and a view trimmed to your waking hours.',
  },
  {
    icon: '🔒',
    title: 'Privacy First',
    desc: 'Your data is encrypted in transit and at rest. We never sell your data to third parties.',
  },
  {
    icon: '⚡',
    title: '90-Second Setup',
    desc: 'From zero to personalised OS in under two minutes. Enter your birth details, answer 10 questions, done.',
  },
  {
    icon: '🌊',
    title: 'Drift Detection',
    desc: 'The system notices when your habits drift from your goals and gently corrects course.',
  },
];

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'all-features', label: 'All Features' },
  { id: 'get-started', label: 'Get Started' },
];

export default function FeaturesPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-primary)',
      color: 'var(--color-text-primary)',
      padding: '4rem 2rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1360px',
        margin: '0 auto',
        display: 'flex',
        gap: '2.5rem',
        alignItems: 'flex-start',
      }}>

        <SidebarNav sections={SECTIONS} />

        <main style={{ flex: '1 1 0%', minWidth: 0, width: '100%', paddingBottom: '6rem' }}>
          <Link href="/" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontSize: '0.875rem' }}>
            ← Back to 8os
          </Link>

          <section id="overview" style={{ textAlign: 'center', marginTop: '2rem', marginBottom: '4rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>
              Everything you need to run your life like a system
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.125rem', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto' }}>
              8os combines ancient wisdom with modern AI to build an operating system unique to you.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.875rem', flexWrap: 'wrap', marginTop: '1.75rem' }}>
              <a href="/onboarding" style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.875rem 1.5rem',
                background: 'var(--color-accent)',
                border: '1px solid var(--color-accent)',
                borderRadius: '12px',
                color: 'var(--color-on-accent)',
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: 700,
                boxShadow: '0 10px 24px rgba(110, 83, 31, 0.22)',
              }}>
                Get started free
              </a>
              <Link href="/pricing" style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.875rem 1.5rem',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                color: 'var(--color-text-primary)',
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: 700,
              }}>
                See pricing
              </Link>
            </div>
          </section>

          <section id="all-features" style={{ marginBottom: '4rem', width: '100%' }}>
            {/* OS-5939: 280px minmax so 1440x900 with sidebar is 3 cols, not cramped 4. */}
            {/* OS-6415: align-items: stretch + height: 100% for equal card heights */}
            <div className="features-card-grid" style={{
              display: 'grid',
              alignItems: 'stretch',
              width: '100%',
              gap: '1.5rem',
            }}>
              {features.map((f) => (
                <div key={f.title} style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '1.75rem',
                  height: '100%',
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
                    {f.title}
                  </h3>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="get-started" style={{ textAlign: 'center' }}>
            {/* Native <a> so click is a full navigation (QA test_flow checks window.location; Next <Link> SPA routing can leave the URL "unchanged" from the probe). */}
            <a href="/onboarding" data-qa="features-cta-quiz" style={{
              display: 'inline-block',
              padding: '1rem 2rem',
              background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent) 100%)',
              borderRadius: '12px',
              color: 'var(--color-on-accent)',
              textDecoration: 'none',
              fontSize: '1rem',
              fontWeight: 700,
            }}>
              Generate My Life OS, Free
            </a>
          </section>
        </main>
      </div>
      <style>{`
        .features-card-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        @media (max-width: 1100px) {
          .features-card-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 700px) {
          .features-card-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
