'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export type SearchDoc = {
  href: string
  title: string
  description: string
  kind: 'Page' | 'Blog' | 'FAQ'
}

function score(doc: SearchDoc, q: string): number {
  if (!q) return 1
  const hay = `${doc.title} ${doc.description} ${doc.kind}`.toLowerCase()
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
  let s = 0
  for (const term of terms) {
    if (doc.title.toLowerCase().includes(term)) s += 5
    if (hay.includes(term)) s += 2
  }
  return s
}

export default function SearchPageClient({ docs }: { docs: SearchDoc[] }) {
  const params = useSearchParams()
  const initial = params.get('q') || ''
  const [query, setQuery] = useState(initial)

  const results = useMemo(() => {
    const q = query.trim()
    const ranked = docs
      .map((doc) => ({ doc, s: score(doc, q) }))
      .filter((row) => row.s > 0)
      .sort((a, b) => b.s - a.s)
    return ranked.map((row) => row.doc)
  }, [docs, query])

  return (
    <div
      style={{
        minHeight: 'calc(100vh - var(--header-height, 72px))',
        background: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        padding: '4rem 2rem',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Link href="/" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← Back to 8os
        </Link>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '2rem', marginBottom: '0.5rem' }}>
          Search
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          Find pages, guides, and answers across 8os.
        </p>
        <form
          action="/search"
          method="get"
          onSubmit={(e) => {
            e.preventDefault()
            const next = new URL(window.location.href)
            if (query.trim()) next.searchParams.set('q', query.trim())
            else next.searchParams.delete('q')
            window.history.replaceState({}, '', next.toString())
          }}
          style={{ marginBottom: '2rem' }}
        >
          <label htmlFor="site-search" style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Search 8os
          </label>
          <input
            id="site-search"
            name="q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try BaZi, pricing, archetypes…"
            autoFocus
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              border: '1px solid var(--color-border, #333)',
              background: 'var(--color-bg-card, var(--color-bg-secondary, transparent))',
              color: 'inherit',
              fontSize: '1rem',
            }}
          />
        </form>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          {results.length} result{results.length === 1 ? '' : 's'}
          {query.trim() ? ` for “${query.trim()}”` : ''}
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '1.5rem 0 0' }}>
          {results.map((doc) => (
            <li
              key={`${doc.kind}:${doc.href}:${doc.title}`}
              style={{
                marginBottom: '1rem',
                padding: '1rem 0',
                borderBottom: '1px solid var(--color-border, #222)',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {doc.kind}
              </div>
              <Link href={doc.href} style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '1.125rem' }}>
                {doc.title}
              </Link>
              <p style={{ margin: '0.35rem 0 0', color: 'var(--color-text-secondary)' }}>{doc.description}</p>
            </li>
          ))}
        </ul>
        {results.length === 0 && (
          <p>
            No matches. Try <Link href="/faq">FAQ</Link>, <Link href="/blog">Blog</Link>, or{' '}
            <Link href="/archetypes">Archetypes</Link>.
          </p>
        )}
      </div>
    </div>
  )
}
