import Link from 'next/link';
import type { Metadata } from 'next';
import { SidebarNav } from '@/components/SidebarNav';
import { getAllBlogPosts, type BlogPost } from '@/lib/content/blog';

export const metadata: Metadata = {
  title: 'Blog — 8os',
  description: 'Insights on productivity, BaZi, AI, and building your personalized Life OS.',
};

const SECTIONS = [
  { id: 'blog-header', label: 'Blog' },
];

const POSTS_PER_PAGE = 9;

type CategoryKey = 'BaZi' | 'Productivity' | 'Archetypes' | 'Elements' | 'Goals' | 'Comparisons';

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'BaZi', label: 'BaZi' },
  { key: 'Productivity', label: 'Productivity' },
  { key: 'Archetypes', label: 'Archetypes' },
  { key: 'Elements', label: 'Elements' },
  { key: 'Goals', label: 'Goals' },
  { key: 'Comparisons', label: 'Comparisons' },
];

const CATEGORY_STYLE: Record<CategoryKey, { gradient: string; glyph: string }> = {
  BaZi: { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', glyph: '卦' },
  Productivity: { gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', glyph: '⚡' },
  Archetypes: { gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', glyph: '⚑' },
  Elements: { gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', glyph: '☯' },
  Goals: { gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', glyph: '◎' },
  Comparisons: { gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', glyph: '⚖' },
};

function deriveCategory(post: BlogPost): CategoryKey {
  const hay = (post.title + ' ' + post.keywords.join(' ')).toLowerCase();
  if (/(vs\b|versus|compared|comparison|myers|enneagram|human design|disc)/.test(hay)) return 'Comparisons';
  if (/(metal element|water element|wood element|fire element|earth element|five elements)/.test(hay)) return 'Elements';
  if (/(archetype|commander|capricorn|famous|leadership)/.test(hay)) return 'Archetypes';
  if (/(productivity|todoist|notion|app|deep work|planning|habit|remote work|morning routine)/.test(hay)) return 'Productivity';
  if (/(goal|timing|annual cycle|decision|career)/.test(hay)) return 'Goals';
  return 'BaZi';
}

function Thumbnail({ category, large }: { category: CategoryKey; large?: boolean }) {
  const style = CATEGORY_STYLE[category];
  return (
    <div
      aria-hidden="true"
      style={{
        background: style.gradient,
        borderRadius: large ? '14px' : '10px',
        height: large ? '220px' : '96px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: large ? '4rem' : '2rem',
        color: 'rgba(255,255,255,0.92)',
        textShadow: '0 2px 12px rgba(0,0,0,0.35)',
        flexShrink: 0,
      }}
    >
      {style.glyph}
    </div>
  );
}

function Card({ post, category }: { post: BlogPost; category: CategoryKey }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '14px',
        overflow: 'hidden',
        textDecoration: 'none',
        transition: 'border-color 0.2s, transform 0.2s',
      }}
    >
      <div style={{ padding: '0.85rem 0.85rem 0' }}>
        <Thumbnail category={category} />
      </div>
      <div style={{ padding: '0.9rem 1rem 1.1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.7rem' }}>
          <span style={{
            color: 'var(--color-accent)',
            border: '1px solid rgba(102,126,234,0.4)',
            borderRadius: '999px',
            padding: '0.1rem 0.55rem',
          }}>{category}</span>
          <span style={{ color: 'var(--color-text-muted)' }}>{post.date} · {post.readTime}</span>
        </div>
        <h2 style={{ fontSize: '1.02rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 0.4rem 0', lineHeight: 1.35 }}>
          {post.title}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', lineHeight: 1.55, margin: 0 }}>
          {post.excerpt}
        </p>
      </div>
    </Link>
  );
}

interface PageProps {
  searchParams?: { page?: string; category?: string };
}

export default function BlogPage({ searchParams }: PageProps) {
  const all = getAllBlogPosts();
  const postsWithCategory = all.map((post) => ({ post, category: deriveCategory(post) }));

  const selectedCategory = (searchParams?.category as CategoryKey | undefined) ?? undefined;
  const filtered = selectedCategory
    ? postsWithCategory.filter((p) => p.category === selectedCategory)
    : postsWithCategory;

  const featured = filtered[0];
  const rest = filtered.slice(1);

  const page = Math.max(1, parseInt(searchParams?.page ?? '1', 10) || 1);
  const totalPages = Math.max(1, Math.ceil(rest.length / POSTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * POSTS_PER_PAGE;
  const pageItems = rest.slice(start, start + POSTS_PER_PAGE);

  const chipHref = (cat: CategoryKey | undefined) => {
    const params = new URLSearchParams();
    if (cat) params.set('category', cat);
    return params.toString() ? `/blog?${params.toString()}` : '/blog';
  };
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    params.set('page', String(p));
    return `/blog?${params.toString()}`;
  };

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
          <section id="blog-header" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Blog
            </h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 0 }}>
              Insights on productivity, BaZi, AI, and building your personalized Life OS.
            </p>
          </section>

          {filtered.length === 0 ? (
            <section>
              <div style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '3rem 2rem',
                textAlign: 'center',
              }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
                  No posts in this category yet
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  Try a different category or browse all articles.
                </p>
              </div>
            </section>
          ) : (
            <>
              <CategoryChips selected={selectedCategory} chipHref={chipHref} />

              {featured && currentPage === 1 && (
                <section style={{ marginBottom: '2rem' }}>
                  <Link
                    href={`/blog/${featured.post.slug}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr)',
                      gap: '0',
                      background: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      textDecoration: 'none',
                    }}
                  >
                    <div style={{ padding: '1.25rem 1.25rem 0' }}>
                      <Thumbnail category={featured.category} large />
                    </div>
                    <div style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.6rem', fontSize: '0.75rem' }}>
                        <span style={{
                          color: '#fff',
                          background: 'var(--color-accent)',
                          borderRadius: '999px',
                          padding: '0.15rem 0.7rem',
                          fontWeight: 600,
                        }}>Featured</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{featured.post.date} · {featured.post.readTime}</span>
                      </div>
                      <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 0.6rem 0', lineHeight: 1.25 }}>
                        {featured.post.title}
                      </h2>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
                        {featured.post.excerpt}
                      </p>
                    </div>
                  </Link>
                </section>
              )}

              <section>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '1.25rem',
                }}>
                  {pageItems.map(({ post, category }) => (
                    <Card key={post.slug} post={post} category={category} />
                  ))}
                </div>
              </section>

              {totalPages > 1 && (
                <nav aria-label="Pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '2.5rem' }}>
                  {currentPage > 1 && (
                    <Link href={pageHref(currentPage - 1)} style={pageLinkStyle(false)}>← Prev</Link>
                  )}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={pageHref(p)}
                      aria-current={p === currentPage ? 'page' : undefined}
                      style={pageLinkStyle(p === currentPage)}
                    >
                      {p}
                    </Link>
                  ))}
                  {currentPage < totalPages && (
                    <Link href={pageHref(currentPage + 1)} style={pageLinkStyle(false)}>Next →</Link>
                  )}
                </nav>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function pageLinkStyle(active: boolean): React.CSSProperties {
  return {
    minWidth: '2.25rem',
    height: '2.25rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 0.6rem',
    borderRadius: '8px',
    border: active ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
    background: active ? 'rgba(102,126,234,0.15)' : 'transparent',
    color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    fontSize: '0.85rem',
    textDecoration: 'none',
    fontWeight: active ? 600 : 400,
  };
}

function CategoryChips({
  selected,
  chipHref,
}: {
  selected: CategoryKey | undefined;
  chipHref: (cat: CategoryKey | undefined) => string;
}) {
  return (
    <div aria-label="Category filter" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.75rem' }}>
      <Link
        href={chipHref(undefined)}
        style={chipStyle(selected === undefined)}
      >
        All
      </Link>
      {CATEGORIES.map((c) => (
        <Link key={c.key} href={chipHref(c.key)} style={chipStyle(selected === c.key)}>
          {c.label}
        </Link>
      ))}
    </div>
  );
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: '0.8rem',
    padding: '0.35rem 0.85rem',
    borderRadius: '999px',
    border: active
      ? '1px solid var(--color-accent)'
      : '1px solid var(--color-border)',
    background: active ? 'rgba(102,126,234,0.15)' : 'transparent',
    color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    textDecoration: 'none',
    fontWeight: active ? 600 : 400,
  };
}
