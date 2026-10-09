const HEARTBEAT = 'pomo:account-sync'
const DEADLINE = 'pomo:deadline'
const DEFAULT_SITE = 'https://pomo-co.work'
const defaults = { workDuration: 25, shortBreak: 5, longBreak: 15, longBreakAfter: 4 }
const modes = ['WORK', 'SHORT_BREAK', 'LONG_BREAK', 'TIME_TRACKING']
let busy = false
let syncPending = null
const ready = Promise.all([
  chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
  fetch(chrome.runtime.getURL('tokens.css')).then(response => response.text()).then(css => {
    const color = css.match(/--pixel-tomato:\s*(#[\da-f]+);/i)?.[1]
    if (color) return chrome.action.setBadgeBackgroundColor({ color })
  }),
])

function allowedOrigin(value) {
  const url = new URL(value)
  if (url.username || url.password || !((url.protocol === 'https:' && ['pomo-co.work', 'www.pomo-co.work'].includes(url.hostname)) || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('INVALID_URL')
  return url.origin
}
async function auth() {
  await ready
  return chrome.storage.local.get(['accountToken', 'siteUrl', 'language'])
}
async function api(path, body, override) {
  const credentials = override || await auth()
  if (!credentials.accountToken) throw new Error('AUTH_REQUIRED')
  const response = await fetch(`${allowedOrigin(credentials.siteUrl || DEFAULT_SITE)}${path}`, {
    method: body ? 'POST' : 'GET', cache: 'no-store', credentials: 'omit',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${credentials.accountToken}` },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
  })
  if (response.status === 401) {
    if (!override && (await auth()).accountToken === credentials.accountToken) await clearAccount()
    throw new Error('AUTH_REQUIRED')
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(response.status === 409 ? 'STALE' : data.error === 'PRO_REQUIRED' ? 'PRO_REQUIRED' : 'SAVE_FAILED')
  }
  return response.json()
}
async function clearAccount() {
  await chrome.storage.local.remove(['accountToken'])
  await chrome.storage.session.remove(['snapshot', 'pendingAuth'])
  await Promise.all([chrome.alarms.clear(HEARTBEAT), chrome.alarms.clear(DEADLINE)])
  await chrome.action.setBadgeText({ text: '' })
}
async function ensureHeartbeat() {
  if (!(await chrome.alarms.get(HEARTBEAT))) await chrome.alarms.create(HEARTBEAT, { periodInMinutes: .5 })
}
async function synchronize() {
  if (syncPending) return syncPending
  syncPending = readAccount().finally(() => { syncPending = null })
  return syncPending
}
async function readAccount() {
  const credentials = await auth()
  if (!credentials.accountToken) {
    const { pendingAuth } = await chrome.storage.session.get('pendingAuth')
    return { authenticated: false, siteUrl: credentials.siteUrl || DEFAULT_SITE, loginPending: !!pendingAuth && pendingAuth.expiresAt > Date.now() }
  }
  let account = await api('/api/timer')
  let session = account.session
  const remaining = item => item.status === 'PAUSED' ? Math.max(0, item.remainingSeconds ?? item.duration * 60)
    : Math.max(0, item.duration * 60 - Math.floor((account.serverNow - Date.parse(item.startedAt)) / 1000))
  // The server guards version and deadline, so multiple clients cannot complete a newer session.
  if (session?.status === 'ACTIVE' && remaining(session) === 0) {
    try {
      await api('/api/timer', { action: 'complete', sessionId: session.id, updatedAt: session.updatedAt })
    } catch (error) { if (error.message !== 'STALE') throw error }
    account = await api('/api/timer')
    session = account.session
  }
  // Never repopulate account state after logout or switching the backend.
  const currentAuth = await auth()
  if (currentAuth.accountToken !== credentials.accountToken || currentAuth.siteUrl !== credentials.siteUrl) throw new Error('AUTH_REQUIRED')
  const prefsKey = `timer:${account.user.id}:${allowedOrigin(credentials.siteUrl || DEFAULT_SITE)}`
  const stored = await chrome.storage.local.get(prefsKey)
  const prefs = stored[prefsKey] || { mode: 'WORK', lastEndedId: account.lastSession?.id || null, completedCount: 0 }
  if (account.lastSession && account.lastSession.id !== prefs.lastEndedId) {
    const ended = account.lastSession
    prefs.lastEndedId = ended.id
    if (ended.status === 'COMPLETED' && ended.type === 'WORK') {
      prefs.completedCount += 1
      prefs.mode = prefs.completedCount % (account.user.settings?.longBreakAfter || 4) === 0 ? 'LONG_BREAK' : 'SHORT_BREAK'
    } else if (prefs.mode !== 'TIME_TRACKING') prefs.mode = 'WORK'
    await chrome.storage.local.set({ [prefsKey]: prefs })
  } else if (!stored[prefsKey]) await chrome.storage.local.set({ [prefsKey]: prefs })
  if (!account.user.canTimeTrack && prefs.mode === 'TIME_TRACKING' && !session) prefs.mode = 'WORK'
  const settings = account.user.settings || defaults
  const mode = session?.type || prefs.mode
  const idleSeconds = mode === 'SHORT_BREAK' ? settings.shortBreak * 60 : mode === 'LONG_BREAK' ? settings.longBreak * 60 : settings.workDuration * 60
  const state = {
    authenticated: true, username: account.user.username, userId: account.user.id,
    language: credentials.language,
    sessionId: session?.id || null, updatedAt: session?.updatedAt || null,
    mode, running: session?.status === 'ACTIVE', remaining: session ? remaining(session) : idleSeconds,
    duration: session ? session.duration * 60 : 0, startedAt: session?.startedAt || null,
    task: session?.task || '', busy, canTimeTrack: account.user.canTimeTrack, settings,
    sampledAt: Date.now(), clockOffset: account.serverNow - Date.now(), siteUrl: credentials.siteUrl || DEFAULT_SITE, prefsKey,
  }
  await chrome.storage.session.set({ snapshot: state })
  await ensureHeartbeat()
  if (session?.status === 'ACTIVE') {
    const deadline = Date.parse(session.startedAt) + session.duration * 60000 - state.clockOffset
    const existing = await chrome.alarms.get(DEADLINE)
    if (!existing || Math.abs(existing.scheduledTime - deadline) > 1000) await chrome.alarms.create(DEADLINE, { when: Math.max(Date.now() + 1000, deadline) })
  } else await chrome.alarms.clear(DEADLINE)
  await chrome.action.setBadgeText({ text: session ? session.status === 'PAUSED' ? 'Ⅱ' : '▶' : '' })
  return state
}
async function beginLogin(siteUrl) {
  if (busy) throw new Error('BUSY')
  const origin = allowedOrigin(siteUrl || DEFAULT_SITE)
  const requestId = crypto.randomUUID()
  const tab = await chrome.tabs.create({ url: `${origin}/extension/authorize?extensionId=${chrome.runtime.id}&requestId=${requestId}` })
  await chrome.storage.session.set({ pendingAuth: { origin, requestId, tabId: tab.id, expiresAt: Date.now() + 10 * 60000 } })
  return { loginPending: true }
}
async function handle(message) {
  if (message.action === 'tasks') {
    const tasks = await api('/api/tasks')
    if (!Array.isArray(tasks)) throw new Error('ACTION_FAILED')
    return { tasks: tasks.filter(task => !task.completed).map(task => ({ id: task.id, title: task.title })) }
  }
  if (message.action === 'login') return beginLogin(message.siteUrl)
  if (message.action === 'logout') {
    if (busy) throw new Error('BUSY')
    busy = true
    try {
      if (syncPending) await syncPending.catch(() => {})
      await clearAccount()
      return { state: { authenticated: false } }
    } finally { busy = false }
  }
  if (message.action === 'state') {
    if (busy) {
      const cached = await chrome.storage.session.get('snapshot')
      return { state: cached.snapshot ? { ...cached.snapshot, busy: true } : { authenticated: false } }
    }
    return { state: await synchronize() }
  }
  if (busy) throw new Error('BUSY')
  busy = true
  try {
    const state = await synchronize()
    if (!state.authenticated) throw new Error('AUTH_REQUIRED')
    if (state.sessionId !== message.sessionId || state.updatedAt !== message.updatedAt) throw new Error('STALE')
    if (message.action === 'mode') {
      if (state.sessionId) throw new Error('STOP_FIRST')
      if (!modes.includes(message.mode)) throw new Error('INVALID_SETTINGS')
      if (message.mode === 'TIME_TRACKING' && !state.canTimeTrack) throw new Error('PRO_REQUIRED')
      const prefs = (await chrome.storage.local.get(state.prefsKey))[state.prefsKey]
      await chrome.storage.local.set({ [state.prefsKey]: { ...prefs, mode: message.mode } })
    } else if (message.action === 'settings') {
      const limits = { workDuration: [1, 60], shortBreak: [1, 30], longBreak: [1, 60], longBreakAfter: [2, 10] }
      const settings = {}
      for (const [key, [min, max]] of Object.entries(limits)) {
        const value = message.settings?.[key]
        if (!Number.isInteger(value) || value < min || value > max) throw new Error('INVALID_SETTINGS')
        settings[key] = value
      }
      const credentials = await auth()
      const response = await fetch(`${credentials.siteUrl || DEFAULT_SITE}/api/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${credentials.accountToken}` },
        body: JSON.stringify(settings), signal: AbortSignal.timeout(15000), credentials: 'omit',
      })
      if (response.status === 401) { await clearAccount(); throw new Error('AUTH_REQUIRED') }
      if (!response.ok) throw new Error('SAVE_FAILED')
    } else if (['start', 'pause', 'resume', 'stop'].includes(message.action)) {
      await api('/api/timer', { action: message.action, sessionId: state.sessionId, updatedAt: state.updatedAt, mode: state.mode, task: message.task })
    } else throw new Error('INVALID_SETTINGS')
    busy = false
    return { state: await synchronize() }
  } finally { busy = false }
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL('popup.html')) || message?.source !== 'pomo:extension:popup') return
  void handle(message).then(respond).catch(error => respond({ error: error.message || 'ACTION_FAILED' }))
  return true
})
chrome.runtime.onMessageExternal.addListener((message, sender, respond) => {
  if (message?.source !== 'pomo:account:authorize') return
  void (async () => {
    await ready
    const { pendingAuth } = await chrome.storage.session.get('pendingAuth')
    const senderUrl = new URL(sender.url)
    if (!pendingAuth || busy || pendingAuth.expiresAt < Date.now() || sender.tab?.id !== pendingAuth.tabId || senderUrl.origin !== pendingAuth.origin || senderUrl.pathname !== '/extension/authorize' || message.requestId !== pendingAuth.requestId || typeof message.token !== 'string' || message.token.length > 10000) throw new Error('AUTH_FAILED')
    busy = true
    try {
      if (syncPending) await syncPending.catch(() => {})
      await api('/api/timer', undefined, { accountToken: message.token, siteUrl: pendingAuth.origin })
      await chrome.storage.local.set({ accountToken: message.token, siteUrl: pendingAuth.origin, language: message.language === 'es' ? 'es' : 'en' })
      await chrome.storage.session.remove(['pendingAuth', 'snapshot'])
      busy = false
      await synchronize()
      respond({ success: true })
    } finally { busy = false }
  })().catch(() => respond({ success: false }))
  return true
})
async function wake() {
  try { if ((await auth()).accountToken) await synchronize() } catch { /* Retry on the next alarm or popup request. */ }
}
chrome.alarms.onAlarm.addListener(alarm => { if ([HEARTBEAT, DEADLINE].includes(alarm.name) && !busy) void wake() })
chrome.runtime.onStartup.addListener(() => void wake())
chrome.runtime.onInstalled.addListener(() => void wake())
void ready.then(wake).catch(() => {})
