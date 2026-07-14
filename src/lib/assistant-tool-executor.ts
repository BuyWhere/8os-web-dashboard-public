/**
 * Assistant Tool Executor
 * Executes tool calls by interacting with the REAL database models
 * (Goal / OSProject / OSTask / CalendarEvent) — the same tables the app pages
 * and the /api/goals, /api/tasks, /api/calendar/events endpoints read from.
 *
 * Historical note: an earlier version wrote to user.osConfig JSON, which meant
 * the assistant's goals/tasks/events were invisible to the rest of the app.
 * This version is DB-backed and userId-scoped so "create a goal and schedule
 * its first task" produces real, visible Goal + OSTask + CalendarEvent rows.
 */

import { prisma } from '@/lib/db/prisma'
import { wouldExceedActiveCap } from '@/lib/goal-hygiene'

/**
 * The production `goals` table has NOT NULL `company_id`, `title`, `description`
 * columns added by an out-of-band "Paperclip multi-tenant" migration that the
 * local Prisma schema may not model. We source company_id the same way
 * src/lib/os-seeder.ts does, and INSERT via raw SQL so goal creation works
 * whether or not the generated client knows about those columns.
 */
function getCompanyId(): string {
  const fromEnv = process.env.PAPERCLIP_COMPANY_ID ?? process.env.COMPANY_ID
  if (fromEnv && fromEnv.length === 36) return fromEnv
  return '27f38d2c-bcdd-43c2-a022-89b0ee9ff548'
}

type ToolName =
  | 'get_goals'
  | 'create_goal'
  | 'update_goal'
  | 'get_projects'
  | 'create_project'
  | 'update_project'
  | 'get_tasks'
  | 'create_task'
  | 'schedule_task'
  | 'complete_task'
  | 'get_calendar_events'
  | 'create_calendar_event'
  | 'get_archetype_info'
  | 'get_energy_hours'

const DOMAIN_IDS = ['career', 'wealth', 'health', 'relationships', 'learning', 'legacy'] as const
type DomainId = (typeof DOMAIN_IDS)[number]
const CHECK_METHODS = ['binary', 'numeric', 'time', 'streak', 'milestone'] as const

/** Best-effort keyword → life-domain inference so create_goal always has a domain. */
function inferDomain(text: string): DomainId {
  const t = (text || '').toLowerCase()
  const table: Array<[DomainId, RegExp]> = [
    ['health', /\b(run|marathon|gym|fit|weight|health|exercise|sleep|diet|yoga|meditat|workout|5k|10k|race)\b/],
    ['wealth', /\b(money|wealth|save|saving|invest|income|revenue|budget|debt|financ|retire|net worth)\b/],
    ['career', /\b(career|job|promot|business|startup|launch|work|company|client|sales|product)\b/],
    ['learning', /\b(learn|study|course|read|book|skill|language|degree|certif|practice|write|writing)\b/],
    ['relationships', /\b(relationship|family|friend|partner|spouse|kids|marriage|date|dating|social|community)\b/],
    ['legacy', /\b(legacy|impact|charit|volunteer|mentor|give|donat|found|mission|purpose)\b/],
  ]
  for (const [domain, re] of table) if (re.test(t)) return domain
  return 'health'
}

function normalizePriority(p?: string): 'high' | 'medium' | 'low' {
  const v = (p || '').toLowerCase()
  return v === 'high' || v === 'low' ? v : 'medium'
}

/** Parse "30 min", "1h", "45", "2 hours" → minutes (clamped 5..480, default 60). */
function parseDurationMinutes(d?: string | number): number {
  if (typeof d === 'number' && Number.isFinite(d)) return Math.min(480, Math.max(5, Math.round(d)))
  const s = String(d ?? '').toLowerCase().trim()
  if (!s) return 60
  const hourMatch = s.match(/([\d.]+)\s*(h|hr|hour)/)
  if (hourMatch) return Math.min(480, Math.max(5, Math.round(parseFloat(hourMatch[1]) * 60)))
  const minMatch = s.match(/([\d.]+)/)
  if (minMatch) return Math.min(480, Math.max(5, Math.round(parseFloat(minMatch[1]))))
  return 60
}

/**
 * Execute a tool call from the assistant
 */
export async function executeTool(
  toolName: ToolName,
  args: Record<string, any>,
  userId: string
): Promise<any> {
  switch (toolName) {
    case 'get_goals':
      return getGoals(userId, args.domainId, args.status)
    case 'create_goal':
      return createGoal(userId, args)
    case 'update_goal':
      return updateGoal(userId, args.goalId, args.updates)
    case 'get_projects':
      return getProjects(userId, args.goalId, args.domainId)
    case 'create_project':
      return createProject(userId, args)
    case 'update_project':
      return updateProject(userId, args.projectId, args.updates)
    case 'get_tasks':
      return getTasks(userId, args.projectId, args.goalId, args.status)
    case 'create_task':
      return createTask(userId, args)
    case 'schedule_task':
      return scheduleTask(userId, args)
    case 'complete_task':
      return completeTask(userId, args.taskId)
    case 'get_calendar_events':
      return getCalendarEvents(userId, args.startDate, args.endDate)
    case 'create_calendar_event':
      return createCalendarEvent(userId, args)
    case 'get_archetype_info':
      return getArchetypeInfo(userId)
    case 'get_energy_hours':
      return getEnergyHours(userId)
    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}

// ─── Goals ──────────────────────────────────────────────────────────────────

async function getGoals(userId: string, domainId?: string, status?: string) {
  const goals = await prisma.goal.findMany({
    where: {
      userId,
      status: (status as any) || 'active',
      ...(domainId ? { domainId } : {}),
    },
    include: { projects: { include: { tasks: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return {
    goals: goals.map((g) => ({
      id: g.id,
      domainId: g.domainId,
      name: g.name,
      definition: g.definition,
      checkMethod: g.checkMethod,
      status: g.status,
      progress: g.progress,
      projectCount: g.projects.length,
    })),
  }
}

async function createGoal(userId: string, args: Record<string, any>) {
  const name = String(args.name || '').trim()
  if (!name) throw new Error('Goal name is required')

  const domainId: DomainId = (DOMAIN_IDS.includes(args.domainId) ? args.domainId : inferDomain(name + ' ' + (args.definition || '')))
  const definition = String(args.definition || name).slice(0, 1000)
  const checkMethod = CHECK_METHODS.includes(args.checkMethod) ? args.checkMethod : 'milestone'
  const checkConfig = (args.checkConfig && typeof args.checkConfig === 'object') ? args.checkConfig : {}

  // Respect the E-10 active-goal cap ("Focus Mode"), but degrade gracefully:
  // if capped, create the goal as `paused` instead of failing, and tell the
  // model so it can inform the user rather than silently doing nothing.
  const cap = await wouldExceedActiveCap(userId).catch(() => ({ blocked: false, activeCount: 0, cap: 3, focusMode: false }))
  const status: 'active' | 'paused' = cap.blocked ? 'paused' : 'active'

  // Raw INSERT so the NOT NULL company_id/title/description columns (out-of-band
  // Paperclip migration) are always populated — mirrors src/lib/os-seeder.ts.
  const companyId = getCompanyId()
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO goals (
       id, "userId", "company_id", title, description, level, status,
       "domainId", name, definition, "checkMethod", "checkConfig", progress,
       "createdAt", "updatedAt", "created_at", "updated_at"
     ) VALUES (
       gen_random_uuid(), $1, $2::uuid, $3, $4, 'task', $8,
       $5, $3, $4, $6, $7::jsonb, 0,
       NOW(), NOW(), NOW(), NOW()
     ) RETURNING id`,
    userId, companyId, name, definition, domainId, checkMethod,
    JSON.stringify(checkConfig), status,
  )
  const goalId = rows[0].id

  await prisma.activityLog.create({
    data: { userId, goalId, action: 'goal_created', metadata: { name, via: 'assistant' } },
  }).catch(() => {})

  return {
    success: true,
    goal: {
      id: goalId, domainId, name,
      definition, checkMethod, status, progress: 0,
    },
    capNotice: cap.blocked
      ? `You already have ${cap.activeCount} active goals (Focus Mode cap is ${cap.cap}). I created this goal as PAUSED so we don't lose it, activate it in Goals when you free up a slot, or turn off Focus Mode in notification settings.`
      : undefined,
  }
}

async function updateGoal(userId: string, goalId: string, updates: Record<string, any>) {
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } })
  if (!goal) throw new Error(`Goal not found: ${goalId}`)

  const data: Record<string, any> = {}
  if (typeof updates?.name === 'string') data.name = updates.name.slice(0, 200)
  if (typeof updates?.definition === 'string') data.definition = updates.definition.slice(0, 1000)
  if (updates?.status && ['active', 'paused', 'completed', 'archived'].includes(updates.status)) data.status = updates.status
  if (updates?.checkConfig && typeof updates.checkConfig === 'object') {
    data.checkConfig = { ...(goal.checkConfig as any), ...updates.checkConfig }
  }
  if (typeof updates?.progress === 'number') data.progress = Math.min(1, Math.max(0, updates.progress))

  const updated = await prisma.goal.update({ where: { id: goalId }, data })
  return { success: true, goal: { id: updated.id, name: updated.name, definition: updated.definition, status: updated.status } }
}

// ─── Projects ─────────────────────────────────────────────────────────────

async function getProjects(userId: string, goalId?: string, domainId?: string) {
  const projects = await prisma.oSProject.findMany({
    where: {
      userId,
      ...(goalId ? { goalId } : {}),
      ...(domainId ? { goal: { domainId } } : {}),
    },
    include: { goal: { select: { name: true, domainId: true } }, tasks: true },
    orderBy: { suggestedOrder: 'asc' },
  })
  return {
    projects: projects.map((p) => ({
      id: p.id, name: p.name, description: p.description, goalId: p.goalId,
      goalName: p.goal?.name, domainId: p.goal?.domainId,
      estimatedDuration: p.estimatedDuration, taskCount: p.tasks.length,
    })),
  }
}

async function createProject(userId: string, args: Record<string, any>) {
  let goalId: string | undefined = args.goalId
  // Allow linking by goal name if id not supplied.
  if (!goalId && args.goalName) {
    const g = await prisma.goal.findFirst({ where: { userId, name: { contains: String(args.goalName), mode: 'insensitive' } } })
    goalId = g?.id
  }
  if (!goalId) throw new Error('createProject requires a goalId (or a matching goalName). Create or fetch the goal first.')

  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } })
  if (!goal) throw new Error(`Goal not found: ${goalId}`)

  const count = await prisma.oSProject.count({ where: { userId, goalId } })
  const project = await prisma.oSProject.create({
    data: {
      userId, goalId,
      name: String(args.name || 'New project').slice(0, 200),
      description: String(args.description || '').slice(0, 1000),
      estimatedDuration: String(args.estimatedDuration || '1 week'),
      suggestedOrder: count + 1,
      accepted: true,
    },
  })
  return { success: true, project: { id: project.id, name: project.name, goalId, goalName: goal.name } }
}

async function updateProject(userId: string, projectId: string, updates: Record<string, any>) {
  const project = await prisma.oSProject.findFirst({ where: { id: projectId, userId } })
  if (!project) throw new Error(`Project not found: ${projectId}`)
  const data: Record<string, any> = {}
  if (typeof updates?.name === 'string') data.name = updates.name.slice(0, 200)
  if (typeof updates?.description === 'string') data.description = updates.description.slice(0, 1000)
  if (typeof updates?.accepted === 'boolean') data.accepted = updates.accepted
  const updated = await prisma.oSProject.update({ where: { id: projectId }, data })
  return { success: true, project: { id: updated.id, name: updated.name } }
}

// ─── Tasks ────────────────────────────────────────────────────────────────

async function getTasks(userId: string, projectId?: string, goalId?: string, status?: string) {
  const tasks = await prisma.oSTask.findMany({
    where: {
      userId,
      ...(projectId ? { projectId } : {}),
      ...(goalId ? { goalId } : {}),
      ...(status ? { status: status as any } : {}),
    },
    orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
    take: 100,
  })
  return {
    tasks: tasks.map((t) => ({
      id: t.id, name: t.name, priority: t.priority, status: t.status,
      duration: t.duration, scheduledAt: t.scheduledAt, projectId: t.projectId,
      goalId: t.goalId, domainId: t.domainId,
    })),
  }
}

/**
 * Create a task. Accepts projectId OR goalId OR goalName (resolved) OR neither
 * (a loose task with an inferred domain). Optionally schedules it immediately
 * (scheduledAt ISO or "morning"/"afternoon"/"evening" tomorrow).
 */
async function createTask(userId: string, args: Record<string, any>) {
  let projectId: string | null = args.projectId ?? null
  let goalId: string | null = args.goalId ?? null
  let domainId: string | null = DOMAIN_IDS.includes(args.domainId) ? args.domainId : null

  // Resolve goal by name if provided.
  if (!goalId && args.goalName) {
    const g = await prisma.goal.findFirst({ where: { userId, name: { contains: String(args.goalName), mode: 'insensitive' } } })
    if (g) { goalId = g.id; domainId = domainId ?? g.domainId }
  }
  // If a project is given, inherit its goal/domain.
  if (projectId) {
    const p = await prisma.oSProject.findFirst({ where: { id: projectId, userId }, include: { goal: true } })
    if (!p) throw new Error(`Project not found: ${projectId}`)
    goalId = goalId ?? p.goalId
    domainId = domainId ?? p.goal?.domainId ?? null
  }
  // If a goal is given (or resolved), inherit its domain.
  if (goalId && !domainId) {
    const g = await prisma.goal.findFirst({ where: { id: goalId, userId } })
    if (g) domainId = g.domainId
  }
  if (!domainId) domainId = inferDomain(String(args.name || ''))

  const duration = parseDurationMinutes(args.duration)
  const scheduledAt = resolveScheduleTime(args.scheduledAt || args.suggestedSchedule)
  const scheduledEnd = scheduledAt ? new Date(scheduledAt.getTime() + duration * 60000) : null

  const task = await prisma.oSTask.create({
    data: {
      userId,
      name: String(args.name || 'New task').slice(0, 500),
      notes: String(args.notes || '').slice(0, 1000),
      projectId,
      goalId,
      domainId,
      duration,
      priority: normalizePriority(args.priority),
      energyRequired: ['green', 'yellow', 'red'].includes(args.energyRequired) ? args.energyRequired : 'green',
      scheduledAt,
      scheduledEnd,
    },
  })
  await prisma.activityLog.create({
    data: { userId, taskId: task.id, goalId: goalId ?? undefined, action: 'task_created', metadata: { name: task.name, via: 'assistant' } },
  }).catch(() => {})

  // If we scheduled it, also drop a calendar event so it appears on /calendar.
  let calendarEvent = null
  if (scheduledAt && scheduledEnd) {
    calendarEvent = await prisma.calendarEvent.create({
      data: {
        userId, taskId: task.id, title: task.name, description: '',
        startAt: scheduledAt, endAt: scheduledEnd, domainId,
      },
    })
  }

  return {
    success: true,
    task: { id: task.id, name: task.name, priority: task.priority, duration: task.duration, scheduledAt: task.scheduledAt, goalId, domainId },
    calendarEvent: calendarEvent ? { id: calendarEvent.id, startAt: calendarEvent.startAt, endAt: calendarEvent.endAt } : null,
  }
}

/**
 * Schedule an EXISTING task (or one just created) onto a time slot, creating a
 * calendar event. Accepts taskId + startTime (ISO) OR a natural slot.
 */
async function scheduleTask(userId: string, args: Record<string, any>) {
  const task = await prisma.oSTask.findFirst({ where: { id: args.taskId, userId } })
  if (!task) throw new Error(`Task not found: ${args.taskId}`)

  const startAt = resolveScheduleTime(args.startTime || args.scheduledAt || args.slot) || defaultSlot()
  const duration = task.duration || parseDurationMinutes(args.duration)
  const endAt = new Date(startAt.getTime() + duration * 60000)

  const updated = await prisma.oSTask.update({
    where: { id: task.id },
    data: { scheduledAt: startAt, scheduledEnd: endAt },
  })

  const event = await prisma.calendarEvent.create({
    data: {
      userId, taskId: task.id, title: task.name, description: '',
      startAt, endAt, domainId: task.domainId ?? null,
    },
  })

  return {
    success: true,
    task: { id: updated.id, name: updated.name, scheduledAt: updated.scheduledAt },
    calendarEvent: { id: event.id, title: event.title, startAt: event.startAt, endAt: event.endAt },
  }
}

async function completeTask(userId: string, taskId: string) {
  const task = await prisma.oSTask.findFirst({ where: { id: taskId, userId } })
  if (!task) throw new Error(`Task not found: ${taskId}`)
  const updated = await prisma.oSTask.update({
    where: { id: taskId },
    data: { status: 'done', completedAt: new Date() },
  })
  await prisma.activityLog.create({
    data: { userId, taskId: updated.id, goalId: updated.goalId ?? undefined, action: 'task_completed', metadata: { name: updated.name, via: 'assistant' } },
  }).catch(() => {})
  return { success: true, task: { id: updated.id, name: updated.name, status: updated.status } }
}

// ─── Calendar ─────────────────────────────────────────────────────────────

async function getCalendarEvents(userId: string, startDate?: string, endDate?: string) {
  const from = startDate ? new Date(startDate) : new Date()
  const to = endDate ? new Date(endDate) : new Date(from.getTime() + 7 * 86400000)
  const events = await prisma.calendarEvent.findMany({
    where: { userId, startAt: { gte: from }, endAt: { lte: to } },
    orderBy: { startAt: 'asc' },
    take: 200,
  })
  return {
    events: events.map((e) => ({ id: e.id, title: e.title, startAt: e.startAt, endAt: e.endAt, taskId: e.taskId, domainId: e.domainId })),
    dateRange: { start: from.toISOString(), end: to.toISOString() },
  }
}

async function createCalendarEvent(userId: string, args: Record<string, any>) {
  const startAt = resolveScheduleTime(args.startTime || args.startAt) || defaultSlot()
  const endAt = args.endTime || args.endAt
    ? new Date(args.endTime || args.endAt)
    : new Date(startAt.getTime() + 60 * 60000)

  // If a taskId is given, resolve title/domain from it.
  let title = String(args.title || '').slice(0, 300)
  let domainId: string | null = args.domainId ?? null
  let taskId: string | null = args.taskId ?? null
  if (taskId) {
    const task = await prisma.oSTask.findFirst({ where: { id: taskId, userId } })
    if (task) { if (!title) title = task.name; domainId = domainId ?? task.domainId ?? null; await prisma.oSTask.update({ where: { id: task.id }, data: { scheduledAt: startAt, scheduledEnd: endAt } }) }
    else taskId = null
  }
  if (!title) title = 'New event'

  const event = await prisma.calendarEvent.create({
    data: { userId, taskId, title, description: String(args.description || '').slice(0, 1000), startAt, endAt, domainId },
  })
  return { success: true, event: { id: event.id, title: event.title, startAt: event.startAt, endAt: event.endAt, taskId: event.taskId } }
}

// ─── Archetype / energy ─────────────────────────────────────────────────────

async function getArchetypeInfo(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.osConfig) return { message: 'No OS configuration found. Run onboarding first.' }
  const osConfig = user.osConfig as any
  return { archetype: osConfig.archetype, archetypeName: osConfig.archetypeName, sunSign: osConfig.sunSign, bazi: osConfig.bazi }
}

async function getEnergyHours(userId: string) {
  const profile = await prisma.energyProfile.findUnique({ where: { userId } }).catch(() => null)
  if (profile?.hourMap) {
    return { energyHours: profile.hourMap, message: 'green = peak energy, yellow = moderate, red = low. Schedule high-priority tasks during green hours.' }
  }
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const osConfig = (user?.osConfig as any) || {}
  return { energyHours: osConfig.energyHours || {}, message: 'Energy hours show your peak performance times throughout the day' }
}

// ─── Scheduling helpers ─────────────────────────────────────────────────────

/** Next occurrence tomorrow at 09:00 (server UTC) as a safe default. */
function defaultSlot(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return d
}

/**
 * Resolve a schedule string. Accepts:
 *  - ISO datetime → parsed directly
 *  - "morning" | "afternoon" | "evening" | "anytime"/"tomorrow" → tomorrow slot
 *  - undefined/null → null (unscheduled)
 */
function resolveScheduleTime(input?: string): Date | null {
  if (!input) return null
  const s = String(input).trim()
  // ISO datetime?
  const iso = Date.parse(s)
  if (!Number.isNaN(iso) && /\d{4}-\d{2}-\d{2}/.test(s)) return new Date(iso)
  const lower = s.toLowerCase()
  const base = new Date()
  base.setDate(base.getDate() + 1)
  if (lower.includes('morning')) { base.setHours(9, 0, 0, 0); return base }
  if (lower.includes('afternoon')) { base.setHours(14, 0, 0, 0); return base }
  if (lower.includes('evening') || lower.includes('night')) { base.setHours(19, 0, 0, 0); return base }
  if (lower.includes('tomorrow') || lower.includes('anytime') || lower.includes('today')) { base.setHours(9, 0, 0, 0); return base }
  return null
}
