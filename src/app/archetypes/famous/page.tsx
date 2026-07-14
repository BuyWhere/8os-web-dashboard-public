import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Famous Archetypes — 8os.ai | See Who Shares Your Blueprint',
  description:
    'Discover which celebrities, leaders, and innovators share your BaZi archetype across the 8os operating styles and compare the patterns behind their public edge.',
  alternates: {
    canonical: '/archetypes/famous',
  },
  openGraph: {
    title: 'Famous Archetypes — 8os.ai | See Who Shares Your Blueprint',
    description:
      'Discover which celebrities, leaders, and innovators share your BaZi archetype across the 8os operating styles and compare the patterns behind their public edge.',
    url: 'https://8os.ai/archetypes/famous',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Famous Archetypes — 8os.ai | See Who Shares Your Blueprint',
    description:
      'Discover which celebrities, leaders, and innovators share your BaZi archetype across the 8os operating styles and compare the patterns behind their public edge.',
  },
};

export type ArchetypeId = 'strategic_commander' | 'nurturing_creative' | 'harmonizer_guardian' | 'steady_achiever';

export interface FamousPerson {
  name: string;
  born: string; // YYYY-MM-DD or YYYY
  knownFor: string;
  archetype: ArchetypeId;
  element: 'Metal' | 'Wood' | 'Fire' | 'Earth' | 'Water';
  trait: string; // one-line personality insight
}

// 50+ celebrities mapped to archetypes
// BaZi analysis based on birth year/month elements + personality patterns
const FAMOUS_ARCHETYPES: FamousPerson[] = [
  // ─── Strategic Commander (Metal energy: decisive, structured, ambitious) ───
  { name: 'Steve Jobs', born: '1955-02-24', knownFor: 'Apple co-founder', archetype: 'strategic_commander', element: 'Wood', trait: 'Uncompromising vision, controlled intensity' },
  { name: 'Elon Musk', born: '1971-06-28', knownFor: 'Tesla, SpaceX', archetype: 'strategic_commander', element: 'Metal', trait: 'First-principles thinker, relentless executor' },
  { name: 'Margaret Thatcher', born: '1925-10-13', knownFor: 'UK Prime Minister', archetype: 'strategic_commander', element: 'Metal', trait: 'Iron determination, strategic conservatism' },
  { name: 'Jeff Bezos', born: '1964-01-12', knownFor: 'Amazon founder', archetype: 'strategic_commander', element: 'Wood', trait: 'Long-term thinking, customer obsession' },
  { name: 'Angela Merkel', born: '1954-07-17', knownFor: 'German Chancellor', archetype: 'strategic_commander', element: 'Wood', trait: 'Methodical pragmatist, steady authority' },
  { name: 'Napoleon Bonaparte', born: '1769-08-15', knownFor: 'French Emperor', archetype: 'strategic_commander', element: 'Earth', trait: 'Tactical genius, absolute command' },
  { name: 'Bill Gates', born: '1955-10-28', knownFor: 'Microsoft co-founder', archetype: 'strategic_commander', element: 'Wood', trait: 'Systems thinker, relentless optimizer' },
  { name: 'Satya Nadella', born: '1967-08-19', knownFor: 'Microsoft CEO', archetype: 'strategic_commander', element: 'Fire', trait: 'Empathetic leadership, growth mindset' },
  { name: 'Sheryl Sandberg', born: '1969-08-28', knownFor: 'Meta COO, Lean In author', archetype: 'strategic_commander', element: 'Earth', trait: 'Operational excellence, purposeful ambition' },
  { name: 'Sam Altman', born: '1985-04-22', knownFor: 'OpenAI CEO', archetype: 'strategic_commander', element: 'Metal', trait: 'Visionary pragmatist, builder of futures' },
  { name: 'Jensen Huang', born: '1963-02-17', knownFor: 'NVIDIA CEO', archetype: 'strategic_commander', element: 'Water', trait: 'Decade-long bets, platform-level thinking' },
  { name: 'Reed Hastings', born: '1960-10-08', knownFor: 'Netflix co-founder', archetype: 'strategic_commander', element: 'Metal', trait: 'Radical candor, freedom and responsibility' },
  { name: 'Mark Zuckerberg', born: '1984-05-14', knownFor: 'Meta founder', archetype: 'strategic_commander', element: 'Water', trait: 'Move fast, own the network' },

  // ─── Nurturing Creative (Wood/Fire energy: expressive, empathic, innovative) ─
  { name: 'Oprah Winfrey', born: '1954-01-29', knownFor: 'Media mogul, philanthropist', archetype: 'nurturing_creative', element: 'Wood', trait: 'Transforming vulnerability into connection' },
  { name: 'Frida Kahlo', born: '1907-07-06', knownFor: 'Painter, artist', archetype: 'nurturing_creative', element: 'Fire', trait: 'Raw self-expression, pain as art' },
  { name: 'Maya Angelou', born: '1928-04-04', knownFor: 'Poet, memoirist', archetype: 'nurturing_creative', element: 'Earth', trait: 'Words that heal, story as liberation' },
  { name: 'Leonardo da Vinci', born: '1452-04-15', knownFor: 'Renaissance polymath', archetype: 'nurturing_creative', element: 'Metal', trait: 'Insatiable curiosity, beauty in systems' },
  { name: 'Steve Wozniak', born: '1950-08-11', knownFor: 'Apple co-founder, engineer', archetype: 'nurturing_creative', element: 'Metal', trait: 'Pure creation for the joy of it' },
  { name: 'Lady Gaga', born: '1986-03-28', knownFor: 'Singer, actress', archetype: 'nurturing_creative', element: 'Fire', trait: 'Radical authenticity, art as activism' },
  { name: 'Walt Disney', born: '1901-12-05', knownFor: 'Disney founder', archetype: 'nurturing_creative', element: 'Metal', trait: 'Imagination at industrial scale' },
  { name: 'J.K. Rowling', born: '1965-07-31', knownFor: 'Harry Potter author', archetype: 'nurturing_creative', element: 'Wood', trait: 'Worlds built from hardship and love' },
  { name: 'Brené Brown', born: '1965-11-18', knownFor: 'Researcher, author', archetype: 'nurturing_creative', element: 'Wood', trait: 'Vulnerability as strength' },
  { name: 'Coco Chanel', born: '1883-08-19', knownFor: 'Fashion designer', archetype: 'nurturing_creative', element: 'Earth', trait: 'Liberation through elegant simplicity' },
  { name: 'Pharrell Williams', born: '1973-04-05', knownFor: 'Producer, designer', archetype: 'nurturing_creative', element: 'Water', trait: 'Joy as a creative force' },
  { name: 'Tim Burton', born: '1958-08-25', knownFor: 'Director', archetype: 'nurturing_creative', element: 'Earth', trait: 'Beauty in darkness, outsider art' },
  { name: 'Eckhart Tolle', born: '1948-02-16', knownFor: 'Spiritual teacher, author', archetype: 'nurturing_creative', element: 'Earth', trait: 'Presence as the ultimate creative act' },
  { name: 'Beyoncé', born: '1981-09-04', knownFor: 'Singer, entrepreneur', archetype: 'nurturing_creative', element: 'Metal', trait: 'Disciplined artistry, impeccable craft' },

  // ─── Harmonizer Guardian (Water/Earth energy: relational, diplomatic, empathic) ─
  { name: 'Barack Obama', born: '1961-08-04', knownFor: '44th US President', archetype: 'harmonizer_guardian', element: 'Metal', trait: 'Bridge-builder, grace under pressure' },
  { name: 'Dalai Lama', born: '1935-07-06', knownFor: 'Tibetan spiritual leader', archetype: 'harmonizer_guardian', element: 'Earth', trait: 'Compassion as global practice' },
  { name: 'Nelson Mandela', born: '1918-07-18', knownFor: 'South African President', archetype: 'harmonizer_guardian', element: 'Earth', trait: 'Forgiveness as revolutionary act' },
  { name: 'Michelle Obama', born: '1964-01-17', knownFor: 'Former First Lady, author', archetype: 'harmonizer_guardian', element: 'Wood', trait: '"When they go low, we go high"' },
  { name: 'Mahatma Gandhi', born: '1869-10-02', knownFor: 'Independence movement leader', archetype: 'harmonizer_guardian', element: 'Earth', trait: 'Non-violent resistance, moral force' },
  { name: 'Mother Teresa', born: '1910-08-26', knownFor: 'Humanitarian, saint', archetype: 'harmonizer_guardian', element: 'Metal', trait: 'Service as highest calling' },
  { name: 'Princess Diana', born: '1961-07-01', knownFor: 'Humanitarian, icon', archetype: 'harmonizer_guardian', element: 'Metal', trait: 'Radical empathy, humanizing power' },
  { name: 'Fred Rogers', born: '1928-03-20', knownFor: "Mister Rogers' Neighborhood", archetype: 'harmonizer_guardian', element: 'Earth', trait: 'Every child matters, presence as gift' },
  { name: 'Jacinda Ardern', born: '1980-07-26', knownFor: 'New Zealand Prime Minister', archetype: 'harmonizer_guardian', element: 'Metal', trait: 'Compassionate governance, strength in kindness' },
  { name: 'Carl Jung', born: '1875-07-26', knownFor: 'Psychologist, founder of analytical psychology', archetype: 'harmonizer_guardian', element: 'Wood', trait: 'The inner life is the outer map' },
  { name: 'Thich Nhat Hanh', born: '1926-10-11', knownFor: 'Zen master, peace activist', archetype: 'harmonizer_guardian', element: 'Fire', trait: 'Interbeing, mindfulness as peace' },
  { name: 'Keanu Reeves', born: '1964-09-02', knownFor: 'Actor, philanthropist', archetype: 'harmonizer_guardian', element: 'Wood', trait: 'Quiet grace, generosity without fanfare' },

  // ─── Steady Achiever (Earth/Metal energy: practical, disciplined, reliable) ─
  { name: 'Warren Buffett', born: '1930-08-30', knownFor: 'Berkshire Hathaway, investor', archetype: 'steady_achiever', element: 'Metal', trait: 'Patience as competitive advantage' },
  { name: 'Tim Cook', born: '1960-11-01', knownFor: 'Apple CEO', archetype: 'steady_achiever', element: 'Metal', trait: 'Operational mastery, quiet excellence' },
  { name: 'Serena Williams', born: '1981-09-26', knownFor: 'Tennis champion', archetype: 'steady_achiever', element: 'Metal', trait: '23 titles built on unglamorous reps' },
  { name: 'Roger Federer', born: '1981-08-08', knownFor: 'Tennis champion', archetype: 'steady_achiever', element: 'Metal', trait: 'Grace through discipline, longevity by design' },
  { name: 'Kobe Bryant', born: '1978-08-23', knownFor: 'NBA champion, entrepreneur', archetype: 'steady_achiever', element: 'Earth', trait: 'Mamba mentality: 4 AM is the advantage' },
  { name: 'David Goggins', born: '1975-02-17', knownFor: 'Author, athlete', archetype: 'steady_achiever', element: 'Wood', trait: 'The 40% rule — you\'re never truly done' },
  { name: 'Marie Curie', born: '1867-11-07', knownFor: 'Nobel laureate (Physics, Chemistry)', archetype: 'steady_achiever', element: 'Fire', trait: 'Stubborn precision, two-Nobel persistence' },
  { name: 'Ray Dalio', born: '1949-08-08', knownFor: 'Bridgewater, investor', archetype: 'steady_achiever', element: 'Earth', trait: 'Principles-first, radical transparency' },
  { name: 'Charlie Munger', born: '1924-01-01', knownFor: 'Vice chairman, Berkshire', archetype: 'steady_achiever', element: 'Earth', trait: 'Mental models, invert always invert' },
  { name: 'LeBron James', born: '1984-12-30', knownFor: 'NBA champion, entrepreneur', archetype: 'steady_achiever', element: 'Water', trait: 'Longevity through obsessive preparation' },
  { name: 'Simone Biles', born: '1997-03-14', knownFor: 'Gymnastics GOAT', archetype: 'steady_achiever', element: 'Fire', trait: 'Excellence redefined by mental health' },
  { name: 'Dwayne Johnson', born: '1972-05-02', knownFor: 'Actor, entrepreneur', archetype: 'steady_achiever', element: 'Water', trait: 'Iron discipline, relentless gratitude' },
  { name: 'James Clear', born: '1986-01-22', knownFor: 'Atomic Habits author', archetype: 'steady_achiever', element: 'Fire', trait: '1% better every day, systems over goals' },

  // ─── Strategic Commander — additional ───
  { name: 'Indra Nooyi', born: '1955-10-28', knownFor: 'PepsiCo CEO', archetype: 'strategic_commander', element: 'Wood', trait: 'Performance with purpose, long-range systems thinking' },
  { name: 'Larry Page', born: '1973-03-26', knownFor: 'Google co-founder', archetype: 'strategic_commander', element: 'Fire', trait: 'Audacious moonshots, first-mover discipline' },
  { name: 'Sundar Pichai', born: '1972-06-10', knownFor: 'Google CEO', archetype: 'strategic_commander', element: 'Water', trait: 'Patient strategist, consensus builder who executes' },
  { name: 'Catherine the Great', born: '1729-05-02', knownFor: 'Empress of Russia', archetype: 'strategic_commander', element: 'Metal', trait: 'Enlightened autocrat, empire-builder through intellect' },
  { name: 'Winston Churchill', born: '1874-11-30', knownFor: 'UK Prime Minister', archetype: 'strategic_commander', element: 'Metal', trait: 'Defiance as strategy, words as weapons' },
  { name: 'Condoleezza Rice', born: '1954-11-14', knownFor: 'US Secretary of State', archetype: 'strategic_commander', element: 'Wood', trait: 'Disciplined intellect, geopolitical precision' },
  { name: 'Marc Andreessen', born: '1971-07-09', knownFor: 'Andreessen Horowitz', archetype: 'strategic_commander', element: 'Fire', trait: 'Software is eating the world — before anyone agreed' },
  { name: 'Peter Thiel', born: '1967-10-11', knownFor: 'PayPal, Palantir, investor', archetype: 'strategic_commander', element: 'Metal', trait: 'Contrarian theses, zero-to-one thinking' },
  { name: 'Genghis Khan', born: '1162-04-16', knownFor: 'Mongol Empire founder', archetype: 'strategic_commander', element: 'Metal', trait: 'Adaptive strategy, meritocracy at scale' },
  { name: 'Ursula von der Leyen', born: '1958-10-08', knownFor: 'European Commission President', archetype: 'strategic_commander', element: 'Earth', trait: 'Continental systems thinker, quiet authority' },
  { name: 'Arvind Krishna', born: '1962-01-01', knownFor: 'IBM CEO', archetype: 'strategic_commander', element: 'Water', trait: 'Research-to-product translator, long-horizon builder' },
  { name: 'Alexander the Great', born: '0356-07-20', knownFor: 'Macedonian King, conqueror', archetype: 'strategic_commander', element: 'Fire', trait: 'Tutored by Aristotle, moved by glory and vision' },

  // ─── Nurturing Creative — additional ───
  { name: 'Toni Morrison', born: '1931-02-18', knownFor: 'Nobel laureate novelist', archetype: 'nurturing_creative', element: 'Water', trait: 'Language as excavation of the Black American soul' },
  { name: 'Pablo Picasso', born: '1881-10-25', knownFor: 'Cubism founder', archetype: 'nurturing_creative', element: 'Earth', trait: 'Destruction as creation, relentless reinvention' },
  { name: 'David Bowie', born: '1947-01-08', knownFor: 'Rock icon, shape-shifter', archetype: 'nurturing_creative', element: 'Metal', trait: 'Identity as art form, the mask that reveals' },
  { name: 'Nikola Tesla', born: '1856-07-10', knownFor: 'Inventor, electrical engineer', archetype: 'nurturing_creative', element: 'Water', trait: 'Vision decades ahead, obsessive creative output' },
  { name: 'Simone de Beauvoir', born: '1908-01-09', knownFor: 'Philosopher, feminist author', archetype: 'nurturing_creative', element: 'Metal', trait: 'One is not born a woman, one becomes one' },
  { name: 'Gabriel García Márquez', born: '1927-03-06', knownFor: 'Magical realist novelist', archetype: 'nurturing_creative', element: 'Wood', trait: 'Reality as insufficient; myth makes it true' },
  { name: 'Björk', born: '1965-11-21', knownFor: 'Avant-garde musician', archetype: 'nurturing_creative', element: 'Wood', trait: 'Nature and technology as creative co-creators' },
  { name: 'Julia Cameron', born: '1948-03-04', knownFor: 'The Artist\'s Way author', archetype: 'nurturing_creative', element: 'Earth', trait: 'Morning pages unlock the blocked creative' },
  { name: 'Hayao Miyazaki', born: '1941-01-05', knownFor: 'Studio Ghibli founder', archetype: 'nurturing_creative', element: 'Metal', trait: 'Hand-drawn worlds, ecological wonder as duty' },
  { name: 'Chimamanda Ngozi Adichie', born: '1977-09-15', knownFor: 'Author, We Should All Be Feminists', archetype: 'nurturing_creative', element: 'Fire', trait: 'The danger of a single story' },
  { name: 'Phoebe Waller-Bridge', born: '1985-07-14', knownFor: 'Fleabag creator, writer', archetype: 'nurturing_creative', element: 'Fire', trait: 'Radical honesty delivered through dark comedy' },
  { name: 'Andrew Huberman', born: '1975-09-26', knownFor: 'Neuroscientist, podcast host', archetype: 'nurturing_creative', element: 'Metal', trait: 'Science as accessible transformation' },
  { name: 'Rick Rubin', born: '1963-03-10', knownFor: 'Record producer', archetype: 'nurturing_creative', element: 'Earth', trait: 'The producer who disappears so art can appear' },

  // ─── Harmonizer Guardian — additional ───
  { name: 'Abraham Lincoln', born: '1809-02-12', knownFor: '16th US President', archetype: 'harmonizer_guardian', element: 'Water', trait: 'Malice toward none, charity for all' },
  { name: 'Eleanor Roosevelt', born: '1884-10-11', knownFor: 'First Lady, UN diplomat', archetype: 'harmonizer_guardian', element: 'Earth', trait: 'The future belongs to those who believe in their dreams' },
  { name: 'Archbishop Desmond Tutu', born: '1931-10-07', knownFor: 'Anti-apartheid activist, Archbishop', archetype: 'harmonizer_guardian', element: 'Fire', trait: 'Ubuntu — I am because we are' },
  { name: 'Jane Goodall', born: '1934-04-03', knownFor: 'Primatologist, conservationist', archetype: 'harmonizer_guardian', element: 'Wood', trait: 'Patient witness, advocacy rooted in love' },
  { name: 'Malala Yousafzai', born: '1997-07-12', knownFor: 'Education activist, Nobel laureate', archetype: 'harmonizer_guardian', element: 'Fire', trait: 'One child, one teacher, one pen can change the world' },
  { name: 'Bernie Sanders', born: '1941-09-08', knownFor: 'US Senator, democratic socialist', archetype: 'harmonizer_guardian', element: 'Metal', trait: 'Not me, us — consistency across six decades' },
  { name: 'Aung San Suu Kyi', born: '1945-06-19', knownFor: 'Myanmar democracy leader', archetype: 'harmonizer_guardian', element: 'Wood', trait: 'Non-violence as moral clarity, house arrest as resolve' },
  { name: 'Yuval Noah Harari', born: '1976-02-24', knownFor: 'Sapiens author, historian', archetype: 'harmonizer_guardian', element: 'Water', trait: 'Zoomed-out perspective as moral responsibility' },
  { name: 'Fred Hampton', born: '1948-08-30', knownFor: 'Black Panther Party chairman', archetype: 'harmonizer_guardian', element: 'Fire', trait: 'Rainbow coalition — unity across difference' },
  { name: 'Greta Thunberg', born: '2003-01-03', knownFor: 'Climate activist', archetype: 'harmonizer_guardian', element: 'Metal', trait: 'How dare you — clarity without compromise' },
  { name: 'Bryan Stevenson', born: '1959-11-14', knownFor: 'Just Mercy author, lawyer', archetype: 'harmonizer_guardian', element: 'Earth', trait: 'Proximity as justice, proximity as love' },
  { name: 'Simone Weil', born: '1909-02-03', knownFor: 'Philosopher, mystic', archetype: 'harmonizer_guardian', element: 'Water', trait: 'Attention is the rarest and purest form of generosity' },

  // ─── Steady Achiever — additional ───
  { name: 'Michael Jordan', born: '1963-02-17', knownFor: 'NBA champion, entrepreneur', archetype: 'steady_achiever', element: 'Fire', trait: 'Talent is God-given; will is self-made' },
  { name: 'Ichiro Suzuki', born: '1973-10-22', knownFor: 'MLB Hall of Fame outfielder', archetype: 'steady_achiever', element: 'Water', trait: '3,000 hits built one swing at a time' },
  { name: 'Cal Newport', born: '1982-06-28', knownFor: 'Deep Work author', archetype: 'steady_achiever', element: 'Metal', trait: 'Deliberate practice; deep work as currency' },
  { name: 'Angela Duckworth', born: '1970-07-18', knownFor: 'Grit author, psychologist', archetype: 'steady_achiever', element: 'Wood', trait: 'Grit — passion and perseverance over time' },
  { name: 'Jocko Willink', born: '1971-09-08', knownFor: 'Navy SEAL, Extreme Ownership author', archetype: 'steady_achiever', element: 'Metal', trait: 'Discipline equals freedom — not a slogan, a system' },
  { name: 'Pat Riley', born: '1945-03-20', knownFor: 'NBA coach, 5x champion', archetype: 'steady_achiever', element: 'Earth', trait: 'Excellence is the gradual result of always striving to do better' },
  { name: 'Cristiano Ronaldo', born: '1985-02-05', knownFor: 'Football GOAT contender', archetype: 'steady_achiever', element: 'Fire', trait: 'Your love for what you do must be bigger than the fear of failure' },
  { name: 'Naomi Osaka', born: '1997-10-16', knownFor: '4x Grand Slam champion', archetype: 'steady_achiever', element: 'Water', trait: 'Mental health is the foundation, not the obstacle' },
  { name: 'Phil Jackson', born: '1945-09-17', knownFor: 'NBA coach, 11x champion', archetype: 'steady_achiever', element: 'Earth', trait: 'The strength of the team is each member; the strength of each is the team' },
  { name: 'Gary Vaynerchuk', born: '1975-11-14', knownFor: 'Entrepreneur, author', archetype: 'steady_achiever', element: 'Fire', trait: 'Legacy is greater than currency; obsession as engine' },
  { name: 'Nick Saban', born: '1951-10-31', knownFor: 'Alabama football coach, 7x champion', archetype: 'steady_achiever', element: 'Earth', trait: 'The Process: this play, this moment, nothing else' },
];

const ARCHETYPE_META: Record<ArchetypeId, { label: string; element: string; tagline: string; color: string; bg: string }> = {
  strategic_commander: {
    label: 'Strategic Commander',
    element: 'Metal / Wood',
    tagline: 'Decisive. Visionary. Built to lead.',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.08)',
  },
  nurturing_creative: {
    label: 'Nurturing Creative',
    element: 'Fire / Wood',
    tagline: 'Expressive. Empathic. Transformative.',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
  },
  harmonizer_guardian: {
    label: 'Harmonizer Guardian',
    element: 'Water / Earth',
    tagline: 'Relational. Diplomatic. Deeply human.',
    color: '#22d3ee',
    bg: 'rgba(34,211,238,0.08)',
  },
  steady_achiever: {
    label: 'Steady Achiever',
    element: 'Earth / Metal',
    tagline: 'Disciplined. Reliable. Built for the long game.',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
  },
};

const ELEMENT_SYMBOL: Record<string, string> = {
  Metal: '⚙️', Wood: '🌿', Fire: '🔥', Earth: '⛰️', Water: '🌊',
};

export default function FamousArchetypesPage() {
  const grouped = Object.fromEntries(
    (Object.keys(ARCHETYPE_META) as ArchetypeId[]).map((id) => [
      id,
      FAMOUS_ARCHETYPES.filter((p) => p.archetype === id),
    ])
  ) as Record<ArchetypeId, FamousPerson[]>;

  return (
    <div style={pageStyle}>
      <div style={innerStyle}>
        {/* Header */}
        <header style={headerStyle}>
          <p style={eyebrowStyle}>Famous Archetypes</p>
          <h1 style={pageTitleStyle}>Who shares your blueprint?</h1>
          <p style={pageDescStyle}>
            BaZi and Western astrology patterns reveal deep personality blueprints.
            These 100+ leaders, artists, and athletes show the archetypes in action.
          </p>
          <Link href="/onboarding" style={ctaBtnStyle}>Discover Your Archetype →</Link>
        </header>

        {/* Archetype sections */}
        {(Object.keys(ARCHETYPE_META) as ArchetypeId[]).map((archetypeId) => {
          const meta = ARCHETYPE_META[archetypeId];
          const people = grouped[archetypeId];
          return (
            <section key={archetypeId} style={{ ...sectionStyle, background: meta.bg, borderColor: `${meta.color}22` }}>
              <div style={sectionHeaderStyle}>
                <div>
                  <h2 style={{ ...sectionTitleStyle, color: meta.color }}>{meta.label}</h2>
                  <p style={sectionElementStyle}>{meta.element} Energy</p>
                  <p style={sectionTaglineStyle}>{meta.tagline}</p>
                </div>
                <span style={{ ...countBadgeStyle, background: `${meta.color}22`, color: meta.color }}>
                  {people.length} profiles
                </span>
              </div>

              <div style={gridStyle}>
                {people.map((person) => (
                  <div key={person.name} style={cardStyle}>
                    <div style={cardHeaderStyle}>
                      <div style={avatarStyle}>{person.name.charAt(0)}</div>
                      <div>
                        <p style={nameStyle}>{person.name}</p>
                        <p style={bornStyle}>{person.born.slice(0, 4)}</p>
                      </div>
                      <span style={elementBadgeStyle} title={`${person.element} element`}>
                        {ELEMENT_SYMBOL[person.element]}
                      </span>
                    </div>
                    <p style={knownForStyle}>{person.knownFor}</p>
                    <p style={traitStyle}>&ldquo;{person.trait}&rdquo;</p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {/* Bottom CTA */}
        <div style={bottomCtaStyle}>
          <h2 style={bottomTitleStyle}>Your archetype is waiting</h2>
          <p style={bottomDescStyle}>
            Take 90 seconds. Find out which of these leaders you share a blueprint with.
          </p>
          <Link href="/onboarding" style={ctaBtnStyle}>Get Your Free Archetype</Link>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = { background: '#060608', color: 'var(--color-bg-secondary)', minHeight: '100vh' };
const innerStyle: React.CSSProperties = { maxWidth: '1100px', margin: '0 auto', padding: '4rem 1.5rem' };
const headerStyle: React.CSSProperties = { textAlign: 'center', marginBottom: '4rem' };
const eyebrowStyle: React.CSSProperties = { margin: '0 0 0.75rem', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a78bfa' };
const pageTitleStyle: React.CSSProperties = { margin: '0 0 1rem', fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.1, letterSpacing: '-0.04em' };
const pageDescStyle: React.CSSProperties = { margin: '0 0 1.75rem', fontSize: '1rem', lineHeight: 1.65, color: 'rgba(248,250,252,0.6)', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' };
const ctaBtnStyle: React.CSSProperties = { display: 'inline-block', padding: '0.85rem 1.75rem', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', boxShadow: '0 8px 24px rgba(124,58,237,0.4)' };

const sectionStyle: React.CSSProperties = { marginBottom: '2.5rem', padding: '2rem', borderRadius: '20px', border: '1px solid' };
const sectionHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' };
const sectionTitleStyle: React.CSSProperties = { margin: '0 0 0.2rem', fontSize: '1.4rem', fontWeight: 800 };
const sectionElementStyle: React.CSSProperties = { margin: '0 0 0.3rem', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(248,250,252,0.4)' };
const sectionTaglineStyle: React.CSSProperties = { margin: 0, fontSize: '0.9rem', color: 'rgba(248,250,252,0.6)', fontStyle: 'italic' };
const countBadgeStyle: React.CSSProperties = { padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, flexShrink: 0 };

const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.85rem' };
const cardStyle: React.CSSProperties = { padding: '1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '0.5rem' };
const cardHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.65rem' };
const avatarStyle: React.CSSProperties = { width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, flexShrink: 0 };
const nameStyle: React.CSSProperties = { margin: 0, fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.3 };
const bornStyle: React.CSSProperties = { margin: 0, fontSize: '0.72rem', color: 'rgba(248,250,252,0.35)' };
const elementBadgeStyle: React.CSSProperties = { marginLeft: 'auto', fontSize: '1rem', flexShrink: 0 };
const knownForStyle: React.CSSProperties = { margin: 0, fontSize: '0.78rem', color: 'rgba(248,250,252,0.45)', lineHeight: 1.4 };
const traitStyle: React.CSSProperties = { margin: 0, fontSize: '0.82rem', color: 'rgba(248,250,252,0.7)', lineHeight: 1.5, fontStyle: 'italic' };

const bottomCtaStyle: React.CSSProperties = { textAlign: 'center', padding: '3.5rem 2rem', borderRadius: '24px', border: '1px solid rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.06)', marginTop: '2rem' };
const bottomTitleStyle: React.CSSProperties = { margin: '0 0 0.75rem', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', letterSpacing: '-0.04em' };
const bottomDescStyle: React.CSSProperties = { margin: '0 0 1.75rem', fontSize: '1rem', color: 'rgba(248,250,252,0.6)' };
