import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Archetype Explorer, 8os',
  description: 'Explore all 8os archetypes and discover which one matches your personality and energy patterns.',
};

const archetypes = [
  {
    name: 'Strategic Commander',
    element: 'Metal',
    colorClass: styles.metal,
    traits: ['Decisive', 'Structured', 'Goal-driven', 'Analytical'],
    desc: 'You see the battlefield before others do. You plan, execute, and deliver with precision.',
    peak: 'Early morning and late evening',
  },
  {
    name: 'Nurturing Creative',
    element: 'Wood',
    colorClass: styles.wood,
    traits: ['Innovative', 'Adaptive', 'Empathetic', 'Visionary'],
    desc: 'Ideas flow through you naturally. You grow best when given space to explore and create.',
    peak: 'Mid-morning creative windows',
  },
  {
    name: 'Steady Achiever',
    element: 'Fire',
    colorClass: styles.fire,
    traits: ['Ambitious', 'Energetic', 'Charismatic', 'Action-oriented'],
    desc: 'You burn bright and move fast. Your enthusiasm is contagious and your output is prolific.',
    peak: 'Late morning to afternoon',
  },
  {
    name: 'Harmonizer Guardian',
    element: 'Water',
    colorClass: styles.water,
    traits: ['Collaborative', 'Intuitive', 'Patient', 'Diplomatic'],
    desc: 'You bring people together. Your strength is in creating the conditions for others to thrive.',
    peak: 'Afternoon and early evening',
  },
  {
    name: 'Earth Anchor',
    element: 'Earth',
    colorClass: styles.earth,
    traits: ['Reliable', 'Methodical', 'Grounded', 'Practical'],
    desc: 'You are the foundation. Steady, consistent, and trustworthy, you build things that last.',
    peak: 'Consistent throughout the day',
  },
];

export default function ArchetypeExplorerPage() {
  return (
    <main className={styles.pageShell}>
      <div className={styles.pageContainer}>
        <Link href="/" className={styles.backLink}>
          ← Back to 8os
        </Link>

        <header className={styles.hero}>
          <div className={styles.eyebrow}>17,280 Core Configurations</div>
          <h1 className={styles.title}>Archetype Explorer</h1>
          <p className={styles.subtitle}>
            Every 8os is built on a BaZi-derived archetype. These are the five core patterns,
            your exact configuration is a unique blend.
          </p>
        </header>

        <p className={styles.patternAffordance}>
          Showing all five core patterns: Metal, Wood, Fire, Water, and Earth.
        </p>

        <section className={styles.archetypeGrid} aria-label="Five core archetype patterns">
          {archetypes.map((a) => (
            <article key={a.name} className={styles.archetypeCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{a.name}</h2>
                <span className={`${styles.elementBadge} ${a.colorClass}`}>{a.element}</span>
              </div>
              <p className={styles.cardDescription}>{a.desc}</p>
              <div className={styles.traitList}>
                {a.traits.map((t) => (
                  <span key={t} className={styles.trait}>{t}</span>
                ))}
              </div>
              <p className={styles.peakHours}>⚡ Peak hours: {a.peak}</p>
            </article>
          ))}
        </section>

        <section className={styles.ctaCard}>
          <h2 className={styles.ctaTitle}>Discover Your Archetype</h2>
          <p className={styles.ctaText}>
            Your exact archetype is a unique blend determined by your BaZi birth chart.
            Generate yours in 90 seconds, free.
          </p>
          <a href="/quiz" className={styles.ctaButton}>
            Generate My Life OS, Free
          </a>
        </section>
      </div>
    </main>
  );
}
