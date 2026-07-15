export type ArchetypeElement = 'Metal' | 'Wood' | 'Fire' | 'Earth' | 'Water';

export type ArchetypeName =
  | 'Strategic Commander'
  | 'Nurturing Creative'
  | 'Harmonizer Guardian'
  | 'Steady Achiever'
  | 'Visionary Builder';

export type ArchetypeId =
  | 'strategic_commander'
  | 'nurturing_creative'
  | 'harmonizer_guardian'
  | 'steady_achiever'
  | 'visionary_builder';

export interface BaZiPillar {
  year: string;
  month: string;
  day: string;
  hour: string;
}

export interface Archetype {
  name: ArchetypeName;
  element: ArchetypeElement;
  tagline: string;
  description: string;
  strengths: string[];
  workflow: string[];
}

export interface UserArchetype extends Archetype {
  userId: string;
  archetypeId?: ArchetypeId;
  telegramId?: string;
  baziPillars?: BaZiPillar;
  revealedAt: string;
}

export interface BriefingData {
  userId: string;
  telegramId?: string;
  archetype: UserArchetype;
  dailyInsight?: string;
  todaysFocus?: string[];
  energyHours?: {
    optimal: string[];
    okay: string[];
    avoid: string[];
  };
}

export interface ArchetypeRevealPageProps {
  params: { telegramId: string };
}

export const ARCHETYPE_IDS: Record<ArchetypeName, ArchetypeId> = {
  'Strategic Commander': 'strategic_commander',
  'Nurturing Creative': 'nurturing_creative',
  'Harmonizer Guardian': 'harmonizer_guardian',
  'Steady Achiever': 'steady_achiever',
  'Visionary Builder': 'visionary_builder',
};

export const ARCHETYPE_THEME_CLASSES: Record<ArchetypeId, string> = {
  strategic_commander: 'theme-strategic-commander',
  nurturing_creative: 'theme-nurturing-creative',
  harmonizer_guardian: 'theme-harmonizer-guardian',
  steady_achiever: 'theme-steady-achiever',
  visionary_builder: 'theme-visionary-builder',
};

export const ARCHETYPE_NAMES_BY_ID: Record<ArchetypeId, ArchetypeName> = {
  strategic_commander: 'Strategic Commander',
  nurturing_creative: 'Nurturing Creative',
  harmonizer_guardian: 'Harmonizer Guardian',
  steady_achiever: 'Steady Achiever',
  visionary_builder: 'Visionary Builder',
};

export function getArchetypeThemeClass(archetypeName: ArchetypeName): string {
  return ARCHETYPE_THEME_CLASSES[ARCHETYPE_IDS[archetypeName]];
}

export const ARCHETYPE_COLORS: Record<ArchetypeName, string> = {
  'Strategic Commander': '#94a3b8',
  'Nurturing Creative': '#22c55e',
  'Harmonizer Guardian': '#f97316',
  'Steady Achiever': '#3b82f6',
  'Visionary Builder': '#f97316',
};

export const ARCHETYPE_ICONS: Record<ArchetypeName, string> = {
  'Strategic Commander': '⚔️',
  'Nurturing Creative': '🌱',
  'Harmonizer Guardian': '🛡️',
  'Steady Achiever': '🎯',
  'Visionary Builder': '🔥',
};

export const MOCK_ARCHETYPES: Record<ArchetypeName, Archetype> = {
  'Strategic Commander': {
    name: 'Strategic Commander',
    element: 'Metal',
    tagline: 'Forge your path with precision',
    description:
      'You operate with the clarity and force of forged steel. Strategic, decisive, and always moving toward your objectives, you cut through noise to find the essential path forward.',
    strengths: [
      'Rapid decision-making under pressure',
      'Systematic approach to complex problems',
      'Unwavering focus on outcomes',
      'Ability to mobilize resources efficiently',
    ],
    workflow: [
      'Mission banners replace task lists',
      '6 buckets organize your day',
      'Pressure calibrates your focus',
    ],
  },
  'Nurturing Creative': {
    name: 'Nurturing Creative',
    element: 'Wood',
    tagline: 'Grow your ideas like a garden',
    description:
      'Like wood reaching toward light, you grow and adapt organically. Innovative and growth-oriented, you nurture ideas from seed to flourishing reality.',
    strengths: [
      'Creative problem-solving and innovation',
      'Natural ability to nurture and develop',
      'Adaptive and flexible thinking',
      'Long-term vision and patience',
    ],
    workflow: [
      'Seasonal windows replace deadlines',
      'Rituals replace routines',
      'Growth metrics replace completion percentages',
    ],
  },
  'Harmonizer Guardian': {
    name: 'Harmonizer Guardian',
    element: 'Fire',
    tagline: 'Light the way for your circle',
    description:
      'Your fire spreads warmth and connection. As a Harmonizer Guardian, you bring people together, protect relationships, and maintain balance in your ecosystem.',
    strengths: [
      'Deep empathy and emotional intelligence',
      'Natural community builder',
      'Conflict resolution and mediation',
      'Strengthening bonds between people',
    ],
    workflow: [
      'Relationship tags connect tasks to people',
      'Shared rituals strengthen bonds',
      'Group goals align your circle',
    ],
  },
  'Steady Achiever': {
    name: 'Steady Achiever',
    element: 'Earth',
    tagline: 'Build lasting momentum, brick by brick',
    description:
      'Grounded like earth, you build methodically and celebrate every win. Your consistent effort creates lasting momentum and meaningful achievements.',
    strengths: [
      'Consistent daily effort and discipline',
      'Celebrating incremental progress',
      'Clear goal-oriented mindset',
      'Reliable and dependable execution',
    ],
    workflow: [
      'Streaks fuel momentum',
      'Checklists provide clarity',
      'Celebrations mark every win',
    ],
  },
  'Visionary Builder': {
    name: 'Visionary Builder',
    element: 'Fire',
    tagline: 'Ignite the possible, inspire the world',
    description:
      'Your fire-fueled vision creates momentum where others see obstacles. Bold, magnetic, and mission-driven, you move people and build what didn\'t exist before.',
    strengths: [
      'Magnetic energy that inspires action',
      'Bold vision and mission clarity',
      'High-intensity creative output',
      'Natural ability to rally others',
    ],
    workflow: [
      'Sprint cycles replace marathon sessions',
      'Visibility drives accountability',
      'Bold declarations create momentum',
    ],
  },
};
