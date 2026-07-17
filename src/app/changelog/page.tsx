import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Changelog | 8os.ai',
  description: 'What has changed in 8os.ai, new features, improvements, and fixes across all versions.',
  keywords: ['8os changelog', '8os updates', '8os release notes'],
}

type ChangeType = 'new' | 'improvement' | 'fix'

interface Change {
  type: ChangeType
  text: string
}

interface Version {
  version: string
  date: string
  isoDate: string
  label: string
  changes: Change[]
}

const versions: Version[] = [
  {
    version: 'v1.0.0',
    date: 'July 17, 2026',
    isoDate: '2026-07-17',
    label: 'The Coach, Journal & Calendar release',
    changes: [
      { type: 'new', text: 'Coach with memory: remembers you across sessions, knows your goals, chart and commitments, and actually performs the work with real tools' },
      { type: 'new', text: 'Proactive morning brief arrives in your Coach thread at your local morning, governed by quiet hours and a daily cap' },
      { type: 'new', text: 'Journal: write or just talk (continuous voice input); tasks, events, goals and people-to-contact are extracted for one-tap confirmation, and memories are learned automatically' },
      { type: 'new', text: 'Commitments you mention to the Coach surface as calendar proposals ("You said you would... put it on the calendar?")' },
      { type: 'new', text: 'Recurring tasks that actually repeat: completing one schedules the next occurrence; quick-add understands "every day", "every monday", "monthly"' },
      { type: 'new', text: 'Overdue tasks roll forward instead of disappearing, with one-tap Replan into free slots, Defer menus and bulk move to today or tomorrow' },
      { type: 'new', text: 'Tasks on the calendar look like tasks (dashed edge) and can be checked off right on the grid; meetings stay solid' },
      { type: 'new', text: 'Calendar quality of life: jump to any date from the header, copy an event to tomorrow, choose which hours your calendar shows, custom weekday repeats' },
      { type: 'new', text: 'Pro subscription live: AI journaling, goal engine and priority support at $18/month or $119/year' },
      { type: 'improvement', text: 'Tasks page: search, sort by time/priority/duration, notes on every task, undo after complete or delete, daily plan total with an overload warning' },
      { type: 'improvement', text: 'Google Calendar two-way sync: events created in 8os appear in Google, and Google events are editable inside 8os' },
      { type: 'improvement', text: 'Dark mode is fully legible across calendar, tasks and briefings' },
      { type: 'fix', text: 'Times you give the Coach are interpreted in your timezone, everywhere' },
      { type: 'fix', text: 'Checkout, upgrade and post-payment flows keep you on 8os.ai end to end' },
    ],
  },
  {
    version: 'v0.9.2',
    date: 'May 8, 2026',
    isoDate: '2026-05-08',
    label: 'Daily Briefing & SEO',
    changes: [
      { type: 'new', text: 'Daily briefing page with archetype-specific focus, strength, and nudge' },
      { type: 'new', text: 'Blog dynamic route with 20 articles and SEO metadata' },
      { type: 'improvement', text: 'Share cards redesigned with element gradients and shadow side callout' },
      { type: 'fix', text: 'Orchestrator fallback URL now correctly uses path parameter instead of query string' },
    ],
  },
  {
    version: 'v0.9.0',
    date: 'April 22, 2026',
    isoDate: '2026-04-22',
    label: 'Archetype Profiles & Onboarding',
    changes: [
      { type: 'new', text: 'Full archetype profile pages for all 5 elements with superpower and shadow side' },
      { type: 'new', text: 'Onboarding flow: birth date input + 5 behavioral questions' },
      { type: 'improvement', text: 'FAQ page with FAQPage JSON-LD schema for Google rich results' },
      { type: 'improvement', text: 'Quiz landing page with archetype previews and 3-step explainer' },
    ],
  },
  {
    version: 'v0.8.0',
    date: 'March 30, 2026',
    isoDate: '2026-03-30',
    label: 'Resources Hub',
    changes: [
      { type: 'new', text: 'Resources hub with 6 educational guides (BaZi 101, Five Elements, goal templates, compatibility)' },
      { type: 'new', text: 'Goal timing by element guide with seasonal windows for all 5 archetypes' },
      { type: 'new', text: 'Relationship compatibility matrix with 5×5 pairing dynamics' },
      { type: 'fix', text: 'Mobile layout fixed for resource cards on small screens' },
    ],
  },
  {
    version: 'v0.7.0',
    date: 'February 14, 2026',
    isoDate: '2026-02-14',
    label: 'Core Platform',
    changes: [
      { type: 'new', text: 'Dashboard with archetype overview, goal tracker, and daily briefing widget' },
      { type: 'new', text: 'Team compatibility feature: compare element distributions across a group' },
      { type: 'improvement', text: 'Archetype computation engine improved with 5-question behavioral calibration' },
      { type: 'fix', text: 'Authentication session expiry now correctly triggers re-login flow' },
    ],
  },
  {
    version: 'v0.5.0',
    date: 'January 3, 2026',
    isoDate: '2026-01-03',
    label: 'Foundation Launch',
    changes: [
      { type: 'new', text: 'Initial platform launch with BaZi element calculation from birth date' },
      { type: 'new', text: 'Five archetype profiles: Strategic Commander, Nurturing Creative, Steady Achiever, Visionary Builder, Harmonizer Guardian' },
      { type: 'new', text: 'Share cards at /share/[archetype] for all 5 archetypes' },
      { type: 'improvement', text: 'Dark theme system with purple accent throughout all pages' },
    ],
  },
]

const typeConfig: Record<ChangeType, { label: string; color: string; dot: string }> = {
  new: { label: 'New', color: '#22c55e', dot: '#22c55e' },
  improvement: { label: 'Improvement', color: '#38bdf8', dot: '#38bdf8' },
  fix: { label: 'Fix', color: 'var(--color-accent)', dot: 'var(--color-accent)' },
}

export default function ChangelogPage() {
  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', color: 'var(--color-border)' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '56px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
            Changelog
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)' }}>
            New features, improvements, and fixes, in order of what shipped.
          </p>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
            {Object.entries(typeConfig).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: val.dot }} />
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{val.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div style={{ position: 'relative' }}>
          {/* Vertical line */}
          <div
            style={{
              position: 'absolute',
              left: '20px',
              top: 0,
              bottom: 0,
              width: '1px',
              background: 'linear-gradient(180deg, #3730a3, var(--color-bg-card))',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', paddingLeft: '52px' }}>
            {versions.map((v) => (
              <div key={v.version} style={{ position: 'relative' }}>
                {/* Timeline dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-40px',
                    top: '6px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: 'var(--color-accent)',
                    border: '2px solid var(--color-bg-primary)',
                    boxShadow: '0 0 0 2px var(--color-accent)40',
                  }}
                />

                {/* Version header */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '4px' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{v.version}</h2>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#a5b4fc' }}>{v.label}</span>
                  </div>
                  <time
                    dateTime={v.isoDate}
                    style={{ fontSize: '13px', color: '#475569' }}
                  >
                    {v.date}
                  </time>
                </div>

                {/* Changes */}
                <div
                  style={{
                    background: 'var(--color-bg-primary)',
                    border: '1px solid var(--color-bg-card)',
                    borderRadius: '12px',
                    padding: '20px 24px',
                  }}
                >
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {v.changes.map((change, i) => {
                      const cfg = typeConfig[change.type]
                      return (
                        <li
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            paddingBottom: i < v.changes.length - 1 ? '14px' : 0,
                            marginBottom: i < v.changes.length - 1 ? '14px' : 0,
                            borderBottom: i < v.changes.length - 1 ? '1px solid var(--color-bg-card)' : 'none',
                          }}
                        >
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: cfg.dot,
                              marginTop: '7px',
                              flexShrink: 0,
                            }}
                          />
                          <div>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: cfg.color,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                marginRight: '8px',
                              }}
                            >
                              {cfg.label}
                            </span>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: 1.6 }}>
                              {change.text}
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
