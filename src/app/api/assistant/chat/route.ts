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
        select: { id: true, name: true, status: true, horizon: true },
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
    const snapshot =
      `\n\n## The user's current goals (LIVE — this is their full list; never say you can't see their goals)\n` +
      (liveGoals.length === 0
        ? 'No goals yet.'
        : liveGoals.map((g) => `- [${g.id}] "${g.name}" — ${g.status}, ${g.horizon}`).join('\n')) +
      `\n\nOpen tasks: ${openTaskCount} (call get_tasks for details). When you update, schedule, or delete something, use these EXACT ids. To remove a goal/task the user created by mistake, call delete_goal / delete_task. NEVER paste raw JSON or tool output into your reply — summarise in plain language.`

    // Two-tier brain: SHARED knowledge (platform + topical BaZi doctrine) + the
    // PER-USER context (identity/season/state/memory/commitments). This is what
    // makes the Coach actually understand 8os and remember the user across sessions.
    const brain = agentContext?.text ? `\n\n${agentContext.text}` : ''
    const baziDoctrine = selectBaziDoctrine(message)
    const systemPrompt = personalizedPrompt + '\n\n' + PLATFORM_KNOWLEDGE + plays + brain + baziDoctrine + snapshot

    // Build message history
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversation.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'tool',
        content: msg.content,
        tool_call_id: msg.toolCallId || undefined,
        name: msg.toolName || undefined,
      })),
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
        async function streamOneRound(roundMessages: ChatMessage[]) {
          const response = await createStreamingChatCompletion(roundMessages, {
            tools: ASSISTANT_TOOLS,
            tool_choice: 'auto',
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
          let guardUsed = false      // anti-narration corrective round fired once

          for (let round = 0; round < MAX_ROUNDS; round++) {
            const { content, toolCalls } = await streamOneRound(running)

            // No tool calls → this is the final assistant turn.
            if (toolCalls.length === 0) {
              // Anti-narration guard: if the model CLAIMS it did something but no
              // mutating tool ran this whole turn, it hallucinated the action. Give
              // it exactly one corrective round (with tools) to actually do it.
              if (!mutatingCalled && !guardUsed && CLAIMS_ACTION.test(content)) {
                guardUsed = true
                running.push({ role: 'assistant', content })
                running.push({
                  role: 'system',
                  content:
                    'STOP. You just told the user you created/added/updated/scheduled/deleted something, but you called NO tool this turn, so nothing actually changed in their OS. If the user asked for a change, call the correct tools NOW to really perform it (use the exact ids from context). If no change was needed, rewrite your reply so it does not claim any action was taken.',
                })
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
                resultPayload = await executeTool(tc.name as any, args, user.id)
              } catch (error) {
                resultPayload = { error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
              }
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
              const finalResp = await createStreamingChatCompletion(running, { tool_choice: 'none' })
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
