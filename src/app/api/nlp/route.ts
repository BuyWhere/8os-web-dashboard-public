/**
 * POST /api/nlp
 * Parse natural language quick-add input into a structured task.
 * If drift signal detected, logs it and returns drift data.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { parseQuickAdd } from '@/lib/nlp/quick-add'
import { z } from 'zod'

const Schema = z.object({ input: z.string().min(1).max(500) })

const DOMAIN_COLORS: Record<string, string> = {
  career: '#6366f1',
  wealth: '#f59e0b',
  health: '#22c55e',
  relationships: '#ec4899',
  learning: '#3b82f6',
  legacy: '#8b5cf6',
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const result = parseQuickAdd(parsed.data.input)

  // Drift signal handling
  if (result.driftSignal) {
    await prisma.activityLog.create({
      data: {
        userId: auth.userId,
        action: 'drift_detected',
        metadata: { emotion: result.driftEmotion, input: parsed.data.input },
      },
    })
    return NextResponse.json({
      type: 'drift',
      emotion: result.driftEmotion,
      message: getDriftMessage(result.driftEmotion ?? 'stressed'),
      suggestions: getDriftSuggestions(result.driftEmotion ?? 'stressed'),
    })
  }

  // Build scheduled time if hour provided
  let scheduledAt: string | null = null
  let scheduledEnd: string | null = null
  if (result.scheduledHour !== undefined) {
    const d = new Date()
    if (result.dayOffset) d.setDate(d.getDate() + result.dayOffset)
    d.setHours(result.scheduledHour, 0, 0, 0)
    const dur = result.durationMinutes ?? 60
    scheduledAt = d.toISOString()
    scheduledEnd = new Date(d.getTime() + dur * 60 * 1000).toISOString()
  }

  // Auto-create the task in the DB
  const task = await prisma.oSTask.create({
    data: {
      userId: auth.userId,
      name: result.name,
      domainId: result.domainId ?? null,
      duration: result.durationMinutes ?? 60,
      priority: result.priority ?? 'medium',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
      energyRequired: result.priority === 'high' ? 'green' : 'yellow',
    },
  })

  // Sync calendar event
  if (scheduledAt && scheduledEnd) {
    await prisma.calendarEvent.create({
      data: {
        userId: auth.userId,
        taskId: task.id,
        title: task.name,
        startAt: new Date(scheduledAt),
        endAt: new Date(scheduledEnd),
        domainId: result.domainId ?? null,
        color: result.domainId ? DOMAIN_COLORS[result.domainId] : null,
      },
    })
  }

  await prisma.activityLog.create({
    data: { userId: auth.userId, taskId: task.id, action: 'task_created', metadata: { source: 'nlp', input: parsed.data.input } },
  })

  return NextResponse.json({
    type: 'task',
    task,
    parsed: result,
    message: buildConfirmationMessage(result, task),
  })
}

function buildConfirmationMessage(result: ReturnType<typeof parseQuickAdd>, task: { id: string; name: string }): string {
  const parts = [`Added: "${task.name}"`]
  if (result.domainId) parts.push(`Domain: ${result.domainId}`)
  if (result.scheduledHour !== undefined) {
    const h = result.scheduledHour
    const ampm = h >= 12 ? 'pm' : 'am'
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
    parts.push(`Scheduled: ${displayH}${ampm}`)
  }
  if (result.dayOffset) parts.push('(tomorrow)')
  return parts.join(' · ')
}

function getDriftMessage(emotion: string): string {
  const messages: Record<string, string> = {
    stressed: 'I hear you. Let\'s take a breath and see what we can ease.',
    overwhelmed: 'It\'s okay to feel overwhelmed. Let\'s simplify your day.',
    anxious: 'Anxiety is a signal. Let\'s ground your next step.',
    'burned out': 'Burnout is real. Rest is productive. What can we remove?',
    exhausted: 'Your energy matters. Let\'s reschedule what can wait.',
    lost: 'We\'ll find the thread together. What feels most important right now?',
    stuck: 'Being stuck is temporary. Let\'s pick the smallest next action.',
  }
  return messages[emotion] ?? 'I\'m with you. Let\'s adjust your focus.'
}

function getDriftSuggestions(emotion: string): string[] {
  const always = ['Take a 10-minute break', 'Review your top priority goal']
  const extra: Record<string, string[]> = {
    stressed: ['Move one task to tomorrow', 'Do a 5-minute breathing exercise'],
    overwhelmed: ['Pick just 3 tasks for today', 'Close unnecessary tabs'],
    anxious: ['Write down what\'s worrying you', 'Call someone you trust'],
    'burned out': ['Block tomorrow morning as rest time', 'Review what you can delegate'],
    exhausted: ['Schedule a nap if possible', 'Reduce today\'s task count by half'],
  }
  return [...always, ...(extra[emotion] ?? [])]
}
