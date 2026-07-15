import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getBlogPost, getAllBlogPosts } from '@/lib/content/blog'

interface Props {
  params: { slug: string }
}

export async function generateStaticParams() {
  const posts = getAllBlogPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getBlogPost(params.slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.isoDate,
    },
  }
}

export default function BlogPostPage({ params }: Props) {
  const post = getBlogPost(params.slug)
  if (!post) notFound()

  return (
    <div style={{ background: '#080808', minHeight: '100vh', color: 'var(--color-border)' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Breadcrumb */}
        <nav style={{ marginBottom: '32px' }}>
          <Link
            href="/blog"
            style={{ color: '#7c3aed', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
          >
            ← Back to Blog
          </Link>
        </nav>

        {/* Meta */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          <time dateTime={post.isoDate}>{post.date}</time>
          <span>{post.readTime}</span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: '40px',
            fontWeight: 700,
            color: 'var(--color-bg-secondary)',
            lineHeight: 1.2,
            marginBottom: '20px',
          }}
        >
          {post.title}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: '18px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.7,
            marginBottom: '12px',
          }}
        >
          {post.description}
        </p>

        {/* Excerpt */}
        <p
          style={{
            fontSize: '16px',
            color: 'var(--color-text-secondary)',
            fontStyle: 'italic',
            lineHeight: 1.6,
            marginBottom: '48px',
            borderLeft: '3px solid #7c3aed',
            paddingLeft: '16px',
          }}
        >
          {post.excerpt}
        </p>

        {/* Keywords */}
        {post.keywords.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '48px' }}>
            {post.keywords.map((kw) => (
              <span
                key={kw}
                style={{
                  background: '#1e1b4b',
                  color: '#a5b4fc',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* Sections */}
        {post.sections.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {post.sections.map((section, i) => (
              <section key={i}>
                <h2
                  style={{
                    fontSize: '24px',
                    fontWeight: 600,
                    color: 'var(--color-bg-secondary)',
                    marginBottom: '16px',
                  }}
                >
                  {section.heading}
                </h2>
                {section.paragraphs.map((p, j) => (
                  <p key={j} style={{ color: 'var(--color-text-muted)', lineHeight: 1.8, marginBottom: '12px' }}>
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>
        ) : (
          <div
            style={{
              background: '#0f0f1a',
              border: '1px solid #1e1b4b',
              borderRadius: '12px',
              padding: '32px',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
            }}
          >
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>Full article coming soon.</p>
            <p style={{ fontSize: '14px' }}>
              In the meantime, discover your archetype below.
            </p>
          </div>
        )}

        {/* CTA */}
        <div
          style={{
            marginTop: '64px',
            background: 'linear-gradient(135deg, #1e1b4b, #0f0f1a)',
            border: '1px solid #3730a3',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
          }}
        >
          <h3 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-bg-secondary)', marginBottom: '12px' }}>
            Discover Your BaZi Archetype
          </h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '15px' }}>
            90 seconds. No birth time required. Get your personal operating system.
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
