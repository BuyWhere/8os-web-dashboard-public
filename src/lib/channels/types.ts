/**
 * Channel layer types (OS-2652, program doc §3.5).
 *
 * One `DeliveryChannel` interface with drivers. Web-inbox and Telegram drivers
 * ship now; WhatsApp is a later driver added with zero playbook changes.
 */

/** An operable action attached to a message (renders as a button / inline keyboard). */
export interface ChannelAction {
  /** Stable action id, e.g. "rp:<proposalId>:accept". Used as Telegram callback_data (≤64 bytes). */
  id: string
  label: string
}

/** The channel-agnostic message shape playbooks emit. */
export interface ChannelMessage {
  title?: string
  body: string
  actions?: ChannelAction[]
  /** Optional structured context persisted alongside the web-inbox record. */
  meta?: Record<string, unknown>
}

export interface DeliveryResult {
  delivered: boolean
  /** Driver-specific detail: web-inbox row id, telegram message id, or a skip reason. */
  detail?: string
}

export interface DeliveryChannel {
  key: string
  send(userId: string, message: ChannelMessage): Promise<DeliveryResult>
}
