/**
 * Channel dispatcher (OS-2652, program doc §3.5).
 *
 * `deliver(userId, message)` fans a message out to the user's linked channels:
 *   - Telegram — attempted when the bot is configured AND the user has linked
 *     (silently skipped otherwise; the driver reports why in `detail`).
 *   - Web inbox — ALWAYS written, as the fallback and the channel of record.
 *
 * Adding WhatsApp later = one new driver in CHANNELS, zero playbook changes.
 */
import type { ChannelMessage, DeliveryResult } from './types'
import { webInboxChannel } from './web-inbox'
import { telegramChannel } from './telegram'

export type { ChannelAction, ChannelMessage, DeliveryChannel, DeliveryResult } from './types'
export { webInboxChannel, writeInboxMessage } from './web-inbox'
export {
  telegramChannel,
  isTelegramConfigured,
  getTelegramBotUsernameOrNull,
  getLinkedTelegramChatId,
  sendTelegramMessage,
  telegramApi,
} from './telegram'

export interface DeliverOutcome {
  /** True when at least one channel accepted the message. */
  delivered: boolean
  /** Per-channel results, keyed by channel key. */
  results: Record<string, DeliveryResult>
  /** The inbox_messages row id (the record), when the web-inbox write succeeded. */
  inboxMessageId: string | null
}

export async function deliver(userId: string, message: ChannelMessage): Promise<DeliverOutcome> {
  const results: Record<string, DeliveryResult> = {}

  // Best-effort push channel first (never throws — drivers swallow errors).
  try {
    results[telegramChannel.key] = await telegramChannel.send(userId, message)
  } catch (e) {
    console.error('[channels] telegram driver error:', e)
    results[telegramChannel.key] = { delivered: false, detail: 'driver-error' }
  }

  // Web inbox is always the record / fallback.
  try {
    results[webInboxChannel.key] = await webInboxChannel.send(userId, message)
  } catch (e) {
    console.error('[channels] web-inbox driver error:', e)
    results[webInboxChannel.key] = { delivered: false, detail: 'driver-error' }
  }

  const web = results[webInboxChannel.key]
  return {
    delivered: Object.values(results).some((r) => r.delivered),
    results,
    inboxMessageId: web?.delivered && web.detail ? web.detail : null,
  }
}
