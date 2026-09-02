import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllBlogPosts } from '@/lib/content/blog';
import BlogListClient from '@/components/BlogListClient';

export const metadata: Metadata = {
  title: 'Blog, 8os',
  description: 'Insights on productivity, BaZi, AI, and building your personalized Life OS.',
};

export default function BlogPage() {
  const posts = getAllBlogPosts();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-primary)',
      color: 'var(--color-text-primary)',
      padding: '4rem 2rem',
    }}>
      {/*
        OS-5813: align with Header/Footer (1360px) and pricing (1200px).
        An 800px column looked left-weighted against the full-width chrome
        even with margin: 0 auto — VidMee flagged the listing as off-center.
      */}
      <div className="blog-index-shell" style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <Link href="/" style={{ color: 'var(--color-text-primary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
          ← Back to 8os
        </Link>
        <section id="blog-header" style={{ marginTop: '2rem', marginBottom: '3rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Blog
          </h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 auto', maxWidth: '40rem' }}>
            Insights on productivity, BaZi, AI, and building your personalized Life OS.
          </p>
        </section>
        <BlogListClient posts={posts} />
      </div>
    </div>
  );
}
