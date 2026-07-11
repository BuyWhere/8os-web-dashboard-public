/**
 * Quiz Engine — 10 adaptive questions
 * Scoring dimensions:
 *   systematic / intuitive
 *   goal_driven / process_driven
 *   energy_pattern  (morning | afternoon | evening | steady)
 *   stress_response (focus | withdraw | social | physical)
 *   leadership      (charismatic | demonstrative | supportive | strategic)
 *   recharge        (social | introspective | creative | kinesthetic)
 */

export interface QuizOption {
  key: 'a' | 'b' | 'c' | 'd'
  text: string
  scores: Partial<QuizScoreVector>
}

export interface QuizQuestion {
  id: number
  text: string
  options: QuizOption[]
  // If this baziElement is strongly present, this question can be skipped
  skipIfBaziElement?: string
}

export interface QuizScoreVector {
  systematic: number
  intuitive: number
  goalDriven: number
  processDriven: number
  energyMorning: number
  energyAfternoon: number
  energyEvening: number
  energySteady: number
  stressFocus: number
  stressWithdraw: number
  stressSocial: number
  stressPhysical: number
  leaderCharismatic: number
  leaderDemonstrative: number
  leaderSupportive: number
  leaderStrategic: number
  rechargeExtrovert: number
  rechargeIntrovert: number
  rechargeCreative: number
  rechargeKinesthetic: number
  futureFocused: number
  presentFocused: number
}

export const EMPTY_SCORE = (): QuizScoreVector => ({
  systematic: 0, intuitive: 0,
  goalDriven: 0, processDriven: 0,
  energyMorning: 0, energyAfternoon: 0, energyEvening: 0, energySteady: 0,
  stressFocus: 0, stressWithdraw: 0, stressSocial: 0, stressPhysical: 0,
  leaderCharismatic: 0, leaderDemonstrative: 0, leaderSupportive: 0, leaderStrategic: 0,
  rechargeExtrovert: 0, rechargeIntrovert: 0, rechargeCreative: 0, rechargeKinesthetic: 0,
  futureFocused: 0, presentFocused: 0,
})

export const QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    text: 'How do you approach a new project?',
    options: [
      { key: 'a', text: 'Jump in — figure it out as I go', scores: { intuitive: 2, energyMorning: 1 } },
      { key: 'b', text: 'Plan thoroughly before starting', scores: { systematic: 2, goalDriven: 1 } },
      { key: 'c', text: 'Consult others, then decide together', scores: { leaderSupportive: 2, rechargeExtrovert: 1 } },
      { key: 'd', text: 'Wait for the right moment and conditions', scores: { processDriven: 2, rechargeIntrovert: 1 } },
    ],
  },
  {
    id: 2,
    text: 'Your ideal work environment is:',
    options: [
      { key: 'a', text: 'Dynamic and constantly changing', scores: { intuitive: 2, futureFocused: 1 } },
      { key: 'b', text: 'Structured with clear expectations', scores: { systematic: 2, goalDriven: 1 } },
      { key: 'c', text: 'Collaborative — people-first', scores: { rechargeExtrovert: 2, leaderSupportive: 1 } },
      { key: 'd', text: 'Independent — I work best alone', scores: { rechargeIntrovert: 2, leaderStrategic: 1 } },
    ],
  },
  {
    id: 3,
    text: 'When you face a difficult problem, you:',
    options: [
      { key: 'a', text: 'Trust your gut and act quickly', scores: { intuitive: 2, stressFocus: 1 } },
      { key: 'b', text: 'Analyze all available data first', scores: { systematic: 2, processDriven: 1 } },
      { key: 'c', text: 'Brainstorm many creative solutions', scores: { rechargeCreative: 2, intuitive: 1 } },
      { key: 'd', text: 'Look for proven methods that work', scores: { goalDriven: 2, systematic: 1 } },
    ],
    skipIfBaziElement: 'metal',
  },
  {
    id: 4,
    text: 'Your natural energy peaks during:',
    options: [
      { key: 'a', text: 'Morning — sharp and clear-headed', scores: { energyMorning: 3 } },
      { key: 'b', text: 'Afternoon — in full stride', scores: { energyAfternoon: 3 } },
      { key: 'c', text: 'Evening or night — I come alive late', scores: { energyEvening: 3 } },
      { key: 'd', text: 'Consistent throughout the day', scores: { energySteady: 3 } },
    ],
  },
  {
    id: 5,
    text: 'When under significant stress, you:',
    options: [
      { key: 'a', text: 'Get more focused and push through', scores: { stressFocus: 3, goalDriven: 1 } },
      { key: 'b', text: 'Withdraw and need alone time to recover', scores: { stressWithdraw: 3, rechargeIntrovert: 1 } },
      { key: 'c', text: 'Talk it out with someone I trust', scores: { stressSocial: 3, rechargeExtrovert: 1 } },
      { key: 'd', text: 'Exercise, move, or do something physical', scores: { stressPhysical: 3, rechargeKinesthetic: 1 } },
    ],
  },
  {
    id: 6,
    text: 'What primarily drives you?',
    options: [
      { key: 'a', text: 'Achievement and measurable results', scores: { goalDriven: 3, leaderCharismatic: 1 } },
      { key: 'b', text: 'Learning, growth, and mastery', scores: { processDriven: 3, rechargeCreative: 1 } },
      { key: 'c', text: 'Connection and a sense of belonging', scores: { rechargeExtrovert: 2, leaderSupportive: 2 } },
      { key: 'd', text: 'Security, stability, and peace of mind', scores: { systematic: 2, stressWithdraw: 1 } },
    ],
    skipIfBaziElement: 'water',
  },
  {
    id: 7,
    text: 'In decision-making, you most value:',
    options: [
      { key: 'a', text: 'Speed — done is better than perfect', scores: { intuitive: 2, goalDriven: 1 } },
      { key: 'b', text: 'Quality — every detail matters', scores: { systematic: 2, processDriven: 2 } },
      { key: 'c', text: 'Consensus — everyone should agree', scores: { leaderSupportive: 2, rechargeExtrovert: 1 } },
      { key: 'd', text: 'Data — numbers and facts first', scores: { systematic: 2, leaderStrategic: 1 } },
    ],
  },
  {
    id: 8,
    text: 'Your natural leadership style is:',
    options: [
      { key: 'a', text: 'Lead from the front — inspire through energy', scores: { leaderCharismatic: 3, futureFocused: 1 } },
      { key: 'b', text: 'Lead by example — show, don\'t tell', scores: { leaderDemonstrative: 3, processDriven: 1 } },
      { key: 'c', text: 'Coach and support others to grow', scores: { leaderSupportive: 3, rechargeExtrovert: 1 } },
      { key: 'd', text: 'Set the vision and delegate clearly', scores: { leaderStrategic: 3, goalDriven: 1 } },
    ],
    skipIfBaziElement: 'fire',
  },
  {
    id: 9,
    text: 'You recharge best by:',
    options: [
      { key: 'a', text: 'Social gatherings and meeting new people', scores: { rechargeExtrovert: 3, stressSocial: 1 } },
      { key: 'b', text: 'Quiet time alone — reading, thinking', scores: { rechargeIntrovert: 3, stressWithdraw: 1 } },
      { key: 'c', text: 'Creative hobbies — art, music, writing', scores: { rechargeCreative: 3, intuitive: 1 } },
      { key: 'd', text: 'Physical activity — exercise, sport, nature', scores: { rechargeKinesthetic: 3, stressPhysical: 1 } },
    ],
  },
  {
    id: 10,
    text: 'Your relationship with time is:',
    options: [
      { key: 'a', text: 'Future-focused — always planning ahead', scores: { futureFocused: 3, goalDriven: 1 } },
      { key: 'b', text: 'Present-focused — fully in the moment', scores: { presentFocused: 3, intuitive: 1 } },
      { key: 'c', text: 'Past-informed — I learn from history', scores: { systematic: 2, processDriven: 1 } },
      { key: 'd', text: 'Fluid — time bends to what matters', scores: { intuitive: 2, rechargeCreative: 1 } },
    ],
  },
]

export interface QuizAnswers {
  [questionId: number]: 'a' | 'b' | 'c' | 'd'
}

export function scoreQuiz(answers: QuizAnswers): QuizScoreVector {
  const total = EMPTY_SCORE()
  for (const [qIdStr, answer] of Object.entries(answers)) {
    const qId = parseInt(qIdStr)
    const question = QUESTIONS.find(q => q.id === qId)
    if (!question) continue
    const option = question.options.find(o => o.key === answer)
    if (!option) continue
    for (const [key, val] of Object.entries(option.scores)) {
      (total as Record<string, number>)[key] = ((total as Record<string, number>)[key] || 0) + (val as number)
    }
  }
  return total
}

/**
 * Determine which questions to skip based on BaZi signals.
 * If a BaZi element has count >= 3, its associated question can be skipped.
 */
export function getSkipQuestions(baziElementCounts: Record<string, number>): Set<number> {
  const skip = new Set<number>()
  for (const q of QUESTIONS) {
    if (q.skipIfBaziElement && baziElementCounts[q.skipIfBaziElement] >= 3) {
      skip.add(q.id)
    }
  }
  return skip
}

/**
 * Normalize a score vector to [0, 1] range per dimension pair.
 */
export function normalizeScores(raw: QuizScoreVector): Record<string, number> {
  const s = raw as Record<string, number>
  const normalize = (a: string, b: string): [string, number, string, number] => {
    const total = s[a] + s[b]
    if (total === 0) return [a, 0.5, b, 0.5]
    return [a, s[a] / total, b, s[b] / total]
  }
  const [, systematic, , intuitive] = normalize('systematic', 'intuitive')
  const [, goalDriven, , processDriven] = normalize('goalDriven', 'processDriven')

  const energyTotal = s.energyMorning + s.energyAfternoon + s.energyEvening + s.energySteady || 1
  const stressTotal = s.stressFocus + s.stressWithdraw + s.stressSocial + s.stressPhysical || 1
  const leaderTotal = s.leaderCharismatic + s.leaderDemonstrative + s.leaderSupportive + s.leaderStrategic || 1
  const rechargeTotal = s.rechargeExtrovert + s.rechargeIntrovert + s.rechargeCreative + s.rechargeKinesthetic || 1

  const dominantEnergy = energyTotal === 1 ? 'steady' :
    ['morning', 'afternoon', 'evening', 'steady']
      .sort((a, b) => (s[`energy${b.charAt(0).toUpperCase() + b.slice(1)}`] || 0) - (s[`energy${a.charAt(0).toUpperCase() + a.slice(1)}`] || 0))[0]

  const dominantStress = stressTotal === 1 ? 'focus' :
    ['focus', 'withdraw', 'social', 'physical']
      .sort((a, b) => (s[`stress${b.charAt(0).toUpperCase() + b.slice(1)}`] || 0) - (s[`stress${a.charAt(0).toUpperCase() + a.slice(1)}`] || 0))[0]

  return {
    systematic,
    intuitive,
    goalDriven,
    processDriven,
    dominantEnergy,
    dominantStress,
    leaderCharismatic: s.leaderCharismatic / leaderTotal,
    leaderDemonstrative: s.leaderDemonstrative / leaderTotal,
    leaderSupportive: s.leaderSupportive / leaderTotal,
    leaderStrategic: s.leaderStrategic / leaderTotal,
    rechargeExtrovert: s.rechargeExtrovert / rechargeTotal,
    rechargeIntrovert: s.rechargeIntrovert / rechargeTotal,
    rechargeCreative: s.rechargeCreative / rechargeTotal,
    rechargeKinesthetic: s.rechargeKinesthetic / rechargeTotal,
    futureFocused: s.futureFocused / (s.futureFocused + s.presentFocused || 1),
  }
}
