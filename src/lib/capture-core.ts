/**
 * Universal quick-capture core (extracted from /api/capture for OS-2652).
 *
 * `runCapture(userId, text)` is the SAME single-shot classifier the CaptureBar
 * uses via POST /api/capture: one free-text input → exactly one OS object
 * (task or goal) via Flow AI tool-calling, then the object is created and a
 * short confirmation returned. The Telegram webhook calls this directly
 * (userId resolved from the telegram link), so bot capture and web capture
 * are literally one code path.
 *
 * This file is a verbatim extraction of the route logic — the route now wraps
 * it in auth + rate limiting + HTTP shapes; nothing behavioral changed.
 */
import { createChatCompletion, ChatMessage, Tool } from '@/lib/flow-ai'
import { executeTool } from '@/lib/assistant-tool-executor'
import { prisma } from '@/lib/db/prisma'

// Focused tool set for capture: the model must call exactly ONE of these.
// create_task here does NOT require a projectId (capture is friction-free; the
// task can live unparented and be organised later), which is why we use a local
// tool definition rather than the full ASSISTANT_TOOLS set.
const CAPTURE_TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'capture_task',
      description:
        'Capture a single actionable to-do. Use this for anything the user needs to DO: errands, calls, emails, meetings, chores, reminders, "buy X", "call Y", "finish Z". Parse priority, duration and life domain when they are evident from the text. If a clear time/day is mentioned, include scheduledAt as an ISO 8601 datetime.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Concise task name (strip filler words like "remind me to").' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Priority if evident, else medium.' },
          durationMinutes: { type: 'number', description: 'Estimated duration in minutes if evident, else omit.' },
          domainId: {
            type: 'string',
            enum: ['career', 'wealth', 'health', 'relationships', 'learning', 'legacy'],
            description: 'Best-fit life domain if evident, else omit.',
          },
          scheduledAt: { type: 'string', description: 'ISO 8601 datetime if a clear time/day is present, else omit.' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'capture_goal',
      description:
        'Capture a longer-term outcome or aspiration the user wants to achieve. Use this for things framed as wants/ambitions/outcomes: "I want to...", "get fit this year", "launch a podcast", "learn Spanish", "save $10k". Not for a single immediate action (use capture_task for those).',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Concise goal name, e.g. "Get fit".' },
          domainId: {
            type: 'string',
            enum: ['career', 'wealth', 'health', 'relationships', 'learning', 'legacy'],
            description: 'Best-fit life domain.',
          },
          definition: { type: 'string', description: 'What success looks like (optional).' },
        },
        required: ['name', 'domainId'],
      },
    },
  },
]

function buildCapturePrompt(now: Date, archetypeName?: string | null): string {
  let p = `You are the 8OS quick-capture engine. The user typed ONE short free-text note from anywhere in their dashboard. Turn it into exactly ONE OS object by calling EXACTLY ONE tool — either capture_task or capture_goal — and nothing else. Do not ask questions. Do not call more than one tool.

Decision rule:
- If it is a single concrete action/errand/reminder/event (something to DO), call capture_task.
- If it is a longer-term outcome, ambition or aspiration ("I want to...", "this year", "become", "launch", "learn", "save up"), call capture_goal.

Parsing rules for capture_task:
- Extract priority (urgent/asap/important => high), duration, and life domain only when clearly implied.
- If a specific time or day is mentioned (e.g. "fri 3pm", "tomorrow 2pm", "tonight"), resolve it relative to the current time and pass scheduledAt as an ISO 8601 datetime. If no clear time, omit scheduledAt.
- Keep the task name clean and short.

The current date and time is ${now.toISOString()} (use this to resolve relative times).`
  if (archetypeName) p += `\nThe user's archetype is ${archetypeName}; keep naming natural to them.`
  return p
}

const DOMAIN_COLORS: Record<string, string> = {
  career: '#6366f1', wealth: '#f59e0b', health: '#22c55e',
  relationships: '#ec4899', learning: '#3b82f6', legacy: '#8b5cf6',
}

export type CaptureOutcome =
  | { ok: true; kind: 'task' | 'goal'; object: unknown; confirmation: string; color: string | null }
  | { ok: false; status: number; error: string }

export async function runCapture(userId: string, rawText: string): Promise<CaptureOutcome> {
  const text = (rawText ?? '').toString().trim()
  if (!text) return { ok: false, status: 400, error: 'text is required' }
  if (text.length > 500) return { ok: false, status: 400, error: 'text too long' }

  const archetype = await prisma.archetypeResult.findUnique({ where: { userId } }).catch(() => null)

  const messages: ChatMessage[] = [
    { role: 'system', content: buildCapturePrompt(new Date(), archetype?.archetypeName) },
    { role: 'user', content: text },
  ]

  let completion
  try {
    completion = await createChatCompletion(messages, {
      tools: CAPTURE_TOOLS,
      tool_choice: 'auto',
      temperature: 0.2,
    })
  } catch (e) {
    console.error('[capture] LLM error:', e)
    return { ok: false, status: 502, error: 'Capture failed (assistant unavailable). Please try again.' }
  }

  const toolCalls = completion.choices?.[0]?.message?.tool_calls ?? []
  if (!toolCalls.length) {
    return { ok: false, status: 422, error: 'Could not interpret that as a task or goal. Try rephrasing.' }
  }

  // Honour exactly the first tool call (capture = one object).
  const call = toolCalls[0]
  let args: Record<string, unknown> = {}
  try {
    args = JSON.parse(call.function.arguments || '{}')
  } catch {
    args = {}
  }

  if (call.function.name === 'capture_goal') {
    const result = await executeTool('create_goal' as never, {
      domainId: args.domainId,
      name: args.name,
      definition: args.definition,
    }, userId)
    const goal = (result as { goal: { id: string; name: string; domainId: string; progress: number } }).goal
    return {
      ok: true,
      kind: 'goal',
      object: goal,
      confirmation: `Goal added: "${goal.name}"${goal.domainId ? ` · ${goal.domainId}` : ''}`,
      color: DOMAIN_COLORS[goal.domainId] ?? null,
    }
  }

  // Default / capture_task path. create_task requires a projectId, so for
  // friction-free capture we create the OSTask directly (unparented) here,
  // mirroring how /api/nlp creates project-less tasks.
  const name = (args.name as string) || text
  const priority: 'high' | 'medium' | 'low' =
    args.priority === 'high' || args.priority === 'low' ? args.priority : 'medium'
  const durationMinutes = typeof args.durationMinutes === 'number' && args.durationMinutes > 0
    ? Math.round(args.durationMinutes) : 60
  const domainId = (['career', 'wealth', 'health', 'relationships', 'learning', 'legacy'].includes(args.domainId as string)
    ? (args.domainId as string) : null)

  let scheduledAt: Date | null = null
  let scheduledEnd: Date | null = null
  if (typeof args.scheduledAt === 'string') {
    const d = new Date(args.scheduledAt)
    if (!isNaN(d.getTime())) {
      scheduledAt = d
      scheduledEnd = new Date(d.getTime() + durationMinutes * 60 * 1000)
    }
  }

  const task = await prisma.oSTask.create({
    data: {
      userId,
      name,
      domainId,
      duration: durationMinutes,
      priority,
      status: 'todo',
      scheduledAt,
      scheduledEnd,
      energyRequired: priority === 'high' ? 'green' : 'yellow',
    },
  })

  if (scheduledAt && scheduledEnd) {
    await prisma.calendarEvent.create({
      data: {
        userId,
        taskId: task.id,
        title: task.name,
        startAt: scheduledAt,
        endAt: scheduledEnd,
        domainId,
        color: domainId ? DOMAIN_COLORS[domainId] : null,
      },
    }).catch(() => {})
  }

  await prisma.activityLog.create({
    data: { userId, taskId: task.id, action: 'task_created', metadata: { source: 'capture', input: text } },
  }).catch(() => {})

  const parts = [`Task added: "${task.name}"`]
  if (domainId) parts.push(domainId)
  if (priority && priority !== 'medium') parts.push(`${priority} priority`)
  if (scheduledAt) {
    parts.push(scheduledAt.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }))
  }

  return {
    ok: true,
    kind: 'task',
    object: task,
    confirmation: parts.join(' · '),
    color: domainId ? DOMAIN_COLORS[domainId] : null,
  }
}
