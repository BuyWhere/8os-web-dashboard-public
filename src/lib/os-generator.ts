/**
 * os-generator client library.
 *
 * Wraps POST /api/generate which proxies to the Python os-generator service
 * running on Railway (os-generator.railway.internal).
 *
 * Returns a full OSConfig including archetype, elements, buckets, tone,
 * workflow description, and energy hours.
 */

// ── Types (mirrors os-generator Python models) ─────────────────────────────

export type BaziElement = 'Metal' | 'Wood' | 'Water' | 'Fire' | 'Earth'

export interface QuizAnswers {
  q01: number; q02: number; q03: number; q04: number; q05: number
  q06: number; q07: number; q08: number; q09: number; q10: number
  q11: number; q12: number; q13: number; q14: number; q15: number
}

export interface OSGeneratorRequest {
  birth_date: string           // YYYY-MM-DD
  quiz_answers: QuizAnswers
  name?: string
  goals?: string[]
  domains?: string[]
}

export interface OSGeneratorUser {
  name: string
  bazi_element: BaziElement
  archetype: string
  archetype_descriptor: string
}

export interface OSGeneratorBucket {
  id: string
  label: string
  description: string
  archetype_focus: string
  initial_projects: string[]
}

export interface OSGeneratorEnergyHours {
  peak_windows: string[]
  flexibility: string
  user_adjustable: boolean
}

export interface OSGeneratorConfig {
  schema_version: string
  user: OSGeneratorUser
  buckets: OSGeneratorBucket[]
  workflow_description: string[]
  tone: string
  energy_hours: OSGeneratorEnergyHours | null
  generated_at: string
}

// ── Client ─────────────────────────────────────────────────────────────────

/**
 * Call the os-generator proxy to produce a full OS config.
 */
export async function generateOSConfig(
  req: OSGeneratorRequest
): Promise<OSGeneratorConfig> {
  const resp = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.error ?? `os-generator failed (${resp.status})`)
  }

  return resp.json()
}

/**
 * Convert frontend quiz answers (Record<number, 'a'|'b'|'c'|'d'>)
 * to the 1–10 integer scale expected by the Python os-generator.
 *
 * The mapping is deterministic:
 *   'a' → 2, 'b' → 4, 'c' → 7, 'd' → 9
 *
 * This produces a spread across the 1-10 range while preserving
 * relative ordering.
 */
export function mapQuizAnswersToScale(
  answers: Record<number, string>
): QuizAnswers {
  const toInt = (v: string): number => {
    switch (v) {
      case 'a': return 2
      case 'b': return 4
      case 'c': return 7
      case 'd': return 9
      default:  return 5
    }
  }

  return {
    q01: toInt(answers[1] ?? 'a'),
    q02: toInt(answers[2] ?? 'a'),
    q03: toInt(answers[3] ?? 'a'),
    q04: toInt(answers[4] ?? 'a'),
    q05: toInt(answers[5] ?? 'a'),
    q06: toInt(answers[6] ?? 'a'),
    q07: toInt(answers[7] ?? 'a'),
    q08: toInt(answers[8] ?? 'a'),
    q09: toInt(answers[9] ?? 'a'),
    q10: toInt(answers[10] ?? 'a'),
    q11: toInt(answers[11] ?? 'a'),
    q12: toInt(answers[12] ?? 'a'),
    q13: toInt(answers[13] ?? 'a'),
    q14: toInt(answers[14] ?? 'a'),
    q15: toInt(answers[15] ?? 'a'),
  }
}

/**
 * Store an OS config in localStorage/sessionStorage for the onboarding flow.
 */
export function cacheOSConfig(config: OSGeneratorConfig): void {
  try {
    localStorage.setItem('8os_config', JSON.stringify(config))
    // Also store the archetype id for backward compatibility with existing
    // components that read 8os_archetype_id
    const archetypeId = config.user.archetype.toLowerCase().replace(/\s+/g, '_')
    localStorage.setItem('8os_archetype_id', archetypeId)
    sessionStorage.setItem('8os_archetype_id', archetypeId)
    // Store archetype for the archetype display page
    localStorage.setItem('8os_archetype', JSON.stringify({
      archetypeId,
      archetypeName: config.user.archetype,
      confidence: 1.0,
      isHybrid: false,
      dominantElements: [config.user.bazi_element.toLowerCase()],
      bazi: { dominantElement: config.user.bazi_element.toLowerCase() },
      osConfig: config,
    }))
  } catch {}
}
