// Only invalidations cross into the page. No account token or private state.
chrome.runtime.onMessage.addListener(message => {
  if (message?.source !== 'pomo:extension:timer-changed' || typeof message.userId !== 'string') return
  window.dispatchEvent(new CustomEvent('pomo:extension:timer-changed', {
    detail: { userId: message.userId },
  }))
})
