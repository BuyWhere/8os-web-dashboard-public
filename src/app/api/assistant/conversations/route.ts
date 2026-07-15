/**
 * Assistant Conversations API Route
 * List and manage assistant conversations
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'

/**
 * GET /api/assistant/conversations
 * List all conversations for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const conversations = await prisma.assistantConversation.findMany({
      where: { userId: auth.userId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('List conversations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/assistant/conversations
 * Create a new conversation
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { title } = body

    const conversation = await prisma.assistantConversation.create({
      data: {
        userId: auth.userId,
        title: title || null,
      },
    })

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Create conversation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
