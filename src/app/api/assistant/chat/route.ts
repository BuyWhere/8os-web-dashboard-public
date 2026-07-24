/**
 * Assistant Chat API Route
 * Handles streaming chat completions with tool execution
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { streamText, tool, jsonSchema, type CoreMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { type ChatMessage } from '@/lib/flow-ai'
import { ASSISTANT_TOOLS, buildPersonalizedPrompt } from '@/lib/assistant-tools'
import { executeTool } from '@/lib/assistant-tool-executor'
import { requireAuth } from '@/lib/auth/require-auth'
import { assembleAgentContext } from '@/lib/agent-context'
import { PLATFORM_KNOWLEDGE, selectBaziDoctrine } from '@/lib/coach/knowledge'
import { selectPlays } from '@/lib/coach/plays'
import { detectAndStoreCommitment } from '@/lib/memory/commitment-detect'
import { consolidateUser } from '@/lib/memory/extract'

/** Debounce heavy memory consolidation per user (Railway process is long-lived). */
const _lastConsolidate = new Map<string, number>()

/** Tools that mutate the user's OS — used by the anti-narration verification guard. */
const MUTATING_TOOLS = new Set([
  'create_goal', 'update_goal', 'delete_goal',
  'create_project', 'update_project',
  'create_task', 'schedule_task', 'complete_task', 'delete_task',
  'create_calendar_event',
])
const CLAIMS_ACTION = /\b(create|created|add|added|delete|deleted|remove|removed|archive|archived|schedul|mov(?:e|ed)|updat|convert|set up|mark(?:ed)?|log(?:ged)?)\b/i
/** "Let me review/check/fetch…" style promises — announcing work instead of doing it. */
const PROMISES_ACTION = /\b(let me|i'?ll|i will|i am going to|executing|fetching|checking|reviewing|looking (at|into)|going to|one sweep|right now)\b/i

/**
 * POST /api/assistant/chat
 * Send a message to the assistant and get a streaming response
 *
 * Body: {
 *   message: string
 *   conversationId?: string (for continuing existing conversations)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user (Clerk session -> app user id, QA header preserved)
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const user = { id: auth.userId }

    const body = await request.json()
    const { message, conversationId } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get or create conversation (single-expression init so TS keeps the type
    // through the streaming closures below).
    let conversation = conversationId
      ? await prisma.assistantConversation.findUnique({
          where: { id: conversationId, userId: user.id },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        })
      : null

    if (!conversation) {
      conversation = await prisma.assistantConversation.create({
        data: { userId: user.id },
        include: { messages: true },
      })
    }
    // Snapshot for the streaming closures (TS can't narrow the `let` in there).
    const convoId: string = conversation.id

    // Build personalized system prompt with user's archetype + CURRENT date so
    // the Coach resolves "today"/"tomorrow" correctly (it used to guess the date
    // from stale task data and file everything to the wrong day).
    const fullUser = await prisma.user.findUnique({ where: { id: user.id } })
    const osConfig = (fullUser?.osConfig as any) || {}
    // Canonical timezone lives on UserProfile (auto-captured by Settings→Preferences),
    // read via getUserTimezone (defaults Asia/Singapore). This is the SAME source the
    // rest of the OS uses for "today" math.
    const { getUserTimezone } = await import('@/lib/user-time')
    const timezone = await getUserTimezone(user.id)
    const firstName =
      (fullUser as any)?.firstName ||
      (fullUser as any)?.name ||
      (fullUser?.email ? fullUser.email.split('@')[0] : undefined)
    const personalizedPrompt = buildPersonalizedPrompt(osConfig, { now: new Date(), timezone, firstName })

    // Live-state snapshot — inject the user's REAL goals + open-task count up front so
    // the Coach always sees the full picture (it used to be blind to paused goals and
    // would claim it couldn't see them / act on the wrong ones / narrate fake actions).
    const [liveGoals, openTaskCount, agentContext] = await Promise.all([
      prisma.goal.findMany({
        where: { userId: user.id, status: { in: ['active', 'paused'] } },
        select: { id: true, name: true, status: true, horizon: true, createdAt: true, projects: { select: { id: true } } },
        orderBy: { createdAt: 'asc' },
        take: 150,
      }),
      prisma.oSTask.count({ where: { userId: user.id, status: { in: ['todo', 'in_progress'] } } }),
      // The per-user "brain": identity (archetype + BaZi chart), season (luck
      // pillars), state (goals/calendar/alignment), and durable memory + open
      // commitments — ranked, token-budgeted. Never throws.
      assembleAgentContext(user.id, 'adhoc_nudge').catch(() => null),
    ])
    // Curated shared playbook layer (best-practice plays relevant to this message).
    const plays = await selectPlays(message).catch(() => '')
    const todayIso = (() => {
      try { return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date()) } catch { return new Date().toISOString().slice(0, 10) }
    })()
    const goalDay = (d: Date) => {
      try { return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(d) } catch { return d.toISOString().slice(0, 10) }
    }
    const snapshot =
      `\n\n## The user's current goals (LIVE — this is their full list; never say you can't see their goals)\n` +
      `Today is ${todayIso}. "created" dates below let you tell which goals are recent vs long-standing.\n` +
      (liveGoals.length === 0
        ? 'No goals yet.'
        : liveGoals.map((g) => {
            const cd = goalDay(g.createdAt as Date)
            const flag = cd === todayIso ? ' [CREATED TODAY]' : ''
            const proj = g.projects?.length ? `, ${g.projects.length} project(s)` : ''
            return `- [${g.id}] "${g.name}" — ${g.status}, ${g.horizon}, created ${cd}${flag}${proj}`
          }).join('\n')) +
      `\n\nOpen tasks: ${openTaskCount} (call get_tasks for details). When you update, schedule, or delete something, use these EXACT ids.\n` +
      `BATCH OPS: to remove or convert MANY goals at once, call delete_goals(goalIds:[...]) or convert_goals_to_tasks(goalIds:[...]) ONE time with all the ids — never loop the single-item tools dozens of times (that fails). After a batch tool returns, tell the user how many succeeded.\n` +
      `SCHEDULING TIMES: never invent a clock time. If the user gave a day but no time, use DATE-ONLY scheduledAt (YYYY-MM-DD) so the task sits on that day's list without cluttering the calendar; suggest the Replan button or auto-scheduling if they want real slots. Only use a full datetime when the user stated one.\n` +
      `DELETION SAFETY: "today's goals" / "the ones you just created" means ONLY goals marked [CREATED TODAY]. NEVER delete a goal created on an earlier date or one that has projects unless the user names it explicitly — those are long-standing goals (the six foundational domain goals like Build/Fix/Improve/Operate/Think/Personal are permanent; never delete them as "today's"). When unsure which goals the user means, LIST the candidates and ask before deleting. NEVER paste raw JSON or tool output into your reply — summarise in plain language.`

    // Two-tier brain: SHARED knowledge (platform + topical BaZi doctrine) + the
    // PER-USER context (identity/season/state/memory/commitments). This is what
    // makes the Coach actually understand 8os and remember the user across sessions.
    const brain = agentContext?.text ? `\n\n${agentContext.text}` : ''
    const baziDoctrine = selectBaziDoctrine(message)
    const systemPrompt = personalizedPrompt + '\n\n' + PLATFORM_KNOWLEDGE + plays + brain + baziDoctrine + snapshot

    // Build message history. THREE rules, each a hard-won bug fix:
    //  1. Assistant messages MUST carry their persisted tool_calls — omitting them
    //     leaves every stored tool result as an ORPHANED `tool` message (invalid
    //     per the OpenAI tool contract). That malformed history is what made the
    //     Coach flail/narrate in long conversations, regardless of model.
    //  2. Cap the window (last 40) and start it at a `user` message so we never
    //     open mid tool-sequence.
    //  3. Truncate giant old tool payloads — they bloat context without value.
    const windowRaw = conversation.messages.slice(-40)
    let winStart = 0
    while (winStart < windowRaw.length && windowRaw[winStart].role !== 'user') winStart++
    const history: ChatMessage[] = windowRaw.slice(winStart).map((msg) => {
      const m: ChatMessage = {
        role: msg.role as 'user' | 'assistant' | 'tool',
        content:
          msg.role === 'tool' && msg.content && msg.content.length > 3000
            ? msg.content.slice(0, 3000) + '…[truncated]'
            : msg.content,
      }
      const calls = msg.toolCalls as unknown as Array<{ id: string; name: string; arguments?: string }> | null
      if (msg.role === 'assistant' && Array.isArray(calls) && calls.length > 0) {
        m.tool_calls = calls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments ?? {}) },
        }))
      }
      if (msg.toolCallId) m.tool_call_id = msg.toolCallId
      if (msg.toolName) m.name = msg.toolName
      return m
    })
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ]

    // Save user message + bump the conversation so "most recent" ordering and the
    // Coach's auto-resume-on-reopen reflect real activity, not just creation time.
    await prisma.assistantMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    })
    await prisma.assistantConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    }).catch(() => {})

    // ── AI SDK harness ────────────────────────────────────────────────────
    // The tool loop, assistant/tool message threading, and stream parsing are
    // owned by the Vercel AI SDK (streamText + maxSteps). The hand-rolled loop
    // this replaces produced orphaned tool_calls, dropped batches, and
    // narration loops — that entire bug class now lives in a maintained harness.
    const flow = createOpenAI({
      baseURL: 'https://api.flowaiapi.com/v1',
      apiKey: process.env.FLOW_AI_API_KEY || '',
      compatibility: 'compatible', // Flow AI is OpenAI-compatible, not OpenAI
    })

    // Our stored history (OpenAI wire shape) → SDK CoreMessages.
    const coreHistory: CoreMessage[] = []
    for (const m of history) {
      if (m.role === 'user') {
        coreHistory.push({ role: 'user', content: m.content || '' })
      } else if (m.role === 'assistant') {
        if (m.tool_calls && m.tool_calls.length > 0) {
          const parts: any[] = []
          if (m.content) parts.push({ type: 'text', text: m.content })
          for (const tc of m.tool_calls) {
            let args: any = {}
            try { args = JSON.parse(tc.function.arguments || '{}') } catch { /* keep {} */ }
            parts.push({ type: 'tool-call', toolCallId: tc.id, toolName: tc.function.name, args })
          }
          coreHistory.push({ role: 'assistant', content: parts })
        } else {
          coreHistory.push({ role: 'assistant', content: m.content || '' })
        }
      } else if (m.role === 'tool' && m.tool_call_id) {
        let result: any = m.content
        try { result = JSON.parse(m.content || '') } catch { /* keep string */ }
        coreHistory.push({
          role: 'tool',
          content: [{ type: 'tool-result', toolCallId: m.tool_call_id, toolName: m.name || 'tool', result }],
        })
      }
    }
    const coreMessages: CoreMessage[] = [
      { role: 'system', content: systemPrompt },
      ...coreHistory,
      { role: 'user', content: message },
    ]

    // Execution tracking for the anti-narration verification.
    let anyToolCalled = false
    let mutatingCalled = false
    void mutatingCalled

    // Our OpenAI-format tool defs → SDK tools (same schemas via jsonSchema; the
    // SAME executeTool runs them, tz-aware and userId-scoped).
    const sdkTools: Record<string, any> = {}
    for (const t of ASSISTANT_TOOLS) {
      const name = t.function.name
      sdkTools[name] = tool({
        description: t.function.description,
        parameters: jsonSchema(t.function.parameters as any),
        execute: async (args: any) => {
          let payload: any
          try {
            payload = await executeTool(name as any, args ?? {}, user.id, timezone)
          } catch (error) {
            payload = { error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
          }
          anyToolCalled = true
          if (MUTATING_TOOLS.has(name) && !(payload && payload.error)) mutatingCalled = true
          return payload
        },
      })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: Record<string, unknown>) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

        /** One SDK run: streams to the client (existing wire protocol), persists
         *  each step in the same DB shape as before, returns final text +
         *  generated messages for threading a follow-up phase. */
        async function runPhase(
          msgs: CoreMessage[],
          toolChoice: 'auto' | 'required',
          maxSteps: number,
        ): Promise<{ text: string; responseMessages: CoreMessage[] }> {
          let round = 0
          const result = streamText({
            model: flow.chat('flow-1'),
            messages: msgs,
            tools: sdkTools,
            toolChoice,
            maxSteps,
            temperature: 0.7,
            onStepFinish: async ({ text, toolCalls, toolResults }) => {
              // Persist in the exact shape the history rebuilder expects.
              try {
                if (text || toolCalls.length > 0) {
                  await prisma.assistantMessage.create({
                    data: {
                      conversationId: convoId,
                      role: 'assistant',
                      content: text || null,
                      ...(toolCalls.length > 0
                        ? { toolCalls: toolCalls.map((tc) => ({ id: tc.toolCallId, name: tc.toolName, arguments: JSON.stringify(tc.args ?? {}) })) }
                        : {}),
                    },
                  })
                }
                for (const tr of toolResults) {
                  await prisma.assistantMessage.create({
                    data: {
                      conversationId: convoId,
                      role: 'tool',
                      content: JSON.stringify((tr as any).result ?? null),
                      toolCallId: tr.toolCallId,
                      toolName: tr.toolName,
                    },
                  })
                }
              } catch (e) { console.error('[assistant/chat] step persist failed:', e) }
            },
          })

          for await (const part of result.fullStream) {
            if (part.type === 'text-delta') {
              send({ type: 'content', content: part.textDelta })
            } else if (part.type === 'tool-call') {
              send({ type: 'tool_start', round, toolCalls: [{ id: part.toolCallId, name: part.toolName }] })
            } else if (part.type === 'tool-result') {
              send({ type: 'tool_complete', round })
            } else if (part.type === 'step-finish') {
              round++
            } else if (part.type === 'error') {
              throw (part as any).error instanceof Error ? (part as any).error : new Error(String((part as any).error))
            }
          }
          const steps = await result.steps
          const response = await result.response
          return { text: steps[steps.length - 1]?.text ?? '', responseMessages: response.messages as CoreMessage[] }
        }

        try {
          // Phase 1 — the normal turn.
          const p1 = await runPhase(coreMessages, 'auto', 10)

          // Anti-narration verification: the model claimed or promised action but
          // ran ZERO tools → one corrective pass where a tool call is REQUIRED for
          // exactly one step (then auto to finish up and summarise honestly).
          if (!anyToolCalled && (CLAIMS_ACTION.test(p1.text) || PROMISES_ACTION.test(p1.text))) {
            send({ type: 'content', content: '\n\n' })
            const guardBase: CoreMessage[] = [
              ...coreMessages,
              ...p1.responseMessages,
              {
                role: 'system',
                content:
                  'STOP. You told the user you did (or are about to do) something, but you called NO tool, so nothing actually happened. Call the correct tools NOW — to read, use get_tasks/get_calendar_events/get_goals; to change, use the exact ids from context and the BULK tools delete_goals/convert_goals_to_tasks for batches. Then report honestly what you actually did.',
              },
            ]
            const p2a = await runPhase(guardBase, 'required', 1)
            await runPhase([...guardBase, ...p2a.responseMessages], 'auto', 8)
          }

          // Learn from this turn — non-blocking (Railway's process is long-lived,
          // so fire-and-forget completes). Real-time commitment capture every turn
          // (cheap, regex-prefiltered); durable-memory consolidation debounced.
          void detectAndStoreCommitment(user.id, message).catch(() => {})
          const lastCons = _lastConsolidate.get(user.id) || 0
          if (Date.now() - lastCons > 30 * 60 * 1000) {
            _lastConsolidate.set(user.id, Date.now())
            void consolidateUser(user.id).catch(() => {})
          }

          send({ type: 'done', conversationId: conversation.id })
        } catch (error) {
          console.error('Chat error:', error)
          send({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Assistant chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
