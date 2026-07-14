import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Community | 8os.ai',
  description:
    'The 8os.ai community, archetype groups, active discussions, and the coming forum. Find your element tribe.',
  keywords: ['8os community', 'BaZi community', 'archetype community', 'five elements community'],
}

const groups = [
  {
    archetype: 'Strategic Commander',
    element: 'Metal',
    color: 'var(--color-text-muted)',
    bg: '#1a1f2e',
    border: 'var(--color-text-muted)40',
    members: '1,240+',
    description:
      'A group for Metal types who want to build better systems, make sharper decisions, and find others who value precision over noise.',
    activeTopics: ['Weekly system reviews', 'Decision frameworks', 'Tool setups for Metal types'],
  },
  {
    archetype: 'Nurturing Creative',
    element: 'Water',
    color: '#38bdf8',
    bg: '#0c1929',
    border: '#38bdf840',
    members: '980+',
    description:
      'A space for Water types to share cross-domain insights, discuss synthesis projects, and find accountability for shipping.',
    activeTopics: ['Cross-domain projects', 'Deep work strategies', 'Overcoming analysis paralysis'],
  },
  {
    archetype: 'Steady Achiever',
    element: 'Wood',
    color: '#22c55e',
    bg: '#0a1f0e',
    border: '#22c55e40',
    members: '1,580+',
    description:
      'The largest group, Wood types share habit stacks, long-game strategies, and compounding frameworks.',
    activeTopics: ['Habit tracking', '1-year goal threads', 'Compounding strategies'],
  },
  {
    archetype: 'Visionary Builder',
    element: 'Fire',
    color: '#f97316',
    bg: '#1f100a',
    border: '#f9731640',
    members: '870+',
    description:
      'Fire types who are launching things, inspiring others, and figuring out how to sustain the intensity without burning out.',
    activeTopics: ['Launch debriefs', 'Burnout prevention', 'Finding your next vision'],
  },
  {
    archetype: 'Harmonizer Guardian',
    element: 'Earth',
    color: '#d97706',
    bg: '#1f1700',
    border: '#d9770640',
    members: '720+',
    description:
      'Earth types navigating the tension between supporting others and protecting their own wellbeing and goals.',
    activeTopics: ['Boundary-setting', 'Community building', 'Self-care as strategy'],
  },
]

const activeDiscussions = [
  {
    title: 'How do you handle Metal vs Fire conflict in a team?',
    archetype: 'All elements',
    replies: 34,
    lastActive: '2 hours ago',
  },
  {
    title: 'Water types: what finally made you ship?',
    archetype: 'Nurturing Creative',
    replies: 28,
    lastActive: '5 hours ago',
  },
  {
    title: 'Wood achievers: what\'s your 5-year compounding goal?',
    archetype: 'Steady Achiever',
    replies: 41,
    lastActive: '1 day ago',
  },
  {
    title: 'Fire burnout recovery, what actually worked',
    archetype: 'Visionary Builder',
    replies: 52,
    lastActive: '6 hours ago',
  },
  {
    title: 'Earth types: how did you learn to say no?',
    archetype: 'Harmonizer Guardian',
    replies: 67,
    lastActive: '3 hours ago',
  },
  {
    title: 'Metal types: what\'s the most useful system you\'ve built?',
    archetype: 'Strategic Commander',
    replies: 29,
    lastActive: '8 hours ago',
  },
]

const archetypeColors: Record<string, string> = {
  'All elements': '#7c3aed',
  'Nurturing Creative': '#38bdf8',
  'Steady Achiever': '#22c55e',
  'Visionary Builder': '#f97316',
  'Harmonizer Guardian': '#d97706',
  'Strategic Commander': 'var(--color-text-muted)',
}

export default function CommunityPage() {
  return (
    <div style={{ background: '#080808', minHeight: '100vh', color: 'var(--color-border)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '56px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 700, color: 'var(--color-bg-secondary)', marginBottom: '12px' }}>
            Community
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)', maxWidth: '560px', lineHeight: 1.65 }}>
            Five archetype groups. Active discussions. A place to find others who operate the way
            you do.
          </p>
        </div>

        {/* Archetype Groups */}
        <section style={{ marginBottom: '56px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-bg-secondary)', marginBottom: '24px' }}>
            Archetype Groups
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {groups.map((g) => (
              <div
                key={g.archetype}
                style={{
                  background: g.bg,
                  border: `1px solid ${g.border}`,
                  borderRadius: '14px',
                  padding: '24px 28px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-bg-secondary)' }}>{g.archetype}</h3>
                    <span
                      style={{
                        background: `${g.color}20`,
                        color: g.color,
                        padding: '2px 10px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {g.element}
                    </span>
                  </div>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{g.members} members</span>
                </div>

                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: 1.65, marginBottom: '14px' }}>
                  {g.description}
                </p>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {g.activeTopics.map((topic) => (
                    <span
                      key={topic}
                      style={{
                        background: '#ffffff08',
                        border: '1px solid #ffffff10',
                        color: 'var(--color-text-muted)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Active Discussions */}
        <section style={{ marginBottom: '56px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-bg-secondary)', marginBottom: '24px' }}>
            Active Discussions
          </h2>
          <div
            style={{
              background: '#0f0f0f',
              border: '1px solid #1e1e2e',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            {activeDiscussions.map((d, i) => (
              <div
                key={d.title}
                style={{
                  padding: '18px 24px',
                  borderBottom: i < activeDiscussions.length - 1 ? '1px solid #1e1e2e' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <p style={{ color: 'var(--color-bg-secondary)', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                    {d.title}
                  </p>
                  <span
                    style={{
                      background: `${archetypeColors[d.archetype]}15`,
                      color: archetypeColors[d.archetype],
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    {d.archetype}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{d.replies} replies</p>
                  <p style={{ color: '#475569', fontSize: '12px' }}>{d.lastActive}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Coming Soon: Forum */}
        <div
          style={{
            background: '#0f0f1a',
            border: '1px dashed #3730a3',
            borderRadius: '16px',
            padding: '36px',
            textAlign: 'center',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              background: '#1e1b4b',
              color: '#a5b4fc',
              padding: '4px 14px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            Coming Soon
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-bg-secondary)', marginBottom: '10px' }}>
            The 8os Forum
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', lineHeight: 1.65, maxWidth: '480px', margin: '0 auto 20px' }}>
            A dedicated forum for each archetype group, with threads, goal accountability,
            weekly check-ins, and cross-element collaboration spaces. Launching with the v1.0 release.
          </p>
          <p style={{ color: '#475569', fontSize: '13px' }}>
            Create your free account now to be notified when it launches.
          </p>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <Link
            href="/onboarding"
            style={{
              background: '#7c3aed',
              color: '#fff',
              padding: '14px 36px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '16px',
              display: 'inline-block',
            }}
          >
            Join the Community Free →
          </Link>
          <p style={{ color: '#475569', fontSize: '13px', marginTop: '10px' }}>
            Discover your archetype to find your group
          </p>
        </div>
      </div>
    </div>
  )
}
