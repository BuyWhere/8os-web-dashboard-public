/**
 * src/lib/behavior-tokens.ts — E-11 (backlog §5) behavior tokens.
 *
 * A DETERMINISTIC function from the existing archetype dimensions — the quiz
 * axes (systematic ⇄ intuitive × goal ⇄ process) and the BaZi Day-Master
 * strength — to a small token set that makes "a genuinely different OS per
 * person" concrete in BEHAVIOR (not paint). The tokens are consumed by:
 *   - the scheduler default block length (deep_blocks 90 vs varied 45),
 *   - the coaching tone in playbooks/shared.ts (directive/terse vs reflective),
 *   - the notification default nudge frequency (surfaced for the E-13 governor).
 *
 * NO hardcoding: every token is computed from the axes below. Two archetypes
 * differing on any input axis must differ on ≥1 token (see the probe).
 *
 * Mapping (doc §5):
 *   nudge_frequency  : process-oriented → lower           (low | medium | high)
 *   brief_tone       : systematic → directive             (directive | reflective)
 *   task_granularity : systematic-goal → fine             (fine | coarse)
 *   scheduling_style : strong Day Master → deep_blocks     (deep_blocks | varied)
 *   challenge_level  : goal-oriented + strong → 3          (1 | 2 | 3)
 */

export type NudgeFrequency = 'low' | 'medium' | 'high'
export type BriefTone = 'directive' | 'reflective'
export type TaskGranularity = 'fine' | 'coarse'
export type SchedulingStyle = 'deep_blocks' | 'varied'
export type ChallengeLevel = 1 | 2 | 3

export interface BehaviorTokens {
  nudge_frequency: NudgeFrequency
  brief_tone: BriefTone
  task_granularity: TaskGranularity
  scheduling_style: SchedulingStyle
  challenge_level: ChallengeLevel
}

export type DayMasterStrength = 'strong' | 'weak' | 'balanced'

/**
 * The two quiz axes the tokens read. Values are 0..1 normalized scores where
 * `systematic` and `goalDriven` are the "high" ends of their axes (the quiz
 * normaliser guarantees systematic + intuitive ≈ 1 and goalDriven +
 * processDriven ≈ 1). We read `systematic` / `goalDriven` directly and fall
 * back to the complement of the opposite score, then to 0.5 if neither exists.
 */
export interface PersonalityAxes {
  systematic?: number
  intuitive?: number
  goalDriven?: number
  processDriven?: number
}

const DEFAULT_TOKENS: BehaviorTokens = {
  nudge_frequency: 'medium',
  brief_tone: 'reflective',
  task_granularity: 'coarse',
  scheduling_style: 'varied',
  challenge_level: 2,
}

function axisSystematic(a: PersonalityAxes): number {
  if (typeof a.systematic === 'number') return a.systematic
  if (typeof a.intuitive === 'number') return 1 - a.intuitive
  return 0.5
}
function axisGoalDriven(a: PersonalityAxes): number {
  if (typeof a.goalDriven === 'number') return a.goalDriven
  if (typeof a.processDriven === 'number') return 1 - a.processDriven
  return 0.5
}

/**
 * Deterministically compute the behavior tokens from the archetype dimensions.
 * Pure function — same inputs always yield the same tokens.
 */
export function computeBehaviorTokens(input: {
  personalityAxes: PersonalityAxes
  dayMasterStrength?: DayMasterStrength | null
}): BehaviorTokens {
  const systematic = axisSystematic(input.personalityAxes) // 0..1, high = systematic
  const goalDriven = axisGoalDriven(input.personalityAxes) // 0..1, high = goal-oriented
  const strong = input.dayMasterStrength === 'strong'

  const isSystematic = systematic >= 0.5
  const isGoalDriven = goalDriven >= 0.5
  const isProcess = !isGoalDriven

  // nudge_frequency: process-oriented → lower. The more process-oriented (lower
  // goalDriven), the fewer nudges. Thresholds bucket the goalDriven score.
  let nudge_frequency: NudgeFrequency
  if (goalDriven >= 0.66) nudge_frequency = 'high'
  else if (goalDriven >= 0.4) nudge_frequency = 'medium'
  else nudge_frequency = 'low'

  // brief_tone: systematic → directive, else reflective.
  const brief_tone: BriefTone = isSystematic ? 'directive' : 'reflective'

  // task_granularity: systematic-goal → fine, else coarse.
  const task_granularity: TaskGranularity = isSystematic && isGoalDriven ? 'fine' : 'coarse'

  // scheduling_style: strong Day Master → deep_blocks, else varied.
  const scheduling_style: SchedulingStyle = strong ? 'deep_blocks' : 'varied'

  // challenge_level: goal-oriented + strong → 3; goal-oriented OR strong → 2;
  // process-oriented + not strong → 1.
  let challenge_level: ChallengeLevel
  if (isGoalDriven && strong) challenge_level = 3
  else if (isGoalDriven || strong) challenge_level = 2
  else challenge_level = 1
  void isProcess

  return { nudge_frequency, brief_tone, task_granularity, scheduling_style, challenge_level }
}

/**
 * Narrow arbitrary JSON to a valid BehaviorTokens, or null if malformed.
 */
export function coerceBehaviorTokens(raw: unknown): BehaviorTokens | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const nudge = r.nudge_frequency
  const tone = r.brief_tone
  const gran = r.task_granularity
  const style = r.scheduling_style
  const chal = r.challenge_level
  if (
    (nudge === 'low' || nudge === 'medium' || nudge === 'high') &&
    (tone === 'directive' || tone === 'reflective') &&
    (gran === 'fine' || gran === 'coarse') &&
    (style === 'deep_blocks' || style === 'varied') &&
    (chal === 1 || chal === 2 || chal === 3)
  ) {
    return {
      nudge_frequency: nudge,
      brief_tone: tone,
      task_granularity: gran,
      scheduling_style: style,
      challenge_level: chal,
    }
  }
  return null
}

/**
 * Default scheduling block length (minutes) implied by the scheduling_style
 * token: deep_blocks → 90, varied → 45 (doc §5 / E-11 scheduler defaults).
 */
export function defaultBlockMinutes(style: SchedulingStyle): number {
  return style === 'deep_blocks' ? 90 : 45
}

/** Defaults used when a user has no computed tokens yet. */
export function defaultBehaviorTokens(): BehaviorTokens {
  return { ...DEFAULT_TOKENS }
}

/**
 * Read the stored behavior tokens for a user from their ArchetypeResult.
 * If the row exists but `behavior_tokens` is absent (pre-backfill / a race),
 * recompute deterministically from the stored axes + Day-Master strength so a
 * caller always gets a coherent set. Returns the defaults when there is no
 * archetype at all. Never throws — scheduling/coaching must stay defensive.
 *
 * Uses raw SQL for the additive column (the Prisma client may not yet know it
 * on a drifted deploy). Server-only (imports prisma lazily).
 */
export async function getBehaviorTokens(userId: string): Promise<BehaviorTokens> {
  try {
    const { prisma } = await import('@/lib/db/prisma')
    // NOTE: archetype_results uses QUOTED camelCase columns ("personalityVector",
    // "calculationLog", "userId"); only behavior_tokens is snake_case (@map).
    const rows = await prisma.$queryRawUnsafe<
      { behavior_tokens: unknown; personalityVector: unknown; calculationLog: unknown }[]
    >(
      `SELECT behavior_tokens, "personalityVector", "calculationLog"
         FROM archetype_results WHERE "userId" = $1 LIMIT 1`,
      userId,
    )
    const row = rows[0]
    if (!row) return defaultBehaviorTokens()

    const stored = coerceBehaviorTokens(row.behavior_tokens)
    if (stored) return stored

    // Fallback: recompute from stored axes + strength (keeps behavior coherent
    // before the backfill lands).
    const pv = (row.personalityVector ?? {}) as Record<string, unknown>
    const log = (row.calculationLog ?? {}) as Record<string, unknown>
    const strength = (log.strength as DayMasterStrength | undefined) ?? null
    return computeBehaviorTokens({
      personalityAxes: {
        systematic: typeof pv.systematic === 'number' ? pv.systematic : undefined,
        intuitive: typeof pv.intuitive === 'number' ? pv.intuitive : undefined,
        goalDriven: typeof pv.goalDriven === 'number' ? pv.goalDriven : undefined,
        processDriven: typeof pv.processDriven === 'number' ? pv.processDriven : undefined,
      },
      dayMasterStrength: strength,
    })
  } catch {
    return defaultBehaviorTokens()
  }
}
