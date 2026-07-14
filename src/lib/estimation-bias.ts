/**
 * src/lib/estimation-bias.ts — E-12 (backlog §5) estimation-learning helpers.
 *
 * Per-user, per-goal-domain planning-fallacy correction. On each task
 * completion that carries a real actual duration, we fold (actual / estimated)
 * into an EMA bias factor for that domain, clamped 0.5–3.0. `findBestSlot` then
 * pads a task's estimate by the domain factor + a transition buffer, and the
 * schedule response is HONEST about the padding.
 *
 * Relation-free `estimation_bias` table (raw SQL) so it survives prod DB drift.
 * Everything here is defensive and never throws into the caller path.
 */
import { prisma } from '@/lib/db/prisma'

export const BIAS_MIN = 0.5
export const BIAS_MAX = 3.0
export const EMA_ALPHA = 0.35 // weight on the newest sample
export const TRANSITION_BUFFER_MIN = 10 // minutes added after padding

export function clampFactor(f: number): number {
  if (!Number.isFinite(f)) return 1.0
  return Math.min(BIAS_MAX, Math.max(BIAS_MIN, f))
}

export interface BiasRow {
  factor: number
  sampleCount: number
}

/** Read the current bias row for (user, domain), or null if none yet. */
export async function getBias(userId: string, domainId: string): Promise<BiasRow | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ factor: number; sample_count: number }[]>(
      `SELECT factor, sample_count FROM estimation_bias WHERE user_id = $1 AND domain_id = $2 LIMIT 1`,
      userId,
      domainId,
    )
    const r = rows[0]
    if (!r) return null
    return { factor: clampFactor(Number(r.factor)), sampleCount: Number(r.sample_count) }
  } catch {
    return null
  }
}

/**
 * The multiplier findBestSlot should apply to a domain's estimate. Defaults to
 * 1.0 (no padding) when there is no learned factor. Always clamped.
 */
export async function getBiasFactor(userId: string, domainId: string | null | undefined): Promise<number> {
  if (!domainId) return 1.0
  const row = await getBias(userId, domainId)
  return row ? clampFactor(row.factor) : 1.0
}

/**
 * Fold one completion sample (actualMinutes / estimatedMinutes) into the EMA
 * for (user, domain). Seeds the factor with the first observed ratio, then
 * blends subsequent ratios with EMA_ALPHA. Returns the new clamped factor.
 * Best-effort: on any error returns 1.0 without throwing.
 */
export async function updateBias(
  userId: string,
  domainId: string,
  estimatedMinutes: number,
  actualMinutes: number,
): Promise<number> {
  if (!(estimatedMinutes > 0) || !(actualMinutes > 0)) return 1.0
  const ratio = clampFactor(actualMinutes / estimatedMinutes)
  try {
    const existing = await getBias(userId, domainId)
    let next: number
    let count: number
    if (!existing || existing.sampleCount <= 0) {
      next = ratio
      count = 1
    } else {
      next = clampFactor(existing.factor * (1 - EMA_ALPHA) + ratio * EMA_ALPHA)
      count = existing.sampleCount + 1
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO estimation_bias (user_id, domain_id, factor, sample_count, updated_at)
         VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (user_id, domain_id)
         DO UPDATE SET factor = EXCLUDED.factor, sample_count = EXCLUDED.sample_count, updated_at = now()`,
      userId,
      domainId,
      next,
      count,
    )
    return next
  } catch {
    return 1.0
  }
}

/**
 * Apply a domain's bias factor to a raw estimate and add the transition buffer.
 * Returns the padded minutes (rounded) plus the pieces for an honest message.
 */
export function padEstimate(rawMinutes: number, factor: number): {
  paddedMinutes: number
  factor: number
  buffer: number
  padded: boolean
} {
  const f = clampFactor(factor)
  const padded = f > 1.01
  const base = Math.round(rawMinutes * f)
  const paddedMinutes = padded ? base + TRANSITION_BUFFER_MIN : rawMinutes
  return { paddedMinutes, factor: f, buffer: padded ? TRANSITION_BUFFER_MIN : 0, padded }
}

/**
 * Honest one-line note about padding, e.g.
 * "Your career tasks run 1.6× your estimates — padded (+10m buffer)."
 * Returns null when no padding was applied.
 */
export function paddingNote(domainId: string, factor: number): string | null {
  const f = clampFactor(factor)
  if (f <= 1.01) return null
  return `Your ${domainId} tasks run ${f.toFixed(1)}× your estimates, padded (+${TRANSITION_BUFFER_MIN}m buffer).`
}
