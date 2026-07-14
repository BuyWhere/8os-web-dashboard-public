/**
 * Daily insight generation engine.
 *
 * - 1 DeepSeek call per user per day, cached in Redis (key: insight:{userId}:{date}, TTL 24h)
 * - Falls back to template pool if API fails
 * - Stores result in DailyInsight table
 */

import { redis } from '@/lib/redis/client'
import { prisma } from '@/lib/db/prisma'
import { deepseekChat } from './client'
import { getFallbackInsight } from './templates'
import { notifyTelegram } from '@/lib/monitoring/telegram'

const CACHE_TTL = 60 * 60 * 24 // 24 hours

interface InsightContext {
  userId: string
  archetypeId: string
  archetypeName: string
  dominantElement: string
  goals: Array<{ name: string; domainId: string; progress: number }>
  recentActivity: Array<{ action: string; metadata: Record<string, unknown> }>
  firstName?: string
}

/**
 * Build the personalized prompt using archetype + goals + recent activity.
 */
function buildPrompt(ctx: InsightContext): string {
  const goalSummary = ctx.goals
    .slice(0, 3)
    .map((g) => `- ${g.name} (${g.domainId}, ${Math.round(g.progress * 100)}% progress)`)
    .join('\n')

  const activitySummary = ctx.recentActivity
    .slice(0, 5)
    .map((a) => `- ${a.action}`)
    .join('\n')

  const name = ctx.firstName ? `${ctx.firstName}` : 'this person'

  return `You are a personal life coach specializing in Chinese metaphysics (BaZi) and modern behavioral psychology. Generate a single personalized daily insight for ${name}.

User Profile:
- Archetype: ${ctx.archetypeName} (${ctx.archetypeId})
- Dominant Element: ${ctx.dominantElement}

Active Goals:
${goalSummary || '- No active goals yet'}

Recent Activity (last 7 days):
${activitySummary || '- No recent activity'}

Write ONE concise, actionable daily insight (2-4 sentences maximum).
- Speak directly to them in second person
- Reference their archetype's core strength
- Connect to their actual goals or recent activity where relevant
- End with a concrete micro-action for today
- Tone: warm, direct, wise, not generic or preachy

Insight:`
}

/**
 * Get or generate today's insight for a user.
 * Returns cached result if available.
 */
export async function getDailyInsight(userId: string, userTimezone = 'UTC'): Promise<{
  content: string
  isFallback: boolean
  cached: boolean
  date: string
}> {
  // Compute user-local date
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: userTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  const cacheKey = `insight:${userId}:${dateStr}`

  // Check Redis cache first
  const cached = await redis.get(cacheKey)
  if (cached) {
    const parsed = JSON.parse(cached) as { content: string; isFallback: boolean }
    return { ...parsed, cached: true, date: dateStr }
  }

  // Check DB (in case Redis was cleared)
  const existing = await prisma.dailyInsight.findUnique({
    where: { userId_date: { userId, date: dateStr } },
  })
  if (existing) {
    // Restore cache
    await redis.set(
      cacheKey,
      JSON.stringify({ content: existing.content, isFallback: existing.isFallback }),
      'EX',
      CACHE_TTL,
    )
    return { content: existing.content, isFallback: existing.isFallback, cached: true, date: dateStr }
  }

  // Generate new insight
  return generateAndCache(userId, dateStr, cacheKey)
}

async function generateAndCache(userId: string, dateStr: string, cacheKey: string) {
  // Load user context
  const [archetype, goals, recentActivity, profile] = await Promise.all([
    prisma.archetypeResult.findUnique({ where: { userId } }),
    prisma.goal.findMany({
      where: { userId, status: 'active' },
      orderBy: { updatedAt: 'desc' },
      take: 3,
    }),
    prisma.activityLog.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
  ])

  if (!archetype) {
    // No archetype yet — use generic fallback
    const content = getFallbackInsight('pioneer', dateStr)
    await cacheAndStore({ userId, dateStr, cacheKey, content, isFallback: true, prompt: null })
    return { content, isFallback: true, cached: false, date: dateStr }
  }

  const ctx: InsightContext = {
    userId,
    archetypeId: archetype.archetypeId,
    archetypeName: archetype.archetypeName,
    dominantElement: (archetype.dominantElements as string[])[0] ?? 'wood',
    goals: goals.map((g) => ({ name: g.name, domainId: g.domainId, progress: g.progress })),
    recentActivity: recentActivity.map((a) => ({
      action: a.action,
      metadata: a.metadata as Record<string, unknown>,
    })),
    firstName: profile?.email?.split('@')[0],
  }

  const prompt = buildPrompt(ctx)
  let content: string
  let isFallback = false

  try {
    content = await deepseekChat(
      [
        { role: 'system', content: 'You are a wise, concise personal coach. Respond with exactly what is asked.' },
        { role: 'user', content: prompt },
      ],
      { maxTokens: 250, temperature: 0.85 },
    )
  } catch (err) {
    console.error('[DeepSeek] insight generation failed, using fallback:', err)
    content = getFallbackInsight(archetype.archetypeId, dateStr)
    isFallback = true

    // Alert monitoring
    notifyTelegram(`⚠️ DeepSeek insight generation failed for user ${userId}: ${String(err)}`).catch(() => {})
  }

  await cacheAndStore({ userId, dateStr, cacheKey, content, isFallback, prompt })
  return { content, isFallback, cached: false, date: dateStr }
}

async function cacheAndStore(opts: {
  userId: string
  dateStr: string
  cacheKey: string
  content: string
  isFallback: boolean
  prompt: string | null
}) {
  const { userId, dateStr, cacheKey, content, isFallback, prompt } = opts

  await Promise.all([
    redis.set(cacheKey, JSON.stringify({ content, isFallback }), 'EX', CACHE_TTL),
    prisma.dailyInsight.upsert({
      where: { userId_date: { userId, date: dateStr } },
      create: { userId, date: dateStr, content, isFallback, prompt },
      update: { content, isFallback, prompt },
    }),
  ])
}
