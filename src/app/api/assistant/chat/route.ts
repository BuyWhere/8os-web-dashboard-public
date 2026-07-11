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

    // Build personalized system prompt with user's archetype
    const fullUser = await prisma.user.findUnique({ where: { id: user.id } })
    const osConfig = (fullUser?.osConfig as any) || {}
    const personalizedPrompt = buildPersonalizedPrompt(osConfig)

    // Build message history
    const messages: ChatMessage[] = [
      { role: 'system', content: personalizedPrompt },
      ...conversation.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'tool',
        content: msg.content,
        tool_call_id: msg.toolCallId || undefined,
        name: msg.toolName || undefined,
      })),
      { role: 'user', content: message },
    ]

    // Save user message
    await prisma.assistantMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    })

    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const MAX_ROUNDS = 5

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

          for (let round = 0; round < MAX_ROUNDS; round++) {
            const { content, toolCalls } = await streamOneRound(running)

            // No tool calls → this is the final assistant turn.
            if (toolCalls.length === 0) {
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
