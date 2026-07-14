import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'BaZi Element by Zodiac Sign | 8os.ai',
  description:
    'Discover your BaZi element by zodiac sign. Each sign has multiple elemental expressions, find your exact combination and learn what it means for your goals and operating system.',
  keywords: [
    'bazi zodiac sign',
    'astrology element bazi',
    'scorpio bazi element',
    'capricorn bazi element',
    'aries bazi',
    'five elements zodiac',
  ],
};

const SIGNS = [
  {
    sign: 'Capricorn',
    dates: 'Dec 22 - Jan 19',
    emoji: '♑',
    description:
      'The sign of ambition and structured achievement. Capricorn amplifies Metal precision, Water strategic depth, Earth patient construction, Fire rare warmth, and Wood resilient adaptability into formidable archetypes.',
    profiles: [
      { slug: 'capricorn-geng-metal', element: 'Geng Metal ⚙️', archetype: 'Strategic Commander' },
      { slug: 'capricorn-ren-water', element: 'Ren Water 🌊', archetype: 'Nurturing Creative' },
      { slug: 'capricorn-ji-earth', element: 'Ji Earth 🏔️', archetype: 'Harmonizer Guardian' },
      { slug: 'capricorn-bing-fire', element: 'Bing Fire 🔥', archetype: 'Visionary Builder' },
      { slug: 'capricorn-yi-wood', element: 'Yi Wood 🌿', archetype: 'Steady Achiever' },
    ],
  },
  {
    sign: 'Aquarius',
    dates: 'Jan 20 - Feb 18',
    emoji: '♒',
    description:
      'The sign of innovation and collective vision. Aquarius pairs with Fire for revolutionary leadership (both Bing and Ding), Water for systems intelligence, Wood for long-range growth, and Earth for systemic staying power.',
    profiles: [
      { slug: 'aquarius-bing-fire', element: 'Bing Fire 🔥', archetype: 'Visionary Builder' },
      { slug: 'aquarius-gui-water', element: 'Gui Water 🌊', archetype: 'Nurturing Creative' },
      { slug: 'aquarius-jia-wood', element: 'Jia Wood 🌿', archetype: 'Steady Achiever' },
      { slug: 'aquarius-wu-earth', element: 'Wu Earth 🏔️', archetype: 'Harmonizer Guardian' },
      { slug: 'aquarius-ding-fire', element: 'Ding Fire 🔥', archetype: 'Visionary Builder' },
    ],
  },
  {
    sign: 'Pisces',
    dates: 'Feb 19 - Mar 20',
    emoji: '♓',
    description:
      'The sign of deep feeling and transcendent perception. Pisces amplifies Water intuition (both Gui and Ren), Wood patient growth, Fire radiant transmission, and Earth compassionate stability into something almost otherworldly.',
    profiles: [
      { slug: 'pisces-gui-water', element: 'Gui Water 🌊', archetype: 'Nurturing Creative' },
      { slug: 'pisces-jia-wood', element: 'Jia Wood 🌿', archetype: 'Steady Achiever' },
      { slug: 'pisces-bing-fire', element: 'Bing Fire 🔥', archetype: 'Visionary Builder' },
      { slug: 'pisces-wu-earth', element: 'Wu Earth 🏔️', archetype: 'Harmonizer Guardian' },
      { slug: 'pisces-ren-water', element: 'Ren Water 🌊', archetype: 'Nurturing Creative' },
    ],
  },
  {
    sign: 'Aries',
    dates: 'Mar 21 - Apr 19',
    emoji: '♈',
    description:
      'The sign of initiation and fearless action. Aries pairs powerfully with Metal for decisive execution, Fire for pioneering momentum, Wood for adaptive persistence, Water for empathic speed, and Earth for grounded endurance.',
    profiles: [
      { slug: 'aries-geng-metal', element: 'Geng Metal ⚙️', archetype: 'Strategic Commander' },
      { slug: 'aries-ding-fire', element: 'Ding Fire 🔥', archetype: 'Visionary Builder' },
      { slug: 'aries-yi-wood', element: 'Yi Wood 🌿', archetype: 'Steady Achiever' },
      { slug: 'aries-gui-water', element: 'Gui Water 🌊', archetype: 'Nurturing Creative' },
      { slug: 'aries-wu-earth', element: 'Wu Earth 🏔️', archetype: 'Harmonizer Guardian' },
    ],
  },
  {
    sign: 'Taurus',
    dates: 'Apr 20 - May 20',
    emoji: '♉',
    description:
      'The sign of patient building and sensory depth. Taurus amplifies Earth grounding, Water depth, Wood patient growth, Metal precision, and Fire intimate warmth into extraordinary durability.',
    profiles: [
      { slug: 'taurus-wu-earth', element: 'Wu Earth 🏔️', archetype: 'Harmonizer Guardian' },
      { slug: 'taurus-gui-water', element: 'Gui Water 🌊', archetype: 'Nurturing Creative' },
      { slug: 'taurus-jia-wood', element: 'Jia Wood 🌿', archetype: 'Steady Achiever' },
      { slug: 'taurus-geng-metal', element: 'Geng Metal ⚙️', archetype: 'Strategic Commander' },
      { slug: 'taurus-ding-fire', element: 'Ding Fire 🔥', archetype: 'Visionary Builder' },
    ],
  },
  {
    sign: 'Gemini',
    dates: 'May 21 - Jun 20',
    emoji: '♊',
    description:
      "The sign of intellectual range and communicative speed. Gemini amplifies Wood growth energy, Fire's radiant transmission, Metal's cutting precision, Earth's nurturing breadth, and Water's strategic synthesis.",
    profiles: [
      { slug: 'gemini-yi-wood', element: 'Yi Wood 🌿', archetype: 'Steady Achiever' },
      { slug: 'gemini-bing-fire', element: 'Bing Fire 🔥', archetype: 'Visionary Builder' },
      { slug: 'gemini-geng-metal', element: 'Geng Metal ⚙️', archetype: 'Strategic Commander' },
      { slug: 'gemini-ji-earth', element: 'Ji Earth 🏔️', archetype: 'Harmonizer Guardian' },
      { slug: 'gemini-ren-water', element: 'Ren Water 🌊', archetype: 'Nurturing Creative' },
    ],
  },
  {
    sign: 'Cancer',
    dates: 'Jun 21 - Jul 22',
    emoji: '♋',
    description:
      'The sign of deep care and protective nurturing. Cancer amplifies Fire warmth, Water depth (both Gui and Ren), Earth grounding, and Wood patient growth into its most emotionally attuned archetypes.',
    profiles: [
      { slug: 'cancer-ding-fire', element: 'Ding Fire 🔥', archetype: 'Visionary Builder' },
      { slug: 'cancer-gui-water', element: 'Gui Water 🌊', archetype: 'Nurturing Creative' },
      { slug: 'cancer-wu-earth', element: 'Wu Earth 🏔️', archetype: 'Harmonizer Guardian' },
      { slug: 'cancer-jia-wood', element: 'Jia Wood 🌿', archetype: 'Steady Achiever' },
      { slug: 'cancer-ren-water', element: 'Ren Water 🌊', archetype: 'Nurturing Creative' },
    ],
  },
  {
    sign: 'Leo',
    dates: 'Jul 23 - Aug 22',
    emoji: '♌',
    description:
      "The sign of bold expression and generous leadership. Leo pairs Fire brilliance, Earth's grounded authority, Wood's cumulative stature (both Jia and Yi), and Water's surprising emotional depth.",
    profiles: [
      { slug: 'leo-bing-fire', element: 'Bing Fire 🔥', archetype: 'Visionary Builder' },
      { slug: 'leo-wu-earth', element: 'Wu Earth 🏔️', archetype: 'Harmonizer Guardian' },
      { slug: 'leo-jia-wood', element: 'Jia Wood 🌿', archetype: 'Steady Achiever' },
      { slug: 'leo-gui-water', element: 'Gui Water 🌊', archetype: 'Nurturing Creative' },
      { slug: 'leo-yi-wood', element: 'Yi Wood 🌿', archetype: 'Steady Achiever' },
    ],
  },
  {
    sign: 'Virgo',
    dates: 'Aug 23 - Sep 22',
    emoji: '♍',
    description:
      'The sign of precision and discernment. Virgo amplifies Earth steadiness (Ji and Wu), Water analytical depth, Metal surgical execution, and Wood continuous improvement into exceptional quality.',
    profiles: [
      { slug: 'virgo-ji-earth', element: 'Ji Earth 🏔️', archetype: 'Harmonizer Guardian' },
      { slug: 'virgo-ren-water', element: 'Ren Water 🌊', archetype: 'Nurturing Creative' },
      { slug: 'virgo-geng-metal', element: 'Geng Metal ⚙️', archetype: 'Strategic Commander' },
      { slug: 'virgo-yi-wood', element: 'Yi Wood 🌿', archetype: 'Steady Achiever' },
      { slug: 'virgo-wu-earth', element: 'Wu Earth 🏔️', archetype: 'Harmonizer Guardian' },
    ],
  },
  {
    sign: 'Libra',
    dates: 'Sep 23 - Oct 22',
    emoji: '♎',
    description:
      "The sign of harmony and aesthetic intelligence. Libra amplifies Wood's collaborative nature, Water's empathic attunement, Metal's decisive fairness, Fire's intimate warmth, and Earth's grounded peacemaking into something unusually beautiful.",
    profiles: [
      { slug: 'libra-yi-wood', element: 'Yi Wood 🌿', archetype: 'Steady Achiever' },
      { slug: 'libra-gui-water', element: 'Gui Water 🌊', archetype: 'Nurturing Creative' },
      { slug: 'libra-geng-metal', element: 'Geng Metal ⚙️', archetype: 'Strategic Commander' },
      { slug: 'libra-ding-fire', element: 'Ding Fire 🔥', archetype: 'Visionary Builder' },
      { slug: 'libra-wu-earth', element: 'Wu Earth 🏔️', archetype: 'Harmonizer Guardian' },
    ],
  },
  {
    sign: 'Scorpio',
    dates: 'Oct 23 - Nov 21',
    emoji: '♏',
    description:
      'The sign of transformation and penetrating perception. Scorpio amplifies Water, Wood, Fire, and Earth into the most intensely perceptive and transformative archetypes in the system.',
    profiles: [
      { slug: 'scorpio-jia-wood', element: 'Jia Wood 🌿', archetype: 'Steady Achiever' },
      { slug: 'scorpio-ren-water', element: 'Ren Water 🌊', archetype: 'Nurturing Creative' },
      { slug: 'scorpio-gui-water', element: 'Gui Water 🌊', archetype: 'Nurturing Creative' },
      { slug: 'scorpio-ding-fire', element: 'Ding Fire 🔥', archetype: 'Visionary Builder' },
      { slug: 'scorpio-wu-earth', element: 'Wu Earth 🏔️', archetype: 'Harmonizer Guardian' },
    ],
  },
  {
    sign: 'Sagittarius',
    dates: 'Nov 22 - Dec 21',
    emoji: '♐',
    description:
      "The sign of expansive vision and philosophical exploration. Sagittarius amplifies Wood's patient growth, Fire's radiant broadcast, Water's philosophical depth, Yi Wood's flexible range, and Metal's decisive principle into wide-ranging, wisdom-seeking archetypes.",
    profiles: [
      { slug: 'sagittarius-jia-wood', element: 'Jia Wood 🌿', archetype: 'Steady Achiever' },
      { slug: 'sagittarius-bing-fire', element: 'Bing Fire 🔥', archetype: 'Visionary Builder' },
      { slug: 'sagittarius-gui-water', element: 'Gui Water 🌊', archetype: 'Nurturing Creative' },
      { slug: 'sagittarius-yi-wood', element: 'Yi Wood 🌿', archetype: 'Steady Achiever' },
      { slug: 'sagittarius-geng-metal', element: 'Geng Metal ⚙️', archetype: 'Strategic Commander' },
    ],
  },
];

const ELEMENT_COLORS: Record<string, string> = {
  Metal: 'var(--color-text-muted)',
  Water: '#38bdf8',
  Wood: '#22c55e',
  Fire: '#f97316',
  Earth: '#f59e0b',
};

function getElementColor(element: string): string {
  for (const [el, color] of Object.entries(ELEMENT_COLORS)) {
    if (element.includes(el)) return color;
  }
  return 'var(--color-accent)';
}

export default function SignsPage() {
  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', color: 'var(--color-border)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Breadcrumb */}
        <nav style={{ marginBottom: '32px' }}>
          <Link href="/archetypes" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
            ← All Archetypes
          </Link>
        </nav>

        {/* Header */}
        <h1 style={{ fontSize: '40px', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2, marginBottom: '16px' }}>
          Your BaZi Element by Zodiac Sign
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: '12px', maxWidth: '680px' }}>
          Western astrology gives you a sign. BaZi gives you an element. Combined, they reveal your exact operating
          system, how you think, work, make decisions, and pursue goals.
        </p>
        <p style={{ fontSize: '16px', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '48px', maxWidth: '680px' }}>
          Each zodiac sign can express multiple BaZi elements depending on the year and month of birth. Find your sign
          below and explore the profiles that match your combination.
        </p>

        {/* Signs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
          {SIGNS.map((s) => (
            <div
              key={s.sign}
              style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-bg-card)',
                borderRadius: '16px',
                padding: '28px',
              }}
            >
              {/* Sign header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '32px' }}>{s.emoji}</span>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{s.sign}</h2>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>{s.dates}</p>
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                {s.description}
              </p>

              {/* Profiles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {s.profiles.map((p) => {
                  const color = getElementColor(p.element);
                  return (
                    <Link
                      key={p.slug}
                      href={`/archetypes/${p.slug}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--color-bg-primary)',
                        border: `1px solid ${color}33`,
                        borderRadius: '8px',
                        padding: '12px 16px',
                        textDecoration: 'none',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <span style={{ fontSize: '14px', color: 'var(--color-border)', fontWeight: 500 }}>{p.element}</span>
                      <span
                        style={{
                          fontSize: '12px',
                          color,
                          background: `${color}22`,
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontWeight: 500,
                        }}
                      >
                        {p.archetype}
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Coming soon placeholder */}
              {s.profiles.length < 2 && (
                <p style={{ fontSize: '12px', color: '#334155', marginTop: '8px' }}>
                  More {s.sign} profiles coming soon.
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Not sure CTA */}
        <div
          style={{
            marginTop: '64px',
            background: 'linear-gradient(135deg, var(--color-bg-card), var(--color-bg-card))',
            border: '1px solid #3730a3',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
          }}
        >
          <h3 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
            Not Sure Which Profile Is Yours?
          </h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '15px' }}>
            Take the 90-second quiz. We identify your dominant element from your birth date and a few quick questions,
            no birth time required.
          </p>
          <Link
            href="/onboarding"
            style={{
              background: 'var(--color-accent)',
              color: '#fff',
              padding: '14px 32px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '15px',
              display: 'inline-block',
            }}
          >
            Find Your Archetype Free →
          </Link>
        </div>
      </div>
    </div>
  );
}
