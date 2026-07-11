/**
 * ARCHIE Archetype Engine
 *
 * Generates a personalized OS archetype from:
 *  - Sun sign (12) derived from birth date
 *  - BaZi Day Master (10 stems) derived from birth date
 *  - Day Master Strength (strong / weak / balanced)
 *  - Personality type (4 types: systematic-goal, systematic-process,
 *                               intuitive-goal, intuitive-process)
 *  - Hour pillar (12 slots, optional)
 *
 * Total base combinations: 12 × 10 × 3 × 4 × 12 = 17,280
 * (Scales to 456M+ with goal/task template variants)
 *
 * archetype_id format: "{sun_sign_key}_{day_master_romanized}_{strength}_{personality_code}"
 * Example: "capricorn_geng_strong_sg"
 */

import { calculateSunSign, getSunSignById, SUN_SIGNS as _SUN_SIGNS, type SunSignResult } from './sun-sign'
import { calculateBazi, STEM_ELEMENT, type BaziResult, type Stem, STEMS } from './bazi'
import { calculateDayMasterStrength, type DayMasterStrength, type StrengthResult } from './bazi-strength'
import { hourToShichen, SHICHEN_SLOTS, type ShichenSlot } from './time-quiz'

// ─── Personality Types ────────────────────────────────────────────────────────

export type PersonalityDimension1 = 'systematic' | 'intuitive'
export type PersonalityDimension2 = 'goal' | 'process'
export type PersonalityCode = 'sg' | 'sp' | 'ig' | 'ip'
export type PersonalityType = `${PersonalityDimension1}-${PersonalityDimension2}`

export const PERSONALITY_TYPES: Record<PersonalityCode, { dim1: PersonalityDimension1; dim2: PersonalityDimension2; label: string }> = {
  sg: { dim1: 'systematic', dim2: 'goal',    label: 'Systematic Goal-Driven' },
  sp: { dim1: 'systematic', dim2: 'process', label: 'Systematic Process-Driven' },
  ig: { dim1: 'intuitive',  dim2: 'goal',    label: 'Intuitive Goal-Driven' },
  ip: { dim1: 'intuitive',  dim2: 'process', label: 'Intuitive Process-Driven' },
}

// ─── Day Master Romanization ──────────────────────────────────────────────────

export const DAY_MASTER_ROMANIZED: Record<Stem, string> = {
  甲: 'jia', 乙: 'yi', 丙: 'bing', 丁: 'ding', 戊: 'wu',
  己: 'ji',  庚: 'geng', 辛: 'xin', 壬: 'ren', 癸: 'gui',
}

export const DAY_MASTER_EN: Record<Stem, string> = {
  甲: 'Yang Wood (甲)', 乙: 'Yin Wood (乙)',   丙: 'Yang Fire (丙)', 丁: 'Yin Fire (丁)',
  戊: 'Yang Earth (戊)', 己: 'Yin Earth (己)', 庚: 'Yang Metal (庚)', 辛: 'Yin Metal (辛)',
  壬: 'Yang Water (壬)', 癸: 'Yin Water (癸)',
}

// ─── Dashboard Token Types ────────────────────────────────────────────────────

export interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  success: string
  warning: string
}

export interface Typography {
  heading: string
  body: string
  mono: string
  style: string
}

export interface DashboardTokens {
  colorPalette: ColorPalette
  typography: Typography
  metaphor: {
    visual: string
    layout: string
    animation: string
    icons: string[]
  }
  taskPresentation: {
    style: string
    cardDescription: string
    progressLabel: string
    dueDateTemplate: string
  }
  progressVisualization: {
    type: string
    fillDescription: string
    milestones: string[]
    celebrationStyle: string
  }
  schedulingPhilosophy: {
    blockStyle: string
    restStyle: string
    energyPattern: string
    calendarView: string
  }
  coachingTone: {
    style: string
    exampleMessages: string[]
    metaphorFrequency: 'high' | 'medium' | 'low'
  }
  ritualSuggestions: {
    daily: string
    weekly: string
    monthly: string
    annual: string
  }
}

// ─── Sun Sign Dashboard Themes ────────────────────────────────────────────────

export const SUN_SIGN_DASHBOARD_TOKENS: Record<string, DashboardTokens> = {
  capricorn: {
    colorPalette: { primary: '#2C3E50', secondary: '#7F8C8D', accent: '#F39C12', background: '#ECF0F1', text: '#2C3E50', success: '#27AE60', warning: '#E67E22' },
    typography: { heading: '"Playfair Display", serif', body: '"Inter", sans-serif', mono: '"JetBrains Mono", monospace', style: 'Traditional, established, authoritative' },
    metaphor: { visual: 'Mountain range with summit markers', layout: 'Vertical hierarchy (base → mid → summit)', animation: 'Climbing ascent, flag planting at peak', icons: ['mountain', 'compass', 'flag', 'peak'] },
    taskPresentation: { style: 'Summit checkpoints (milestones, not tasks)', cardDescription: 'Elevation marker with altitude', progressLabel: '% to summit', dueDateTemplate: 'Summit by {{date}}' },
    progressVisualization: { type: 'Mountain elevation profile', fillDescription: 'Height gained, terrain difficulty', milestones: ['Base camp', 'Mid-camp', 'Summit'], celebrationStyle: 'Flag planting animation, summit panorama' },
    schedulingPhilosophy: { blockStyle: 'Long ascent phases (2–3 hours)', restStyle: 'Scheduled at base camps', energyPattern: 'Steady, consistent, no sprints', calendarView: 'Seasonal view (quarterly goals)' },
    coachingTone: { style: 'Mentor, elder, experienced guide', exampleMessages: ['The summit is closer than it appears.', 'Every step upward is progress. Rest is part of the climb.', "You've reached base camp. Next: the ridge."], metaphorFrequency: 'high' },
    ritualSuggestions: { daily: 'Morning altitude check — review today\'s elevation gain', weekly: 'Summit review — what was achieved, what\'s next ridge', monthly: 'Seasonal planning — which peaks this quarter', annual: 'Mountain range vision — 10-year summit map' },
  },
  aquarius: {
    colorPalette: { primary: '#3498DB', secondary: '#9B59B6', accent: '#1ABC9C', background: '#F8F9FA', text: '#2C3E50', success: '#2ECC71', warning: '#E74C3C' },
    typography: { heading: '"Space Grotesk", sans-serif', body: '"Inter", sans-serif', mono: '"Fira Code", monospace', style: 'Modern, geometric, unconventional' },
    metaphor: { visual: 'Constellation map, connected nodes, network', layout: 'Radial hub (center goal, orbiting tasks)', animation: 'Node connections forming, data flowing', icons: ['circuit', 'satellite', 'lightbulb', 'network'] },
    taskPresentation: { style: 'Innovation nodes (ideas, experiments, breakthroughs)', cardDescription: 'Connected dot with network lines', progressLabel: 'Connections made', dueDateTemplate: 'Launch by {{date}}' },
    progressVisualization: { type: 'Network graph, constellation formation', fillDescription: 'Nodes connected, pathways lit', milestones: ['Proof of concept', 'Prototype', 'Launch'], celebrationStyle: 'Network explosion, new constellation' },
    schedulingPhilosophy: { blockStyle: 'Innovation sprints (90 min, Pomodoro variant)', restStyle: 'Recharge between experiments', energyPattern: 'Bursts of insight, flexible timing', calendarView: 'Project phases, not daily tasks' },
    coachingTone: { style: 'Futurist, inventor, disruptor', exampleMessages: ['The future is built one experiment at a time.', "That idea? It's a node waiting to connect.", 'Break the pattern. The solution is outside the box.'], metaphorFrequency: 'medium' },
    ritualSuggestions: { daily: 'Innovation spark — 10-min ideation session', weekly: 'Lab review — what experiments worked/failed', monthly: 'Future scan — emerging trends, new tools', annual: 'Vision casting — 5-year breakthrough map' },
  },
  pisces: {
    colorPalette: { primary: '#AED6F1', secondary: '#D7BDE2', accent: '#85C1E9', background: '#F5F5F5', text: '#5D6D7E', success: '#A9DFBF', warning: '#FAD7A0' },
    typography: { heading: '"Cormorant Garamond", serif', body: '"Nunito", sans-serif', mono: '"Inconsolata", monospace', style: 'Ethereal, flowing, delicate' },
    metaphor: { visual: 'Ocean waves, tide pools, underwater world', layout: 'Fluid, organic shapes, no rigid grid', animation: 'Gentle waves, floating elements, bubbles', icons: ['wave', 'fish', 'shell', 'moon', 'star'] },
    taskPresentation: { style: 'Dream bubbles (ideas, visions, creative sparks)', cardDescription: 'Soft rounded shape with glow', progressLabel: 'Flow state', dueDateTemplate: 'When the tide is right' },
    progressVisualization: { type: 'Tide chart, wave height, flow meter', fillDescription: 'Water level rising, currents flowing', milestones: ['Low tide (rest)', 'High tide (action)', 'Full moon (peak)'], celebrationStyle: 'Wave crest, splash, rainbow' },
    schedulingPhilosophy: { blockStyle: 'Flow sessions (follow energy, no rigid time)', restStyle: 'Essential, guilt-free, part of the cycle', energyPattern: 'Ebb and flow, intuitive timing', calendarView: 'Moon phases, seasonal rhythms' },
    coachingTone: { style: 'Mystic, poet, gentle guide', exampleMessages: ['The tide brings what you need. Trust the flow.', "Your dreams are not distractions — they're signals.", "Rest is not absence. It's the deep current."], metaphorFrequency: 'high' },
    ritualSuggestions: { daily: 'Morning tide check — what does intuition say today?', weekly: 'Dream journal — log dreams, find patterns', monthly: 'Full moon reflection — release, renew, set intentions', annual: 'Ocean voyage — where is the current taking you?' },
  },
  aries: {
    colorPalette: { primary: '#E74C3C', secondary: '#C0392B', accent: '#F1C40F', background: '#FADBD8', text: '#2C3E50', success: '#27AE60', warning: '#E67E22' },
    typography: { heading: '"Oswald", sans-serif', body: '"Roboto", sans-serif', mono: '"Roboto Mono", monospace', style: 'Bold, aggressive, dynamic' },
    metaphor: { visual: 'Battlefield, arena, race track', layout: 'Forward momentum, no looking back', animation: 'Charging, explosions, victory flags', icons: ['sword', 'shield', 'flag', 'flame', 'lightning'] },
    taskPresentation: { style: 'Battle objectives (missions, not tasks)', cardDescription: 'Banner with objective, difficulty level', progressLabel: 'Territory conquered', dueDateTemplate: 'Victory by {{date}}' },
    progressVisualization: { type: 'Battle map, territory control, conquest meter', fillDescription: 'Ground gained, flags planted', milestones: ['First blood', 'Breakthrough', 'Victory'], celebrationStyle: 'Explosion, victory fanfare, flag wave' },
    schedulingPhilosophy: { blockStyle: 'Combat rounds (25 min, intense focus)', restStyle: 'Recovery between battles', energyPattern: 'Bursts, sprints, all-out effort', calendarView: 'Campaign phases, battle plans' },
    coachingTone: { style: 'General, war leader, motivator', exampleMessages: ['The battlefield is yours. Charge!', 'Victory belongs to the bold.', "That objective? It's yours for the taking."], metaphorFrequency: 'high' },
    ritualSuggestions: { daily: "Morning battle cry — declare today's objective", weekly: 'Victory lap — celebrate wins, learn from losses', monthly: 'Campaign review — strategy, tactics, alliances', annual: '1-year battle plan' },
  },
  taurus: {
    colorPalette: { primary: '#27AE60', secondary: '#8B7355', accent: '#F39C12', background: '#F5F5DC', text: '#3E2723', success: '#2ECC71', warning: '#D35400' },
    typography: { heading: '"Merriweather", serif', body: '"Lato", sans-serif', mono: '"Source Code Pro", monospace', style: 'Grounded, substantial, reliable' },
    metaphor: { visual: 'Garden, farm, construction site', layout: 'Structured plots, rows, foundations', animation: 'Building up, growing, harvesting', icons: ['tree', 'brick', 'tool', 'seed', 'barn'] },
    taskPresentation: { style: 'Building blocks (foundations, walls, roofs)', cardDescription: 'Brick with layer number', progressLabel: '% built', dueDateTemplate: 'Foundation set by {{date}}' },
    progressVisualization: { type: 'Building construction, floor plan', fillDescription: 'Walls raised, rooms completed', milestones: ['Foundation', 'Frame', 'Roof', 'Interior'], celebrationStyle: 'Building completion, ribbon cutting' },
    schedulingPhilosophy: { blockStyle: 'Construction phases (steady, consistent)', restStyle: 'Essential for quality, not rushed', energyPattern: 'Steady, patient, persistent', calendarView: 'Seasonal (planting, growing, harvest)' },
    coachingTone: { style: 'Craftsman, farmer, builder', exampleMessages: ['Every brick matters. Lay it well.', 'The foundation determines the height.', 'Harvest comes to those who plant consistently.'], metaphorFrequency: 'high' },
    ritualSuggestions: { daily: "Morning inspection — check today's build site", weekly: "Progress review — what's built, what's next", monthly: 'Seasonal planning — what to plant, what to harvest', annual: '10-year property vision' },
  },
  gemini: {
    colorPalette: { primary: '#F1C40F', secondary: '#3498DB', accent: '#9B59B6', background: '#FEF9E7', text: '#2C3E50', success: '#2ECC71', warning: '#E67E22' },
    typography: { heading: '"Poppins", sans-serif', body: '"Open Sans", sans-serif', mono: '"IBM Plex Mono", monospace', style: 'Playful, curious, dual' },
    metaphor: { visual: 'Switchboard, network hub, library', layout: 'Dual panels, split view, multiple streams', animation: 'Switching, connecting, data flowing', icons: ['twin', 'book', 'phone', 'arrow', 'network'] },
    taskPresentation: { style: 'Message threads (conversations, not tasks)', cardDescription: 'Envelope with priority flag', progressLabel: 'Messages sent', dueDateTemplate: 'Reply by {{date}}' },
    progressVisualization: { type: 'Network graph, message threads, knowledge tree', fillDescription: 'Branches connected, information flowing', milestones: ['First contact', 'Deep dive', 'Synthesis'], celebrationStyle: 'Connection spark, network expansion' },
    schedulingPhilosophy: { blockStyle: 'Pomodoro with switching (25 min × 2, different topics)', restStyle: 'Mental variety, not physical rest', energyPattern: 'Curiosity-driven, multiple interests', calendarView: 'Topic-based, not time-based' },
    coachingTone: { style: 'Journalist, curator, connector', exampleMessages: ["That idea? Connect it to this one. Boom.", 'Your network is your net worth.', 'Two ideas walk into a bar. You make the introduction.'], metaphorFrequency: 'medium' },
    ritualSuggestions: { daily: "Morning scan — what's new, what's interesting", weekly: 'Synthesis session — connect dots from the week', monthly: 'Curiosity audit — what did you learn, what next', annual: 'Knowledge map — what fields to explore' },
  },
  cancer: {
    colorPalette: { primary: '#5DADE2', secondary: '#AED6F1', accent: '#F5B041', background: '#F8F9FA', text: '#2C3E50', success: '#A9DFBF', warning: '#F8C471' },
    typography: { heading: '"Quicksand", sans-serif', body: '"Nunito", sans-serif', mono: '"Inconsolata", monospace', style: 'Soft, protective, circular' },
    metaphor: { visual: 'Home, nest, shell, family table', layout: 'Circular, protective, centered', animation: 'Gentle rocking, nesting, embracing', icons: ['shell', 'house', 'heart', 'moon', 'family'] },
    taskPresentation: { style: 'Care tasks (nurturing, protecting, feeding)', cardDescription: 'Soft rounded shape with heart', progressLabel: 'Nurturing level', dueDateTemplate: "When they're ready" },
    progressVisualization: { type: 'Nest building, home completion, family tree', fillDescription: 'Comfort level, safety index', milestones: ['Safe space', 'Thriving family', 'Legacy'], celebrationStyle: 'Home completion, family gathering' },
    schedulingPhilosophy: { blockStyle: 'Care sessions (focused on others)', restStyle: 'Self-care essential, guilt-free', energyPattern: 'Cyclical, lunar, emotional', calendarView: 'Family events, care schedules' },
    coachingTone: { style: 'Parent, protector, home-maker', exampleMessages: ['Your nest is your strength.', 'Care for yourself first. Then others.', 'Home is where your power grows.'], metaphorFrequency: 'high' },
    ritualSuggestions: { daily: 'Morning nurture — what needs care today', weekly: 'Family check-in — how is everyone doing', monthly: 'Home audit — what needs fixing, what needs love', annual: 'Legacy of care — who have you nurtured, how' },
  },
  leo: {
    colorPalette: { primary: '#F39C12', secondary: '#E67E22', accent: '#C0392B', background: '#FEF5E7', text: '#2C3E50', success: '#F1C40F', warning: '#E74C3C' },
    typography: { heading: '"Abril Fatface", serif', body: '"Lato", sans-serif', mono: '"Fira Code", monospace', style: 'Dramatic, bold, theatrical' },
    metaphor: { visual: 'Stage, spotlight, theater, red carpet', layout: 'Center stage, audience view, performance metrics', animation: 'Spotlight, curtain rise, applause', icons: ['crown', 'star', 'microphone', 'trophy'] },
    taskPresentation: { style: 'Performance slots (acts, scenes, shows)', cardDescription: 'Playbill with billing, reviews', progressLabel: 'Audience engagement', dueDateTemplate: 'Opening night: {{date}}' },
    progressVisualization: { type: 'Stage completion, show quality, audience size', fillDescription: 'Acts completed, scenes rehearsed', milestones: ['Rehearsal', 'Preview', 'Opening night', 'Encore'], celebrationStyle: 'Standing ovation, curtain call, trophy' },
    schedulingPhilosophy: { blockStyle: 'Performance sessions (rehearse, perform, review)', restStyle: 'Recovery between shows', energyPattern: 'Peak performance, dramatic entrances', calendarView: 'Show schedule, tour dates' },
    coachingTone: { style: 'Director, star, showman', exampleMessages: ['The stage is yours. Own it.', 'That performance? Oscar-worthy.', 'The audience is waiting. Give them a show.'], metaphorFrequency: 'high' },
    ritualSuggestions: { daily: "Morning rehearsal — practice today's performance", weekly: 'Show review — what worked, what bombed, what to improve', monthly: 'Season planning — what shows, what roles', annual: 'Career retrospective — greatest hits, next blockbuster' },
  },
  virgo: {
    colorPalette: { primary: '#7D3C98', secondary: '#8E44AD', accent: '#2ECC71', background: '#F4F6F7', text: '#2C3E50', success: '#27AE60', warning: '#F39C12' },
    typography: { heading: '"Roboto Slab", serif', body: '"Roboto", sans-serif', mono: '"JetBrains Mono", monospace', style: 'Clean, precise, analytical' },
    metaphor: { visual: 'Laboratory, workshop, spreadsheet, code', layout: 'Grid, organized, labeled, categorized', animation: 'Data sorting, optimization, refinement', icons: ['microscope', 'gear', 'checklist', 'graph'] },
    taskPresentation: { style: 'Experiments (hypothesis, method, result)', cardDescription: 'Lab notebook entry with data', progressLabel: 'Precision level', dueDateTemplate: 'Analysis complete by {{date}}' },
    progressVisualization: { type: 'Data charts, efficiency graphs, quality metrics', fillDescription: 'Accuracy improving, errors decreasing', milestones: ['Hypothesis', 'Experiment', 'Analysis', 'Conclusion'], celebrationStyle: 'Breakthrough discovery, peer review approval' },
    schedulingPhilosophy: { blockStyle: 'Analysis sessions (deep focus, no interruption)', restStyle: 'Mental reset, data-free time', energyPattern: 'Steady, methodical, detail-oriented', calendarView: 'Project phases, review cycles' },
    coachingTone: { style: 'Scientist, editor, quality controller', exampleMessages: ["The data doesn't lie. What does it tell you?", 'That process? 15% more efficient. Well done.', 'Perfection is asymptotic. Keep refining.'], metaphorFrequency: 'medium' },
    ritualSuggestions: { daily: 'Morning calibration — check systems, review data', weekly: 'Lab report — what worked, what failed, what\'s next', monthly: 'Process audit — inefficiencies, optimizations', annual: 'Research review — publications, discoveries, next study' },
  },
  libra: {
    colorPalette: { primary: '#E91E63', secondary: '#9C27B0', accent: '#00BCD4', background: '#FCE4EC', text: '#2C3E50', success: '#4CAF50', warning: '#FF9800' },
    typography: { heading: '"Montserrat", sans-serif', body: '"Open Sans", sans-serif', mono: '"Source Code Pro", monospace', style: 'Balanced, elegant, symmetrical' },
    metaphor: { visual: 'Scale, balance beam, mirror, partnership', layout: 'Symmetrical, balanced, centered', animation: 'Balancing, weighing, harmonizing', icons: ['scale', 'heart', 'handshake', 'mirror'] },
    taskPresentation: { style: 'Negotiations (proposals, counter-proposals, agreements)', cardDescription: 'Contract with terms, signatures', progressLabel: 'Balance level', dueDateTemplate: 'Agreement by {{date}}' },
    progressVisualization: { type: 'Scale, balance beam, harmony meter', fillDescription: 'Balance improving, conflicts resolving', milestones: ['Proposal', 'Negotiation', 'Agreement', 'Partnership'], celebrationStyle: 'Handshake, signed contract, harmony achieved' },
    schedulingPhilosophy: { blockStyle: 'Collaboration sessions (2+ people, balanced input)', restStyle: 'Solo reflection, rebalancing', energyPattern: 'Social, diplomatic, consensus-building', calendarView: 'Meeting-heavy, partnership-focused' },
    coachingTone: { style: 'Diplomat, mediator, partner', exampleMessages: ['Balance is not 50/50. It\'s 100/100.', "That conflict? There's a win-win. Find it.", 'Your strength is your fairness.'], metaphorFrequency: 'high' },
    ritualSuggestions: { daily: 'Morning balance check — what needs harmony today', weekly: 'Partnership review — relationships, agreements, conflicts', monthly: "Justice audit — what's fair, what needs rebalancing", annual: 'Alliance map — key partnerships, new collaborations' },
  },
  scorpio: {
    colorPalette: { primary: '#8E44AD', secondary: '#2C3E50', accent: '#C0392B', background: '#F5F5F5', text: '#ECF0F1', success: '#27AE60', warning: '#E74C3C' },
    typography: { heading: '"Cinzel", serif', body: '"Lato", sans-serif', mono: '"Fira Code", monospace', style: 'Mysterious, intense, transformative' },
    metaphor: { visual: 'Phoenix, shadow, underworld, rebirth', layout: 'Dark mode, hidden depths, layers', animation: 'Burning, rising, transforming, emerging', icons: ['phoenix', 'snake', 'key', 'shadow', 'flame'] },
    taskPresentation: { style: 'Missions (undercover, intense, transformative)', cardDescription: 'Secret file with clearance level', progressLabel: 'Depth reached', dueDateTemplate: 'Transformation complete by {{date}}' },
    progressVisualization: { type: 'Depth meter, shadow integration, rebirth cycle', fillDescription: 'Darkness explored, light reclaimed', milestones: ['Descent', 'Crisis', 'Transformation', 'Rebirth'], celebrationStyle: 'Phoenix rising, shadow embraced, power reclaimed' },
    schedulingPhilosophy: { blockStyle: 'Deep dives (intense, uninterrupted, transformative)', restStyle: 'Integration time, not avoidance', energyPattern: 'All-or-nothing, passionate, obsessive', calendarView: 'Transformation phases, not daily tasks' },
    coachingTone: { style: 'Mystic, detective, alchemist', exampleMessages: ['The shadow holds your power. Dive in.', "That crisis? It's a cocoon. Emerge.", "You don't do surface. You do depth."], metaphorFrequency: 'high' },
    ritualSuggestions: { daily: 'Morning descent — what shadow needs light today', weekly: 'Phoenix review — what died, what was reborn', monthly: 'Underworld journey — deep fears, hidden powers', annual: 'Great transformation — what must die for you to grow' },
  },
  sagittarius: {
    colorPalette: { primary: '#E67E22', secondary: '#D35400', accent: '#F1C40F', background: '#FEF5E7', text: '#2C3E50', success: '#27AE60', warning: '#E74C3C' },
    typography: { heading: '"Raleway", sans-serif', body: '"Open Sans", sans-serif', mono: '"Inconsolata", monospace', style: 'Adventurous, open, expansive' },
    metaphor: { visual: 'Map, compass, horizon, caravan', layout: 'Wide, expansive, journey-oriented', animation: 'Traveling, discovering, horizon expanding', icons: ['compass', 'map', 'arrow', 'horse', 'star'] },
    taskPresentation: { style: 'Expeditions (journeys, not tasks)', cardDescription: 'Map marker with terrain difficulty', progressLabel: 'Miles traveled', dueDateTemplate: 'Arrive by {{date}}' },
    progressVisualization: { type: 'Map exploration, territory discovered, horizon expanded', fillDescription: 'Land mapped, paths blazed', milestones: ['Departure', 'First sighting', 'Arrival', 'New horizon'], celebrationStyle: 'Flag planting, new land, vista view' },
    schedulingPhilosophy: { blockStyle: 'Expeditions (long, immersive, adventurous)', restStyle: 'Campfire time, story sharing', energyPattern: 'Burst, explore, rest, repeat', calendarView: 'Journey phases, destination-based' },
    coachingTone: { style: 'Explorer, philosopher, adventurer', exampleMessages: ['The horizon is calling. Pack your bags.', "That path? No one's walked it. You first.", 'The journey is the destination. Enjoy the view.'], metaphorFrequency: 'high' },
    ritualSuggestions: { daily: 'Morning compass check — where are you heading today', weekly: 'Expedition review — what did you discover, what\'s next', monthly: 'Horizon scan — new territories, new adventures', annual: '1-year journey map' },
  },
}

// ─── Archetype Name Generator ─────────────────────────────────────────────────

// Sun sign name components (primary identity words)
const SUN_SIGN_NAME_WORDS: Record<string, string[]> = {
  capricorn:   ['Mountain', 'Summit', 'Ridge', 'Forge', 'Peak', 'Stone'],
  aquarius:    ['Network', 'Circuit', 'Signal', 'Wave', 'Node', 'Arc'],
  pisces:      ['Dream', 'Ocean', 'Tide', 'Mist', 'Current', 'Drift'],
  aries:       ['Flame', 'Blaze', 'Charge', 'Strike', 'Spark', 'Conquest'],
  taurus:      ['Foundation', 'Grove', 'Hearth', 'Root', 'Harvest', 'Earth'],
  gemini:      ['Thread', 'Echo', 'Bridge', 'Weave', 'Link', 'Signal'],
  cancer:      ['Nest', 'Shell', 'Hearth', 'Cradle', 'Moon', 'Harbor'],
  leo:         ['Solar', 'Stage', 'Crown', 'Spotlight', 'Gold', 'Flame'],
  virgo:       ['Precision', 'Lab', 'Crystal', 'Lens', 'Weave', 'Blueprint'],
  libra:       ['Scale', 'Mirror', 'Balance', 'Bridge', 'Accord', 'Prism'],
  scorpio:     ['Shadow', 'Phoenix', 'Depth', 'Veil', 'Forge', 'Ember'],
  sagittarius: ['Horizon', 'Arrow', 'Quest', 'Voyage', 'Star', 'Trail'],
}

// Day Master element modifiers
const DAY_MASTER_MODIFIERS: Record<string, string[]> = {
  wood:  ['Forest', 'Branch', 'Grove', 'Bloom', 'Root'],
  fire:  ['Torch', 'Ember', 'Spark', 'Blaze', 'Hearth'],
  earth: ['Stone', 'Clay', 'Mesa', 'Soil', 'Bedrock'],
  metal: ['Blade', 'Steel', 'Forge', 'Crystal', 'Alloy'],
  water: ['Flow', 'Deep', 'Stream', 'Current', 'Well'],
}

// Strength qualifiers
const STRENGTH_QUALIFIERS: Record<DayMasterStrength, string[]> = {
  strong:   ['Grand', 'True', 'Pure', 'Great', 'Full'],
  weak:     ['Hidden', 'Quiet', 'Still', 'Soft', 'Veiled'],
  balanced: ['Steady', 'Clear', 'Even', 'Whole', 'Aligned'],
}

// Personality code suffixes
const PERSONALITY_SUFFIXES: Record<PersonalityCode, string[]> = {
  sg: ['Command', 'Summit', 'Throne', 'Apex'],
  sp: ['Workshop', 'Craft', 'Method', 'System'],
  ig: ['Vision', 'Fire', 'Quest', 'Leap'],
  ip: ['Dream', 'Flow', 'Dance', 'Tide'],
}

// Known archetype name overrides (spec examples + curated combos)
const ARCHETYPE_NAME_OVERRIDES: Record<string, string> = {
  'capricorn_geng_strong_sg': 'The Mountain Forge',
  'capricorn_geng_strong_sg_6': 'The Mountain Forge',
  'pisces_gui_weak_ip': 'The Deep Dream',
  'leo_bing_strong_ig': 'The Solar Flame',
  'virgo_xin_weak_sp': 'The Precision Lab',
  'scorpio_bing_strong_ig': 'The Phoenix Forge',
  'aquarius_ren_strong_ig': 'The Signal Arc',
  'aries_bing_strong_ig': 'The Blaze Summit',
  'taurus_wu_strong_sg': 'The Stone Harvest',
  'gemini_jia_balanced_ip': 'The Forest Thread',
  'cancer_gui_weak_ip': 'The Moon Current',
  'leo_jia_strong_sg': 'The Solar Grove',
  'sagittarius_jia_strong_ig': 'The Forest Horizon',
  'libra_xin_balanced_sp': 'The Crystal Scale',
}

function generateArchetypeName(
  sunSignKey: string,
  dayElement: string,
  strength: DayMasterStrength,
  personalityCode: PersonalityCode,
  hourIndex?: number,
): string {
  // Check overrides first (no hour in key for override lookup)
  const baseKey = `${sunSignKey}_${dayElement}_${strength}_${personalityCode}`
  if (ARCHETYPE_NAME_OVERRIDES[baseKey]) return ARCHETYPE_NAME_OVERRIDES[baseKey]

  // Compositional generation
  const signWords = SUN_SIGN_NAME_WORDS[sunSignKey] ?? ['Star']
  const elementWords = DAY_MASTER_MODIFIERS[dayElement] ?? ['Core']
  const qualifiers = STRENGTH_QUALIFIERS[strength]
  const suffixes = PERSONALITY_SUFFIXES[personalityCode]

  // Use deterministic selection based on hash of inputs
  const hashVal = hashInputs(sunSignKey, dayElement, strength, personalityCode, hourIndex ?? -1)
  const signWord = signWords[hashVal % signWords.length]
  const elemWord = elementWords[(hashVal >> 4) % elementWords.length]

  // 50% chance to use qualifier, 50% chance to use element+sign pattern
  const useQualifier = (hashVal & 0x10) !== 0
  if (useQualifier) {
    const qualifier = qualifiers[(hashVal >> 8) % qualifiers.length]
    return `The ${qualifier} ${signWord}`
  } else {
    return `The ${elemWord} ${signWord}`
  }
}

function hashInputs(...args: (string | number)[]): number {
  let h = 5381
  for (const a of args) {
    const s = String(a)
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h) ^ s.charCodeAt(i)
      h = h >>> 0 // unsigned 32-bit
    }
  }
  return h
}

// ─── Description Generator ────────────────────────────────────────────────────

const STRENGTH_DESC: Record<DayMasterStrength, string> = {
  strong:   'a powerful, self-assured energy',
  weak:     'a refined, receptive sensitivity',
  balanced: 'a harmonious, adaptable equilibrium',
}

const DAY_ELEMENT_DESC: Record<string, string> = {
  wood:  "Wood's upward growth and vision",
  fire:  "Fire's warmth, inspiration, and clarity",
  earth: "Earth's stability, nurturing, and patience",
  metal: "Metal's precision, discipline, and refinement",
  water: "Water's depth, intuition, and adaptability",
}

const PERSONALITY_DESC: Record<PersonalityCode, string> = {
  sg: 'You execute methodically toward clear objectives, building systems that deliver.',
  sp: 'You master the art of process — quality, craft, and continuous refinement.',
  ig: 'You charge toward your vision with intuitive boldness and creative energy.',
  ip: 'You trust the flow of ideas, letting emergence and creativity guide you.',
}

function generateDescription(
  sunSignName: string,
  sunSignTheme: string,
  dayElement: string,
  dayMasterEn: string,
  strength: DayMasterStrength,
  personalityCode: PersonalityCode,
): string {
  return (
    `${sunSignName}'s ${sunSignTheme} meets ${DAY_ELEMENT_DESC[dayElement] ?? dayElement}, expressed through ${STRENGTH_DESC[strength]}. ` +
    PERSONALITY_DESC[personalityCode]
  )
}

// ─── Sun Sign Theme Labels (short) ────────────────────────────────────────────

const SUN_SIGN_THEMES: Record<string, string> = {
  capricorn: 'ambition and mastery', aquarius: 'innovation and vision',
  pisces: 'intuition and flow', aries: 'courage and action',
  taurus: 'patience and craft', gemini: 'curiosity and connection',
  cancer: 'care and protection', leo: 'expression and radiance',
  virgo: 'precision and service', libra: 'harmony and balance',
  scorpio: 'depth and transformation', sagittarius: 'adventure and wisdom',
}

// ─── Goal Template Generator ──────────────────────────────────────────────────

const DOMAIN_GOAL_TEMPLATES: Record<string, Record<PersonalityCode, string[]>> = {
  career: {
    sg: ['Reach [role] by [date] — define clear milestones', 'Launch [product] with measurable adoption metrics', 'Build a team of [n] that consistently ships on time'],
    sp: ['Achieve mastery in [skill] through deliberate practice', 'Optimize the [process] for 30% efficiency gain', 'Document and systematize [workflow] by [date]'],
    ig: ['Land [dream role] by taking bold, unconventional moves', 'Build [vision] that disrupts [industry]', 'Become known for [expertise] in [community]'],
    ip: ['Explore [field] deeply and let the right path emerge', 'Create [project] that expresses your unique perspective', 'Build a career that evolves with your growing interests'],
  },
  wealth: {
    sg: ['Save $[X] by [date] using automated savings milestones', 'Build $[X] investment portfolio with systematic monthly contributions', 'Achieve $[X] annual revenue by [date]'],
    sp: ['Optimize budget to reduce waste by [X]% each quarter', 'Build diversified income streams systematically', 'Track and refine investment strategy monthly'],
    ig: ['Create passive income of $[X]/month from [source]', 'Launch [business] that generates $[X] in year 1', 'Invest in opportunities aligned with your vision'],
    ip: ['Build wealth doing what you love — [passion] monetized', 'Explore multiple income streams and find what flows naturally', 'Let financial abundance follow meaningful work'],
  },
  health: {
    sg: ['Complete [fitness goal] by [date] with structured plan', 'Build daily habits: [exercise], [sleep], [nutrition] tracked', 'Achieve [health metric] in [X] weeks'],
    sp: ['Perfect a sustainable health routine refined over [X] months', 'Optimize sleep, nutrition, and movement as a system', 'Track biometrics and improve key indicators each quarter'],
    ig: ['Run [race] / achieve [goal] fueled by ambitious drive', 'Transform your body and mind through bold new habits', 'Pursue peak performance — train like an athlete'],
    ip: ['Build a health practice that feels natural and joyful', 'Listen to your body and develop intuitive wellness habits', 'Explore healing practices that resonate deeply'],
  },
  relationships: {
    sg: ['Build [X] deep friendships by [date] with intentional investment', 'Strengthen key relationships through consistent quality time', 'Achieve relationship goals: [milestone] by [date]'],
    sp: ['Develop a relationship nurturing routine — weekly check-ins', 'Learn and apply [communication skill] systematically', 'Build community through regular, meaningful rituals'],
    ig: ['Create a circle of [X] people who inspire and challenge you', 'Pursue the connections that excite and energize you', 'Build relationships that accelerate your shared vision'],
    ip: ['Let relationships deepen organically through authentic presence', 'Explore new communities and let resonant bonds emerge', 'Nurture connections that feel right at a soul level'],
  },
  learning: {
    sg: ['Master [skill/subject] with a structured curriculum by [date]', 'Complete [certification/degree] with milestone-based study plan', 'Read [X] books on [topic] and apply key lessons'],
    sp: ['Build deep expertise in [domain] through deliberate practice', 'Create a learning system: spaced repetition + project application', 'Develop [craft] to a professional standard'],
    ig: ['Learn [skill] and use it to create [bold project]', 'Pursue [field] with passionate curiosity and fast experimentation', 'Become a [title/expert] in [area] that lights you up'],
    ip: ['Follow your curiosity wherever it leads — explore [interest]', 'Learn through doing: build [project] and discover as you go', 'Let learning evolve with your changing passions'],
  },
  legacy: {
    sg: ['Build [legacy project] with a 10-year roadmap and quarterly milestones', 'Create [lasting institution/work] that outlives you', 'Mentor [X] people to their goals in the next [years]'],
    sp: ['Document your knowledge and methods for future generations', 'Build systems and processes that scale beyond you', 'Create a body of work that defines your contribution'],
    ig: ['Create something that changes [industry/community]', 'Build the movement, company, or art that embodies your vision', 'Leave the world transformed by your boldest work'],
    ip: ['Let your legacy emerge from authentic, heartfelt contribution', 'Create art/work/service that flows from your deepest self', 'Build something meaningful at your own pace, in your own way'],
  },
}

function generateGoalTemplates(personalityCode: PersonalityCode): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const [domain, templates] of Object.entries(DOMAIN_GOAL_TEMPLATES)) {
    result[domain] = templates[personalityCode] ?? []
  }
  return result
}

// ─── Task Template Generator ──────────────────────────────────────────────────

const PROJECT_TASK_TEMPLATES: Record<PersonalityCode, (projectName: string) => string[]> = {
  sg: (p) => [
    `Define ${p} scope, deliverables, and success metrics`,
    `Break ${p} into weekly milestones with clear owners`,
    `Complete Phase 1 of ${p} — validate core assumption`,
    `Review ${p} progress against plan — adjust if needed`,
    `Ship ${p} v1 — measure impact and document learnings`,
  ],
  sp: (p) => [
    `Research and document best practices for ${p}`,
    `Design the ${p} process/workflow — map each step`,
    `Build ${p} prototype focusing on craft and quality`,
    `Refine ${p} based on detailed review — eliminate waste`,
    `Finalize ${p} — ensure it meets the standard of excellence`,
  ],
  ig: (p) => [
    `Vision: write 1-page bold vision for ${p} outcome`,
    `Identify the 3 biggest bets that will make ${p} succeed`,
    `Execute ${p} sprint 1 — move fast, learn faster`,
    `Validate ${p} with real users — pivot if the data demands it`,
    `Launch ${p} — make noise, measure the response`,
  ],
  ip: (p) => [
    `Explore what ${p} could become — let ideas emerge freely`,
    `Experiment with ${p} approach — try 3 different directions`,
    `Build ${p} prototype using whatever feels most natural`,
    `Share ${p} work-in-progress — gather organic feedback`,
    `Let ${p} evolve — iterate toward what feels right`,
  ],
}

// ─── Energy Hour Calculator ───────────────────────────────────────────────────

const ELEMENT_PEAK_HOURS: Record<string, number[]> = {
  wood:  [6, 7, 8],       // early morning — growth, rising energy
  fire:  [10, 11, 12, 13], // late morning to midday — peak heat
  earth: [8, 9, 13, 14],  // mid-morning & early afternoon — grounded
  metal: [15, 16, 17, 18], // late afternoon — precision sharpens
  water: [21, 22, 23, 0],  // night — depth, introspection
}

const PERSONALITY_PEAK_ADJUSTMENTS: Record<PersonalityCode, number[]> = {
  sg: [8, 9, 10],          // systematic-goal: structured morning focus
  sp: [9, 10, 14, 15],     // systematic-process: mid-morning + afternoon craft
  ig: [11, 12, 13, 20, 21], // intuitive-goal: midday burst + evening insight
  ip: [19, 20, 21, 22],    // intuitive-process: evening creative flow
}

export interface EnergyHourMap {
  peak: number[]           // 0-23, best hours for deep work
  moderate: number[]       // good for lighter tasks
  rest: number[]           // protect — low energy / recovery
}

function calculateEnergyHours(
  dayElement: string,
  personalityCode: PersonalityCode,
  hourIndex?: number,
): EnergyHourMap {
  const elementPeak = ELEMENT_PEAK_HOURS[dayElement] ?? [9, 10, 11]
  const personalityPeak = PERSONALITY_PEAK_ADJUSTMENTS[personalityCode]

  // Merge and deduplicate
  const peakSet = new Set([...elementPeak, ...personalityPeak])

  // If hour pillar known, boost those hours slightly
  if (hourIndex !== undefined) {
    const slot = SHICHEN_SLOTS[hourIndex % 12]
    if (slot) {
      peakSet.add(slot.startHour)
      if (slot.endHour > slot.startHour) {
        peakSet.add(slot.startHour + 1)
      }
    }
  }

  const peak = Array.from(peakSet).sort((a, b) => a - b)
  const allHours = Array.from({ length: 24 }, (_, i) => i)
  const peakHourSet = new Set(peak)

  // Rest hours = 6h window farthest from peak (roughly opposite)
  const peakCenter = peak.reduce((a, b) => a + b, 0) / peak.length
  const restCenter = (peakCenter + 12) % 24
  const rest = allHours.filter(h => {
    const diff = Math.abs(h - restCenter)
    return Math.min(diff, 24 - diff) <= 3
  })

  const restSet = new Set(rest)
  const moderate = allHours.filter(h => !peakHourSet.has(h) && !restSet.has(h))

  return { peak, moderate, rest }
}

// ─── ARCHIE Archetype ID ──────────────────────────────────────────────────────

function buildArchetypeId(
  sunSignKey: string,
  dayMasterRomanized: string,
  strength: DayMasterStrength,
  personalityCode: PersonalityCode,
  hourIndex?: number,
): string {
  const base = `${sunSignKey}_${dayMasterRomanized}_${strength}_${personalityCode}`
  return hourIndex !== undefined ? `${base}_h${hourIndex}` : base
}

// ─── Main ARCHIE Result ───────────────────────────────────────────────────────

export interface ArchieResult {
  // Identity
  archetypeId: string           // e.g. "capricorn_geng_strong_sg"
  archetypeName: string         // e.g. "The Mountain Forge"
  description: string           // combined narrative
  // Inputs
  sunSignId: number
  sunSignKey: string
  sunSignName: string
  isCuspBirth: boolean
  dayMaster: Stem
  dayMasterRomanized: string
  dayMasterEn: string
  dayElement: string
  dayPolarity: string
  strength: DayMasterStrength
  strengthScore: number
  personalityCode: PersonalityCode
  personalityLabel: string
  hourPillarIndex?: number      // 0-11 時辰 index if available
  hourPillarName?: string       // e.g. "子时 (Rat Hour)"
  // BaZi computed
  bazi: {
    yearPillar: string
    monthPillar: string
    dayPillar: string
    hourPillar: string | null
    dominantElement: string
    elementCounts: Record<string, number>
  }
  // Dashboard
  dashboardTokens: DashboardTokens
  // Templates
  goalTemplates: Record<string, string[]>
  taskTemplateFn: string        // personality code for task generation
  energyHours: EnergyHourMap
  // Metadata
  combinationCount: number      // total archetype combinations possible
  calculatedAt: string
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface ArchieInput {
  birthDate: string             // YYYY-MM-DD
  birthTime?: string            // HH:MM (24h), optional
  personalityCode: PersonalityCode
  // Optional: pass pre-calculated BaZi result to skip recalculation
  baziOverride?: BaziResult
  // Optional: override hour index (0-11) from time quiz result
  estimatedHourIndex?: number
}

// ─── Main generate function ───────────────────────────────────────────────────

export function generateArchetype(input: ArchieInput): ArchieResult {
  const { birthDate, birthTime, personalityCode, baziOverride, estimatedHourIndex } = input

  // 1. Parse birth date
  const [year, month, day] = birthDate.split('-').map(Number)

  // 2. Sun sign
  const sunSignResult = calculateSunSign(month, day)

  // 3. BaZi
  let hour: number | undefined
  if (birthTime) {
    hour = parseInt(birthTime.split(':')[0], 10)
  }
  const bazi = baziOverride ?? calculateBazi(year, month, day, hour)

  // 4. Day Master strength
  const strengthResult = calculateDayMasterStrength(bazi)

  // 5. Hour pillar index (0-11 時辰)
  let hourPillarIndex: number | undefined
  let hourPillarName: string | undefined
  if (hour !== undefined) {
    const shichen = hourToShichen(hour)
    hourPillarIndex = shichen.index
    hourPillarName = `${shichen.chineseName} (${shichen.animal} Hour, ${shichen.hours})`
  } else if (estimatedHourIndex !== undefined) {
    const shichen = SHICHEN_SLOTS[estimatedHourIndex % 12]
    if (shichen) {
      hourPillarIndex = shichen.index
      hourPillarName = `${shichen.chineseName} — estimated (${shichen.animal} Hour, ${shichen.hours})`
    }
  }

  // 6. Build archetype ID
  const sunSignKey = sunSignResult.sign.key
  const dayMaster = bazi.dayMaster
  const dayMasterRomanized = DAY_MASTER_ROMANIZED[dayMaster]
  const strength = strengthResult.strength
  const archetypeId = buildArchetypeId(sunSignKey, dayMasterRomanized, strength, personalityCode, hourPillarIndex)

  // 7. Dashboard tokens
  const tokens = SUN_SIGN_DASHBOARD_TOKENS[sunSignKey] ?? SUN_SIGN_DASHBOARD_TOKENS.capricorn

  // 8. Name & description
  const archetypeName = generateArchetypeName(
    sunSignKey, bazi.dayElement, strength, personalityCode, hourPillarIndex
  )
  const description = generateDescription(
    sunSignResult.sign.name,
    SUN_SIGN_THEMES[sunSignKey] ?? 'purpose and growth',
    bazi.dayElement,
    DAY_MASTER_EN[dayMaster],
    strength,
    personalityCode,
  )

  // 9. Goal templates & energy hours
  const goalTemplates = generateGoalTemplates(personalityCode)
  const energyHours = calculateEnergyHours(bazi.dayElement, personalityCode, hourPillarIndex)

  return {
    archetypeId,
    archetypeName,
    description,
    sunSignId: sunSignResult.signId,
    sunSignKey,
    sunSignName: sunSignResult.sign.name,
    isCuspBirth: sunSignResult.isCusp,
    dayMaster,
    dayMasterRomanized,
    dayMasterEn: DAY_MASTER_EN[dayMaster],
    dayElement: bazi.dayElement,
    dayPolarity: bazi.dayPolarity,
    strength,
    strengthScore: strengthResult.score,
    personalityCode,
    personalityLabel: PERSONALITY_TYPES[personalityCode].label,
    hourPillarIndex,
    hourPillarName,
    bazi: {
      yearPillar: bazi.pillarsText.year,
      monthPillar: bazi.pillarsText.month,
      dayPillar: bazi.pillarsText.day,
      hourPillar: bazi.pillarsText.hour,
      dominantElement: bazi.dominantElement,
      elementCounts: bazi.elementCounts,
    },
    dashboardTokens: tokens,
    goalTemplates,
    taskTemplateFn: personalityCode,
    energyHours,
    combinationCount: 17280,
    calculatedAt: new Date().toISOString(),
  }
}

/** Generate task templates for a specific project */
export function generateTaskTemplates(
  personalityCode: PersonalityCode,
  projectName: string,
): string[] {
  return PROJECT_TASK_TEMPLATES[personalityCode](projectName)
}

/** Look up static archetype definition by ID (for GET /api/v1/archetype/:id) */
export function getArchetypeDefinition(archetypeId: string): {
  id: string
  name: string
  description: string
  dashboardTokens: DashboardTokens
} | null {
  // Parse the archetype ID: {sunSign}_{dayMaster}_{strength}_{personality}[_h{n}]
  const parts = archetypeId.split('_')
  if (parts.length < 4) return null

  const [sunSignKey, dayMasterRoman, strengthRaw, personalityCode] = parts
  const strength = strengthRaw as DayMasterStrength
  const pCode = personalityCode as PersonalityCode

  const tokens = SUN_SIGN_DASHBOARD_TOKENS[sunSignKey]
  if (!tokens) return null

  // Find stem by romanization
  const stemEntry = Object.entries(DAY_MASTER_ROMANIZED).find(([, v]) => v === dayMasterRoman)
  const stem = stemEntry?.[0] as Stem | undefined
  const dayElement = stem ? STEM_ELEMENT[stem] : 'earth'

  const name = generateArchetypeName(sunSignKey, dayElement, strength, pCode)
  const signData = SUN_SIGNS.find(s => s.key === sunSignKey)
  const desc = generateDescription(
    signData?.name ?? sunSignKey,
    SUN_SIGN_THEMES[sunSignKey] ?? 'growth',
    dayElement,
    stem ? DAY_MASTER_EN[stem] : '',
    strength,
    pCode,
  )

  return { id: archetypeId, name, description: desc, dashboardTokens: tokens }
}

// Re-export what consumers need
export { SUN_SIGNS } from './sun-sign'
