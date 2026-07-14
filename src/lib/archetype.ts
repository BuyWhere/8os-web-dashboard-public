/**
 * Archetype Calculation Engine
 *
 * Weighted matrix: BaZi 60% + Quiz 40%
 * Output: archetype_id, confidence, dominant_elements, personality_vector
 *
 * Edge cases:
 * - confidence < 0.7 → may output Hybrid Explorer or ask follow-ups
 * - balanced/conflicting BaZi + quiz → Hybrid Explorer
 */

import type { BaziResult } from './bazi'
import type { QuizScoreVector } from './quiz'
import { normalizeScores } from './quiz'

// ─── Archetype Definitions ───────────────────────────────────────────────────

export interface ArchetypeDefinition {
  id: string
  name: string
  tagline: string
  description: string
  icon: string
  color: string
  // BaZi affinity: element → weight (0..1)
  baziElementAffinity: Record<string, number>
  // Polarity bonus
  polarityBonus: { yang: number; yin: number }
  // Ideal quiz normalized profile — keys match normalizeScores() output
  quizProfile: Partial<Record<string, number>>
}

export const ARCHETYPES: ArchetypeDefinition[] = [
  {
    id: 'pioneer',
    name: 'The Pioneer',
    tagline: 'Blazing trails where none exist',
    description: 'Driven, decisive, and always moving forward. You thrive on new beginnings and leading the charge.',
    icon: '🌱',
    color: '#22c55e',
    baziElementAffinity: { wood: 1.0, fire: 0.6, earth: 0.4, metal: 0.3, water: 0.5 },
    polarityBonus: { yang: 1.0, yin: 0.5 },
    quizProfile: { systematic: 0.6, goalDriven: 0.8, futureFocused: 0.8, leaderCharismatic: 0.7 },
  },
  {
    id: 'sage',
    name: 'The Sage',
    tagline: 'Wisdom is the compass',
    description: 'A deep thinker and strategic mind. You seek understanding before acting, and your insights cut to the core.',
    icon: '🌊',
    color: '#3b82f6',
    baziElementAffinity: { water: 1.0, metal: 0.6, wood: 0.5, earth: 0.3, fire: 0.3 },
    polarityBonus: { yang: 0.6, yin: 1.0 },
    quizProfile: { intuitive: 0.65, processDriven: 0.7, rechargeIntrovert: 0.7, leaderStrategic: 0.8 },
  },
  {
    id: 'catalyst',
    name: 'The Catalyst',
    tagline: 'Igniting potential in everything you touch',
    description: 'Magnetic, energetic, and transformative. You inspire others and spark change wherever you go.',
    icon: '🔥',
    color: '#f97316',
    baziElementAffinity: { fire: 1.0, wood: 0.6, earth: 0.5, water: 0.2, metal: 0.3 },
    polarityBonus: { yang: 1.0, yin: 0.4 },
    quizProfile: { intuitive: 0.7, goalDriven: 0.7, rechargeExtrovert: 0.8, leaderCharismatic: 0.9 },
  },
  {
    id: 'architect',
    name: 'The Architect',
    tagline: 'Building systems that outlast you',
    description: 'Precise, strategic, and structured. You see the blueprint in the chaos and craft solutions that scale.',
    icon: '⚙️',
    color: '#94a3b8',
    baziElementAffinity: { metal: 1.0, earth: 0.6, water: 0.4, wood: 0.3, fire: 0.2 },
    polarityBonus: { yang: 1.0, yin: 0.5 },
    quizProfile: { systematic: 0.9, goalDriven: 0.7, leaderStrategic: 0.9, futureFocused: 0.7 },
  },
  {
    id: 'nurturer',
    name: 'The Nurturer',
    tagline: 'Growing the people around you',
    description: 'Empathetic, grounded, and deeply connected. You create environments where people and ideas flourish.',
    icon: '🌍',
    color: '#a16207',
    baziElementAffinity: { earth: 1.0, water: 0.6, wood: 0.5, fire: 0.4, metal: 0.3 },
    polarityBonus: { yang: 0.5, yin: 1.0 },
    quizProfile: { processDriven: 0.7, leaderSupportive: 0.95, rechargeExtrovert: 0.7, stressSocial: 0.6 },
  },
  {
    id: 'innovator',
    name: 'The Innovator',
    tagline: 'Reimagining what is possible',
    description: 'Creative, experimental, and boundary-pushing. You find original solutions and thrive on novelty.',
    icon: '💡',
    color: '#a855f7',
    baziElementAffinity: { wood: 1.0, fire: 0.7, water: 0.5, earth: 0.3, metal: 0.2 },
    polarityBonus: { yang: 0.5, yin: 1.0 },
    quizProfile: { intuitive: 0.8, rechargeCreative: 0.9, processDriven: 0.6 },
  },
  {
    id: 'sentinel',
    name: 'The Sentinel',
    tagline: 'Protecting what matters most',
    description: 'Disciplined, reliable, and sharp. You hold the line, execute with precision, and lead by example.',
    icon: '🛡️',
    color: '#e2e8f0',
    baziElementAffinity: { metal: 1.0, earth: 0.7, water: 0.4, wood: 0.2, fire: 0.2 },
    polarityBonus: { yang: 0.5, yin: 1.0 },
    quizProfile: { systematic: 0.85, stressFocus: 0.8, leaderDemonstrative: 0.8 },
  },
  {
    id: 'mystic',
    name: 'The Mystic',
    tagline: 'Seeing beneath the surface of things',
    description: 'Deeply perceptive, reflective, and visionary. You sense what others miss and draw meaning from patterns.',
    icon: '🌙',
    color: '#818cf8',
    baziElementAffinity: { water: 1.0, fire: 0.6, metal: 0.4, wood: 0.4, earth: 0.2 },
    polarityBonus: { yang: 0.3, yin: 1.0 },
    quizProfile: { intuitive: 0.85, rechargeIntrovert: 0.8, rechargeCreative: 0.7 },
  },
  {
    id: 'builder',
    name: 'The Builder',
    tagline: 'Turning vision into reality, brick by brick',
    description: 'Methodical, persistent, and results-oriented. You take the long view and build things that last.',
    icon: '🏗️',
    color: '#d97706',
    baziElementAffinity: { earth: 1.0, metal: 0.7, wood: 0.5, water: 0.3, fire: 0.4 },
    polarityBonus: { yang: 1.0, yin: 0.5 },
    quizProfile: { systematic: 0.8, goalDriven: 0.75, leaderDemonstrative: 0.7, rechargeKinesthetic: 0.7 },
  },
  {
    id: 'hybrid_explorer',
    name: 'The Hybrid Explorer',
    tagline: 'Thriving in the space between worlds',
    description: 'Fluid, adaptable, and multi-dimensional. Your strength is in synthesis, you bridge opposites and thrive in complexity.',
    icon: '🌀',
    color: '#06b6d4',
    baziElementAffinity: { wood: 0.5, fire: 0.5, earth: 0.5, metal: 0.5, water: 0.5 },
    polarityBonus: { yang: 0.7, yin: 0.7 },
    quizProfile: { intuitive: 0.5, systematic: 0.5, goalDriven: 0.5, processDriven: 0.5 },
  },
]

// ─── Personality Vector ───────────────────────────────────────────────────────

export interface PersonalityVector {
  systematic: number
  intuitive: number
  goalDriven: number
  processDriven: number
  dominantEnergy: string
  dominantStress: string
  leaderCharismatic: number
  leaderDemonstrative: number
  leaderSupportive: number
  leaderStrategic: number
  rechargeExtrovert: number
  rechargeIntrovert: number
  rechargeCreative: number
  rechargeKinesthetic: number
  futureFocused: number
}

// ─── Archetype Result ─────────────────────────────────────────────────────────

export interface ArchetypeEngineResult {
  archetypeId: string
  archetypeName: string
  confidence: number       // 0..1
  dominantElements: string[]
  personalityVector: PersonalityVector
  baziWeight: number
  quizWeight: number
  calculationLog: CalculationLog
  isHybrid: boolean
  hybridSecondary?: string
}

export interface CalculationLog {
  baziScores: Record<string, number>
  quizNormalized: Record<string, number>
  archetypeBaziScores: Record<string, number>
  archetypeQuizScores: Record<string, number>
  archetypeWeightedScores: Record<string, number>
  winner: string
  runnerUp: string
  runnerUpScore: number
}

// ─── Core Calculation ─────────────────────────────────────────────────────────

const BAZI_WEIGHT = 0.6
const QUIZ_WEIGHT = 0.4

export function calculateArchetype(
  bazi: BaziResult,
  quizRaw: QuizScoreVector,
): ArchetypeEngineResult {
  const quizNorm = normalizeScores(quizRaw) as Record<string, number>

  // BaZi scores for each archetype
  const baziScores: Record<string, number> = {}
  for (const arch of ARCHETYPES) {
    const elementScore = arch.baziElementAffinity[bazi.dominantElement] ?? 0.5
    const polarityScore = arch.polarityBonus[bazi.dayPolarity as 'yang' | 'yin'] ?? 0.5
    // Also weight in the day master element specifically
    const dayMasterScore = arch.baziElementAffinity[bazi.dayElement] ?? 0.5
    baziScores[arch.id] = (elementScore * 0.5 + dayMasterScore * 0.3 + polarityScore * 0.2)
  }

  // Quiz scores for each archetype
  const quizScores: Record<string, number> = {}
  for (const arch of ARCHETYPES) {
    let score = 0
    let weight = 0
    for (const [dim, ideal] of Object.entries(arch.quizProfile)) {
      const actual = quizNorm[dim] ?? 0.5
      // Proximity to ideal: 1 - |actual - ideal|
      score += (1 - Math.abs(actual - (ideal as number)))
      weight += 1
    }
    quizScores[arch.id] = weight > 0 ? score / weight : 0.5
  }

  // Combine
  const weightedScores: Record<string, number> = {}
  for (const arch of ARCHETYPES) {
    weightedScores[arch.id] = baziScores[arch.id] * BAZI_WEIGHT + quizScores[arch.id] * QUIZ_WEIGHT
  }

  // Sort descending
  const sorted = Object.entries(weightedScores).sort((a, b) => b[1] - a[1])
  const [winnerId, winnerScore] = sorted[0]
  const [runnerUpId, runnerUpScore] = sorted[1]

  // Confidence: winner's score / (winner + runner-up), normalized
  const totalTop2 = winnerScore + runnerUpScore
  const confidence = totalTop2 > 0 ? winnerScore / totalTop2 : 0.5

  // Hybrid if confidence < 0.55 OR winner is balanced element signals
  const isHybrid = confidence < 0.55 || winnerId === 'hybrid_explorer'
  const finalId = isHybrid ? 'hybrid_explorer' : winnerId
  const finalArch = ARCHETYPES.find(a => a.id === finalId)!

  // Dominant elements (top 2 by count)
  const elemEntries = Object.entries(bazi.elementCounts).sort((a, b) => b[1] - a[1])
  const dominantElements = elemEntries.slice(0, 2).map(([el]) => el)

  const personalityVector: PersonalityVector = {
    systematic: quizNorm.systematic ?? 0.5,
    intuitive: quizNorm.intuitive ?? 0.5,
    goalDriven: quizNorm.goalDriven ?? 0.5,
    processDriven: quizNorm.processDriven ?? 0.5,
    dominantEnergy: (quizNorm.dominantEnergy as unknown as string) ?? 'steady',
    dominantStress: (quizNorm.dominantStress as unknown as string) ?? 'focus',
    leaderCharismatic: quizNorm.leaderCharismatic ?? 0.25,
    leaderDemonstrative: quizNorm.leaderDemonstrative ?? 0.25,
    leaderSupportive: quizNorm.leaderSupportive ?? 0.25,
    leaderStrategic: quizNorm.leaderStrategic ?? 0.25,
    rechargeExtrovert: quizNorm.rechargeExtrovert ?? 0.25,
    rechargeIntrovert: quizNorm.rechargeIntrovert ?? 0.25,
    rechargeCreative: quizNorm.rechargeCreative ?? 0.25,
    rechargeKinesthetic: quizNorm.rechargeKinesthetic ?? 0.25,
    futureFocused: quizNorm.futureFocused ?? 0.5,
  }

  return {
    archetypeId: finalId,
    archetypeName: finalArch.name,
    confidence,
    dominantElements,
    personalityVector,
    baziWeight: BAZI_WEIGHT,
    quizWeight: QUIZ_WEIGHT,
    isHybrid,
    hybridSecondary: isHybrid && winnerId !== 'hybrid_explorer' ? winnerId : undefined,
    calculationLog: {
      baziScores,
      quizNormalized: quizNorm,
      archetypeBaziScores: baziScores,
      archetypeQuizScores: quizScores,
      archetypeWeightedScores: weightedScores,
      winner: winnerId,
      runnerUp: runnerUpId,
      runnerUpScore,
    },
  }
}

export function getArchetypeById(id: string): ArchetypeDefinition | undefined {
  return ARCHETYPES.find(a => a.id === id)
}
