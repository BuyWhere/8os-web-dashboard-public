import type { Metadata } from 'next'
import { getAllBlogPosts } from '@/lib/content/blog'
import SearchPageClient, { type SearchDoc } from './SearchPageClient'

// OS-6096 / OS-2671: public /search must return HTTP 200 with a working,
// server-rendered search input and ranked results for logged-out users.
// Keep noindex so this utility page does not compete with canonical content.
export const metadata: Metadata = {
  title: 'Search, 8os',
  description: 'Search 8os pages, guides, FAQ, and archetypes.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: { canonical: '/search' },
}

const PAGES: SearchDoc[] = [
  { href: '/', title: 'Home', description: 'Personalized life operating system built on BaZi.', kind: 'Page' },
  { href: '/features', title: 'Features', description: 'Daily briefing, goals, archetypes, and team tools.', kind: 'Page' },
  { href: '/pricing', title: 'Pricing', description: 'Free archetype discovery and paid plans.', kind: 'Page' },
  { href: '/faq', title: 'FAQ', description: 'Answers about BaZi, privacy, birth time, and 8os.', kind: 'Page' },
  { href: '/blog', title: 'Blog', description: 'Insights on productivity, BaZi, and Life OS.', kind: 'Page' },
  { href: '/archetypes', title: 'Archetypes', description: 'Compare 8os operating styles and elements.', kind: 'Page' },
  { href: '/quiz', title: 'Quiz', description: 'Discover your dominant element and archetype.', kind: 'Page' },
  { href: '/about', title: 'About', description: 'What 8os is and why it exists.', kind: 'Page' },
  { href: '/how-it-works', title: 'How it works', description: 'From quiz to daily operating system.', kind: 'Page' },
  { href: '/methodology', title: 'Methodology', description: 'How 8os uses BaZi without requiring birth time.', kind: 'Page' },
  { href: '/philosophy', title: 'Philosophy', description: 'Agency over fate. Operating conditions, not destiny.', kind: 'Page' },
  { href: '/contact', title: 'Contact', description: 'Talk to the 8os team.', kind: 'Page' },
  { href: '/privacy', title: 'Privacy', description: 'How 8os handles personal data.', kind: 'Page' },
  { href: '/terms', title: 'Terms', description: 'Terms of use for 8os.ai.', kind: 'Page' },
]

function rankDocs(docs: SearchDoc[], q: string): SearchDoc[] {
  const query = q.trim()
  if (!query) return docs
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const scored = docs
    .map((doc) => {
      const hay = `${doc.title} ${doc.description} ${doc.kind}`.toLowerCase()
      let s = 0
      for (const term of terms) {
        if (doc.title.toLowerCase().includes(term)) s += 5
        if (hay.includes(term)) s += 2
      }
      return { doc, s }
    })
    .filter((row) => row.s > 0)
    .sort((a, b) => b.s - a.s)
  return scored.map((row) => row.doc)
}

type SearchPageProps = {
  searchParams?: { q?: string | string[] }
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  const rawQ = searchParams?.q
  const query = (Array.isArray(rawQ) ? rawQ[0] : rawQ) || ''
  const docs: SearchDoc[] = [
    ...PAGES,
    ...getAllBlogPosts().map((post) => ({
      href: `/blog/${post.slug}`,
      title: post.title,
      description: post.excerpt || post.description,
      kind: 'Blog' as const,
    })),
  ]
  const results = rankDocs(docs, query)

  return <SearchPageClient docs={docs} initial={{ query, results }} />
}