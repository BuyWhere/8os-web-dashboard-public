import type { Metadata } from 'next';
import ArchetypesPageClient from '@/components/ArchetypesPageClient';

export const metadata: Metadata = {
  title: 'Archetypes, Compare the 8os Operating Styles | 8os.ai',
  description:
    'Compare all 8os archetypes side by side. See each operating style, dominant element, work rhythm, and strengths before you start the quiz.',
  alternates: {
    canonical: '/archetypes',
  },
  openGraph: {
    title: 'Archetypes, Compare the 8os Operating Styles | 8os.ai',
    description:
      'Compare all 8os archetypes side by side. See each operating style, dominant element, work rhythm, and strengths before you start the quiz.',
    url: 'https://8os.ai/archetypes',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Archetypes, Compare the 8os Operating Styles | 8os.ai',
    description:
      'Compare all 8os archetypes side by side. See each operating style, dominant element, work rhythm, and strengths before you start the quiz.',
  },
};

export default function ArchetypesPage() {
  return <ArchetypesPageClient />;
}
