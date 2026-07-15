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
    desc: 'Your birth chart generates one of 38 million+ possible configurations. No two operating systems are alike.',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Daily Briefings',
    desc: 'Every morning you receive an intelligence briefing aligned to your energy patterns, goals, and schedule.',
  },
  {
    icon: '🎯',
    title: 'Goal & Project Management',
    desc: 'Set goals across life domains, Career, Wealth, Health, Relationships, Learning, Legacy, and track progress over time.',
  },
  {
    icon: '📅',
    title: 'Smart Scheduling',
    desc: 'Built-in Cal.diy integration automatically schedules work in alignment with your peak energy windows.',
  },
  {
    icon: '💬',
    title: 'Telegram-Native',
    desc: 'Run your entire Life OS from Telegram. No app download required. Works anywhere.',
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
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', gap: '3rem', alignItems: 'flex-start' }}>

        <SidebarNav sections={SECTIONS} />

        <main style={{ flex: 1, minWidth: 0 }}>
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
          </section>

          <section id="all-features" style={{ marginBottom: '4rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.5rem',
            }}>
              {features.map((f) => (
                <div key={f.title} style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '1.75rem',
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
            <Link href="/onboarding" style={{
              display: 'inline-block',
              padding: '1rem 2rem',
              background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent) 100%)',
              borderRadius: '12px',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '1rem',
              fontWeight: 700,
            }}>
              Generate My Life OS, Free
            </Link>
          </section>
        </main>
      </div>
    </div>
  );
}
