import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArchetypeRevealedTracker } from '@/components/ArchetypeRevealedTracker';

interface ArchetypeProfile {
  slug: string;
  sign: string;
  element: string;
  elementEmoji: string;
  elementColor: string;
  archetype: string;
  archetypeSlug: string;
  tagline: string;
  description: string;
  strengths: string[];
  challenges: string[];
  idealWork: string[];
  keyInsight: string;
  dailyPractice: string;
}

const PROFILES: Record<string, ArchetypeProfile> = {
  'capricorn-geng-metal': {
    slug: 'capricorn-geng-metal',
    sign: 'Capricorn', element: 'Metal', elementEmoji: '⚙️', elementColor: 'var(--color-text-muted)',
    archetype: 'Strategic Commander', archetypeSlug: 'strategic-commander',
    tagline: 'The Architect Who Builds Empires',
    description: 'Capricorn × Geng Metal is the most structurally precise combination in the system. Capricorn\'s ambition and discipline amplify Geng Metal\'s decisiveness and systems-orientation into something formidable. Where others see obstacles, you see inefficiencies to eliminate. Where others feel overwhelmed, you feel the clarifying pressure of constraint.',
    strengths: ['Unmatched long-range planning and execution', 'Decisive under pressure without panic', 'Builds systems that outlast the builder', 'Earns trust through reliability, not charisma'],
    challenges: ['Perfectionism slows output, good enough rarely feels good enough', 'Difficulty delegating, others rarely meet the standard', 'Emotional expression feels inefficient; relationships can suffer'],
    idealWork: ['Strategic planning and operations leadership', 'Systems architecture and process design', 'Financial analysis and investment', 'Engineering management'],
    keyInsight: 'Your Metal element sharpens under pressure, but Geng Metal can also crack when overloaded. The system you need most is one that protects your recovery, not just your productivity.',
    dailyPractice: 'Define ONE non-negotiable constraint for the day before opening any communication channel.',
  },
  'capricorn-ren-water': {
    slug: 'capricorn-ren-water',
    sign: 'Capricorn', element: 'Water', elementEmoji: '🌊', elementColor: 'var(--color-element-water)',
    archetype: 'Nurturing Creative', archetypeSlug: 'nurturing-creative',
    tagline: 'The Strategist Who Sees What Others Miss',
    description: 'Capricorn × Ren Water creates a rare combination: Capricorn\'s structural ambition carried by Water\'s deep perception and synthesis capacity. You don\'t just plan, you sense what the plan misses. You see around corners that purely analytical thinkers hit head-on.',
    strengths: ['Pattern recognition is extraordinary, reads beneath the surface', 'Ambitious but intuitive; adjusts when others execute broken plans', 'Deep synthesizer across vast domains', 'Builds long-term with emotional intelligence others lack'],
    challenges: ['Depth produces over-analysis and delayed action', 'Feels the weight of what others miss, can become exhausted by perception', 'Difficulty explaining insights that feel obvious but resist articulation'],
    idealWork: ['Research, intelligence analysis, strategic insight', 'Investment and risk assessment', 'Psychology and organizational behavior', 'Long-form writing and investigative journalism'],
    keyInsight: 'Capricorn pushes you toward achievement; Ren Water pulls you toward depth. The tension is generative, but only if you let the synthesis happen before you force the action.',
    dailyPractice: 'Morning: 10 minutes of unstructured writing before any task list. Water needs to move before Metal can shape it.',
  },
  'aquarius-bing-fire': {
    slug: 'aquarius-bing-fire',
    sign: 'Aquarius', element: 'Fire', elementEmoji: '🔥', elementColor: 'var(--color-element-fire)',
    archetype: 'Visionary Builder', archetypeSlug: 'visionary-builder',
    tagline: 'The Revolutionary Who Builds the Future',
    description: 'Aquarius × Bing Fire is one of the most iconoclastic combinations in the system. Aquarius\'s systems-level thinking about human progress meets Bing Fire\'s warmth, visibility, and magnetic leadership energy. This archetype doesn\'t just have a vision, it broadcasts it at a frequency that moves people.',
    strengths: ['Sees structural solutions to problems others accept as fixed', 'Inspires collective action, rallies people around ideas', 'Combines innovation with genuine warmth (rare in visionary types)', 'High creative output when mission is clear'],
    challenges: ['Brilliant at inception; follow-through requires deliberate structure', 'The vision evolves faster than the team can execute', 'Burns bright, burnout cycles are real and must be managed'],
    idealWork: ['Social entrepreneurship and mission-driven startups', 'Technology for human impact', 'Policy design and advocacy', 'Future-of-work research'],
    keyInsight: 'Bing Fire radiates warmth outward. Aquarius operates from principle. The synthesis is rare: a leader who is both genuinely warm AND structurally innovative.',
    dailyPractice: 'One bold public statement per day, planned the night before so Aquarius\'s precision shapes Fire\'s impulse.',
  },
  'aquarius-gui-water': {
    slug: 'aquarius-gui-water',
    sign: 'Aquarius', element: 'Water', elementEmoji: '🌊', elementColor: 'var(--color-element-water)',
    archetype: 'Nurturing Creative', archetypeSlug: 'nurturing-creative',
    tagline: 'The Innovator Who Feels the System',
    description: 'Aquarius × Gui Water is the most quietly radical combination in the system. Aquarius sees systemic patterns; Gui Water feels them. You don\'t just understand what needs to change, you sense the emotional and relational undercurrents that make change possible or impossible.',
    strengths: ['Reads emotional subtext of systems others treat as purely rational', 'Generates novel frameworks explaining human behavior at scale', 'Builds trust through listening; influence flows from genuine care'],
    challenges: ['Gui Water\'s gentleness can suppress Aquarius\'s radical clarity', 'Insights come in waves, not linear; productivity systems often fight this', 'Boundaries are hard; feels others\' friction as personal'],
    idealWork: ['Organizational psychology and culture design', 'Educational philosophy and curriculum', 'Therapeutic practice and coaching', 'Social impact strategy'],
    keyInsight: 'Gui Water flows into every crack. Aquarius sees the whole system. Together, you understand how change actually happens, not through force, but through finding the path of least resistance through human networks.',
    dailyPractice: 'Start each project by mapping the human relationships involved, not just the tasks.',
  },
  'aries-geng-metal': {
    slug: 'aries-geng-metal',
    sign: 'Aries', element: 'Metal', elementEmoji: '⚙️', elementColor: 'var(--color-text-muted)',
    archetype: 'Strategic Commander', archetypeSlug: 'strategic-commander',
    tagline: 'The Decisive Force That Moves First',
    description: 'Aries × Geng Metal is the fastest-moving Strategic Commander. Aries acts on instinct; Geng Metal acts on precision. The combination produces someone who is both first AND right more often than anyone has a right to be.',
    strengths: ['Exceptional rapid situational assessment', 'Executes with both speed and precision', 'Natural first-mover, establishes context before others process it', 'High energy sustaining long sprints'],
    challenges: ['Speed creates blind spots, what gets missed rarely gets revisited', 'Bluntness creates sharp interpersonal impact', 'Starts more than finishes; needs structural accountability'],
    idealWork: ['Startup founding and early-stage leadership', 'Crisis management and turnaround', 'Competitive intelligence and market strategy', 'High-stakes operational leadership'],
    keyInsight: 'Aries gives you the launch; Geng Metal gives you the aim. Most people have one or the other. You have both, but manage the gap between impulse and impact.',
    dailyPractice: '30-second pause rule before any consequential action. Doesn\'t slow the system, recalibrates aim.',
  },
  'cancer-ding-fire': {
    slug: 'cancer-ding-fire',
    sign: 'Cancer', element: 'Fire', elementEmoji: '🔥', elementColor: 'var(--color-element-fire)',
    archetype: 'Visionary Builder', archetypeSlug: 'visionary-builder',
    tagline: 'The Heart-Led Builder',
    description: 'Cancer × Ding Fire (the candle flame, intimate and warm) is the most emotionally connected Visionary Builder. You don\'t just inspire from a stage, you inspire in the room, in the conversation, in the moment. Your vision is felt before it\'s understood.',
    strengths: ['Creates deep trust quickly through genuine care', 'Inspires through personal connection, not broadcast messaging', 'Holds the emotional container of a team through difficulty', 'Turns personal story into shared meaning'],
    challenges: ['Ding Fire burns quietly, invisible depletion', 'Difficulty with necessary endings (team, projects, relationships)', 'Protective instinct can shade into controlling behavior under stress'],
    idealWork: ['People-centered leadership and management', 'Healthcare, mental health, and community care', 'Education and mentorship', 'Brand storytelling and authentic marketing'],
    keyInsight: 'Ding Fire doesn\'t broadcast, it illuminates. Your power is in proximity. Don\'t try to scale your leadership style before you\'ve maximized what you do at close range.',
    dailyPractice: 'One meaningful one-on-one connection per day. Protect those interactions from being crowded out by scale.',
  },
  'gemini-yi-wood': {
    slug: 'gemini-yi-wood',
    sign: 'Gemini', element: 'Wood', elementEmoji: '🌿', elementColor: 'var(--color-element-wood)',
    archetype: 'Steady Achiever', archetypeSlug: 'steady-achiever',
    tagline: 'The Adaptive Builder',
    description: 'Gemini × Yi Wood (the vine, flexible and persistent) is the most versatile Steady Achiever. Gemini\'s multi-channel curiosity gives Yi Wood\'s patient growth remarkable range. You build momentum across many domains simultaneously without losing the thread of any.',
    strengths: ['Tracks multiple growth trajectories without losing any', 'Adapts mid-route without restarting', 'Communication makes the growth process visible and sharable', 'High output over time, consistent without rigidity'],
    challenges: ['Breadth risks diluting depth, some tracks stay shallow', 'Starting is easier than sustaining', 'Appears casual; underestimated until results arrive'],
    idealWork: ['Multi-platform content and media creation', 'Product management', 'Consulting across industries', 'Entrepreneurship in knowledge-based businesses'],
    keyInsight: 'Yi Wood grows around obstacles. Gemini generates options. The synthesis: you never get truly stuck, you just need to see the route around, not through.',
    dailyPractice: 'Weekly portfolio review: which tracks are growing, which are stalled, which should be pruned.',
  },
  'leo-bing-fire': {
    slug: 'leo-bing-fire',
    sign: 'Leo', element: 'Fire', elementEmoji: '🔥', elementColor: 'var(--color-element-fire)',
    archetype: 'Visionary Builder', archetypeSlug: 'visionary-builder',
    tagline: 'The Sun That Draws Everyone In',
    description: 'Leo × Bing Fire (the sun, broad and radiant) is the most naturally magnetic combination in the system. Both Leo and Bing Fire share the same fundamental quality: they radiate outward, draw attention without effort, and warm everything in their proximity.',
    strengths: ['Magnetic presence that needs no amplification', 'Generous with attention and recognition, people feel seen', 'Inspires through joy, not urgency', 'Creates loyalty and culture effortlessly'],
    challenges: ['Needs recognition as fuel, roles that don\'t provide it are depleting', 'Broadcasts equally, struggles with prioritization of attention', 'Burnout comes suddenly, not gradually'],
    idealWork: ['Executive and brand leadership', 'Performing arts and entertainment', 'High-visibility creative direction', 'Founder roles where culture is the product'],
    keyInsight: 'Bing Fire doesn\'t need to try to shine. Neither does Leo. The work is directing the light, making sure what you radiate is intentional, not just inevitable.',
    dailyPractice: 'Morning declaration: one sentence about what you\'re building today and why it matters.',
  },
  'taurus-wu-earth': {
    slug: 'taurus-wu-earth',
    sign: 'Taurus', element: 'Earth', elementEmoji: '⛰️', elementColor: 'var(--color-element-earth)',
    archetype: 'Harmonizer Guardian', archetypeSlug: 'harmonizer-guardian',
    tagline: 'The Mountain That Everything Rests On',
    description: 'Taurus × Wu Earth (the mountain, massive and stable) is the most grounding combination in the system. Double Earth energy creates extraordinary stability, not passive, but load-bearing. You don\'t just hold ground; you are the ground others build on.',
    strengths: ['Exceptional organizational memory and institutional knowledge', 'Accumulates resources with discipline', 'Deeply trustworthy, commitments are treated as permanent', 'Sensory intelligence: knows what quality actually feels like'],
    challenges: ['Change resistance, adapts slowly even when necessary', 'Accumulation instinct can become hoarding', 'Gets overtaken in fast-moving environments'],
    idealWork: ['Operations management and institutional leadership', 'Banking, real estate, long-horizon investment', 'Culinary arts and hospitality at the highest level', 'Infrastructure development'],
    keyInsight: 'Wu Earth\'s stability is a gift to everyone around you. Your challenge is not finding your foundation, it\'s knowing when to move it.',
    dailyPractice: 'Weekly: one thing you\'re choosing to change this month. Wu Earth needs deliberate destabilization to prevent calcification.',
  },
  'virgo-ji-earth': {
    slug: 'virgo-ji-earth',
    sign: 'Virgo', element: 'Earth', elementEmoji: '⛰️', elementColor: 'var(--color-element-earth)',
    archetype: 'Harmonizer Guardian', archetypeSlug: 'harmonizer-guardian',
    tagline: 'The Craftsperson Who Holds the Standard',
    description: 'Virgo × Ji Earth (the fertile field, productive and nurturing) is the most quality-oriented Harmonizer Guardian. You don\'t just maintain stability, you improve it, refine it, and ensure it serves its purpose precisely.',
    strengths: ['Attention to detail that catches what every other system misses', 'Makes things work better, continuous improvement is the natural mode', 'Deeply caring about outcomes for others, not just processes', 'Turns abstract plans into executable systems'],
    challenges: ['Perfectionism becomes the ceiling, done is often better than perfect', 'Service orientation can crowd out self-advocacy', 'Criticism of self and others can become the dominant mode'],
    idealWork: ['Editorial direction and content strategy', 'Healthcare quality and patient care systems', 'Software QA, UX research, and product refinement', 'Executive operations and chief of staff roles'],
    keyInsight: 'Ji Earth\'s power is not in holding ground, it\'s in making ground productive. You turn raw material into something that lasts.',
    dailyPractice: 'Ship one imperfect thing per week. Ji Earth + Virgo can over-refine, deliberate release builds the muscle of completion over perfection.',
  },
  'scorpio-jia-wood': {
    slug: 'scorpio-jia-wood',
    sign: 'Scorpio', element: 'Wood', elementEmoji: '🌿', elementColor: 'var(--color-element-wood)',
    archetype: 'Steady Achiever', archetypeSlug: 'steady-achiever',
    tagline: 'The Deep Root That Cannot Be Pulled',
    description: 'Scorpio × Jia Wood (the great tree, tall and rooted) is the most tenacious combination in the system. Scorpio\'s intensity amplifies Jia Wood\'s upward growth drive into something almost unstoppable. You don\'t just grow, you grow through resistance.',
    strengths: ['Exceptional resilience, recovers from what ends most others', 'Depth of focus that produces mastery over time', 'Investigative intelligence, uncovers what is hidden', 'Vision with patience: sees the destination and accepts the long journey'],
    challenges: ['Difficulty releasing what no longer serves', 'Can hold grudges while claiming to have moved on', 'Hard to transplant willingly, major changes require exceptional circumstances'],
    idealWork: ['Research and investigation (journalism, science, intelligence)', 'Psychotherapy and depth psychology', 'Long-horizon entrepreneurship and value investing', 'Music and visual art that reward depth over time'],
    keyInsight: 'Jia Wood grows toward the light regardless of what\'s in the way. What you build over years is genuinely hard for anyone to take from you.',
    dailyPractice: 'Monthly: identify one thing you\'ve been holding onto that has stopped serving growth.',
  },
  'sagittarius-jia-wood': {
    slug: 'sagittarius-jia-wood',
    sign: 'Sagittarius', element: 'Wood', elementEmoji: '🌿', elementColor: 'var(--color-element-wood)',
    archetype: 'Steady Achiever', archetypeSlug: 'steady-achiever',
    tagline: 'The Explorer Who Actually Arrives',
    description: 'Sagittarius × Jia Wood is the most far-ranging Steady Achiever. Sagittarius\'s philosophical hunger meets Jia Wood\'s steady upward growth into a rare synthesis: someone who explores widely AND builds something enduring from what they find.',
    strengths: ['Synthesizes wisdom from radically different domains', 'Inspires through the story of the journey, not just the destination', 'Makes complex ideas accessible and shareable', 'Optimistic at depth, genuinely oriented toward possibility'],
    challenges: ['The next horizon always calling before the current one is fully built', 'Over-promises because the vision is clear but the timeline is not', 'Over-teaches before completing the current lesson'],
    idealWork: ['Publishing, media, and knowledge dissemination', 'Higher education and academic leadership', 'Coaching, mentorship, and human development', 'Cross-cultural and international work'],
    keyInsight: 'Jia Wood doesn\'t need to chase the light, it grows toward it. Sagittarius doesn\'t need to run, it expands. Aim at something worthy and grow toward it without urgency.',
    dailyPractice: 'One thing completed before any new thing started. Sagittarius begins easily; Jia Wood finishes slowly.',
  },
  'pisces-gui-water': {
    slug: 'pisces-gui-water',
    sign: 'Pisces', element: 'Water', elementEmoji: '🌊', elementColor: 'var(--color-element-water)',
    archetype: 'Nurturing Creative', archetypeSlug: 'nurturing-creative',
    tagline: 'The Visionary Who Feels the Future',
    description: 'Pisces × Gui Water is perhaps the most intuitive combination in the system. Pisces dissolves boundaries; Gui Water condenses and clarifies. Together, they produce someone who can inhabit multiple realities simultaneously, sensing patterns, possibilities, and emotional undercurrents that others cannot access.',
    strengths: ['Extraordinary empathy and emotional intelligence', 'Absorbs and synthesizes complexity into meaning', 'Creative vision that transcends conventional frameworks', 'Deeply connective, people feel seen and understood'],
    challenges: ['Boundary dissolution makes prioritisation genuinely difficult', 'Absorbs others\' emotional states, leading to depletion', 'Difficulty translating inner vision into externally executable plans'],
    idealWork: ['Therapeutic and healing professions', 'Arts and creative direction', 'Nonprofit and humanitarian work', 'Spiritual and contemplative practices'],
    keyInsight: 'Your depth is not a liability, it is the source of everything you build. But depth without structure becomes drift. Find the container (a system, a collaborator, a ritual) that lets your water flow with direction.',
    dailyPractice: 'Write one page of uncensored thought before any structured work. Let Water move before you try to contain it.',
  },
  'libra-yi-wood': {
    slug: 'libra-yi-wood',
    sign: 'Libra', element: 'Wood', elementEmoji: '🌿', elementColor: 'var(--color-element-wood)',
    archetype: 'Steady Achiever', archetypeSlug: 'steady-achiever',
    tagline: 'The Harmoniser Who Builds Beauty',
    description: 'Libra × Yi Wood is the most aesthetically attuned of the five archetypes. Libra\'s drive for harmony and balance combines with Yi Wood\'s flexible, relationship-oriented energy to create someone who builds through connection, beauty, and collaborative momentum.',
    strengths: ['Creates environments where others naturally thrive', 'Diplomatic bridge between opposing perspectives', 'Attuned to aesthetics, quality, and relational dynamics', 'Sustainable growth through partnership and mutual investment'],
    challenges: ['Decisions delayed by the need for consensus', 'Difficulty acting against others\' preferences even when necessary', 'Aesthetic perfectionism can slow delivery'],
    idealWork: ['Design, architecture, and creative direction', 'Mediation and organisational development', 'Brand strategy and communications', 'Educational curriculum design'],
    keyInsight: 'Libra seeks balance; Yi Wood seeks growth. The tension is productive, you build things that are both beautiful and alive. Lean into the discomfort of an imperfect decision. Growth requires it.',
    dailyPractice: 'Make one decision per day without seeking input. Libra grows by practicing independence; Yi Wood strengthens through solo commitment.',
  },
  'aries-ding-fire': {
    slug: 'aries-ding-fire',
    sign: 'Aries', element: 'Fire', elementEmoji: '🔥', elementColor: 'var(--color-element-fire)',
    archetype: 'Visionary Builder', archetypeSlug: 'visionary-builder',
    tagline: 'The Pioneer Who Ignites Action',
    description: 'Aries × Ding Fire is one of the most action-oriented combinations in the system. Aries\' drive to initiate meets Ding Fire\'s steady, focused warmth, producing someone who doesn\'t just start things, but sustains the flame long enough to see them through.',
    strengths: ['Fearless at initiation, enters where others hesitate', 'Warm and inspiring, draws people into the mission', 'High capacity for independent action and self-direction', 'Energised by challenge and competition'],
    challenges: ['Aries impulsiveness + Fire intensity can overwhelm collaborators', 'Loses interest at the maintenance phase of any project', 'Frustration when others don\'t match the pace'],
    idealWork: ['Entrepreneurship and early-stage startups', 'Athletics, coaching, and performance training', 'Sales and business development', 'Emergency response and crisis management'],
    keyInsight: 'Aries starts fires; Ding Fire tends them. You need both modes, the spark AND the careful sustained burn. Build a system that protects the flame after the ignition rush passes.',
    dailyPractice: 'Name one thing in progress before starting anything new. Aries loves to initiate; Ding Fire needs the current flame attended before adding another.',
  },
  'taurus-gui-water': {
    slug: 'taurus-gui-water',
    sign: 'Taurus', element: 'Water', elementEmoji: '🌊', elementColor: 'var(--color-element-water)',
    archetype: 'Nurturing Creative', archetypeSlug: 'nurturing-creative',
    tagline: 'The Deep Builder Who Lasts',
    description: 'Taurus × Gui Water is one of the most enduring combinations. Taurus\'s patience and sensory attunement combine with Gui Water\'s depth and perception to produce someone who builds with extraordinary care, slowly, intentionally, and with a quality that outlasts trends.',
    strengths: ['Exceptional patience and persistence through long-term projects', 'Attuned to quality, materiality, and aesthetic depth', 'Deep emotional intelligence without volatility', 'Builds trust through consistency over decades'],
    challenges: ['Resistance to change even when the current path is no longer working', 'Depth can slow decision-making past the optimal window', 'Tendency to over-invest in the familiar at the cost of the necessary'],
    idealWork: ['Artisan craftsmanship and high-end product design', 'Finance, real estate, and long-horizon investing', 'Food, hospitality, and sensory experience design', 'Psychological therapy and deep-listening professions'],
    keyInsight: 'Taurus builds to last; Gui Water builds to understand. You are at your best when the thing you are creating is worth the extraordinary care you bring to it.',
    dailyPractice: 'Identify the single most important thing to finish this week. Taurus finishes; Water ensures the finish has depth.',
  },
  'leo-wu-earth': {
    slug: 'leo-wu-earth',
    sign: 'Leo', element: 'Earth', elementEmoji: '🏔️', elementColor: 'var(--color-element-earth)',
    archetype: 'Harmonizer Guardian', archetypeSlug: 'harmonizer-guardian',
    tagline: 'The Generous Leader Who Holds It Together',
    description: 'Leo × Wu Earth is a rare combination of charisma and gravitas. Leo\'s warmth, creativity, and natural leadership meets Wu Earth\'s immovable solidity and capacity to hold space for others. The result is a leader people follow not just because they\'re magnetic, but because they feel genuinely safe.',
    strengths: ['Leads with both warmth and authority, rarely either alone', 'High capacity to hold the centre during group volatility', 'Creative and generous, brings out the best in others', 'Trusted implicitly by those who experience their consistency'],
    challenges: ['The need to be seen can conflict with the capacity to stay quiet and steady', 'Overextension, takes on others\' burdens as an extension of self', 'Difficulty receiving as gracefully as giving'],
    idealWork: ['Educational leadership and institutional development', 'Performing arts and creative direction', 'Community leadership and civic roles', 'Executive leadership in mission-driven organisations'],
    keyInsight: 'Leo needs to shine; Wu Earth needs to be the mountain. You are most powerful when you use the spotlight to illuminate others, not just yourself.',
    dailyPractice: 'Identify one person to acknowledge publicly today. Leo gives; Wu Earth grounds the recognition in something real.',
  },
  'scorpio-ren-water': {
    slug: 'scorpio-ren-water',
    sign: 'Scorpio', element: 'Water', elementEmoji: '🌊', elementColor: 'var(--color-element-water)',
    archetype: 'Nurturing Creative', archetypeSlug: 'nurturing-creative',
    tagline: 'The Transformer Who Sees Everything',
    description: 'Scorpio × Ren Water is the most penetrating combination in the system. Scorpio\'s intensity, depth, and transformative drive meets Ren Water\'s expansive, oceanic perceptual range. Nothing is hidden from this archetype, not in organisations, not in people, not in systems.',
    strengths: ['Sees beneath every surface, patterns, motives, hidden dynamics', 'Extraordinary focus and depth of investigation', 'Transformative capacity, moves through and past what others avoid', 'Trusted absolutely once trust is earned'],
    challenges: ['Intensity can be difficult for others to sustain close contact with', 'Difficulty with superficiality, can dismiss what requires lightness', 'Trust is slow to establish and shattered easily'],
    idealWork: ['Intelligence, security, and investigative roles', 'Depth psychology and therapeutic practice', 'Research and academic investigation', 'Crisis management and high-stakes negotiation'],
    keyInsight: 'Ren Water flows everywhere; Scorpio dives deep. You need both range AND depth in your work, projects that let you investigate fully and affect real transformation.',
    dailyPractice: 'Name one thing you are holding onto that no longer serves. Scorpio transforms; Ren Water flows on.',
  },
  'gemini-bing-fire': {
    slug: 'gemini-bing-fire',
    sign: 'Gemini', element: 'Fire', elementEmoji: '🔥', elementColor: 'var(--color-element-fire)',
    archetype: 'Visionary Builder', archetypeSlug: 'visionary-builder',
    tagline: 'The Networked Spark',
    description: 'Gemini × Bing Fire is the most communicatively electric combination in the system. Gemini\'s intellectual range, speed, and social agility meets Bing Fire\'s radiant warmth and visibility. Ideas don\'t just form here, they broadcast.',
    strengths: ['Rapid ideation and synthesis across domains', 'Exceptional communicator, translates complex ideas into clarity', 'Energises rooms and networks naturally', 'Thrives in ambiguity, adaptable, quick, resilient'],
    challenges: ['Depth sacrificed for breadth under time pressure', 'Commitments made in the excitement of an idea that fade', 'Many fires burning simultaneously; hard to identify which to tend first'],
    idealWork: ['Media, journalism, and content creation', 'Technology evangelism and developer relations', 'Public speaking and thought leadership', 'Cross-functional strategy and innovation roles'],
    keyInsight: 'Gemini covers ground; Bing Fire illuminates it. Your highest impact comes when you choose one thing to radiate fully rather than warming everything slightly.',
    dailyPractice: 'One focused output per morning before any communication. Gemini disperses; Bing Fire channels.',
  },
  'virgo-ren-water': {
    slug: 'virgo-ren-water',
    sign: 'Virgo', element: 'Water', elementEmoji: '🌊', elementColor: 'var(--color-element-water)',
    archetype: 'Nurturing Creative', archetypeSlug: 'nurturing-creative',
    tagline: 'The Systems Thinker Who Flows',
    description: 'Virgo × Ren Water is the most analytically precise Water archetype. Virgo\'s discernment and attention to process meets Ren Water\'s sweeping intelligence and strategic perception, producing someone who is both a systems architect and a deep synthesiser.',
    strengths: ['Combines precision with sweep, sees the details AND the whole', 'Exceptional analyst and process designer', 'High standards applied without rigidity', 'Builds trust through demonstrated competence and thoroughness'],
    challenges: ['Analysis can become perfectionism, good enough is hard to accept', 'Ren Water\'s scope + Virgo\'s precision can produce decision paralysis', 'Difficulty tolerating others\' lower standards for detail'],
    idealWork: ['Data science and analytical research', 'Process improvement and operations excellence', 'Technical writing and documentation', 'Scientific and academic inquiry'],
    keyInsight: 'Virgo refines; Ren Water flows. The synthesis is rare: you can hold an enormous amount of complexity AND attend to the details that make it work. Protect that capacity from fragmentation.',
    dailyPractice: 'Write three things that are good enough as they are. Virgo perfects; Water accepts.',
  },
  'capricorn-ji-earth': {
    slug: 'capricorn-ji-earth',
    sign: 'Capricorn', element: 'Earth', elementEmoji: '🏔️', elementColor: 'var(--color-element-earth)',
    archetype: 'Harmonizer Guardian', archetypeSlug: 'harmonizer-guardian',
    tagline: 'The Steadfast Architect of Systems',
    description: 'Capricorn × Ji Earth is one of the most quietly powerful combinations in the system. Capricorn provides relentless upward drive and structural discipline; Ji Earth (fertile, productive soil) provides the patient, nurturing capacity to make things grow. Where Geng Metal Capricorn cuts through, Ji Earth Capricorn builds from the ground up, carefully, comprehensively, and with a long-horizon vision that others mistake for slowness.',
    strengths: ['Builds institutions and systems that outlast their creator', 'Deeply reliable, commitments are treated as contracts', 'Excellent at turning abstract strategy into executable process', 'Holds groups together through consistency and care'],
    challenges: ['Overly cautious, can refine planning indefinitely before acting', 'Difficulty with delegation; holds too much operational weight personally', 'Emotional needs go unaddressed while serving the structure'],
    idealWork: ['Operations leadership and chief-of-staff roles', 'Government administration and policy implementation', 'Long-horizon project management and infrastructure', 'Family enterprise and generational business leadership'],
    keyInsight: 'Ji Earth doesn\'t push, it sustains. Capricorn doesn\'t rush, it builds. The combination produces a rare capacity to carry weight over time. Know when to put the load down and let others carry it.',
    dailyPractice: 'End each week by naming what you delegated, not just what you completed. Ji Earth + Capricorn must practice releasing as deliberately as it practices building.',
  },
  'aquarius-jia-wood': {
    slug: 'aquarius-jia-wood',
    sign: 'Aquarius', element: 'Wood', elementEmoji: '🌿', elementColor: 'var(--color-element-wood)',
    archetype: 'Steady Achiever', archetypeSlug: 'steady-achiever',
    tagline: 'The Visionary Grower',
    description: 'Aquarius × Jia Wood is the most principled of the Steady Achievers. Aquarius sees what the future should look like; Jia Wood (the great tree, patient and upward-growing) provides the structural spine to grow toward it without losing direction. This archetype combines progressive intellectual vision with steady, cumulative execution.',
    strengths: ['Builds systematically toward long-range social or technological goals', 'Principled without being rigid, adapts strategy while holding mission', 'Inspires through depth and consistency, not spectacle', 'Attracts collaborators who share values, not just goals'],
    challenges: ['Abstract vision can be hard to translate into near-term action', 'Aquarius detachment + Jia Wood patience can appear cold or inaccessible', 'Frustration with institutions that move slower than the vision'],
    idealWork: ['Social enterprise and policy innovation', 'Academic research and institutional reform', 'Technology for human development', 'Long-form writing and systems-level analysis'],
    keyInsight: 'Jia Wood grows toward the light steadily; Aquarius already sees what the light looks like. Together, you are one of the few combinations that can hold both vision AND long-range execution simultaneously.',
    dailyPractice: 'Name the single most important structural step this week. Aquarius thinks at scale; Jia Wood needs a root before a branch.',
  },
  'aries-yi-wood': {
    slug: 'aries-yi-wood',
    sign: 'Aries', element: 'Wood', elementEmoji: '🌿', elementColor: 'var(--color-element-wood)',
    archetype: 'Steady Achiever', archetypeSlug: 'steady-achiever',
    tagline: 'The Fast Starter Who Finishes',
    description: 'Aries × Yi Wood is a dynamic tension that produces real results. Aries brings initiation energy and fearless first-mover instinct; Yi Wood (the vine, flexible and persistent) provides the adaptive persistence that keeps growth going after the launch excitement fades. Most Aries archetypes start fast and disengage at the grind. Yi Wood catches them and keeps them growing.',
    strengths: ['Launches with speed and sustains with flexibility', 'Finds paths around obstacles without abandoning the goal', 'Energised by competition and also by patient accumulation', 'Versatile, performs across domains and adapts to new terrain'],
    challenges: ['Yi Wood\'s instinct to adapt can be hijacked by Aries impulsiveness', 'Starts new tracks before old ones are complete', 'Appears inconsistent but is actually building in multiple directions'],
    idealWork: ['Entrepreneurship across multiple ventures', 'Product development and iteration cycles', 'Fitness, sports, and performance coaching', 'Brand building and creative business development'],
    keyInsight: 'Aries launches; Yi Wood grows. You don\'t need to slow down, you need to choose which vines to keep tending and which to let go.',
    dailyPractice: 'Weekly pruning: choose one active track to pause. Yi Wood grows better with intentional pruning; Aries gains focus by elimination.',
  },
  'cancer-gui-water': {
    slug: 'cancer-gui-water',
    sign: 'Cancer', element: 'Water', elementEmoji: '🌊', elementColor: 'var(--color-element-water)',
    archetype: 'Nurturing Creative', archetypeSlug: 'nurturing-creative',
    tagline: 'The Deep Nurturer',
    description: 'Cancer × Gui Water is the most emotionally attuned combination in the system. Cancer\'s protective, caring instinct meets Gui Water\'s condensing depth and perceptive sensitivity, producing someone whose emotional intelligence is not just empathic, but genuinely diagnostic. You don\'t just feel what others feel; you understand the root of it.',
    strengths: ['Extraordinary emotional perception and therapeutic presence', 'Holds space for others without absorbing their distress', 'Deeply creative, emotional attunement generates original insight', 'Builds intimate trust quickly and permanently'],
    challenges: ['Emotional absorption leads to genuine depletion without recovery rituals', 'Protective instinct can become enmeshment', 'Difficulty distinguishing own feelings from others\''],
    idealWork: ['Therapeutic practice and counselling', 'Early childhood education and child development', 'Narrative arts, memoir, literary fiction, personal essay', 'Palliative and end-of-life care'],
    keyInsight: 'Gui Water condenses; Cancer nurtures. Your perceptive depth is a gift, but it requires containers. Without clear boundaries, you absorb everything and lose yourself.',
    dailyPractice: '10-minute solitary decompression after any intense interaction. Gui Water needs to settle; Cancer needs to come home to itself.',
  },
  'cancer-wu-earth': {
    slug: 'cancer-wu-earth',
    sign: 'Cancer', element: 'Earth', elementEmoji: '🏔️', elementColor: 'var(--color-element-earth)',
    archetype: 'Harmonizer Guardian', archetypeSlug: 'harmonizer-guardian',
    tagline: 'The Protective Anchor',
    description: 'Cancer × Wu Earth is the most protective combination in the system. Cancer\'s instinct to shelter and nurture meets Wu Earth\'s immovable, load-bearing stability. Where others worry, you organise. Where others feel exposed, you become the structure that holds everyone together, the mountain that absorbs the storm.',
    strengths: ['Instinctive crisis stabiliser, calm in proportion to the chaos around them', 'Builds environments where others feel genuinely safe', 'Deep institutional memory, knows what worked and why', 'Protective loyalty that creates lasting bonds'],
    challenges: ['Overprotection can limit others\' independence and growth', 'Needs to feel needed, struggles when the group no longer requires holding', 'Change is threatening; adapts slowly even when necessary'],
    idealWork: ['Family medicine and community healthcare', 'Social work and child welfare', 'Operations and facilities management', 'Hospice care and trauma-informed support'],
    keyInsight: 'Wu Earth holds ground; Cancer protects what\'s on it. You are a foundation, but foundations must be maintained as well as built. Tend to yourself with the same care you give others.',
    dailyPractice: 'Name one thing you are protecting that no longer needs protecting. Wu Earth holds; Cancer must also release.',
  },
  'leo-jia-wood': {
    slug: 'leo-jia-wood',
    sign: 'Leo', element: 'Wood', elementEmoji: '🌿', elementColor: 'var(--color-element-wood)',
    archetype: 'Steady Achiever', archetypeSlug: 'steady-achiever',
    tagline: 'The Growing Light',
    description: 'Leo × Jia Wood is a compelling combination of visibility and patient ambition. Leo needs to shine and be seen; Jia Wood (the great tree) grows steadily upward over years. Together, they produce someone who accumulates influence and stature over time, not through one brilliant moment, but through the consistent quality of their presence and output.',
    strengths: ['Builds a lasting body of work that earns sustained recognition', 'Generous mentor, cultivates others\' growth as a natural leadership expression', 'Combines charisma with substance; presence backed by real competence', 'Long-horizon creative ambition'],
    challenges: ['Leo\'s need for immediate recognition conflicts with Jia Wood\'s slower growth', 'Difficulty in supporting roles where others get the spotlight', 'Can over-commit to projects that offer visibility at the cost of depth'],
    idealWork: ['Creative leadership and arts administration', 'Executive coaching and talent development', 'Broadcast and performing arts', 'Institutional leadership with public presence'],
    keyInsight: 'Leo shines now; Jia Wood shines for decades. Your greatest asset is not what you create in a single moment but the cumulative presence you build over a career.',
    dailyPractice: 'Invest 30 minutes daily in a long-range project with no immediate visibility. Jia Wood grows quietly; Leo\'s patience with that process is the discipline.',
  },
  'virgo-geng-metal': {
    slug: 'virgo-geng-metal',
    sign: 'Virgo', element: 'Metal', elementEmoji: '⚙️', elementColor: 'var(--color-text-muted)',
    archetype: 'Strategic Commander', archetypeSlug: 'strategic-commander',
    tagline: 'The Precision Operator',
    description: 'Virgo × Geng Metal is the most exacting Strategic Commander. Virgo\'s analytical precision and quality obsession meets Geng Metal\'s decisive, systems-oriented force, producing someone who not only sees what is wrong but acts to correct it with surgical speed. This is the archetype of the elite operator: the person who builds the machine AND keeps it running.',
    strengths: ['Identifies the single flaw that invalidates the whole system', 'Exceptional standard-setting and quality governance', 'Makes decisions quickly when data is available; doesn\'t require consensus', 'Combines analytical rigor with executive authority'],
    challenges: ['Perfectionism creates throughput bottlenecks', 'Difficulty with "good enough", the refusal can damage team momentum', 'Communication style can feel clinical or critical when warmth is needed'],
    idealWork: ['Quality assurance and standards leadership', 'Surgical and precision medicine', 'Engineering management and technical leadership', 'Intelligence analysis and risk management'],
    keyInsight: 'Geng Metal cuts cleanly; Virgo defines what clean means. Together, you hold the highest standard in the room. The risk is applying that standard equally to everything, learn to calibrate which things deserve full precision and which deserve speed.',
    dailyPractice: 'Mark two tasks per day as "precision-grade" and complete the rest at 80%. Virgo + Geng Metal must practice selective application of full force.',
  },
  'libra-gui-water': {
    slug: 'libra-gui-water',
    sign: 'Libra', element: 'Water', elementEmoji: '🌊', elementColor: 'var(--color-element-water)',
    archetype: 'Nurturing Creative', archetypeSlug: 'nurturing-creative',
    tagline: 'The Empathic Diplomat',
    description: 'Libra × Gui Water is the most relationally attuned combination in the system. Libra\'s drive for harmony, balance, and aesthetic beauty meets Gui Water\'s condensing depth and quiet perceptiveness. You don\'t just create harmony, you sense where disharmony lives before it surfaces, and you work at that level.',
    strengths: ['Reads relational dynamics before they become problems', 'Diplomatic bridge-builder with genuine emotional intelligence', 'Aesthetically gifted, creates environments of real beauty and care', 'Deep listener; makes others feel fully understood'],
    challenges: ['Gui Water\'s gentle nature reinforces Libra\'s difficulty with conflict', 'Over-prioritises others\' comfort at the expense of own needs', 'Decisions stall when consensus is unavailable'],
    idealWork: ['Mediation, family law, and restorative justice', 'Interior design and spatial experience', 'Organisational development and culture consulting', 'Therapeutic counselling and group facilitation'],
    keyInsight: 'Gui Water flows to balance naturally; Libra seeks it consciously. You were built to find the middle way. Trust that instinct, but remember that true balance sometimes requires visible disagreement.',
    dailyPractice: 'State one direct preference each day without softening it. Libra + Gui Water grows through practicing clarity over consensus.',
  },
  'scorpio-gui-water': {
    slug: 'scorpio-gui-water',
    sign: 'Scorpio', element: 'Water', elementEmoji: '🌊', elementColor: 'var(--color-element-water)',
    archetype: 'Nurturing Creative', archetypeSlug: 'nurturing-creative',
    tagline: 'The Quiet Transformer',
    description: 'Scorpio × Gui Water is the most inwardly powerful combination in the system. Scorpio\'s depth, intensity, and transformative capacity meets Gui Water\'s condensing sensitivity and quiet perception. Where Scorpio × Ren Water is oceanic in range, Scorpio × Gui Water is concentrated, like rain that finds the cracks in stone and reshapes from within.',
    strengths: ['Penetrating emotional and psychological insight', 'Transforms quietly, creates change without announcing it', 'Deep trustworthiness earned through demonstrated discretion', 'Perceptive to hidden truth in systems and people alike'],
    challenges: ['Intensity + sensitivity can produce chronic overwhelm', 'Gui Water internalises what should be expressed', 'Hard for others to read, appears still while processing enormously'],
    idealWork: ['Psychotherapy and depth psychology', 'Investigative research and forensic analysis', 'Strategic advisory and confidential consulting', 'Poetry, literary fiction, and contemplative writing'],
    keyInsight: 'Scorpio transforms; Gui Water penetrates. The combination is one of the most powerful in the system for work that happens below the surface. Your influence is real, learn to trust it even when it\'s invisible.',
    dailyPractice: 'Express one internal perception outward each day, in writing, conversation, or creation. Gui Water condenses; Scorpio must let it rain.',
  },
  'sagittarius-bing-fire': {
    slug: 'sagittarius-bing-fire',
    sign: 'Sagittarius', element: 'Fire', elementEmoji: '🔥', elementColor: 'var(--color-element-fire)',
    archetype: 'Visionary Builder', archetypeSlug: 'visionary-builder',
    tagline: 'The Expansive Illuminator',
    description: 'Sagittarius × Bing Fire is one of the most inspiring combinations in the system. Sagittarius\'s philosophical scope and love of truth meets Bing Fire\'s radiant, sun-like warmth and broadcast energy. You don\'t just see the horizon, you light it up for everyone around you, making the future feel not just possible but inevitable.',
    strengths: ['Inspires at scale, vision lands emotionally, not just intellectually', 'Makes complex ideas feel alive and accessible', 'Generates genuine optimism that others find contagious', 'Cross-domain synthesis at its most communicatively compelling'],
    challenges: ['The next vision arrives before the current one is complete', 'Bing Fire\'s broad warmth + Sagittarius\'s range = deep connections that get spread thin', 'Overcommits to possibility; underestimates implementation friction'],
    idealWork: ['Public speaking, keynotes, and thought leadership', 'Publishing, broadcasting, and media', 'Teaching at scale, online education, masterclasses', 'Missionary entrepreneurship and purpose-driven leadership'],
    keyInsight: 'Bing Fire illuminates everything in range; Sagittarius wants everything in range. The gift is real, but your highest impact comes from choosing the one horizon you\'re most committed to lighting and going all in.',
    dailyPractice: 'Write one paragraph each morning that captures your current core conviction. Sagittarius expands; Bing Fire needs a focal point to be truly bright.',
  },
  'gemini-geng-metal': {
    slug: 'gemini-geng-metal',
    sign: 'Gemini', element: 'Metal', elementEmoji: '⚙️', elementColor: 'var(--color-text-muted)',
    archetype: 'Strategic Commander', archetypeSlug: 'strategic-commander',
    tagline: 'The Sharp-Minded Connector',
    description: "Gemini × Geng Metal is one of the most intellectually precise combinations in the system. Gemini's restless curiosity and multi-channel communication meets Geng Metal's decisive, cutting clarity, producing someone who not only gathers information from everywhere but synthesises it into sharp, actionable conclusions faster than anyone else in the room.",
    strengths: ['Rapid synthesis across disparate domains into clear decisions', 'Communication with precision, says exactly what is needed, nothing more', 'Moves quickly through complex problem spaces without getting lost', 'Exceptional negotiator, combines adaptability with firmness'],
    challenges: ["Gemini's breadth can dilute Geng Metal's focus, too many sharp edges at once", 'Impatience with slower thinkers or iterative processes', 'Can appear dismissive when shifting positions rapidly'],
    idealWork: ['Strategic communications and media', 'Policy analysis and rapid advisory', 'Business intelligence and competitive strategy', 'Legal practice and argumentation'],
    keyInsight: 'Geng Metal cuts with precision; Gemini covers the terrain. The combination is formidable when you choose a single question to be precise about. Breadth without focus blunts the edge.',
    dailyPractice: 'Identify the single sharpest question facing you today. Gemini generates options; Geng Metal needs one thing to cut through.',
  },
  'taurus-jia-wood': {
    slug: 'taurus-jia-wood',
    sign: 'Taurus', element: 'Wood', elementEmoji: '🌿', elementColor: 'var(--color-element-wood)',
    archetype: 'Steady Achiever', archetypeSlug: 'steady-achiever',
    tagline: 'The Patient Builder',
    description: "Taurus × Jia Wood is the most grounded Steady Achiever. Taurus's sensory attunement, patience, and accumulative instinct meets Jia Wood's steady upward growth drive, producing someone who builds slowly, deliberately, and with extraordinary staying power. You are not the fastest, but what you build is real and it lasts.",
    strengths: ['Exceptional endurance, sustains effort through multi-year horizons', 'Quality-oriented: does not cut corners even when shortcuts appear', 'Builds trust through absolute consistency over time', 'Sensory acuity shapes output, makes things that feel as good as they perform'],
    challenges: ['Slow to start and slow to adapt, valuable in stable environments, costly in fast-moving ones', 'Difficulty pivoting once momentum is established', 'Accumulation instinct can turn into hoarding of resources and decisions'],
    idealWork: ['Artisan craftsmanship and maker businesses', 'Architecture, landscape, and long-range design', 'Sustainable agriculture and land stewardship', 'Value investing and patient capital allocation'],
    keyInsight: "Jia Wood grows toward the light over decades. Taurus builds to last. The combination is rare, someone who has both the vision and the patience for things that actually endure. Don't let urgency culture steal that from you.",
    dailyPractice: 'Name one project you are building for the next five years, not the next five weeks. Taurus + Jia Wood needs a long-range anchor to stay oriented.',
  },
  'sagittarius-gui-water': {
    slug: 'sagittarius-gui-water',
    sign: 'Sagittarius', element: 'Water', elementEmoji: '🌊', elementColor: 'var(--color-element-water)',
    archetype: 'Nurturing Creative', archetypeSlug: 'nurturing-creative',
    tagline: 'The Wandering Depth-Finder',
    description: "Sagittarius × Gui Water is the most philosophically attuned Nurturing Creative. Sagittarius seeks truth across vast terrain; Gui Water condenses, feels, and perceives with exquisite sensitivity. The result is someone who travels widely, in ideas, experience, and sometimes place, and returns transformed, carrying insight others cannot access any other way.",
    strengths: ['Synthesises wisdom from lived experience and cross-cultural depth', 'Emotionally intelligent beneath the philosophical distance', 'Generates frameworks others find transformative and lasting', 'Asks the questions that open whole new inquiry spaces'],
    challenges: ["Sagittarius's expansiveness + Gui Water's depth = someone always absorbing more than they can integrate", 'Difficulty committing to one place, framework, or relationship', 'Articulates insight but retreats before the hard implementation work'],
    idealWork: ['Philosophical writing and academic publishing', 'Cross-cultural education and international relations', 'Depth coaching and transformational facilitation', 'Documentary, travel writing, and immersive journalism'],
    keyInsight: 'Gui Water condenses truth from everything it touches. Sagittarius needs a destination to give that truth direction. Find your question and stay with it long enough to write the answer.',
    dailyPractice: 'Write one page per day about what you observed and what it means. Sagittarius needs an output channel; Gui Water needs to distil.',
  },
  'pisces-jia-wood': {
    slug: 'pisces-jia-wood',
    sign: 'Pisces', element: 'Wood', elementEmoji: '🌿', elementColor: 'var(--color-element-wood)',
    archetype: 'Steady Achiever', archetypeSlug: 'steady-achiever',
    tagline: 'The Dreamer Who Grows',
    description: "Pisces × Jia Wood is the most creative Steady Achiever. Pisces dissolves into imagination, feeling, and boundless possibility; Jia Wood (the great tree) provides the structural spine that turns those visions into something real. Without Jia Wood, Pisces drifts. Without Pisces, Jia Wood can lack soul. Together, they produce a creative builder whose work has both roots and wings.",
    strengths: ['Translates vision into work with depth and sustained effort', 'High creative endurance, returns to the work again and again', 'Emotionally resonant output that also demonstrates real craftsmanship', 'Builds toward something genuinely meaningful over the long arc'],
    challenges: ["Pisces' boundlessness makes priorities genuinely hard to set", 'Jia Wood grows through pressure, but too much dissolves into Pisces avoidance', 'May spend years in exploration before the main work crystallises'],
    idealWork: ['Filmmaking, screenwriting, and narrative arts', 'Music composition and long-form performance', 'Spiritual practice and contemplative community building', 'Therapeutic arts and expressive healing work'],
    keyInsight: "Jia Wood gives Pisces a trunk. Pisces gives Jia Wood a sky to grow toward. Honor both: structure your creative practice without strangling it.",
    dailyPractice: 'One hour of protected creative work before any other input. Pisces loses the thread; Jia Wood anchors it.',
  },
  'pisces-bing-fire': {
    slug: 'pisces-bing-fire',
    sign: 'Pisces', element: 'Fire', elementEmoji: '🔥', elementColor: 'var(--color-element-fire)',
    archetype: 'Visionary Builder', archetypeSlug: 'visionary-builder',
    tagline: 'The Radiant Mystic',
    description: "Pisces × Bing Fire is the most spiritually luminous combination in the system. Pisces accesses what cannot be named; Bing Fire broadcasts at full warmth and visibility. Together, they produce someone whose creative and spiritual vision is not just felt but transmitted, lighting up rooms, changing minds, moving people in ways that resist rational explanation.",
    strengths: ['Inspires through presence, not argument, people feel the vision before they understand it', 'Creative output at its most transcendent and resonant', 'Warmth that is genuinely spiritual, not performative', 'Sees what is possible in others before they see it themselves'],
    challenges: ['Without structure, vision dissolves into beautiful fragments', "Bing Fire's need for visibility conflicts with Pisces' need for dissolution", 'Burnout arrives suddenly, Pisces absorbs the impact of others; Fire depletes through output'],
    idealWork: ['Performance art and live experience design', 'Spiritual leadership and contemplative community', 'Healing arts at the intersection of creativity and care', 'Photography, visual poetry, and immersive installation art'],
    keyInsight: 'Bing Fire illuminates; Pisces transcends. The combination creates experiences that move people spiritually. The work is learning to show up consistently, even for what feels like it should be spontaneous.',
    dailyPractice: 'Establish one non-negotiable daily ritual that belongs entirely to you. Bing Fire needs fuel; Pisces needs a container. Build both.',
  },
  'libra-geng-metal': {
    slug: 'libra-geng-metal',
    sign: 'Libra', element: 'Metal', elementEmoji: '⚙️', elementColor: 'var(--color-text-muted)',
    archetype: 'Strategic Commander', archetypeSlug: 'strategic-commander',
    tagline: 'The Decisive Diplomat',
    description: "Libra × Geng Metal is one of the most paradoxically effective combinations: Libra's drive for balance and consensus meets Geng Metal's sharp decisive force. Most Libras delay decisions in search of perfect harmony. Geng Metal cuts through that hesitation and turns Libra's careful analysis into clean, defensible choices.",
    strengths: ['Weighs all perspectives and then acts, rare combination of fairness and decisiveness', 'Excellent at structured negotiation and formal conflict resolution', 'Strategic precision in aesthetic and organisational domains', 'Earns trust through both fairness and follow-through'],
    challenges: ["Geng Metal's decisiveness creates internal dissonance with Libra's desire for more deliberation", 'Can appear cold when decisions override others\' preferences', 'Aesthetic perfectionism + Metal precision slows execution'],
    idealWork: ['Corporate law, arbitration, and formal negotiation', 'Policy development and regulatory leadership', 'Brand management and creative direction at scale', 'Executive leadership in institutions requiring both vision and discipline'],
    keyInsight: "Libra weighs; Geng Metal decides. The synthesis is rare, someone who has both the fairness to see all sides and the decisiveness to act on the best answer. Trust the cut.",
    dailyPractice: 'Make one significant decision per day using a time limit. Libra deliberates indefinitely; Geng Metal performs best under constraint.',
  },
  'capricorn-bing-fire': {
    slug: 'capricorn-bing-fire',
    sign: 'Capricorn', element: 'Fire', elementEmoji: '🔥', elementColor: 'var(--color-element-fire)',
    archetype: 'Visionary Builder', archetypeSlug: 'visionary-builder',
    tagline: 'The Ambitious Illuminator',
    description: "Capricorn × Bing Fire is one of the rarest combinations in the system, Capricorn's mountainous ambition and long-range discipline meets Bing Fire's radiant warmth and magnetic visibility. Where Capricorn alone can appear cold and instrumental, Bing Fire adds a genuine warmth and inspirational quality that makes this archetype both impressive and approachable.",
    strengths: ['Combines long-range strategic vision with inspiring, visible leadership', 'Radiates credibility and warmth simultaneously, extremely rare', 'Builds institutions and legacies that carry real human warmth', 'High-visibility leader whose achievements feel accessible, not distant'],
    challenges: ["Capricorn's drive + Bing Fire's radiance = risk of burning out in visible leadership", 'Difficulty accepting that rest is part of the system', "The combination's ambition can lead to overextension in public commitments"],
    idealWork: ['Visionary founding and institutional leadership', 'Public service and political leadership', 'Executive roles with both operational depth and external presence', 'Architecture, design, or creative direction at the highest institutional level'],
    keyInsight: "Bing Fire radiates warmth; Capricorn builds structure. The combination produces rare leaders whose ambitions feel genuinely human. Protect the warmth, Capricorn's discipline can slowly extinguish it.",
    dailyPractice: 'Name one person you inspired this week (not managed, not directed, inspired). Capricorn measures output; Bing Fire needs to see its warmth land.',
  },
  'aquarius-wu-earth': {
    slug: 'aquarius-wu-earth',
    sign: 'Aquarius', element: 'Earth', elementEmoji: '🏔️', elementColor: 'var(--color-element-earth)',
    archetype: 'Harmonizer Guardian', archetypeSlug: 'harmonizer-guardian',
    tagline: 'The Grounded Revolutionary',
    description: "Aquarius × Wu Earth is one of the most stable change-agents in the system. Aquarius sees what needs to fundamentally change; Wu Earth provides the immovable groundedness to carry that change through without being swept away by opposition or volatility. You are the rare reformer who survives long enough to see the reform succeed.",
    strengths: ['Combines progressive vision with extraordinary institutional staying power', 'Unshakeable under pressure, the mountain holds even as Aquarius challenges the landscape', 'Earns deep credibility over time through consistency and integrity', 'Grounds collective ideals in practical, survivable form'],
    challenges: ['Change happens slower than Aquarius demands, Wu Earth holds back as much as it holds firm', 'Can appear stubborn when holding principle in the face of pragmatic pressure', 'Difficulty with the ambiguity of transitional phases between old and new structures'],
    idealWork: ['Institutional reform and long-range systems change', 'Nonprofit leadership and social movement infrastructure', 'Policy research and governmental transformation', 'Community anchor institutions, libraries, universities, cultural orgs'],
    keyInsight: "Aquarius sees the new world; Wu Earth builds the bridge that doesn't collapse under the weight of getting there. Your most important contribution is staying.",
    dailyPractice: 'Weekly: assess what you are still standing for. Aquarius drifts toward new ideas; Wu Earth must choose what it will not move on.',
  },
  'aries-gui-water': {
    slug: 'aries-gui-water',
    sign: 'Aries', element: 'Water', elementEmoji: '🌊', elementColor: 'var(--color-element-water)',
    archetype: 'Nurturing Creative', archetypeSlug: 'nurturing-creative',
    tagline: 'The Fast-Moving Empath',
    description: "Aries × Gui Water is one of the most surprising combinations, Aries acts first; Gui Water feels first. Together, they produce someone who initiates boldly AND absorbs deeply, oscillating between fearless action and profound sensitivity. The challenge is that these modes can feel mutually exclusive. The gift is that they are not.",
    strengths: ['Moves into situations others hesitate to enter AND immediately reads the human dynamics within them', 'High empathy that does not slow action, perceives and responds simultaneously', 'Creative force: combines initiation energy with emotional depth', 'Quickly earns trust from both bold and sensitive personalities'],
    challenges: ["Gui Water's permeability means Aries absorbs the impact of its own fast actions on others, can be genuinely destabilising", 'Internal conflict between the drive to act and the awareness of consequence', 'Emotional recovery after rapid-action cycles requires deliberate downtime that Aries rarely takes'],
    idealWork: ['Emergency therapeutic support and crisis counselling', 'Rapid-response humanitarian work', 'Sports psychology and performance coaching', 'Creative direction with tight deadlines and high emotional stakes'],
    keyInsight: "Aries launches; Gui Water feels the landing. You experience both the thrill of initiation and the weight of impact. That's not a flaw, it's a complete moral compass. Honor both.",
    dailyPractice: 'Brief check-in after each major action: what did that cost you emotionally? Gui Water needs accounting; Aries needs to complete the cycle.',
  },
  'cancer-jia-wood': {
    slug: 'cancer-jia-wood',
    sign: 'Cancer', element: 'Wood', elementEmoji: '🌿', elementColor: 'var(--color-element-wood)',
    archetype: 'Steady Achiever', archetypeSlug: 'steady-achiever',
    tagline: 'The Nurturing Builder',
    description: "Cancer × Jia Wood is the most caring Steady Achiever. Cancer's protective, emotionally attuned nature meets Jia Wood's upward growth ambition, producing someone who builds not for personal glory but for those they love and serve. The work is always in service of something larger than the self: family, community, legacy.",
    strengths: ['Builds with genuine care for the people who will benefit', 'Extraordinary persistence when motivated by love or duty', 'Creates environments where others grow, the manager who makes careers, not just projects', 'Long-horizon loyalty that produces exceptional depth of relationship'],
    challenges: ['Over-identification with the project as an expression of care, criticism feels personal', 'Difficulty releasing work that is done to make room for what is next', 'Growth drive can feel selfish to Cancer\'s protective instinct, needs permission to want'],
    idealWork: ['Family practice medicine and paediatric care', 'Educational leadership and school administration', 'Social enterprise focused on community wellbeing', 'Landscape architecture and place-making'],
    keyInsight: "Jia Wood grows upward; Cancer grows inward and protective. The tension is generative when you find the work that lets both happen simultaneously, something that grows AND that protects what matters.",
    dailyPractice: 'Name what you are building and who it is for. Cancer needs purpose; Jia Wood needs direction. Connecting the two unlocks both.',
  },
  'taurus-geng-metal': {
    slug: 'taurus-geng-metal',
    sign: 'Taurus', element: 'Metal', elementEmoji: '⚙️', elementColor: 'var(--color-text-muted)',
    archetype: 'Strategic Commander', archetypeSlug: 'strategic-commander',
    tagline: 'The Unyielding Architect',
    description: "Taurus × Geng Metal is the most stubbornly excellent combination in the system. Taurus's slow, patient accumulation and sensory standard-setting meets Geng Metal's decisive, cutting precision. The result is a Strategic Commander who takes their time, but when they act, the execution is clean, complete, and built to outlast everything around it.",
    strengths: ['Combines patience with decisive precision, waits for the right moment, then cuts cleanly', 'Material intelligence: knows what quality looks, feels, and performs like', 'Refuses to compromise on standards even under sustained pressure', 'Accumulates competitive advantage quietly over long time horizons'],
    challenges: ['Patience + precision = rare but costly slowness in fast-moving environments', 'Difficulty pivoting once committed, the system is built to hold, not flex', 'Can appear immovable; collaborators experience this as resistance even when it is conviction'],
    idealWork: ['High-end manufacturing and artisan product leadership', 'Engineering management with long delivery cycles', 'Precision finance and institutional investment', 'Infrastructure development and large-scale construction leadership'],
    keyInsight: "Taurus accumulates; Geng Metal executes. The combination is formidable in environments where patience and precision are both rewarded. Choose your battles with care, this archetype wins wars, not skirmishes.",
    dailyPractice: 'One deliberate decision per day, made with full information and no regret. Taurus deliberates; Geng Metal commits. Practice the second step.',
  },
  'gemini-ji-earth': {
    slug: 'gemini-ji-earth',
    sign: 'Gemini', element: 'Earth', elementEmoji: '🏔️', elementColor: 'var(--color-element-earth)',
    archetype: 'Harmonizer Guardian', archetypeSlug: 'harmonizer-guardian',
    tagline: 'The Versatile Steward',
    description: "Gemini × Ji Earth is one of the most surprising Harmonizer Guardians. Gemini's curious, multi-channel range meets Ji Earth's (fertile soil) careful, productive nurturing energy, producing someone who sustains and supports from a position of remarkable intellectual breadth. You don't just hold the space; you enrich it with ideas, connections, and adaptable care.",
    strengths: ['Holds groups together while keeping them intellectually stimulated', 'Extraordinary range of knowledge applied in service of others', 'Adaptive sustainer, adjusts support style to what each person needs', 'Communicates complex care in accessible, often witty ways'],
    challenges: ["Gemini's range can diffuse Ji Earth's need for depth and continuity of care", 'Appears more casual than committed, others underestimate the depth of dedication', 'May spread support across too many people, thinning the impact of each'],
    idealWork: ['Educational administration and curriculum leadership', 'Community management and knowledge community building', 'Healthcare coordination and patient navigation', 'Editorial direction and multi-format publishing'],
    keyInsight: "Ji Earth makes things grow; Gemini makes sure everyone knows why. Your greatest gift is sustaining environments where diverse thinkers feel genuinely held. That is rarer than almost any other leadership capacity.",
    dailyPractice: 'Name one person you supported this week without recognition. Ji Earth gives quietly; Gemini needs to acknowledge what it tends so it does not neglect it.',
  },
  'leo-gui-water': {
    slug: 'leo-gui-water',
    sign: 'Leo', element: 'Water', elementEmoji: '🌊', elementColor: 'var(--color-element-water)',
    archetype: 'Nurturing Creative', archetypeSlug: 'nurturing-creative',
    tagline: 'The Warm Depth-Finder',
    description: "Leo × Gui Water is one of the most emotionally complex combinations in the system. Leo radiates outward with warmth, creativity, and visible leadership; Gui Water perceives inward with exquisite sensitivity and depth. The tension between these forces, visibility and depth, expression and perception, is the source of both the greatest challenge and the greatest creative gift.",
    strengths: ['Combines magnetic presence with genuine emotional depth, felt as well as seen', 'Creative output has both warmth and substance; resonates beyond the surface', 'Reads the emotional landscape of a room while holding the center of it', 'Builds deep loyalty through the combination of visibility and genuine care'],
    challenges: ["Leo's need to shine conflicts with Gui Water's need for quiet inner space", 'Gui Water absorbs the emotional weight of being seen, draining in ways that are invisible', 'Alternates between over-giving and protective withdrawal'],
    idealWork: ['Performing arts with psychological depth (theatre, film, narrative)', 'Brand leadership with genuine values at the center', 'Coaching and therapeutic work with high-profile clients', 'Cultural institution leadership'],
    keyInsight: "Leo illuminates the stage; Gui Water illuminates what is underneath it. Your deepest work combines both, visible enough to reach people, honest enough to change them.",
    dailyPractice: 'One act of private creation per day, something that is not for an audience. Leo needs expression; Gui Water needs it to have no witness sometimes.',
  },
  'virgo-yi-wood': {
    slug: 'virgo-yi-wood',
    sign: 'Virgo', element: 'Wood', elementEmoji: '🌿', elementColor: 'var(--color-element-wood)',
    archetype: 'Steady Achiever', archetypeSlug: 'steady-achiever',
    tagline: 'The Refined Growth Architect',
    description: "Virgo × Yi Wood is the most carefully constructed Steady Achiever. Virgo's discernment and quality obsession meets Yi Wood's (the vine) flexible, adaptive persistence, producing someone who improves continuously while maintaining forward momentum. You don't just grow; you grow correctly, pruning what isn't working and strengthening what is.",
    strengths: ['Continuous improvement as a natural operating mode, always getting better', 'Highly adaptable while maintaining quality standards others cannot sustain', 'Excellent at building processes that scale without losing craft', 'Earns trust through demonstrated, compounding competence'],
    challenges: ['Perfectionism expressed through Yi Wood can produce endless tweaking at the cost of shipping', 'Difficulty accepting good-enough even when good-enough serves the situation', 'Over-responsible, absorbs quality failures as personal failures'],
    idealWork: ['Content strategy and editorial operations', 'Product design and iterative development', 'Organisational learning and performance improvement', 'Botanical, environmental, and ecological design'],
    keyInsight: "Yi Wood finds the path around the obstacle; Virgo ensures the path meets standard. Together, you build systems that improve by surviving. Trust the vine, it grows better when not over-engineered.",
    dailyPractice: 'Ship one thing before noon, however imperfect. Virgo refines; Yi Wood grows by doing. The momentum matters more than the finish.',
  },
  'libra-ding-fire': {
    slug: 'libra-ding-fire',
    sign: 'Libra', element: 'Fire', elementEmoji: '🔥', elementColor: 'var(--color-element-fire)',
    archetype: 'Visionary Builder', archetypeSlug: 'visionary-builder',
    tagline: 'The Harmonious Inspirer',
    description: "Libra × Ding Fire (the candle flame, intimate and warm) is the most aesthetically and interpersonally beautiful Visionary Builder. Libra's drive for harmony and balance meets Ding Fire's steady, close-range warmth, producing a leader who inspires not through spectacle, but through the quality of presence and the elegance of their vision.",
    strengths: ['Creates environments of beauty and warmth that attract exceptional people', 'Diplomatically visionary, brings opposing parties into shared aspiration', 'Ding Fire warms at close range: deeply connecting to individuals within the vision', 'Aesthetic intelligence transforms functional goals into inspiring ones'],
    challenges: ['Vision gets clouded by the need for consensus, difficulty holding unpopular directions', 'Ding Fire burns quietly and can deplete without detection', 'Avoids the necessary disruption that real vision sometimes requires'],
    idealWork: ['Design leadership and creative direction', 'Arts organisation and cultural programming', 'Brand building for beauty, wellness, and lifestyle categories', 'Facilitation and retreat design'],
    keyInsight: "Ding Fire illuminates close. Libra makes what's close beautiful. Your vision works best in intimate settings, a room, a team, a community, where the warmth and beauty of what you're building can be truly felt.",
    dailyPractice: 'Create one beautiful thing today, even if small. Libra and Ding Fire both need aesthetic output as fuel, not just as product.',
  },
  'scorpio-ding-fire': {
    slug: 'scorpio-ding-fire',
    sign: 'Scorpio', element: 'Fire', elementEmoji: '🔥', elementColor: 'var(--color-element-fire)',
    archetype: 'Visionary Builder', archetypeSlug: 'visionary-builder',
    tagline: 'The Intense Transformer',
    description: "Scorpio × Ding Fire is one of the most psychologically powerful Visionary Builders. Scorpio's transformative depth, intensity, and penetrating perception meets Ding Fire's sustained, focused warmth, producing someone whose vision is not just inspiring but genuinely alchemical. Things change in your presence in ways that cannot always be explained.",
    strengths: ['Vision with psychological depth, addresses what others are afraid to name', 'Intensely loyal once committed; builds followings of deep conviction, not just enthusiasm', 'Ding Fire sustains the vision through long dark periods; does not burn out suddenly', 'Transforms resistance into fuel, adversity strengthens rather than deflects'],
    challenges: ['Intensity creates a field that not everyone can sustain close contact with', 'Difficulty separating the vision from the self, criticism of the work feels existential', 'Ding Fire + Scorpio can produce obsessiveness that crowds out rest and recovery'],
    idealWork: ['Social transformation leadership and activism', 'Psychotherapy and depth-oriented coaching', 'Documentary filmmaking and investigative storytelling', 'Artistic practice at the boundary of beauty and darkness'],
    keyInsight: "Scorpio transforms; Ding Fire illuminates what was dark. Your work reaches places that safer visions cannot. Protect the flame, it is the thing that makes the depth bearable for those who follow you.",
    dailyPractice: 'One hour of complete disengagement from the vision each evening. Scorpio + Ding Fire must protect the threshold between consuming work and consuming self.',
  },
  'sagittarius-yi-wood': {
    slug: 'sagittarius-yi-wood',
    sign: 'Sagittarius', element: 'Wood', elementEmoji: '🌿', elementColor: 'var(--color-element-wood)',
    archetype: 'Steady Achiever', archetypeSlug: 'steady-achiever',
    tagline: 'The Philosophical Explorer Who Lands',
    description: "Sagittarius × Yi Wood is the most wide-ranging Steady Achiever. Sagittarius ranges across philosophical horizons; Yi Wood (the vine) adapts and grows wherever it finds purchase. Together, they produce someone who travels intellectually and experientially far from where they started, and builds something meaningful at each stopping point along the way.",
    strengths: ['Accumulates wisdom across domains without losing practical momentum', 'Adapts naturally to new environments and cultural contexts', 'Synthesises insights from radically different sources into coherent frameworks', 'Flexible enough to pivot when a path closes without abandoning the direction'],
    challenges: ['Too many interesting paths, commitment to one feels like foreclosing all others', 'Yi Wood\'s adaptability reinforces Sagittarius\'s tendency to move on before completing', 'Appears unfocused; the thread is visible only when you step back to see the whole trajectory'],
    idealWork: ['Consulting across sectors and cultures', 'International education and cross-cultural program design', 'Entrepreneurship in knowledge-based or travel-adjacent businesses', 'Polymath writing, essays, narrative nonfiction, intellectual journalism'],
    keyInsight: "Yi Wood grows around every obstacle. Sagittarius sees around every horizon. The question is never 'can I adapt?', it's 'to what?' Choose your direction and let the vine do the rest.",
    dailyPractice: 'Weekly review: which path am I actually on? Yi Wood + Sagittarius must name the thread deliberately or risk losing it in the richness of the journey.',
  },
  'pisces-wu-earth': {
    slug: 'pisces-wu-earth',
    sign: 'Pisces', element: 'Earth', elementEmoji: '🏔️', elementColor: 'var(--color-element-earth)',
    archetype: 'Harmonizer Guardian', archetypeSlug: 'harmonizer-guardian',
    tagline: 'The Compassionate Anchor',
    description: "Pisces × Wu Earth is one of the most unexpectedly stable combinations in the system. Pisces dissolves into feeling, imagination, and boundless empathy; Wu Earth (the mountain) provides immovable, load-bearing groundedness. The result: a Harmonizer Guardian who can hold enormous emotional and psychic complexity without being swept away by it. The ocean, held by bedrock.",
    strengths: ['Holds space for others\' emotional and existential weight without collapsing', 'Deeply compassionate and unconditionally accepting, no one is too much', 'Stable centre in emotionally chaotic environments', 'Turns Pisces\' perceptive depth into durable care, not just momentary attunement'],
    challenges: ["Wu Earth's stability can suppress Pisces' need for creative and emotional flow", 'Appears more contained than they feel, inner world is vast and rarely fully seen', 'Over-holds: absorbs what should be processed and released'],
    idealWork: ['Palliative and hospice care', 'Psychiatric and inpatient mental health', 'Addiction recovery counselling', 'Spiritual direction and contemplative retreat leadership'],
    keyInsight: "Wu Earth holds the container; Pisces fills it with compassion. Your capacity to be present for the heaviest human experiences is a rare gift, and it requires active maintenance, not just passive availability.",
    dailyPractice: 'Daily discharge practice: movement, breath, water, or sound to release what you absorbed. Wu Earth holds; Pisces must flow to stay healthy.',
  },
  'aries-wu-earth': {
    slug: 'aries-wu-earth',
    sign: 'Aries', element: 'Earth', elementEmoji: '🏔️', elementColor: 'var(--color-element-earth)',
    archetype: 'Harmonizer Guardian', archetypeSlug: 'harmonizer-guardian',
    tagline: 'The Steady Warrior',
    description: "Aries × Wu Earth is one of the most paradoxical and powerful combinations in the system. Aries launches with fearless initiation energy; Wu Earth provides the immovable, load-bearing foundation that catches the impact. Most Aries archetypes are all launch. This one lands, and holds. You act boldly, but the mountain beneath you means you never get swept away by your own momentum.",
    strengths: ['Acts decisively AND sustains, rare capacity to both initiate and endure', 'Earns trust through both courage and consistency, two qualities rarely found together', 'Provides stability to teams in fast-moving, high-stakes environments', 'Absorbs pressure without transferring it, a calming force under fire'],
    challenges: ["Aries' impulsiveness and Wu Earth's deliberateness create internal friction, which mode is right?", "Frustration when the mountain inside wants to hold and Aries' energy wants to launch", 'Others may not perceive the steadiness because the Aries initiation energy is more visible'],
    idealWork: ['Military and emergency leadership', 'Founding leadership that must also operate through the long build', 'Athletic training and high-performance sports administration', 'Infrastructure and first-response project management'],
    keyInsight: "Aries initiates; Wu Earth holds. The combination is the warrior who is also the mountain. Use the initiation to find the fight worth having, then let the mountain win it through endurance, not just force.",
    dailyPractice: 'Before acting: name what you are protecting. Aries moves fast; Wu Earth moves with purpose. Connecting the action to the thing you are sustaining transforms impulse into strategy.',
  },
  'cancer-ren-water': {
    slug: 'cancer-ren-water',
    sign: 'Cancer', element: 'Water', elementEmoji: '🌊', elementColor: 'var(--color-element-water)',
    archetype: 'Nurturing Creative', archetypeSlug: 'nurturing-creative',
    tagline: 'The Strategic Nurturer',
    description: "Cancer × Ren Water is the most strategically perceptive Nurturing Creative. Cancer's deep care and protective instinct meets Ren Water's (the great river, expansive and strategic) sweeping perception and intelligence. You don't just nurture from feeling, you read systems, anticipate patterns, and position people for success with a strategic awareness most caregivers never develop.",
    strengths: ['Combines care with strategic intelligence, sees where people need to go, not just how they feel now', 'Reads organisational and relational dynamics at a systems level', 'Protective instinct backed by genuine intelligence about what threats look like in advance', 'Builds trust through both warmth and demonstrated competence'],
    challenges: ["Ren Water's scope and Cancer's depth can produce over-analysis of emotional situations", 'Strategic perception can make simple human moments feel like problems to solve', 'Absorbs others\' relational complexity at scale, needs deliberate decompression'],
    idealWork: ['Executive coaching and leadership development', 'Organisational psychology and team design', 'Paediatric and developmental medicine', 'Strategic philanthropy and impact investment'],
    keyInsight: "Ren Water flows strategically; Cancer flows toward those it loves. The synthesis gives you rare capacity to care AND to position people well. Trust both, the warmth and the strategy are not in conflict.",
    dailyPractice: 'Weekly: name one person you helped toward something they did not yet see in themselves. Cancer cares; Ren Water perceives the path. Together they mentor.',
  },
  'capricorn-yi-wood': {
    slug: 'capricorn-yi-wood',
    sign: 'Capricorn', element: 'Wood', elementEmoji: '🌿', elementColor: 'var(--color-element-wood)',
    archetype: 'Steady Achiever', archetypeSlug: 'steady-achiever',
    tagline: 'The Resilient Climber',
    description: "Capricorn × Yi Wood (the vine) is one of the most surprisingly flexible Steady Achievers. Capricorn provides the mountain, structured ambition, long-range discipline, the will to ascend. Yi Wood provides the vine that finds its path upward regardless of what is in the way. This archetype does not just push through obstacles; it grows around them, always arriving eventually.",
    strengths: ['Exceptional persistence through adversity, does not require a clear path to keep climbing', 'Ambitious and adaptive simultaneously, rare combination in driven personalities', 'Earns respect through sustained output across changing conditions', 'Finds opportunities in constraints that others experience as roadblocks'],
    challenges: ['Yi Wood\'s flexibility can look like inconsistency to Capricorn\'s more linear peers', 'May over-adapt to conditions that warrant pushing back against', 'The long-range vision is real, but the route keeps changing, hard to communicate the plan to others'],
    idealWork: ['Entrepreneurship in underserved or challenging markets', 'Consulting across changing industries and economic cycles', 'Career development and professional coaching', 'Sustainable business and long-horizon impact work'],
    keyInsight: "The mountain gives you the destination; the vine gives you a thousand paths to it. You rarely fail because you are never truly stuck, you just find another route. Name the summit clearly so the routes all point the same direction.",
    dailyPractice: 'Weekly: restate the long-range goal before reviewing how the path has shifted. Capricorn needs the destination fixed; Yi Wood handles the routing.',
  },
  'aquarius-ding-fire': {
    slug: 'aquarius-ding-fire',
    sign: 'Aquarius', element: 'Fire', elementEmoji: '🔥', elementColor: 'var(--color-element-fire)',
    archetype: 'Visionary Builder', archetypeSlug: 'visionary-builder',
    tagline: 'The Intimate Revolutionary',
    description: "Aquarius × Ding Fire (the candle flame, warm and close-range) is the most personally connecting Visionary Builder in the system. Aquarius operates from systems-level principle; Ding Fire warms through intimate, one-on-one presence. The result: someone who holds genuinely radical vision AND builds it through relationships, not broadcasts, changing minds one meaningful conversation at a time.",
    strengths: ['Changes minds through genuine warmth, not argument, deeply persuasive at close range', 'Holds long-range systemic vision without losing sight of the individual in front of them', 'Builds coalitions through personal connection, one conversation at a time', 'Sustainable, Ding Fire does not burn out the way Bing Fire does; warmth is steady, not explosive'],
    challenges: ["Aquarius's systemic thinking can feel cold; Ding Fire's warmth can make the vision feel smaller than it is", 'Operates at relationship scale, scaling the vision to broadcast level requires deliberate effort', 'The intimacy of Ding Fire means Aquarius\'s necessary detachment feels harder to maintain'],
    idealWork: ['Community organising and grassroots leadership', 'Intimate therapeutic and coaching practice', 'Small-scale educational innovation and mentorship', 'Mission-driven nonprofit leadership at the human scale'],
    keyInsight: "Bing Fire broadcasts; Ding Fire changes. You change the world by changing people, slowly, personally, permanently. Don't let urgency pressure you into scaling before the depth is real.",
    dailyPractice: 'One meaningful conversation per day that advances the vision. Aquarius builds systems; Ding Fire builds them one person at a time.',
  },
  'pisces-ren-water': {
    slug: 'pisces-ren-water',
    sign: 'Pisces', element: 'Water', elementEmoji: '🌊', elementColor: 'var(--color-element-water)',
    archetype: 'Nurturing Creative', archetypeSlug: 'nurturing-creative',
    tagline: 'The Oceanic Visionary',
    description: "Pisces × Ren Water is the most expansively perceptive combination in the system. Pisces dissolves all boundaries; Ren Water (the great river and ocean) spans vast territory with strategic intelligence. Together, they produce someone whose consciousness is genuinely enormous, capable of perceiving patterns across scale, holding multiple realities, and synthesising what others cannot even begin to gather.",
    strengths: ['Perceptual range is essentially unlimited, absorbs and synthesises at extraordinary breadth', 'Strategic intelligence embedded in deep emotional attunement', 'Creative vision that addresses whole systems rather than single problems', 'Deeply intuitive about where the world is going before it arrives'],
    challenges: ['Boundary dissolution at scale, absorbs enormous complexity, requires exceptional recovery capacity', 'Difficulty prioritising when everything is perceived as equally significant', 'The vastness of perception makes focused execution a genuine challenge'],
    idealWork: ['Strategic foresight and long-range scenario planning', 'Cross-disciplinary academic research and synthesis', 'Visionary arts and multimedia creative direction', 'Healing and therapeutic work with a systemic or organisational dimension'],
    keyInsight: "Ren Water spans everything; Pisces dissolves into it. Your capacity to perceive and synthesise is unmatched. The discipline is not expanding it further, it is choosing what to do with what you already see.",
    dailyPractice: 'Write three priorities before opening any input channel. Pisces + Ren Water needs a container before the day begins; otherwise the ocean has no shore.',
  },
  'taurus-ding-fire': {
    slug: 'taurus-ding-fire',
    sign: 'Taurus', element: 'Fire', elementEmoji: '🔥', elementColor: 'var(--color-element-fire)',
    archetype: 'Visionary Builder', archetypeSlug: 'visionary-builder',
    tagline: 'The Warm Craftsperson',
    description: "Taurus × Ding Fire is one of the most sensuously compelling Visionary Builders. Taurus's deep connection to material quality, beauty, and patient accumulation meets Ding Fire's steady, intimate warmth, producing someone whose vision is not abstract but embodied. You don't describe the future you're building; you build a room, a meal, a piece of music, a relationship that makes people feel it.",
    strengths: ['Creates work of extraordinary sensory quality that transmits the vision physically', 'Steady, sustainable creative output, does not burn out in flashes', 'Inspires through craft and presence rather than rhetoric', 'Builds things that last: durable creative legacies with real warmth embedded in them'],
    challenges: ['Vision moves at Taurus pace, slow, deliberate, easily overtaken by faster but shallower competitors', 'Ding Fire\'s warmth is personal; scaling the vision to impersonal systems feels wrong', 'Perfectionism in the material dimension delays release'],
    idealWork: ['High-end culinary arts and hospitality experience design', 'Architecture and interior design with human warmth at the center', 'Music production and artisan creative direction', 'Wellness and sensory healing environments'],
    keyInsight: "Ding Fire illuminates what is already beautiful. Taurus knows what beauty is made of. The combination produces work that people do not just admire, they want to live inside it.",
    dailyPractice: 'Create one small beautiful thing each day with your hands. Taurus and Ding Fire both need tactile expression, not just ideas, but made things.',
  },
  'gemini-ren-water': {
    slug: 'gemini-ren-water',
    sign: 'Gemini', element: 'Water', elementEmoji: '🌊', elementColor: 'var(--color-element-water)',
    archetype: 'Nurturing Creative', archetypeSlug: 'nurturing-creative',
    tagline: 'The Wide-Ranging Intelligence',
    description: "Gemini × Ren Water is the most intellectually expansive Nurturing Creative. Gemini's multi-channel curiosity and rapid synthesis meets Ren Water's strategic, sweeping perception and intelligence. The result: someone who gathers knowledge from everywhere, synthesises it across domains, and channels it toward genuine understanding, making the complex legible for others.",
    strengths: ['Synthesises across domains at extraordinary breadth and speed', 'Communicates strategic insight with rare accessibility and wit', 'Holds enormous informational range without losing the thread of any strand', 'Serves others by making complexity navigable, the translator between worlds'],
    challenges: ['Ren Water\'s depth can be sacrificed for Gemini\'s speed, synthesises quickly but sometimes at the cost of the full understanding', 'Restlessness at the surface level when the real insight requires sustained immersion', 'Appears to know everything; can undervalue the slower expertise of specialists'],
    idealWork: ['Strategic research and synthesis roles (think tank, advisory)', 'Technology journalism and technical communication', 'Cross-sector innovation consulting', 'Broad-scope leadership roles requiring integration across many domains'],
    keyInsight: "Gemini covers the ground; Ren Water maps it. The synthesis is rare: you understand how things connect across vast terrain AND you can explain it to anyone. The discipline is slowing down enough to get the depth right before broadcasting.",
    dailyPractice: 'One topic per week for slow, sustained reading, no skimming. Ren Water demands depth; Gemini must create the conditions for it.',
  },
  'leo-yi-wood': {
    slug: 'leo-yi-wood',
    sign: 'Leo', element: 'Wood', elementEmoji: '🌿', elementColor: 'var(--color-element-wood)',
    archetype: 'Steady Achiever', archetypeSlug: 'steady-achiever',
    tagline: 'The Radiant Grower',
    description: "Leo × Yi Wood is the most creatively alive Steady Achiever. Leo needs to be seen and to inspire; Yi Wood (the vine) grows continuously, adapts, and finds light wherever it exists. Together, they produce someone who builds a creative reputation over a career, not through one defining moment but through continuous, high-quality output that accumulates into something remarkable.",
    strengths: ['High creative output sustained over long periods without burning out', 'Adapts creative direction as contexts and audiences evolve', 'Generous, gives credit, teaches, mentors while continuing to produce', 'Builds genuine followings through consistency, warmth, and craft'],
    challenges: ["Leo's desire for recognition can conflict with Yi Wood's patient, incremental pace", 'Difficulty accepting slow periods as part of the growth cycle', 'Spreads creative attention too widely when multiple opportunities appear simultaneously'],
    idealWork: ['Career creative practice in any medium, writing, design, performance, music', 'Creative education and teaching practice', 'Content creation with a long-term audience relationship', 'Brand and creative direction with sustained engagement at the center'],
    keyInsight: "Leo needs the light; Yi Wood grows toward it. The combination is not about one great performance, it is about a life of creative presence that grows more compelling the longer you sustain it.",
    dailyPractice: 'Show one piece of work per week, however small. Leo needs to be seen; Yi Wood grows through visibility. The practice is consistent exposure, not peak performance.',
  },
  'virgo-wu-earth': {
    slug: 'virgo-wu-earth',
    sign: 'Virgo', element: 'Earth', elementEmoji: '🏔️', elementColor: 'var(--color-element-earth)',
    archetype: 'Harmonizer Guardian', archetypeSlug: 'harmonizer-guardian',
    tagline: 'The Steady Standard-Keeper',
    description: "Virgo × Wu Earth is the most durably reliable Harmonizer Guardian. Virgo's analytical precision and service orientation meets Wu Earth's immovable, load-bearing stability, producing someone who does not just maintain standards, but becomes the standard. Others navigate by you. Teams anchor to you. The question is never whether the work will be done correctly; it is whether you will let others do it at all.",
    strengths: ['Holds quality standards without wavering regardless of external pressure', 'Exceptional organisational memory, knows where everything is and why it matters', 'Deeply trustworthy: the system works because you make sure it does', 'Creates calm in complex environments through genuine competence and presence'],
    challenges: ['Wu Earth holds everything; Virgo refines everything, double the load, hard to release', 'Difficulty trusting delegation, others rarely meet the combined standard', 'Over-responsibility becomes the system\'s single point of failure'],
    idealWork: ['Operations and quality leadership in complex organisations', 'Chief of staff and executive operations', 'Hospital administration and clinical quality governance', 'Standards bodies and institutional accreditation'],
    keyInsight: "Wu Earth holds; Virgo perfects. The combination makes you indispensable, which is also the trap. Build systems that hold the standard without you being in every moment of them.",
    dailyPractice: 'Identify one task per week to delegate fully and not check on. Virgo + Wu Earth must practice relinquishing the standard to build capability in others.',
  },
  'libra-wu-earth': {
    slug: 'libra-wu-earth',
    sign: 'Libra', element: 'Earth', elementEmoji: '🏔️', elementColor: 'var(--color-element-earth)',
    archetype: 'Harmonizer Guardian', archetypeSlug: 'harmonizer-guardian',
    tagline: 'The Grounded Peacemaker',
    description: "Libra × Wu Earth is the most stable Harmonizer Guardian. Libra's drive for balance, fairness, and relational harmony meets Wu Earth's immovable groundedness, producing someone whose capacity to hold the center of a group or organisation is extraordinary. Conflicts come to you because they find resolution there. You are the mountain that everyone orients around.",
    strengths: ['Holds conflict without taking sides, the fair witness everyone needs', 'Exceptional mediation and facilitation under prolonged pressure', 'Builds cultures of fairness that outlast any individual leader', 'Grounded aesthetic sense, creates environments that are both beautiful and stable'],
    challenges: ['Too much mediation can prevent the difficult clarity that situations sometimes require', "Wu Earth's stability can make Libra's natural decisiveness even harder to access", 'Holds others\' conflicts; rarely adequately processes own unresolved tensions'],
    idealWork: ['Organisational mediation and conflict transformation', 'HR leadership and workplace culture design', 'Diplomacy and international relations', 'Judicial and arbitration roles'],
    keyInsight: "Libra seeks balance; Wu Earth holds it. The combination is genuinely rare, someone who is not just fair but stable enough to hold fairness under sustained pressure. The risk is that the center cannot hold everything indefinitely. Know your load limit.",
    dailyPractice: 'Name one situation you have been mediating that needs an endpoint. Libra + Wu Earth holds indefinitely; sometimes the resolution requires a decision, not more holding.',
  },
  'scorpio-wu-earth': {
    slug: 'scorpio-wu-earth',
    sign: 'Scorpio', element: 'Earth', elementEmoji: '🏔️', elementColor: 'var(--color-element-earth)',
    archetype: 'Harmonizer Guardian', archetypeSlug: 'harmonizer-guardian',
    tagline: 'The Immovable Transformer',
    description: "Scorpio × Wu Earth is the most enduring combination in the system. Scorpio's transformative intensity and penetrating depth meets Wu Earth's immovable, mountain-like stability, producing someone who transforms what they touch while remaining completely unshakeable themselves. You are the eye of the storm: everything changes around you; you do not move.",
    strengths: ['Holds the center of chaos without being altered by it', 'Transforms systems and people through sustained, grounded presence', 'Earns profound trust, seen as both deep and reliable, almost never both together', 'Absorbs the weight of collective crisis without transferring it'],
    challenges: ['Wu Earth + Scorpio can produce an immovability that prevents necessary self-transformation', 'Others may project permanence onto you that creates unrealistic expectations', 'The capacity to hold everything can become the obligation to hold everything'],
    idealWork: ['Institutional crisis leadership and turnaround', 'Long-horizon social transformation work', 'Deep community anchor roles, the person who stays when everyone else leaves', 'Forensic and investigative leadership in high-stakes environments'],
    keyInsight: "Scorpio transforms; Wu Earth endures. The combination is rare: you can hold the heaviest work of transformation for the longest time. Know the difference between what you are holding for others and what you need to put down for yourself.",
    dailyPractice: 'Name one thing you are holding that is not yours to carry. Scorpio absorbs; Wu Earth holds everything. The practice is deliberate release.',
  },
  'sagittarius-geng-metal': {
    slug: 'sagittarius-geng-metal',
    sign: 'Sagittarius', element: 'Metal', elementEmoji: '⚙️', elementColor: 'var(--color-text-muted)',
    archetype: 'Strategic Commander', archetypeSlug: 'strategic-commander',
    tagline: 'The Decisive Truth-Seeker',
    description: "Sagittarius × Geng Metal is one of the most intellectually formidable Strategic Commanders. Sagittarius's philosophical ambition and truth-seeking range meets Geng Metal's decisive, cutting precision. Where Sagittarius alone can philosophise endlessly, Geng Metal forces the question: what does this mean for what we do now? The result is a Strategic Commander who operates from genuine principle, and executes it without hesitation.",
    strengths: ['Combines wide philosophical range with sharp executable judgment', 'Acts from principle, not expediency, rare in high-stakes environments', 'Exceptional strategic framing that makes the right decision feel obvious', 'Decisive and clear communicator, cuts through ambiguity that paralyses others'],
    challenges: ["Sagittarius's breadth can dilute Geng Metal's focus, too many principles, not enough precision on which one applies now", 'Uncompromising on values in situations requiring pragmatic flexibility', 'Can be blunt in delivering uncomfortable truths; the directness is intended as respect, not aggression'],
    idealWork: ['Strategic leadership in mission-driven organisations', 'Military and public safety command', 'Policy design and standards-setting', 'Philosophical counsel and executive advisory'],
    keyInsight: "Sagittarius finds the truth; Geng Metal acts on it. The combination is rare: a leader who is both philosophically serious AND willing to be decisive. Don't let the search for a more perfect truth delay the action the current truth demands.",
    dailyPractice: 'One principle, clearly stated, before any major decision. Sagittarius grounds Geng Metal in something worth cutting toward; Geng Metal ensures Sagittarius actually cuts.',
  },
};

const STEM_LABELS: Record<string, string> = {
  bing: 'Bing',
  ding: 'Ding',
  geng: 'Geng',
  gui: 'Gui',
  jia: 'Jia',
  ji: 'Ji',
  ren: 'Ren',
  wu: 'Wu',
  yi: 'Yi',
};

function getElementLabel(profile: ArchetypeProfile) {
  const stem = profile.slug.split('-').at(-2);
  return stem && STEM_LABELS[stem] ? `${STEM_LABELS[stem]} ${profile.element}` : profile.element;
}

export async function generateStaticParams() {
  return Object.keys(PROFILES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = PROFILES[slug];
  if (!p) return {};
  const elementLabel = getElementLabel(p);
  return {
    title: `${p.sign} × ${elementLabel}, ${p.archetype} | 8os.ai`,
    description: `${p.tagline}. Strengths, challenges, ideal work, and daily practice for the ${p.sign} ${elementLabel} (${p.archetype}) archetype.`,
    keywords: [`${p.sign} BaZi`, `${elementLabel} archetype`, `${p.sign} ${elementLabel}`, p.archetype, 'BaZi archetype'],
    openGraph: {
      title: `${p.sign} × ${elementLabel}, ${p.archetype} | 8os.ai`,
      description: p.description,
      url: `https://8os.ai/archetypes/${p.slug}`,
      siteName: '8os',
      locale: 'en_US',
      type: 'article',
      images: [{
        url: 'https://8os.ai/og-image.png',
        width: 1200,
        height: 630,
        alt: `${p.sign} × ${elementLabel}, ${p.archetype}`,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${p.sign} × ${elementLabel}, ${p.archetype} | 8os.ai`,
      description: p.description,
      creator: '@8os',
    },
  };
}

export default async function ArchetypePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = PROFILES[slug];
  if (!p) notFound();
  const elementLabel = getElementLabel(p);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', color: 'var(--color-text-secondary)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '56px 24px 80px' }}>
      <ArchetypeRevealedTracker archetype={slug} />
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Breadcrumb — text-muted passes WCAG AA on both dark (5.74:1) and light (5.04:1) */}
        <div style={{ marginBottom: 32, display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
          <Link href="/archetypes" className="archetype-breadcrumb-link">Archetypes</Link>
          <span>›</span>
          <span>{p.sign}</span>
          <span>›</span>
          <span>{elementLabel}</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ background: `${p.elementColor}15`, border: `1px solid ${p.elementColor}30`, color: p.elementColor, borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 600 }}>
              {p.elementEmoji} {elementLabel}
            </span>
            <span style={{ background: 'var(--color-accent-soft)', border: '1px solid var(--color-accent-soft)', color: 'var(--color-accent)', borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 600 }}>
              {p.archetype}
            </span>
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 8, color: 'var(--color-text-primary)', lineHeight: 1.1 }}>
            {p.sign} × {elementLabel}
          </h1>
          <p style={{ fontSize: 20, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 16 }}>{p.tagline}</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 16, lineHeight: 1.7 }}>{p.description}</p>
        </div>

        {/* Strengths + Challenges */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-accent)', marginBottom: 14 }}>Strengths</h2>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.strengths.map((s, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 2 }}>✓</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.5 }}>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-challenges)', marginBottom: 14 }}>Challenges</h2>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.challenges.map((c, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--color-challenges)', flexShrink: 0, marginTop: 2 }}>△</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.5 }}>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Ideal Work */}
        <div style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 14 }}>Ideal Work</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {p.idealWork.map((w, i) => (
              <span key={i} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 12px', color: 'var(--color-text-secondary)', fontSize: 13 }}>{w}</span>
            ))}
          </div>
        </div>

        {/* Key Insight */}
        <div style={{ background: 'var(--color-accent-soft)', border: '1px solid var(--color-accent-soft)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Key Insight</h2>
          <p style={{ color: 'var(--color-text-primary)', fontSize: 15, lineHeight: 1.7, margin: 0 }}>{p.keyInsight}</p>
        </div>

        {/* Daily Practice */}
        <div style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24, marginBottom: 40 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Daily Practice</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 15, lineHeight: 1.7, margin: 0 }}>{p.dailyPractice}</p>
        </div>

        {/* CTA — distinct warm tint bg for conversion visibility on both themes */}
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 32, textAlign: 'center', marginBottom: 32 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 10 }}>Is This Your Archetype?</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, marginBottom: 20 }}>90 seconds. No birth time required. Get your personal operating system free.</p>
          <Link href="/onboarding" className="archetype-cta-primary">
            Get My Archetype →
          </Link>
          <Link href={`/share/${p.archetypeSlug}`} className="archetype-cta-secondary">
            View {p.archetype} Card →
          </Link>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14 }}>
          <Link href="/archetypes/famous" style={{ color: 'var(--color-text-primary)', textDecoration: 'none' }}>Famous Archetypes →</Link>
          <Link href="/resources/five-elements-guide" style={{ color: 'var(--color-text-primary)', textDecoration: 'none' }}>Five Elements Guide →</Link>
          <Link href="/quiz" style={{ color: 'var(--color-text-primary)', textDecoration: 'none' }}>Archetype Quiz →</Link>
        </div>

      </div>
    </main>
  );
}
