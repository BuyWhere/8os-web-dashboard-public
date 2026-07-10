import Link from 'next/link'
import Testimonials from '@/components/landing/Testimonials'
import WaitlistForm from '@/components/landing/WaitlistForm'
import UpcomingBookings from '@/components/landing/UpcomingBookings'

// Landing page — server component. Interactive islands (testimonial rotation,
// waitlist form, cal.diy bookings) live in their own client components so the
// static content (hero, features, how-it-works, journal, footer) is fully
// server-rendered for SEO and SSR snippet quality. See OS-1056.
export default function Home() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        minHeight: '100vh',
        padding: '4rem 2rem 2rem',
        textAlign: 'center',
        background: 'var(--color-bg-primary)',
      }}
    >
      <div style={{ maxWidth: '720px', width: '100%' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '1rem',
          }}
        >
          Personalized Operating System
        </div>

        <h1
          style={{
            fontSize: '3.5rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #fff 0%, #999 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.1,
          }}
        >
          Generate Your Life OS in 90 Seconds
        </h1>

        <p
          style={{
            fontSize: '1.25rem',
            color: '#aaa',
            marginBottom: '1.5rem',
            lineHeight: 1.6,
          }}
        >
          Free. No credit card. Works in Telegram.
        </p>

        <nav
          aria-label="Page navigation"
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '2rem',
          }}
        >
          <Link
            href="#waitlist"
            style={{
              padding: '1rem 2rem',
              fontSize: '1.125rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              cursor: 'pointer',
              transition: 'transform 0.2s, opacity 0.2s',
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
              textDecoration: 'none',
            }}
          >
            Get Started
          </Link>
          {/* OS-1173: cross-link to the prelaunch /coming-soon landing page so
              visitors who want a focused reserve flow (with the affiliate
              opt-in) have a clear next step beyond the in-page waitlist. */}
          <Link
            href="/coming-soon"
            aria-label="Reserve your spot for the July 7 launch"
            style={{
              fontSize: '0.9375rem',
              fontWeight: 500,
              color: '#888',
              textDecoration: 'none',
              padding: '1rem 0.5rem',
              transition: 'color 0.2s',
            }}
          >
            or{' '}
            <span style={{ color: '#c4b5fd', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              reserve your spot
            </span>
          </Link>
        </nav>

        <div
          style={{
            display: 'flex',
            gap: '2rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '3rem',
          }}
        >
          {[
            { label: '38M+', sublabel: 'Configurations' },
            { label: 'Based on', sublabel: 'BaZi' },
            { label: 'AI', sublabel: 'Powered' },
          ].map((badge) => (
            <div
              key={badge.sublabel}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#667eea',
                }}
              >
                {badge.label}
              </span>
              <span
                style={{
                  fontSize: '0.875rem',
                  color: '#888',
                }}
              >
                {badge.sublabel}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '2rem',
            backdropFilter: 'blur(10px)',
            marginBottom: '3rem',
          }}
        >
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#667eea',
              marginBottom: '0.5rem',
            }}
          >
            247 OS generated today
          </div>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#888',
            }}
          >
            Join thousands who&apos;ve already built their personal operating system
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '2rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '3rem',
          }}
        >
          {[
            { title: 'Adaptive AI', desc: 'Learns your patterns' },
            { title: 'Unified Workspace', desc: 'All your tools in one' },
            { title: 'Privacy First', desc: 'Your data stays yours' },
            { title: 'Scheduling', desc: 'Built-in Cal.diy integration' },
          ].map((feature) => (
            <div key={feature.title} style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#667eea',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.25rem',
                }}
              >
                {feature.title}
              </div>
              <div
                style={{
                  fontSize: '0.875rem',
                  color: '#888',
                }}
              >
                {feature.desc}
              </div>
            </div>
          ))}
        </div>

        <div
          id="how-it-works"
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
              marginBottom: '2rem',
              color: '#fff',
            }}
          >
            How It Works
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '2rem',
            }}
          >
            {[
              {
                step: '1',
                title: 'Enter Your Birth Date',
                desc: 'BaZi analysis based on your exact birth details',
              },
              {
                step: '2',
                title: 'Answer 10 Questions',
                desc: 'Quick personality quiz to understand your work style',
              },
              {
                step: '3',
                title: 'Get Your Archetype',
                desc: 'AI-powered OS tailored to how you operate',
              },
              {
                step: '4',
                title: 'Set Your Goals',
                desc: 'Define what matters and let the system adapt to you',
              },
            ].map((item) => (
              <div
                key={item.step}
                style={{
                  padding: '1.5rem',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                  }}
                >
                  {item.step}
                </div>
                <h3
                  style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                    color: '#fff',
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: '#888',
                    lineHeight: 1.5,
                  }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            marginBottom: '3rem',
          }}
        >
          <p
            style={{
              textAlign: 'center',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '1.5rem',
            }}
          >
            As Seen On
          </p>
          <div
            style={{
              display: 'flex',
              gap: '3rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '3rem',
            }}
          >
            {[
              { name: 'TechCrunch', initials: 'TC' },
              { name: 'Product Hunt', initials: 'PH' },
              { name: 'Indie Hackers', initials: 'IH' },
              { name: 'Hacker News', initials: 'HN' },
            ].map((logo) => (
              <div
                key={logo.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: 0.5,
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#888',
                  }}
                >
                  {logo.initials}
                </div>
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#888',
                  }}
                >
                  {logo.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          id="articles"
          style={{ width: '100%', marginBottom: '3rem', textAlign: 'left' }}
        >
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '0.375rem',
              color: '#fff',
            }}
          >
            From the 8os Journal
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
              marginBottom: '1.5rem',
            }}
          >
            Insights on productivity, BaZi, and building your Life OS.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {[
              {
                tag: 'BaZi',
                title: 'Why Your Birth Chart Predicts Your Productivity Style',
                excerpt:
                  'Ancient Chinese metaphysics encoded in 38 million+ configurations — and what that means for how you work best.',
                readTime: '5 min read',
                accent: '#667eea',
              },
              {
                tag: 'AI & Systems',
                title: 'Building a Life Operating System with AI',
                excerpt:
                  'The principles behind a personalized OS that adapts to your energy, goals, and daily rhythm instead of fighting them.',
                readTime: '7 min read',
                accent: '#764ba2',
              },
              {
                tag: 'Productivity',
                title: 'The Myth of the Universal Morning Routine',
                excerpt:
                  "Why the 5 AM club works for some people and destroys others — and how to find your real peak hours.",
                readTime: '4 min read',
                accent: '#22c55e',
              },
            ].map((article) => (
              <div
                key={article.title}
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  transition: 'border-color 0.2s',
                }}
              >
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: article.accent,
                  }}
                >
                  {article.tag}
                </span>
                <h3
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    color: '#fff',
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {article.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.6,
                    margin: 0,
                    flexGrow: 1,
                  }}
                >
                  {article.excerpt}
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 'auto',
                  }}
                >
                  <span
                    style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
                  >
                    {article.readTime}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: article.accent,
                      fontWeight: 500,
                    }}
                  >
                    Coming soon →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Testimonials />

        <WaitlistForm />

        <UpcomingBookings />
      </div>

      <footer
        style={{
          width: '100%',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          marginTop: '4rem',
          padding: '3rem 2rem',
          color: '#999',
          fontSize: '0.875rem',
        }}
      >
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '2rem',
              marginBottom: '2.5rem',
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 700,
                  color: '#ededed',
                  marginBottom: '0.75rem',
                  fontSize: '1rem',
                }}
              >
                8os
              </div>
              <p style={{ lineHeight: 1.6, color: '#999' }}>
                A personalized operating system unique to every person on Earth.
              </p>
            </div>
            <div>
              <div
                style={{
                  fontWeight: 600,
                  color: '#999',
                  marginBottom: '0.75rem',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Product
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <li>
                  <Link
                    href="/features"
                    style={{ color: '#888', textDecoration: 'none' }}
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="/onboarding"
                    style={{ color: '#888', textDecoration: 'none' }}
                  >
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div
                style={{
                  fontWeight: 600,
                  color: '#999',
                  marginBottom: '0.75rem',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Learn
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <li>
                  <Link
                    href="/blog"
                    style={{ color: '#888', textDecoration: 'none' }}
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="/archetypes/explorer"
                    style={{ color: '#888', textDecoration: 'none' }}
                  >
                    Archetype Explorer
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div
                style={{
                  fontWeight: 600,
                  color: '#999',
                  marginBottom: '0.75rem',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Company
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <li>
                  <Link
                    href="/contact"
                    style={{ color: '#888', textDecoration: 'none' }}
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    style={{ color: '#888', textDecoration: 'none' }}
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    style={{ color: '#888', textDecoration: 'none' }}
                  >
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.05)',
              paddingTop: '1.5rem',
              color: '#888',
              fontSize: '0.8rem',
            }}
          >
            © 2026 8os. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  )
}
