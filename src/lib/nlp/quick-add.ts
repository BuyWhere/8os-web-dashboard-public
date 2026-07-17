/**
 * NLP Quick-Add Parser
 * Converts natural language input into structured task data.
 *
 * Examples:
 *   "Gym at 7pm"      → { name: "Gym", domain: "health", scheduledHour: 19 }
 *   "I feel stressed" → { driftSignal: true, emotion: "stressed" }
 *   "Read book for 30 minutes" → { name: "Read book", duration: 30 }
 *   "Call Mom tomorrow at 3pm" → { name: "Call Mom", domain: "relationships", ... }
 */

export type DomainId = 'career' | 'wealth' | 'health' | 'relationships' | 'learning' | 'legacy'

export interface QuickAddResult {
  name: string
  domainId?: DomainId
  scheduledHour?: number   // 0-23
  durationMinutes?: number
  priority?: 'high' | 'medium' | 'low'
  driftSignal?: boolean
  driftEmotion?: string
  notes?: string
  dayOffset?: number       // 0 = today, 1 = tomorrow
  recurrence?: 'daily' | 'weekly' | 'biweekly' | 'monthly'
}

// Domain keyword maps
const DOMAIN_KEYWORDS: Array<{ keywords: string[]; domain: DomainId }> = [
  {
    keywords: ['gym', 'workout', 'run', 'jog', 'exercise', 'yoga', 'meditat', 'sleep', 'doctor', 'health', 'eat', 'meal', 'diet', 'walk'],
    domain: 'health',
  },
  {
    keywords: ['work', 'meeting', 'email', 'project', 'report', 'presentation', 'career', 'job', 'interview', 'client', 'office', 'task', 'deadline'],
    domain: 'career',
  },
  {
    keywords: ['invest', 'budget', 'finance', 'money', 'save', 'spend', 'bill', 'tax', 'wealth', 'income', 'expense'],
    domain: 'wealth',
  },
  {
    keywords: ['call', 'mom', 'dad', 'friend', 'family', 'date', 'social', 'party', 'visit', 'relationship', 'catch up'],
    domain: 'relationships',
  },
  {
    keywords: ['read', 'study', 'learn', 'course', 'book', 'podcast', 'video', 'research', 'practice', 'skill', 'class'],
    domain: 'learning',
  },
  {
    keywords: ['volunteer', 'mentor', 'teach', 'legacy', 'community', 'donate', 'write', 'blog', 'journal', 'impact'],
    domain: 'legacy',
  },
]

// Drift / emotional signals
const DRIFT_SIGNALS = [
  /i feel (stressed|overwhelmed|anxious|burned out|exhausted|lost|stuck|depressed|sad|angry|frustrated)/i,
  /feeling (stressed|overwhelmed|anxious|burned out|exhausted|lost|stuck|depressed)/i,
  /so (stressed|overwhelmed|anxious|tired|exhausted)/i,
  /can'?t (focus|concentrate|keep up|do this)/i,
  /everything is (too much|overwhelming)/i,
]

// Time patterns
const TIME_PATTERNS = [
  { regex: /\bat (\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i, parse: parseAmPm },
  { regex: /\bat (\d{1,2})(?::(\d{2}))?\b/, parse: parse24h },
  { regex: /\bat noon\b/i, parse: () => 12 },
  { regex: /\bat midnight\b/i, parse: () => 0 },
  { regex: /\bin the morning\b/i, parse: () => 9 },
  { regex: /\bin the afternoon\b/i, parse: () => 14 },
  { regex: /\bin the evening\b/i, parse: () => 18 },
  { regex: /\bat night\b/i, parse: () => 21 },
]

// Duration patterns
const DURATION_PATTERNS = [
  { regex: /(\d+)\s*hours?\b/i, parse: (m: RegExpMatchArray) => parseInt(m[1]) * 60 },
  { regex: /(\d+)\s*h\b/i, parse: (m: RegExpMatchArray) => parseInt(m[1]) * 60 },
  { regex: /(\d+)\s*min(?:ute)?s?\b/i, parse: (m: RegExpMatchArray) => parseInt(m[1]) },
  { regex: /for (\d+)m\b/i, parse: (m: RegExpMatchArray) => parseInt(m[1]) },
]

// Priority keywords
const HIGH_PRIORITY = /\b(urgent|asap|important|critical|must|deadline)\b/i
const LOW_PRIORITY = /\b(maybe|someday|eventually|low priority|optional)\b/i

function parseAmPm(m: RegExpMatchArray): number {
  let h = parseInt(m[1])
  const min = m[2] ? parseInt(m[2]) : 0
  const meridiem = m[3].toLowerCase()
  if (meridiem === 'pm' && h !== 12) h += 12
  if (meridiem === 'am' && h === 12) h = 0
  return h
}

function parse24h(m: RegExpMatchArray): number {
  return parseInt(m[1])
}

function detectDomain(text: string): DomainId | undefined {
  const lower = text.toLowerCase()
  for (const { keywords, domain } of DOMAIN_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return domain
  }
  return undefined
}

function stripTimePhrases(text: string): string {
  return text
    .replace(/\bat \d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, '')
    .replace(/\bat \d{1,2}(?::\d{2})?\b/g, '')
    .replace(/\bat (noon|midnight)\b/gi, '')
    .replace(/\bin the (morning|afternoon|evening)\b/gi, '')
    .replace(/\bat night\b/gi, '')
    .replace(/\btomorrow\b/gi, '')
    .replace(/\btoday\b/gi, '')
    .replace(/\bfor \d+\s*(?:hours?|h|min(?:ute)?s?|m)\b/gi, '')
    .replace(/\b\d+\s*(?:hours?|h|min(?:ute)?s?|m)\b/gi, '')
    .replace(/\b(urgent|asap|important|critical|must|deadline)\b/gi, '')
    .replace(/\b(maybe|someday|eventually)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function parseQuickAdd(input: string): QuickAddResult {
  const trimmed = input.trim()

  // Check drift signals first
  for (const pattern of DRIFT_SIGNALS) {
    const m = trimmed.match(pattern)
    if (m) {
      return {
        name: trimmed,
        driftSignal: true,
        driftEmotion: m[1]?.toLowerCase() ?? 'stressed',
      }
    }
  }

  // Extract time
  let scheduledHour: number | undefined
  for (const { regex, parse } of TIME_PATTERNS) {
    const m = trimmed.match(regex)
    if (m) {
      scheduledHour = typeof parse === 'function' ? parse(m) : parse()
      break
    }
  }

  // Extract duration
  let durationMinutes: number | undefined
  for (const { regex, parse } of DURATION_PATTERNS) {
    const m = trimmed.match(regex)
    if (m) {
      durationMinutes = parse(m)
      break
    }
  }

  // Day offset
  let dayOffset = 0
  if (/\btomorrow\b/i.test(trimmed)) dayOffset = 1

  // Recurrence — Todoist-style "every…" phrases ("gym every day", "review every
  // monday", "pay rent monthly", "standup every 2 weeks").
  let recurrence: 'daily' | 'weekly' | 'biweekly' | 'monthly' | undefined
  if (/\bevery\s*(2|two|other)\s*weeks?\b|\bbi-?weekly\b|\bfortnight(ly)?\b/i.test(trimmed)) recurrence = 'biweekly'
  else if (/\bevery\s*day\b|\bdaily\b|\bevery\s+(morning|afternoon|evening|night)\b/i.test(trimmed)) recurrence = 'daily'
  else if (/\bevery\s*week\b|\bweekly\b|\bevery\s+(mon|tues?|wed(nes)?|thur?s?|fri|sat(ur)?|sun)(day)?\b/i.test(trimmed)) recurrence = 'weekly'
  else if (/\bevery\s*month\b|\bmonthly\b/i.test(trimmed)) recurrence = 'monthly'

  // Priority
  let priority: 'high' | 'medium' | 'low' = 'medium'
  if (HIGH_PRIORITY.test(trimmed)) priority = 'high'
  else if (LOW_PRIORITY.test(trimmed)) priority = 'low'

  // Domain
  const domainId = detectDomain(trimmed)

  // Clean task name (time phrases + recurrence phrases)
  let name = stripTimePhrases(trimmed) || trimmed
  if (recurrence) {
    name = name
      .replace(/\bevery\s*(2|two|other)\s*weeks?\b|\bbi-?weekly\b|\bfortnight(ly)?\b/gi, '')
      .replace(/\bevery\s*day\b|\bdaily\b|\bevery\s+(morning|afternoon|evening|night)\b/gi, '')
      .replace(/\bevery\s*week\b|\bweekly\b|\bevery\s+(mon|tues?|wed(nes)?|thur?s?|fri|sat(ur)?|sun)(day)?\b/gi, '')
      .replace(/\bevery\s*month\b|\bmonthly\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim() || name
  }

  return {
    name,
    domainId,
    scheduledHour,
    durationMinutes,
    priority,
    dayOffset,
    recurrence,
  }
}
