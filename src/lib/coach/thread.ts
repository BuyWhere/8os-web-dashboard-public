/**
 * src/lib/coach/thread.ts — the bridge that makes the proactive chief-of-staff and
 * the reactive Coach ONE agent in ONE thread.
 *
 * When a scheduled/event-driven playbook delivers a proactive message (morning
 * brief, drift nudge, shutdown), we ALSO post it into the user's Coach conversation
 * as an assistant message — so it reads as the same coach reaching out, not a
 * separate inbox bot. The user replies in the same thread and the reactive Coach
 * (with full tools + brain) takes over. Day-scoped: reuse today's conversation
 * (active <24h) or open a new one, matching the Coach's auto-resume behaviour.
 */
import { prisma } from '@/lib/db/prisma'

export async function postToCoachThread(
  userId: string,
  title: string | undefined,
  body: string,
  _kind: string,
): Promise<void> {
  try {
    if (!body || !body.trim()) return
    const content = title && title.trim() ? `**${title.trim()}**\n\n${body.trim()}` : body.trim()
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    let convo = await prisma.assistantConversation.findFirst({
      where: { userId, updatedAt: { gte: cutoff } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    })
    if (!convo) {
      convo = await prisma.assistantConversation.create({ data: { userId }, select: { id: true } })
    }
    await prisma.assistantMessage.create({
      data: { conversationId: convo.id, role: 'assistant', content },
    })
    await prisma.assistantConversation.update({ where: { id: convo.id }, data: { updatedAt: new Date() } })
  } catch {
    /* best-effort: mirroring must never break the primary inbox delivery */
  }
}
