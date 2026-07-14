/**
 * Time Quiz — estimates birth hour pillar when birth time is unknown
 *
 * 5 questions narrow the 12 時辰 (shíchen) to 2–3 candidates.
 * Each answer maps to a set of 時辰 with a confidence weight.
 * The engine returns the top candidates for user selection.
 *
 * 12 時辰 (2-hour slots):
 *  0=子(Rat)  23-01   1=丑(Ox)   01-03   2=寅(Tiger) 03-05   3=卯(Rabbit) 05-07
 *  4=辰(Dragon)07-09   5=巳(Snake)09-11   6=午(Horse)11-13   7=未(Goat)  13-15
 *  8=申(Monkey)15-17  9=酉(Rooster)17-19 10=戌(Dog)19-21  11=亥(Pig)  21-23
 */

import { BRANCHES, type Branch } from './bazi'

// ─── 時辰 Definitions ─────────────────────────────────────────────────────────

export interface ShichenSlot {
  index: number       // 0-11
  branch: Branch
  chineseName: string
  animal: string
  hours: string       // e.g. "23:00-01:00"
  startHour: number   // 24h, e.g. 23
  endHour: number     // exclusive
}

export const SHICHEN_SLOTS: ShichenSlot[] = [
  { index: 0,  branch: '子', chineseName: '子时', animal: 'Rat',     hours: '23:00-01:00', startHour: 23, endHour: 1  },
  { index: 1,  branch: '丑', chineseName: '丑时', animal: 'Ox',      hours: '01:00-03:00', startHour: 1,  endHour: 3  },
  { index: 2,  branch: '寅', chineseName: '寅时', animal: 'Tiger',   hours: '03:00-05:00', startHour: 3,  endHour: 5  },
  { index: 3,  branch: '卯', chineseName: '卯时', animal: 'Rabbit',  hours: '05:00-07:00', startHour: 5,  endHour: 7  },
  { index: 4,  branch: '辰', chineseName: '辰时', animal: 'Dragon',  hours: '07:00-09:00', startHour: 7,  endHour: 9  },
  { index: 5,  branch: '巳', chineseName: '巳时', animal: 'Snake',   hours: '09:00-11:00', startHour: 9,  endHour: 11 },
  { index: 6,  branch: '午', chineseName: '午时', animal: 'Horse',   hours: '11:00-13:00', startHour: 11, endHour: 13 },
  { index: 7,  branch: '未', chineseName: '未时', animal: 'Goat',    hours: '13:00-15:00', startHour: 13, endHour: 15 },
  { index: 8,  branch: '申', chineseName: '申时', animal: 'Monkey',  hours: '15:00-17:00', startHour: 15, endHour: 17 },
  { index: 9,  branch: '酉', chineseName: '酉时', animal: 'Rooster', hours: '17:00-19:00', startHour: 17, endHour: 19 },
  { index: 10, branch: '戌', chineseName: '戌时', animal: 'Dog',     hours: '19:00-21:00', startHour: 19, endHour: 21 },
  { index: 11, branch: '亥', chineseName: '亥时', animal: 'Pig',     hours: '21:00-23:00', startHour: 21, endHour: 23 },
]

// ─── Quiz Questions ───────────────────────────────────────────────────────────

export interface TimeQuizOption {
  key: 'a' | 'b' | 'c' | 'd' | 'e' | 'f'
  text: string
  // Weights by 時辰 index (0-11)
  weights: Partial<Record<number, number>>
}

export interface TimeQuizQuestion {
  id: number
  text: string
  options: TimeQuizOption[]
}

export const TIME_QUIZ_QUESTIONS: TimeQuizQuestion[] = [
  {
    id: 1,
    text: 'Your natural energy peak is:',
    options: [
      { key: 'a', text: 'Late night, I think best after midnight',   weights: { 0: 3, 11: 2 } },
      { key: 'b', text: 'Very early morning, before most wake up',    weights: { 1: 2, 2: 3, 3: 2 } },
      { key: 'c', text: 'Morning, 7am-11am feels sharpest',           weights: { 4: 3, 5: 3 } },
      { key: 'd', text: 'Midday, I hit my stride around noon',        weights: { 6: 3, 7: 2 } },
      { key: 'e', text: 'Afternoon/evening, 3pm-7pm is my zone',      weights: { 8: 3, 9: 3 } },
      { key: 'f', text: 'Evening, I come alive after dinner',         weights: { 10: 3, 11: 2 } },
    ],
  },
  {
    id: 2,
    text: 'Your childhood personality was:',
    options: [
      { key: 'a', text: 'Quiet, observant, liked staying up late',    weights: { 0: 3, 11: 2, 10: 1 } },
      { key: 'b', text: 'Active and curious, always up early',         weights: { 2: 3, 3: 3, 4: 2 } },
      { key: 'c', text: 'Social and expressive, loved the daytime',    weights: { 5: 2, 6: 3, 7: 2 } },
      { key: 'd', text: 'Independent adventurer, evening energy',      weights: { 8: 2, 9: 3, 10: 2 } },
    ],
  },
  {
    id: 3,
    text: 'Your parents would have described you as:',
    options: [
      { key: 'a', text: '"Night baby, hard to put down at bedtime"',  weights: { 0: 4, 11: 3 } },
      { key: 'b', text: '"Early riser, up with the sun"',              weights: { 3: 4, 4: 3 } },
      { key: 'c', text: '"Active during the day, sleepy at night"',     weights: { 5: 2, 6: 3, 7: 2 } },
      { key: 'd', text: '"Evening energy, got a second wind at 8pm"',  weights: { 10: 4, 11: 3 } },
    ],
  },
  {
    id: 4,
    text: 'Your best ideas come:',
    options: [
      { key: 'a', text: 'Late at night, alone in the quiet',           weights: { 0: 3, 11: 2, 1: 1 } },
      { key: 'b', text: 'Early morning, fresh and rested',             weights: { 2: 2, 3: 3, 4: 2 } },
      { key: 'c', text: 'During active, social daytime hours',         weights: { 6: 2, 7: 2, 8: 2 } },
      { key: 'd', text: 'Evening, winding down from the day',          weights: { 9: 2, 10: 3 } },
    ],
  },
  {
    id: 5,
    text: 'Your natural sleep pattern is:',
    options: [
      { key: 'a', text: 'Stay up very late, sleep in',                 weights: { 0: 3, 1: 2, 11: 1 } },
      { key: 'b', text: 'Early to bed, early to rise',                 weights: { 2: 2, 3: 3, 4: 2 } },
      { key: 'c', text: 'Regular and consistent, asleep by 10pm',     weights: { 4: 2, 5: 2, 6: 1 } },
      { key: 'd', text: 'Variable, depends on what I\'m doing',       weights: { 7: 1, 8: 1, 9: 1, 10: 1, 11: 1 } },
    ],
  },
]

// ─── Scoring ──────────────────────────────────────────────────────────────────

export type TimeQuizAnswers = Record<number, 'a' | 'b' | 'c' | 'd' | 'e' | 'f'>

export interface ShichenCandidate {
  shichen: ShichenSlot
  score: number
  confidence: number   // 0-1, relative confidence vs. total
  description: string
}

export interface TimeQuizResult {
  candidates: ShichenCandidate[]   // top 2-3, ordered by score
  topHour: number                  // best-estimate hour (startHour of winner)
  message: string                  // user-facing message
}

export function scoreTimeQuiz(answers: TimeQuizAnswers): TimeQuizResult {
  const scores: number[] = Array(12).fill(0)

  for (const [qIdStr, answer] of Object.entries(answers)) {
    const qId = parseInt(qIdStr)
    const q = TIME_QUIZ_QUESTIONS.find(q => q.id === qId)
    if (!q) continue
    const opt = q.options.find(o => o.key === answer)
    if (!opt) continue
    for (const [idxStr, weight] of Object.entries(opt.weights)) {
      scores[parseInt(idxStr)] += weight as number
    }
  }

  const total = scores.reduce((a, b) => a + b, 0) || 1

  // Sort descending, take top 3
  const indexed = scores.map((s, i) => ({ index: i, score: s }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter(x => x.score > 0)

  const candidates: ShichenCandidate[] = indexed.map(({ index, score }) => {
    const slot = SHICHEN_SLOTS[index]
    return {
      shichen: slot,
      score,
      confidence: score / total,
      description: buildDescription(slot),
    }
  })

  const topSlot = candidates[0]?.shichen ?? SHICHEN_SLOTS[6] // noon fallback

  return {
    candidates,
    topHour: topSlot.startHour,
    message: candidates.length > 0
      ? `Based on your answers, you were likely born during ${topSlot.chineseName} (${topSlot.animal} Hour, ${topSlot.hours}).`
      : 'Could not determine a strong candidate, please check birth records if possible.',
  }
}

function buildDescription(slot: ShichenSlot): string {
  const traits: Record<string, string> = {
    '子': 'Rat Hour, Deep thinker, night creative, private mind',
    '丑': 'Ox Hour, Persistent, steady, works through the quiet hours',
    '寅': 'Tiger Hour, Bold, action-oriented, rises before the world wakes',
    '卯': 'Rabbit Hour, Gentle, artistic, early-morning clarity',
    '辰': 'Dragon Hour, Ambitious, charismatic, commands the morning',
    '巳': 'Snake Hour, Wise, introspective, midmorning strategist',
    '午': 'Horse Hour, Dynamic, social, peak-energy leader',
    '未': 'Goat Hour, Creative, empathetic, afternoon dreamer',
    '申': 'Monkey Hour, Clever, quick, afternoon problem-solver',
    '酉': 'Rooster Hour, Precise, detail-oriented, late afternoon executor',
    '戌': 'Dog Hour, Loyal, reflective, evening guardian',
    '亥': 'Pig Hour, Intuitive, nurturing, deep evening thinker',
  }
  return traits[slot.branch] ?? `${slot.chineseName} (${slot.hours})`
}

/** Given a known birth hour (0-23), return the 時辰 it falls in. */
export function hourToShichen(hour: number): ShichenSlot {
  // 子 (Rat) wraps: 23:00-01:00
  if (hour === 23 || hour === 0) return SHICHEN_SLOTS[0]
  for (const slot of SHICHEN_SLOTS.slice(1)) {
    if (hour >= slot.startHour && hour < slot.endHour) return slot
  }
  return SHICHEN_SLOTS[0]
}
