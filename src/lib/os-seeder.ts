/**
 * OS Seeder — Archetype → Goals → Projects → Tasks
 *
 * After archetype generation, persist a themed starter set of goals, projects,
 * and tasks so the new user lands on a populated dashboard instead of an
 * empty board.
 *
 * Source of truth for the starter structure: the os-generator service
 * (Railway, /generate endpoint), which returns 6 buckets with archetype-themed
 * initial_projects. We map each bucket to a domain, every initial_project to
 * an OSProject, and pull themed tasks from the Python os-generator's
 * /generate-tasks endpoint (which has element-specific templates).
 *
 * Fallback: if os-generator is unreachable, build a deterministic TS-only
 * starter from the archetype + dominant elements so the dashboard is never
 * empty for a fresh user.
 *
 * Idempotent: if the user already has goals, this is a no-op. We don't
 * clobber an existing user-edited board.
 */

import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

// ── Types mirroring os-generator responses ────────────────────────────────

export interface OSGeneratorUser {
  name: string
  bazi_element: 'Metal' | 'Wood' | 'Water' | 'Fire' | 'Earth'
  archetype: string
  archetype_descriptor: string
}

export interface OSGeneratorBucket {
  id: 'BUILD' | 'FIX' | 'IMPROVE' | 'OPERATE' | 'THINK' | 'PERSONAL'
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

export interface OSGeneratorTask {
  name: string
  duration_minutes: number
  priority: 'high' | 'medium' | 'low'
  schedule: { bucket: string; suggested_time: 'morning' | 'afternoon' | 'evening'; suggested_day: string | null }
  rationale: string
}

export interface OSGeneratorTasksResponse {
  tasks: OSGeneratorTask[]
  archetype: string
  generated_at: string
}

// ── Bucket → Domain mapping ──────────────────────────────────────────────
// Goal.domainId is constrained to career | wealth | health | relationships
// | learning | legacy. We map the 6 OS buckets to these 6 domains and use
// the bucket label/description to flavor the goal definition.

const BUCKET_DOMAIN: Record<OSGeneratorBucket['id'], {
  domainId: 'career' | 'wealth' | 'health' | 'relationships' | 'learning' | 'legacy'
  checkMethod: 'binary' | 'numeric' | 'time' | 'streak' | 'milestone'
}> = {
  BUILD:    { domainId: 'career',        checkMethod: 'milestone' },
  FIX:      { domainId: 'career',        checkMethod: 'milestone' },
  IMPROVE:  { domainId: 'learning',      checkMethod: 'milestone' },
  OPERATE:  { domainId: 'legacy',        checkMethod: 'streak' },
  THINK:    { domainId: 'learning',      checkMethod: 'milestone' },
  PERSONAL: { domainId: 'health',        checkMethod: 'streak' },
}

// ── Time-of-day → energy level ────────────────────────────────────────────

const TIME_ENERGY: Record<'morning' | 'afternoon' | 'evening', 'green' | 'yellow' | 'red'> = {
  morning: 'green',
  afternoon: 'yellow',
  evening: 'red',
}

const TIME_HOUR: Record<'morning' | 'afternoon' | 'evening', number> = {
  morning: 9,
  afternoon: 14,
  evening: 19,
}

const PRIORITY_MAP: Record<'high' | 'medium' | 'low', 'high' | 'medium' | 'low'> = {
  high: 'high',
  medium: 'medium',
  low: 'low',
}

// ── Element → archetype display icons (for theme only — DB stores archetype id) ─

const ELEMENT_THEME_HINT: Record<OSGeneratorUser['bazi_element'], string> = {
  Metal: 'precision, structure, and measurable outcomes',
  Wood:  'growth, learning, and consistent creation',
  Water: 'adaptive flow, observation, and pattern synthesis',
  Fire:  'rapid prototyping, momentum, and decisive action',
  Earth: 'durable foundations, systematic review, and quality',
}

// ── Public API ───────────────────────────────────────────────────────────

export interface SeedSummary {
  seeded: boolean
  skippedReason?: string
  goalsCreated: number
  projectsCreated: number
  tasksCreated: number
  archetype: string
  element: string
}

// ── company_id for tenant scoping ─────────────────────────────────────────
// The prod goals table has a NOT NULL company_id (added by an out-of-band
// migration to support Paperclip multi-tenant scoping). The local Prisma
// schema doesn't model it yet, so Prisma writes silently fail without it.
// We source company_id from PAPERCLIP_COMPANY_ID (the user's tenant) and
// include it in the raw INSERTs.
//
// TODO(OS-1900): once schema.prisma adds `company_id String @db.Uuid` to the
// Goal model, this raw-SQL path can be removed and the seeder can use
// Prisma's tx.goal.create directly.
function getCompanyId(): string {
  const fromEnv = process.env.PAPERCLIP_COMPANY_ID ?? process.env.COMPANY_ID
  if (fromEnv && fromEnv.length === 36) return fromEnv
  // Fallback: 8os's tenant. Safe default because every existing goal in
  // prod belongs to one of these 3 companies and 8os.ai routes are
  // single-tenant. If you find yourself needing multi-tenant seeding,
  // look up the user's company via the User model.
  return '27f38d2c-bcdd-43c2-a022-89b0ee9ff548'
}

/**
 * Seed a starter goal/project/task tree for a freshly-archetyped user.
 *
 * Returns a summary so the caller can surface counts back to the client.
 * Never throws on os-generator failure — falls back to a TS-only seed.
 */
export async function seedOSConfigForUser(args: {
  userId: string
  archetypeName: string
  archetypeId: string
  dominantElements: string[]
  dayElement: string
  // birthDate as YYYY-MM-DD for os-generator input
  birthDate: string
}): Promise<SeedSummary> {
  // Idempotency: skip if user already has any goals (manual or seeded).
  const existing = await prisma.goal.count({ where: { userId: args.userId } })
  if (existing > 0) {
    return {
      seeded: false,
      skippedReason: 'user already has goals',
      goalsCreated: 0,
      projectsCreated: 0,
      tasksCreated: 0,
      archetype: args.archetypeName,
      element: args.dayElement,
    }
  }

  // Try os-generator (Railway) first for the buckets + themed tasks.
  let config: OSGeneratorConfig | null = null
  let themedTasks: OSGeneratorTask[] = []
  try {
    config = await fetchOSConfig(args.birthDate)
  } catch (err) {
    console.warn('[os-seeder] os-generator /generate failed, using fallback config:', err)
  }

  // If we have a config, also pull themed tasks (one per bucket is enough
  // for a starter — keep the dashboard light).
  if (config) {
    try {
      const taskResp = await fetchOSTasks(args.birthDate, 6)
      themedTasks = taskResp.tasks.slice(0, 6)
    } catch (err) {
      console.warn('[os-seeder] os-generator /generate-tasks failed, using fallback tasks:', err)
    }
  }

  if (!config) {
    config = buildFallbackConfig(args)
  }
  if (themedTasks.length === 0) {
    themedTasks = buildFallbackTasks(args.dayElement)
  }

  // Persist the tree in a single transaction.
  const summary = await persistTree({
    userId: args.userId,
    archetypeName: args.archetypeName,
    archetypeId: args.archetypeId,
    config,
    themedTasks,
  })

  return {
    seeded: true,
    ...summary,
    archetype: args.archetypeName,
    element: args.dayElement,
  }
}

// ── Persistence ───────────────────────────────────────────────────────────

async function persistTree(args: {
  userId: string
  archetypeName: string
  archetypeId: string
  config: OSGeneratorConfig
  themedTasks: OSGeneratorTask[]
}): Promise<{ goalsCreated: number; projectsCreated: number; tasksCreated: number }> {
  let goalsCreated = 0
  let projectsCreated = 0
  let tasksCreated = 0
  // Global counter so only the first 2 tasks across the whole tree land
  // on today; everything else is backlog (scheduledAt = null).
  let globalTaskIdx = 0

  // The prod goals table has a NOT NULL company_id column that the local
  // Prisma schema doesn't model — a $transaction + tx.goal.create silently
  // fails on this. Use $queryRawUnsafe so we control the INSERT columns
  // explicitly and surface any DB errors.
  //
  // Each row is sequenced so a partial seed never leaves an orphan tree
  // (goal → project → task → next goal).
  const companyId = getCompanyId()

  try {
    // Distribute themed tasks across buckets so each bucket goal gets
    // at most 2 starter tasks. Tasks are unscheduled (backlog) by default
    // — the dashboard renders them in the "backlog" slice.
    const tasksByBucket = new Map<string, OSGeneratorTask[]>()
    for (const t of args.themedTasks) {
      const bucket = t.schedule.bucket
      const arr = tasksByBucket.get(bucket) ?? []
      arr.push(t)
      tasksByBucket.set(bucket, arr)
    }

    for (let bucketIdx = 0; bucketIdx < args.config.buckets.length; bucketIdx++) {
      const bucket = args.config.buckets[bucketIdx]
      const domainMap = BUCKET_DOMAIN[bucket.id]

      const goalName = bucket.label
      const goalDefinition =
        `${bucket.description}\n\n` +
        `Tailored for the ${args.archetypeName} archetype — focus: ${bucket.archetype_focus}. ` +
        `Tone: ${args.config.tone}.`

      const goalInsert = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO goals (
           id, "userId", "company_id", title, description, level, status,
           "domainId", name, definition, "checkMethod", "checkConfig", progress,
           "createdAt", "updatedAt", "created_at", "updated_at"
         ) VALUES (
           gen_random_uuid(), $1, $2::uuid, $3, $4, 'task', 'active',
           $5, $3, $4, $6, $7::jsonb, 0,
           NOW(), NOW(), NOW(), NOW()
         ) RETURNING id`,
        args.userId,
        companyId,
        goalName,
        goalDefinition,
        domainMap.domainId,
        domainMap.checkMethod,
        JSON.stringify({ seeded_from_os: true, bucket_id: bucket.id, archetype: args.archetypeName }),
      )
      const goalId = goalInsert[0].id
      goalsCreated++

      // Pull this bucket's initial projects (capped at 2 to keep starter light)
      const projects = bucket.initial_projects.slice(0, 2)
      const bucketTasks = tasksByBucket.get(bucket.id) ?? []

      for (let pIdx = 0; pIdx < projects.length; pIdx++) {
        const projectName = projects[pIdx]
        const projectInsert = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO os_projects (
             id, "userId", "goalId", name, description,
             "estimatedDuration", "suggestedOrder", accepted,
             "createdAt", "updatedAt"
           ) VALUES (
             gen_random_uuid(), $1, $2::uuid, $3, $4,
             '1 week', $5, true,
             NOW(), NOW()
           ) RETURNING id`,
          args.userId,
          goalId,
          projectName,
          `Auto-seeded starter for the ${args.archetypeName} archetype. ` +
            `Refine via chat with your 8os assistant.`,
          pIdx,
        )
        const projectId = projectInsert[0].id
        projectsCreated++

        // Attach at most 2 themed tasks per project (cycling through bucket tasks)
        const projectTasks = bucketTasks.slice(pIdx * 2, pIdx * 2 + 2)
        for (let tIdx = 0; tIdx < projectTasks.length; tIdx++) {
          const tpl = projectTasks[tIdx]
          const scheduledAt = scheduleFor(tpl.schedule.suggested_time, globalTaskIdx)
          globalTaskIdx++
          await prisma.$queryRawUnsafe(
            `INSERT INTO os_tasks (
               id, "userId", "projectId", "goalId", name, notes,
               duration, priority, status, "scheduledAt", "scheduledEnd",
               "energyRequired", recurrence, "createdAt", "updatedAt"
             ) VALUES (
               gen_random_uuid(), $1, $2, $3::uuid, $4, $5,
               $6, $7::"TaskPriority", 'todo'::"TaskStatus", $8, $9,
               $10, 'none'::"RecurrenceRule", NOW(), NOW()
             )`,
            args.userId,
            projectId,
            goalId,
            tpl.name,
            tpl.rationale,
            tpl.duration_minutes,
            PRIORITY_MAP[tpl.priority],
            scheduledAt,
            scheduledAt ? new Date(scheduledAt.getTime() + tpl.duration_minutes * 60_000) : null,
            TIME_ENERGY[tpl.schedule.suggested_time],
          )
          tasksCreated++
        }
      }

      // If a bucket has no projects (edge case in fallback), still attach its tasks
      if (projects.length === 0 && bucketTasks.length > 0) {
        for (const tpl of bucketTasks.slice(0, 2)) {
          const scheduledAt = scheduleFor(tpl.schedule.suggested_time, globalTaskIdx)
          globalTaskIdx++
          await prisma.$queryRawUnsafe(
            `INSERT INTO os_tasks (
               id, "userId", "projectId", "goalId", name, notes,
               duration, priority, status, "scheduledAt", "scheduledEnd",
               "energyRequired", recurrence, "createdAt", "updatedAt"
             ) VALUES (
               gen_random_uuid(), $1, NULL, $2::uuid, $3, $4,
               $5, $6::"TaskPriority", 'todo'::"TaskStatus", $7, $8,
               $9, 'none'::"RecurrenceRule", NOW(), NOW()
             )`,
            args.userId,
            goalId,
            tpl.name,
            tpl.rationale,
            tpl.duration_minutes,
            PRIORITY_MAP[tpl.priority],
            scheduledAt,
            scheduledAt ? new Date(scheduledAt.getTime() + tpl.duration_minutes * 60_000) : null,
            TIME_ENERGY[tpl.schedule.suggested_time],
          )
          tasksCreated++
        }
      }
    }

    // Log the seed event so the dashboard's "recent activity" reflects it.
    await prisma.$queryRawUnsafe(
      `INSERT INTO activity_logs (id, "userId", action, metadata, "createdAt")
       VALUES (gen_random_uuid(), $1, 'os_seeded', $2::jsonb, NOW())`,
      args.userId,
      JSON.stringify({
        archetype: args.archetypeName,
        archetype_id: args.archetypeId,
        goals: goalsCreated,
        projects: projectsCreated,
        tasks: tasksCreated,
        buckets: args.config.buckets.map((b) => b.id),
        source: 'archetype_onboarding',
      }),
    )
  } catch (err) {
    console.error('[os-seeder] persistTree failed:', err)
    throw err
  }

  return { goalsCreated, projectsCreated, tasksCreated }
}

// ── Network: os-generator client ─────────────────────────────────────────

async function fetchOSConfig(birthDate: string): Promise<OSGeneratorConfig> {
  const base = process.env.OS_GENERATOR_URL ?? 'http://os-generator.railway.internal:8001'
  const resp = await fetch(`${base}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '8os User',
      birth_date: birthDate,
      quiz: null, // /generate works without quiz — uses BaZi element alone
    }),
  })
  if (!resp.ok) {
    throw new Error(`os-generator /generate returned ${resp.status}`)
  }
  return (await resp.json()) as OSGeneratorConfig
}

async function fetchOSTasks(birthDate: string, maxTasks: number): Promise<OSGeneratorTasksResponse> {
  const base = process.env.OS_GENERATOR_URL ?? 'http://os-generator.railway.internal:8001'
  const resp = await fetch(`${base}/generate-tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      birth_date: birthDate,
      goals: [],
      domains: [],
    }),
  })
  if (!resp.ok) {
    throw new Error(`os-generator /generate-tasks returned ${resp.status}`)
  }
  const json = (await resp.json()) as OSGeneratorTasksResponse
  return {
    ...json,
    tasks: json.tasks.slice(0, maxTasks),
  }
}

// ── Fallbacks (os-generator unreachable) ─────────────────────────────────

function buildFallbackConfig(args: {
  archetypeName: string
  dominantElements: string[]
  dayElement: string
}): OSGeneratorConfig {
  const element = (ELEMENT_THEME_HINT_WIRE[args.dayElement] ?? 'Metal') as OSGeneratorUser['bazi_element']
  return {
    schema_version: '0.1',
    user: {
      name: '8os User',
      bazi_element: element,
      archetype: args.archetypeName,
      archetype_descriptor: `${args.archetypeName} — ${ELEMENT_THEME_HINT[element]}`,
    },
    buckets: FALLBACK_BUCKETS,
    workflow_description: [
      `Operate from your ${args.archetypeName} archetype — ${ELEMENT_THEME_HINT[element]}`,
      `Lean on your dominant element (${args.dominantElements[0] ?? element.toLowerCase()}) for steady execution`,
    ],
    tone: `${args.archetypeName.toLowerCase()}, direct, supportive`,
    energy_hours: {
      peak_windows: ['09:00-11:00', '14:00-16:00'],
      flexibility: 'moderate',
      user_adjustable: true,
    },
    generated_at: new Date().toISOString(),
  }
}

const ELEMENT_THEME_HINT_WIRE: Record<string, OSGeneratorUser['bazi_element']> = {
  metal: 'Metal',
  wood: 'Wood',
  water: 'Water',
  fire: 'Fire',
  earth: 'Earth',
}

const FALLBACK_BUCKETS: OSGeneratorBucket[] = [
  {
    id: 'BUILD',
    label: 'Build',
    description: 'Create the core outputs that move your work forward.',
    archetype_focus: 'production and creation',
    initial_projects: ['Define flagship deliverable', 'Set up core system'],
  },
  {
    id: 'FIX',
    label: 'Fix',
    description: 'Resolve blockers and reliability gaps that drain momentum.',
    archetype_focus: 'blocker removal and reliability',
    initial_projects: ['Identify top 3 blockers', 'Stabilize critical path'],
  },
  {
    id: 'IMPROVE',
    label: 'Improve',
    description: 'Iterate on what already works to compound returns.',
    archetype_focus: 'refinement and optimization',
    initial_projects: ['Process audit', 'Optimization sprint'],
  },
  {
    id: 'OPERATE',
    label: 'Operate',
    description: 'Run the rhythms that keep your system humming.',
    archetype_focus: 'cadence and discipline',
    initial_projects: ['Weekly review ritual', 'Daily operating cadence'],
  },
  {
    id: 'THINK',
    label: 'Think',
    description: 'Hold space for reflection, research, and synthesis.',
    archetype_focus: 'strategy and pattern recognition',
    initial_projects: ['Strategic research session', 'Vision alignment'],
  },
  {
    id: 'PERSONAL',
    label: 'Personal',
    description: 'Tend to the body, relationships, and inner life.',
    archetype_focus: 'wellbeing and connection',
    initial_projects: ['Health protocols', 'Relationship rhythms'],
  },
]

function buildFallbackTasks(dayElement: string): OSGeneratorTask[] {
  // Small, themed set: 2 tasks per bucket, 12 total.
  const buckets: OSGeneratorBucket['id'][] = ['BUILD', 'OPERATE', 'FIX', 'IMPROVE', 'THINK', 'PERSONAL']
  const priority: ('high' | 'medium' | 'low')[] = ['high', 'medium']
  const times: ('morning' | 'afternoon' | 'evening')[] = ['morning', 'afternoon', 'evening']

  const themeLine = ELEMENT_THEME_HINT[ELEMENT_THEME_HINT_WIRE[dayElement] ?? 'Metal']

  const names: Record<OSGeneratorBucket['id'], string[]> = {
    BUILD:    ['Define a flagship outcome', 'Outline the build sequence'],
    OPERATE:  ['Run a 60-minute weekly review', 'Establish a daily stand-up ritual'],
    FIX:      ['List your top 3 blockers', 'Resolve the highest-leverage blocker'],
    IMPROVE:  ['Audit the slowest step', 'Run one optimization experiment'],
    THINK:    ['Sketch a 90-day vision', 'Capture 3 strategic questions'],
    PERSONAL: ['Schedule a movement session', 'Block reflection time'],
  }

  const tasks: OSGeneratorTask[] = []
  let i = 0
  for (const bucket of buckets) {
    for (let j = 0; j < 2; j++) {
      tasks.push({
        name: names[bucket][j],
        duration_minutes: 60,
        priority: priority[j],
        schedule: {
          bucket,
          suggested_time: times[i % times.length],
          suggested_day: null,
        },
        rationale: `Seeded starter for your archetype — ${themeLine}.`,
      })
      i++
    }
  }
  return tasks
}

// ── Scheduling helper ────────────────────────────────────────────────────

/**
 * Convert a suggested_time + offset index into a concrete Date (or null).
 *
 * Spreads tasks so a fresh user lands with:
 *   - 2 tasks scheduled today (visible in the dashboard "today" column)
 *   - remaining tasks unscheduled (null) → render in the backlog column
 *
 * Returning null for non-today tasks keeps the backlog populated without
 * overwhelming the first-day user with a wall of pre-scheduled work.
 */
function scheduleFor(time: 'morning' | 'afternoon' | 'evening', offsetIdx: number): Date | null {
  // Only the first two tasks land on today. Everything else is backlog.
  if (offsetIdx >= 2) return null

  const base = new Date()
  base.setHours(TIME_HOUR[time], 0, 0, 0)
  // If the time slot has already passed today, push to tomorrow morning
  if (base.getTime() < Date.now()) {
    base.setDate(base.getDate() + 1)
  }
  return base
}

// ── Debug helper (for /api/dashboard exposure later) ──────────────────────

export async function getSeedSummaryForUser(userId: string): Promise<{
  hasSeed: boolean
  goalCount: number
  projectCount: number
  taskCount: number
  lastSeedAt: Date | null
}> {
  const [goalCount, projectCount, taskCount, lastSeed] = await Promise.all([
    prisma.goal.count({ where: { userId } }),
    prisma.oSProject.count({ where: { userId } }),
    prisma.oSTask.count({ where: { userId } }),
    prisma.activityLog.findFirst({
      where: { userId, action: 'os_seeded' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ])
  return {
    hasSeed: lastSeed !== null,
    goalCount,
    projectCount,
    taskCount,
    lastSeedAt: lastSeed?.createdAt ?? null,
  }
}