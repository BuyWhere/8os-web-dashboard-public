'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { BlogPost, BlogCategory } from '@/lib/content/blog'

const POSTS_PER_PAGE = 10

const CATEGORY_CONFIG: Record<BlogCategory, { icon: string; color: string; bg: string }> = {
  BaZi: { icon: '☯', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  Productivity: { icon: '⚡', color: '#facc15', bg: 'rgba(250,204,21,0.12)' },
  Archetypes: { icon: '🎭', color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  'Mental Health': { icon: '🧠', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  Comparisons: { icon: '⚖️', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
}

const ALL_CATEGORIES: BlogCategory[] = ['BaZi', 'Productivity', 'Archetypes', 'Mental Health', 'Comparisons']

interface BlogListClientProps {
  posts: BlogPost[]
}

export default function BlogListClient({ posts }: BlogListClientProps) {
  const [activeCategory, setActiveCategory] = useState<BlogCategory | null>(null)
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE)

  const filtered = activeCategory
    ? posts.filter((p) => p.category === activeCategory)
    : posts

  const visible = filtered.slice(0, visibleCount)
  const remaining = filtered.length - visibleCount

  const featured = posts.find((p) => p.featured) ?? posts[0]

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
      {/* Featured Article */}
      {featured && !activeCategory && (
        <Link
          href={`/blog/${featured.slug}`}
          style={{ textDecoration: 'none', display: 'block', marginBottom: '32px' }}
        >
          <article
            style={{
              background: 'linear-gradient(135deg, #1a1033 0%, #0f0f1a 50%, #0a1628 100%)',
              border: '1px solid #2d1b69',
              borderRadius: '16px',
              padding: '32px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'border-color 0.2s, transform 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#7c3aed'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2d1b69'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#7c3aed',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Featured
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '24px' }}>
                {CATEGORY_CONFIG[featured.category].icon}
              </span>
              <span
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
                fontSize: '24px',
                fontWeight: 700,
                color: '#f1f5f9',
                lineHeight: 1.3,
                marginBottom: '12px',
              }}
            >
              {featured.title}
            </h2>
            <p
              style={{
                fontSize: '15px',
                color: '#94a3b8',
                lineHeight: 1.6,
                marginBottom: '16px',
              }}
            >
              {featured.excerpt}
            </p>
            <div style={{ display: 'flex', gap: '12px', color: '#64748b', fontSize: '13px' }}>
              <time dateTime={featured.isoDate}>{featured.date}</time>
              <span>·</span>
              <span>{featured.readTime}</span>
            </div>
          </article>
        </Link>
      )}

      {/* Category Filter Chips */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '28px',
        }}
      >
        <button
          onClick={() => {
            setActiveCategory(null)
            setVisibleCount(POSTS_PER_PAGE)
          }}
          style={{
            background: !activeCategory ? '#7c3aed' : '#1a1a2e',
            color: !activeCategory ? '#fff' : '#94a3b8',
            border: `1px solid ${!activeCategory ? '#7c3aed' : '#2a2a3e'}`,
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
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
              onClick={() => {
                setActiveCategory(isActive ? null : cat)
                setVisibleCount(POSTS_PER_PAGE)
              }}
              style={{
                background: isActive ? config.bg : '#1a1a2e',
                color: isActive ? config.color : '#94a3b8',
                border: `1px solid ${isActive ? config.color + '40' : '#2a2a3e'}`,
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
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

      {/* Post Grid */}
      <div style={{ display: 'grid', gap: '16px' }}>
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
                  background: '#0f0f0f',
                  border: '1px solid #1e1e2e',
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
                  e.currentTarget.style.borderColor = '#1e1e2e'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span
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
                  <span style={{ color: '#4a4a5a', fontSize: '12px' }}>·</span>
                  <time
                    dateTime={post.isoDate}
                    style={{ color: '#64748b', fontSize: '12px' }}
                  >
                    {post.date}
                  </time>
                  <span style={{ color: '#4a4a5a', fontSize: '12px' }}>·</span>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>{post.readTime}</span>
                </div>
                <h2
                  style={{
                    fontSize: '17px',
                    fontWeight: 600,
                    color: '#f1f5f9',
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
                    color: '#94a3b8',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {post.excerpt}
                </p>
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
              background: '#1a1a2e',
              color: '#a78bfa',
              border: '1px solid #2d1b69',
              borderRadius: '8px',
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#2d1b69'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1a1a2e'
              e.currentTarget.style.color = '#a78bfa'
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
            color: '#64748b',
          }}
        >
          <p style={{ fontSize: '16px' }}>No articles in this category yet.</p>
        </div>
      )}
    </div>
  )
}
