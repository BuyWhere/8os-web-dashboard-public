'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { BlogPost, BlogCategory } from '@/lib/content/blog'

const POSTS_PER_PAGE = 10

const CATEGORY_CONFIG: Record<BlogCategory, { icon: string; color: string; bg: string }> = {
  // Light: darken pastels so they clear 4.5:1 on cream/white. Dark: CSS
  // [data-theme=dark] .blog-tag-pill brightens (OS-5654).
  BaZi: { icon: '☯', color: 'var(--color-accent-border)', bg: 'var(--color-accent-soft)' },
  Productivity: { icon: '⚡', color: '#7A5A1E', bg: 'var(--color-accent-soft)' },
  Archetypes: { icon: '🎭', color: '#7A3B2E', bg: 'var(--color-accent-soft)' },
  'Mental Health': { icon: '🧠', color: '#146C34', bg: 'var(--color-accent-soft)' },
  Comparisons: { icon: '⚖️', color: '#0369a1', bg: 'var(--color-accent-soft)' },
}

const ALL_CATEGORIES: BlogCategory[] = ['BaZi', 'Productivity', 'Archetypes', 'Mental Health', 'Comparisons']

interface BlogListClientProps {
  posts: BlogPost[]
}

export default function BlogListClient({ posts }: BlogListClientProps) {
  const [activeCategory, setActiveCategory] = useState<BlogCategory | null>(null)
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE)
  const [searchQuery, setSearchQuery] = useState('')

  const featured = posts.find((p) => p.featured) ?? posts[0]

  // Filter by search query (title, excerpt, slug)
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return posts
    const q = searchQuery.toLowerCase()
    return posts.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q)
    )
  }, [posts, searchQuery])

  const filtered = activeCategory
    ? searchFiltered.filter((p) => p.category === activeCategory)
    : searchFiltered

  const hasSearchQuery = searchQuery.trim().length > 0
  const showFeatured = featured && !activeCategory && !hasSearchQuery

  // When the featured hero is shown (no category or search filter), drop it
  // from the list below so it isn't duplicated as the first card.
  const listSource = showFeatured
    ? filtered.filter((p) => p.slug !== featured.slug)
    : filtered

  const visible = listSource.slice(0, visibleCount)
  const remaining = listSource.length - visibleCount

  const categoryCounts: Record<BlogCategory, number> = {
    BaZi: 0,
    Productivity: 0,
    Archetypes: 0,
    'Mental Health': 0,
    Comparisons: 0,
  }
  posts.forEach((p) => {
    categoryCounts[p.category]++
  })

  return (
    <div>
      <style>{`
        @media (max-width: 640px) {
          .featured-article-grid {
            grid-template-columns: 1fr !important;
          }
          .featured-visual {
            height: 120px !important;
          }
        }
      `}</style>
      {/* Featured Article */}
      {showFeatured && (
        <Link
          href={`/blog/${featured.slug}`}
          style={{ textDecoration: 'none', display: 'block', marginBottom: '32px' }}
        >
          <article
            className="featured-article-grid"
            style={{
              background: 'linear-gradient(135deg, var(--color-bg-card) 0%, var(--color-bg-card) 50%, var(--color-bg-card) 100%)',
              border: '1px solid var(--color-bg-card)',
              borderRadius: '16px',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'border-color 0.2s, transform 0.2s',
              display: 'grid',
              gridTemplateColumns: '180px 1fr',
              gap: '24px',
              alignItems: 'center',
              minHeight: '200px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-bg-card)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {/* Visual element - abstract decorative panel */}
            <div
              className="featured-visual"
              style={{
                background: 'linear-gradient(135deg, var(--color-accent-soft) 0%, var(--color-bg-primary) 100%)',
                borderRadius: '12px',
                height: '160px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
              aria-hidden="true"
            >
              <span style={{ fontSize: '48px', opacity: 0.7 }}>
                {CATEGORY_CONFIG[featured.category].icon}
              </span>
              {/* Subtle decorative pattern */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(circle at 30% 30%, var(--color-accent) 0%, transparent 50%), radial-gradient(circle at 70% 70%, var(--color-accent-border) 0%, transparent 40%)',
                  opacity: 0.15,
                }}
              />
            </div>
            <div>
              <span
                className="blog-featured-badge"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'inline-block',
                  marginBottom: '12px',
                }}
              >
                Featured
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span
                  className="blog-tag-pill"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: CATEGORY_CONFIG[featured.category].color,
                    background: CATEGORY_CONFIG[featured.category].bg,
                    padding: '4px 10px',
                    borderRadius: '6px',
                  }}
                >
                  {featured.category}
                </span>
              </div>
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.3,
                  marginBottom: '10px',
                }}
              >
                {featured.title}
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.6,
                  marginBottom: '14px',
                }}
              >
                {featured.excerpt}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                  <time dateTime={featured.isoDate}>{featured.date}</time>
                  <span>·</span>
                  <span className="blog-read-time">{featured.readTime}</span>
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  aria-hidden="true"
                >
                  Read article
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>
            </div>
          </article>
        </Link>
      )}

      {/* Search Input */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ position: 'relative' }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="blog-search-icon"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-secondary)',
              pointerEvents: 'none',
            }}
          >
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            className="blog-search-input"
            placeholder="Search articles by title or keyword…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setVisibleCount(POSTS_PER_PAGE)
            }}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px 10px 38px',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
          />
        </div>
      </div>

      {/* Category Filter Chips — wrap on one row when the 1360px shell
          has room (OS-5941); still wrap cleanly at narrower widths. */}
      <div
        className="blog-category-chips"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginBottom: '28px',
        }}
      >
        <button
          className={`blog-category-chip${!activeCategory ? ' blog-category-chip--all-active' : ''}`}
          onClick={() => {
            setActiveCategory(null)
            setVisibleCount(POSTS_PER_PAGE)
          }}
          style={{
            background: !activeCategory ? 'var(--color-accent)' : 'var(--color-bg-card)',
            color: !activeCategory ? '#fff' : 'var(--color-text-primary)',
            border: `1px solid ${!activeCategory ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          All ({posts.length})
        </button>
        {ALL_CATEGORIES.map((cat) => {
          const config = CATEGORY_CONFIG[cat]
          const isActive = activeCategory === cat
          return (
            <button
              key={cat}
              className={`blog-category-chip${isActive ? ' blog-category-chip--active' : ''}`}
              onClick={() => {
                setActiveCategory(isActive ? null : cat)
                setVisibleCount(POSTS_PER_PAGE)
              }}
              style={{
                background: isActive ? config.bg : 'var(--color-bg-card)',
                color: isActive ? config.color : 'var(--color-text-primary)',
                border: `1px solid ${isActive ? config.color + '40' : 'var(--color-border)'}`,
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{config.icon}</span>
              {cat} ({categoryCounts[cat]})
            </button>
          )
        })}
      </div>

      {/* Post Grid — 2-col on desktop so the 1200px shell is filled evenly (OS-5813) */}
      <div className="blog-post-grid" style={{ display: 'grid', gap: '16px' }}>
        {visible.map((post) => {
          const config = CATEGORY_CONFIG[post.category]
          return (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{ textDecoration: 'none' }}
            >
              <article
                style={{
                  background: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-bg-card)',
                  borderRadius: '12px',
                  padding: '24px',
                  transition: 'border-color 0.2s, transform 0.15s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = config.color + '60'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-bg-card)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span
                    className="blog-tag-pill"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: config.color,
                      background: config.bg,
                      padding: '3px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {config.icon} {post.category}
                  </span>
                  {post.date && <span className="blog-meta-dot" style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>·</span>}
                  {post.date && (
                    <time
                      dateTime={post.isoDate}
                      style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}
                    >
                      {post.date}
                    </time>
                  )}
                  {post.readTime && <span className="blog-meta-dot" style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>·</span>}
                  {post.readTime && <span className="blog-read-time" style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{post.readTime}</span>}
                </div>
                <h2
                  style={{
                    fontSize: '17px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    lineHeight: 1.35,
                    marginBottom: '8px',
                    margin: '0 0 8px 0',
                  }}
                >
                  {post.title}
                </h2>
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.6,
                    margin: '0 0 12px 0',
                  }}
                >
                  {post.excerpt}
                </p>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--color-text-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Read article
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </article>
            </Link>
          )
        })}
      </div>

      {/* Load More */}
      {remaining > 0 && (
        <div style={{ textAlign: 'center', marginTop: '28px' }}>
          <button
            onClick={() => setVisibleCount((c) => c + POSTS_PER_PAGE)}
            style={{
              background: 'var(--color-bg-card)',
              color: 'var(--color-accent)',
              border: '1px solid var(--color-bg-card)',
              borderRadius: '8px',
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-bg-card)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-bg-card)'
              e.currentTarget.style.color = 'var(--color-accent)'
            }}
          >
            Load More ({remaining} remaining)
          </button>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: 'var(--color-text-secondary)',
          }}
        >
          <p style={{ fontSize: '16px' }}>No articles in this category yet.</p>
        </div>
      )}
    </div>
  )
}
