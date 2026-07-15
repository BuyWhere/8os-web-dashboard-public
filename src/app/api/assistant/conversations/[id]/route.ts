/**
 * Assistant Conversation Detail API Route
 * GET /api/assistant/conversations/[id] — get a conversation with all messages
 * DELETE /api/assistant/conversations/[id] — delete a conversation
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const conversation = await prisma.assistantConversation.findUnique({
      where: { id: params.id, userId: auth.userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      conversation,
      messages: conversation.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content || '',
        toolCalls: msg.toolCalls,
        createdAt: msg.createdAt,
      })),
    })
  } catch (error) {
    console.error('Get conversation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    await prisma.assistantConversation.delete({
      where: { id: params.id, userId: auth.userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete conversation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
