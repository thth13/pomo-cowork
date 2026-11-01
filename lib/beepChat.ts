export interface BeepMessage {
  role: 'user' | 'assistant'
  content: string
  requestId?: string
  status?: string
}

export const BEEP_MESSAGE_LIMIT = 2000
export const BEEP_HISTORY_LIMIT = 16
export const BEEP_HISTORY_CHAR_LIMIT = 12000

/** Keep whole messages; never truncate a user's current question. */
export function beepHistory(messages: BeepMessage[]): BeepMessage[] {
  const result: BeepMessage[] = []
  let length = 0
  for (const message of messages.slice(-BEEP_HISTORY_LIMIT).reverse()) {
    if (length + message.content.length > BEEP_HISTORY_CHAR_LIMIT) break
    result.unshift(message)
    length += message.content.length
  }
  return result
}

export interface BeepConversationInfo { id: string; revision: number; title?: string }
export interface BeepConversationDetail {
  conversation: BeepConversationInfo
  messages: BeepMessage[]
  nextBefore: number | null
  active: boolean
}
