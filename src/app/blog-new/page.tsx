import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllBlogPosts } from '@/lib/content/blog'

export const metadata: Metadata = {
  title: '8os.ai Blog — BaZi, Archetypes & Personal Operating Systems',
  description:
    'Explore BaZi, the Five Elements, productivity archetypes, and goal-setting strategies. The 8os.ai knowledge base.',
  keywords: ['BaZi blog', 'productivity archetypes', 'five elements', 'personal OS', 'goal setting'],
}

export default function BlogPage() {
  const posts = getAllBlogPosts()

  return (
    <div style={{ background: '#080808', minHeight: '100vh', color: 'var(--color-border)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 700, color: 'var(--color-bg-secondary)', marginBottom: '12px' }}>
            8os.ai Blog
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)', maxWidth: '560px' }}>
            BaZi, the Five Elements, productivity archetypes, and how to build a personal operating
            system that actually works.
          </p>
        </div>

        {/* Post Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '24px',
          }}
        >
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{ textDecoration: 'none' }}
            >
              <article
                style={{
                  background: '#0f0f0f',
                  border: '1px solid #1e1e2e',
                  borderRadius: '12px',
                  padding: '28px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                }}
              >
                {/* Meta */}
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '14px',
                    color: 'var(--color-text-secondary)',
                    fontSize: '13px',
                  }}
                >
                  <time dateTime={post.isoDate}>{post.date}</time>
                  <span>·</span>
                  <span>{post.readTime}</span>
                </div>

                {/* Title */}
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: 'var(--color-bg-secondary)',
                    lineHeight: 1.35,
                    marginBottom: '12px',
                    flexGrow: 1,
                  }}
                >
                  {post.title}
                </h2>

                {/* Excerpt */}
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.65,
                    marginBottom: '20px',
                  }}
                >
                  {post.excerpt}
                </p>

                {/* Read more */}
                <span
                  style={{
                    color: '#7c3aed',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  Read article →
                </span>
              </article>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: '64px',
            textAlign: 'center',
            padding: '48px 24px',
            background: '#0f0f1a',
            borderRadius: '16px',
            border: '1px solid #1e1b4b',
          }}
        >
          <h3 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-bg-secondary)', marginBottom: '12px' }}>
            Ready to discover your archetype?
          </h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
            90 seconds. No birth time required. Get your personal operating system free.
          </p>
          <Link
            href="/onboarding"
            style={{
              background: '#7c3aed',
              color: '#fff',
              padding: '14px 32px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '15px',
              display: 'inline-block',
            }}
          >
            Get Your Archetype Free →
          </Link>
        </div>
      </div>
    </div>
  )
}
