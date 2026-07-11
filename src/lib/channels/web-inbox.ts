/**
 * Web-inbox delivery driver (OS-2652) — the always-on channel of record.
 *
 * Writes one `inbox_messages` row per delivery. The row is what
 * /api/inbox/messages lists and /dashboard/inbox renders. Every deliver()
 * call lands here regardless of other channels, so the inbox doubles as the
 * delivery ledger.
 */
import { prisma } from '@/lib/db/prisma'
import type { ChannelMessage, DeliveryChannel, DeliveryResult } from './types'

/**
 * Persist a message as an inbox row. Exported separately so the Telegram
 * webhook can persist callback payloads through the same code path.
 */
export async function writeInboxMessage(
  userId: string,
  message: ChannelMessage,
  opts: { read?: boolean } = {},
): Promise<{ id: string }> {
  const row = await prisma.inboxMessage.create({
    data: {
      userId,
      title: message.title ?? null,
      body: message.body,
      actionsJson: message.actions && message.actions.length > 0
        ? (message.actions as unknown as object)
        : undefined,
      meta: message.meta ? (message.meta as object) : undefined,
      read: opts.read ?? false,
    },
    select: { id: true },
  })
  return row
}

export const webInboxChannel: DeliveryChannel = {
  key: 'web-inbox',
  async send(userId: string, message: ChannelMessage): Promise<DeliveryResult> {
    try {
      const row = await writeInboxMessage(userId, message)
      return { delivered: true, detail: row.id }
    } catch (e) {
      console.error('[channels/web-inbox] write failed:', e)
      return { delivered: false, detail: 'write-failed' }
    }
  },
}
