/**
 * Assistant Chat API Route
 * Handles streaming chat completions with tool execution
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import {
  createStreamingChatCompletion,
  parseStreamChunk,
  ChatMessage,
  StreamChunk,
} from '@/lib/flow-ai'
import { ASSISTANT_TOOLS, ASSISTANT_SYSTEM_PROMPT, buildPersonalizedPrompt } from '@/lib/assistant-tools'
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

    // Get or create conversation
    let conversation
    if (conversationId) {
      conversation = await prisma.assistantConversation.findUnique({
        where: { id: conversationId, userId: user.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })
    }

    if (!conversation) {
      conversation = await prisma.assistantConversation.create({
        data: { userId: user.id },
        include: { messages: true },
      })
    }

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

    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const MAX_ROUNDS = 8

        // Read one streamed completion; enqueue content deltas to the client and
        // accumulate any tool calls. Returns { content, toolCalls }.
        async function streamOneRound(roundMessages: ChatMessage[], forceTool = false) {
          const response = await createStreamingChatCompletion(roundMessages, {
            // The Coach is the flagship AGENTIC surface: pin the strong tier, not
            // cost-routed 'auto' (which lands on deepseek-*-flash and, in long
            // tool-heavy conversations, narrates "I'll do it" without emitting tool
            // calls). Everything else keeps using 'auto'.
            model: 'flow-1',
            tools: ASSISTANT_TOOLS,
            // On the anti-narration corrective round, REQUIRE a tool call so the
            // model can't just re-narrate.
            tool_choice: forceTool ? 'required' : 'auto',
          })
          const reader = response.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          let content = ''
          const toolCalls: { id: string; name: string; arguments: string }[] = []

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            for (const line of lines) {
              const chunk = parseStreamChunk(line)
              if (!chunk) continue
              const delta = chunk.choices[0]?.delta
              if (!delta) continue

              if (delta.content) {
                content += delta.content
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`)
                )
              }

              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  if (tc.id) {
                    toolCalls.push({ id: tc.id, name: tc.function?.name || '', arguments: tc.function?.arguments || '' })
                  } else if (tc.index !== undefined && toolCalls[tc.index]) {
                    if (tc.function?.arguments) toolCalls[tc.index].arguments += tc.function.arguments
                    if (tc.function?.name && !toolCalls[tc.index].name) toolCalls[tc.index].name = tc.function.name
                  } else if (tc.function?.arguments && toolCalls.length > 0) {
                    // Fallback: append to the most recent tool call when no index is provided.
                    toolCalls[toolCalls.length - 1].arguments += tc.function.arguments
                  }
                }
              }
            }
          }
          return { content, toolCalls }
        }

        try {
          // Running message list threaded across tool rounds.
          const running: ChatMessage[] = [...messages]
          let mutatingCalled = false // did any tool that changes the OS actually run?
          let anyToolCalled = false  // did ANY tool run this turn (incl. reads)?
          let guardUsed = false      // anti-narration corrective round fired once
          let forceNext = false      // force a tool call on the next round (guard)

          for (let round = 0; round < MAX_ROUNDS; round++) {
            const { content, toolCalls } = await streamOneRound(running, forceNext)
            forceNext = false

            // No tool calls → this is the final assistant turn.
            if (toolCalls.length === 0) {
              // Anti-narration guard: the model either CLAIMED it did something, or
              // PROMISED to do something ("let me review…") — but no tool has run at
              // all this turn. Both are pure narration; force one corrective round
              // where a tool call is REQUIRED.
              const narrated =
                (!mutatingCalled && CLAIMS_ACTION.test(content)) ||
                (!anyToolCalled && PROMISES_ACTION.test(content))
              if (narrated && !guardUsed) {
                guardUsed = true
                running.push({ role: 'assistant', content })
                running.push({
                  role: 'system',
                  content:
                    'STOP. You told the user you did (or are about to do) something, but you called NO tool, so nothing actually happened. Call the correct tools NOW — to read, call get_tasks/get_calendar_events/get_goals; to change, use the exact ids from context and the BULK tools delete_goals/convert_goals_to_tasks for batches. Never announce work without doing it in the same turn.',
                })
                forceNext = true // next round MUST emit a tool call
                continue
              }
              await prisma.assistantMessage.create({
                data: { conversationId: conversation.id, role: 'assistant', content },
              })
              break
            }

            // Tool calls requested — notify client, persist, execute, feed back.
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'tool_start', round, toolCalls: toolCalls.map(tc => ({ id: tc.id, name: tc.name })) })}\n\n`)
            )

            await prisma.assistantMessage.create({
              data: {
                conversationId: conversation.id,
                role: 'assistant',
                content: content || null,
                toolCalls: toolCalls.map(tc => ({ id: tc.id, name: tc.name, arguments: tc.arguments })),
              },
            })

            // Add the assistant tool-call turn to the running history.
            running.push({
              role: 'assistant',
              content: content || null,
              tool_calls: toolCalls.map(tc => ({ id: tc.id, type: 'function' as const, function: { name: tc.name, arguments: tc.arguments } })),
            })

            // Execute each tool call and append tool results.
            for (const tc of toolCalls) {
              let resultPayload: any
              try {
                const args = tc.arguments ? JSON.parse(tc.arguments) : {}
                resultPayload = await executeTool(tc.name as any, args, user.id, timezone)
              } catch (error) {
                resultPayload = { error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
              }
              anyToolCalled = true
              if (MUTATING_TOOLS.has(tc.name) && !(resultPayload && resultPayload.error)) mutatingCalled = true
              const resultStr = JSON.stringify(resultPayload)
              running.push({ role: 'tool', content: resultStr, tool_call_id: tc.id, name: tc.name })
              await prisma.assistantMessage.create({
                data: { conversationId: conversation.id, role: 'tool', content: resultStr, toolCallId: tc.id, toolName: tc.name },
              }).catch(() => {})
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'tool_complete', round })}\n\n`)
            )

            // If this was the last allowed round, force a final no-tools summary
            // so the user always gets a closing message.
            if (round === MAX_ROUNDS - 1) {
              const finalResp = await createStreamingChatCompletion(running, { model: 'flow-1', tool_choice: 'none' })
              const finalReader = finalResp.getReader()
              const finalDecoder = new TextDecoder()
              let finalBuf = ''
              let finalContent = ''
              while (true) {
                const { done, value } = await finalReader.read()
                if (done) break
                finalBuf += finalDecoder.decode(value, { stream: true })
                const flines = finalBuf.split('\n')
                finalBuf = flines.pop() || ''
                for (const line of flines) {
                  const chunk = parseStreamChunk(line)
                  const d = chunk?.choices[0]?.delta
                  if (d?.content) {
                    finalContent += d.content
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', content: d.content })}\n\n`))
                  }
                }
              }
              await prisma.assistantMessage.create({
                data: { conversationId: conversation.id, role: 'assistant', content: finalContent },
              })
            }
            // else: loop again — the model sees the tool results and may call more tools.
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

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done', conversationId: conversation.id })}\n\n`)
          )
        } catch (error) {
          console.error('Chat error:', error)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`)
          )
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
