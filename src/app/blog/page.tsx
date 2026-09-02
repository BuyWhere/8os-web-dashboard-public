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
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Link href="/" style={{ color: 'var(--color-text-primary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
          ← Back to 8os
        </Link>
        <section id="blog-header" style={{ marginTop: '2rem', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Blog
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 0 }}>
            Insights on productivity, BaZi, AI, and building your personalized Life OS.
          </p>
        </section>
        <BlogListClient posts={posts} />
      </div>
    </div>
  );
}
