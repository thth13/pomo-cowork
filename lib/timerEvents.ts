import { POMO_EXTENSION_ID } from '@/lib/extensionIdentity'

const CHANNEL = 'pomo:timer-changed'

// Publish only after the server has accepted a session/settings write.
export function notifyTimerChanged(userId?: string) {
  if (typeof window === 'undefined' || !userId) return
  window.dispatchEvent(new CustomEvent(CHANNEL, { detail: { userId } }))
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(CHANNEL)
      channel.postMessage({ userId })
      channel.close()
    } catch { /* Browser storage restrictions must not fail an accepted write. */ }
  }
}

export function subscribeTimerChanges(userId: string, refresh: () => void) {
  const runtime = (window as Window & { chrome?: { runtime?: {
    sendMessage: (id: string, message: unknown, callback: () => void) => void
    lastError?: unknown
  } } }).chrome?.runtime
  const onLocalChange = (event: Event) => {
    if ((event as CustomEvent<{ userId: string }>).detail.userId !== userId) return
    try {
      runtime?.sendMessage(POMO_EXTENSION_ID, { source: CHANNEL, userId }, () => { void runtime.lastError })
    } catch { /* The extension is optional. */ }
  }
  const onExtensionChange = (event: Event) => {
    if ((event as CustomEvent<{ userId: string }>).detail?.userId === userId) refresh()
  }
  let channel: BroadcastChannel | null = null
  try {
    if (typeof BroadcastChannel !== 'undefined') channel = new BroadcastChannel(CHANNEL)
  } catch { /* Focus still restores state when browser messaging is unavailable. */ }
  if (channel) channel.onmessage = event => { if (event.data?.userId === userId) refresh() }
  window.addEventListener(CHANNEL, onLocalChange)
  window.addEventListener('pomo:extension:timer-changed', onExtensionChange)
  return () => {
    window.removeEventListener(CHANNEL, onLocalChange)
    window.removeEventListener('pomo:extension:timer-changed', onExtensionChange)
    channel?.close()
  }
}
