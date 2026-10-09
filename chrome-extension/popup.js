const copy = {
  en: {
    openSite: 'Open site ↗', connecting: 'Loading account…', connected: 'Synchronized with your account',
    login: 'Sign in to your account', logout: 'Sign out', signInDescription: 'Use the same account as on the site. Your timer works even when the site is closed.',
    loginPending: 'Complete sign-in in the opened tab. Then return to Pocket Timer.', signedOut: 'Sign in to see your timer',
    serverSettings: 'Server address', siteAddress: 'Site address', allowedSites: 'pomo-co.work or localhost (with your port).',
    start: 'Start', pause: 'Pause', resume: 'Resume', stop: 'Stop', reset: 'Reset', focus: 'Focus', shortBreak: 'Short break', longBreak: 'Long break', tracker: 'Time track',
    timerSettings: 'Timer settings', focusMinutes: 'Focus · minutes', shortMinutes: 'Short break · minutes', longMinutes: 'Long break · minutes', breakAfter: 'Long break after',
    nextSession: 'Changes apply to the next session.', save: 'Save settings', saved: 'Settings saved.',
    keepOpen: 'Your timer syncs with your account. The site can be closed.', taskName: 'Task', tasksLoading: 'Loading tasks…', tasksFailed: 'Could not load tasks. Retrying…',
    offline: 'Cannot reach your account. Check your connection; controls will return after synchronization.', ready: 'Ready', running: 'Running', paused: 'Paused',
    pro: 'Time track requires Pro on your account.', stopFirst: 'Stop the current session to switch modes.', elapsed: 'Elapsed time', remaining: 'Time remaining',
    working: 'Updating…', noTask: 'No task selected',
    INVALID_URL: 'Use https://pomo-co.work or http://localhost:PORT (or 127.0.0.1).', invalidField: 'Enter a whole number from {min} to {max}.',
    BUSY: 'The timer is updating. Try again in a moment.', STALE: 'The timer changed elsewhere. Review its current state and try again.',
    STOP_FIRST: 'Stop the current session to switch modes.', PRO_REQUIRED: 'Time track requires Pro on your account.',
    INVALID_SETTINGS: 'Check the timer settings and their allowed ranges.', SAVE_FAILED: 'Could not save the change. Check your connection and try again.',
    ACTION_FAILED: 'The action could not be completed. Check your connection and try again.',
    TIMEOUT: 'No response yet. Wait for synchronization before trying the action again.', AUTH_REQUIRED: 'Your session expired. Sign in again.',
  },
  es: {
    openSite: 'Abrir sitio ↗', connecting: 'Cargando cuenta…', connected: 'Sincronizado con tu cuenta',
    login: 'Iniciar sesión en tu cuenta', logout: 'Cerrar sesión', signInDescription: 'Usa la misma cuenta que en el sitio. El temporizador funciona aunque el sitio esté cerrado.',
    loginPending: 'Completa el inicio de sesión en la pestaña abierta y vuelve a Pocket Timer.', signedOut: 'Inicia sesión para ver tu temporizador',
    serverSettings: 'Dirección del servidor', siteAddress: 'Dirección del sitio', allowedSites: 'pomo-co.work o localhost (con tu puerto).',
    start: 'Iniciar', pause: 'Pausar', resume: 'Reanudar', stop: 'Detener', reset: 'Reiniciar', focus: 'Enfoque', shortBreak: 'Descanso corto', longBreak: 'Descanso largo', tracker: 'Registrar tiempo',
    timerSettings: 'Ajustes del temporizador', focusMinutes: 'Enfoque · minutos', shortMinutes: 'Descanso corto · minutos', longMinutes: 'Descanso largo · minutos', breakAfter: 'Descanso largo después de',
    nextSession: 'Los cambios se aplican a la próxima sesión.', save: 'Guardar ajustes', saved: 'Ajustes guardados.',
    keepOpen: 'El temporizador se sincroniza con tu cuenta. Puedes cerrar el sitio.', taskName: 'Tarea', tasksLoading: 'Cargando tareas…', tasksFailed: 'No se pudieron cargar las tareas. Reintentando…',
    offline: 'No se pudo conectar con tu cuenta. Revisa la conexión; los controles volverán al sincronizar.', ready: 'Listo', running: 'En marcha', paused: 'En pausa',
    pro: 'Registrar tiempo requiere Pro en tu cuenta.', stopFirst: 'Detén la sesión actual para cambiar de modo.', elapsed: 'Tiempo transcurrido', remaining: 'Tiempo restante',
    working: 'Actualizando…', noTask: 'Sin tarea seleccionada',
    INVALID_URL: 'Usa https://pomo-co.work o http://localhost:PUERTO (o 127.0.0.1).', invalidField: 'Introduce un número entero entre {min} y {max}.',
    BUSY: 'El temporizador se está actualizando. Inténtalo en un momento.', STALE: 'El temporizador cambió en otro lugar. Revisa su estado e inténtalo de nuevo.',
    STOP_FIRST: 'Detén la sesión actual para cambiar de modo.', PRO_REQUIRED: 'Registrar tiempo requiere Pro en tu cuenta.',
    INVALID_SETTINGS: 'Revisa los ajustes y sus límites.', SAVE_FAILED: 'No se pudo guardar el cambio. Revisa la conexión e inténtalo de nuevo.',
    ACTION_FAILED: 'No se pudo completar la acción. Revisa la conexión e inténtalo de nuevo.',
    TIMEOUT: 'Aún no hay respuesta. Espera a que se sincronice antes de repetir la acción.', AUTH_REQUIRED: 'Tu sesión caducó. Inicia sesión de nuevo.',
  },
}
const $ = id => document.getElementById(id)
const fields = ['workDuration', 'shortBreak', 'longBreak', 'longBreakAfter']
const modes = { WORK: 'focus', SHORT_BREAK: 'shortBreak', LONG_BREAK: 'longBreak', TIME_TRACKING: 'tracker' }
let language = navigator.language.startsWith('es') ? 'es' : 'en'
let state = null
let requestPending = false
let polling = false
let dirty = false
let offline = false
let lastAccount = null
let tasks = []
let selectedTaskId = ''
let tasksPending = false
let tasksError = false
let tasksLoadedAt = 0
let taskOptionsKey = ''
let selectionRevision = 0
let tasksHaveLoaded = false
const t = key => copy[language][key] || copy[language].ACTION_FAILED
function feedback(key, error = false) {
  $('feedback').textContent = key ? t(key) : ''
  $('feedback').dataset.error = String(error)
}
function localize() {
  document.documentElement.lang = language
  document.querySelectorAll('[data-copy]').forEach(node => { node.textContent = t(node.dataset.copy) })
  $('modes').setAttribute('aria-label', language === 'es' ? 'Modo del temporizador' : 'Timer mode')
}
function draw() {
  const authenticated = !!state?.authenticated
  const disabled = !authenticated || requestPending || state.busy || offline
  document.querySelector('main').setAttribute('aria-busy', String(requestPending || !state))
  $('sign-in').hidden = state === null || authenticated
  $('timer-panel').hidden = !authenticated
  $('account-row').hidden = !authenticated
  if (!authenticated) closeAccount()
  $('logout').disabled = requestPending || !!state?.busy
  $('login').disabled = requestPending
  $('account-name').textContent = authenticated ? state.username : ''
  $('account-status').hidden = offline
  $('connection').hidden = authenticated && !offline
  $('connection').textContent = offline ? t('offline') : !state ? t('connecting') : authenticated ? t('connected') : state.loginPending ? t('loginPending') : t('signedOut')
  $('primary').disabled = disabled
  $('stop').disabled = disabled || !state?.sessionId
  $('save').disabled = disabled
  $('task-select').disabled = disabled || tasksPending || !!state?.sessionId
  $('time-track').disabled = disabled || !!state?.sessionId || !state?.canTimeTrack
  $('time-track').checked = state?.mode === 'TIME_TRACKING'
  $('modes').hidden = state?.mode === 'TIME_TRACKING'
  $('tasks-feedback').textContent = tasksError ? t('tasksFailed') : tasksPending && !tasksLoadedAt ? t('tasksLoading') : ''
  fields.forEach(key => { $(key).disabled = disabled })
  document.querySelectorAll('[data-mode]').forEach(button => {
    button.disabled = disabled || !!state?.sessionId || (button.dataset.mode === 'TIME_TRACKING' && !state?.canTimeTrack)
    button.setAttribute('aria-pressed', String(state?.mode === button.dataset.mode))
  })
  $('primary').textContent = requestPending ? t('working') : state?.sessionId ? t(state.running ? 'pause' : 'resume') : t('start')
  $('stop').textContent = t('stop')
  $('mode-help').textContent = state?.sessionId ? t('stopFirst') : authenticated && !state.canTimeTrack ? t('pro') : ''
  if (!authenticated) return
  $('mode-label').textContent = t(modes[state.mode] || 'focus')
  $('timer-status').textContent = t(state.sessionId ? state.running ? 'running' : 'paused' : 'ready')
  const remaining = state.sessionId && state.running
    ? Math.max(0, state.duration - Math.floor((Date.now() + state.clockOffset - Date.parse(state.startedAt)) / 1000))
    : state.remaining
  const seconds = state.mode === 'TIME_TRACKING' ? state.sessionId ? Math.max(0, state.duration - remaining) : 0 : remaining
  $('digits').textContent = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
  $('digits').setAttribute('aria-label', t(state.mode === 'TIME_TRACKING' ? 'elapsed' : 'remaining'))
}
function applyState(next) {
  if (!next || typeof next.authenticated !== 'boolean') throw new Error('ACTION_FAILED')
  if (next.authenticated && (!Object.hasOwn(modes, next.mode) || !Number.isFinite(next.remaining))) throw new Error('ACTION_FAILED')
  if (state?.authenticated && next.authenticated && state.userId === next.userId && next.sampledAt < state.sampledAt) return
  const account = next.authenticated ? `${next.siteUrl}:${next.userId}` : null
  if (account !== lastAccount) {
    dirty = false; tasks = []; selectedTaskId = ''; tasksError = false; tasksLoadedAt = 0; tasksHaveLoaded = false; lastAccount = account
    selectionRevision += 1
    if (account) void restoreTask(account, selectionRevision)
  }
  state = next
  offline = false
  if (next.language === 'en' || next.language === 'es') language = next.language
  localize()
  if (next.siteUrl) $('site-url').value = next.siteUrl
  if (!dirty && next.authenticated) fields.forEach(key => { $(key).value = next.settings[key] })
  renderTasks()
  draw()
  if (next.authenticated) void refreshTasks()
}
function renderTasks() {
  const key = JSON.stringify([language, tasks, tasksHaveLoaded, state?.sessionId, state?.task, selectedTaskId])
  if (key === taskOptionsKey) return
  taskOptionsKey = key
  const select = $('task-select')
  select.replaceChildren(new Option(t('noTask'), ''))
  for (const task of tasks) select.add(new Option(task.title, task.id))
  if (tasksHaveLoaded && selectedTaskId && !tasks.some(task => task.id === selectedTaskId)) {
    selectedTaskId = ''
    persistTask()
  }
  if (state?.sessionId) {
    const current = tasks.find(task => task.title === state.task)
    if (current) {
      select.value = current.id
      if (selectedTaskId !== current.id) { selectedTaskId = current.id; persistTask() }
    }
    else if (state.task) {
      select.add(new Option(state.task, '__current_session__'))
      select.value = '__current_session__'
    }
  } else select.value = selectedTaskId
  $('task-picker').hidden = !tasks.length && !(state?.sessionId && state.task)
}
async function refreshTasks() {
  if (!state?.authenticated || tasksPending || Date.now() - tasksLoadedAt < 15000) return
  const account = lastAccount
  tasksPending = true
  draw()
  try {
    const response = await send('tasks')
    if (account !== lastAccount) return
    if (response.error) throw new Error(response.error)
    if (!Array.isArray(response.tasks)) throw new Error('ACTION_FAILED')
    tasks = response.tasks
    tasksHaveLoaded = true
    tasksError = false
    renderTasks()
  } catch {
    if (account === lastAccount) tasksError = true
  } finally {
    tasksPending = false
    if (account === lastAccount) tasksLoadedAt = Date.now()
    draw()
  }
}
function closeAccount(restoreFocus = false) {
  $('account-popover').hidden = true
  $('account-name').setAttribute('aria-expanded', 'false')
  if (restoreFocus) $('account-name').focus()
}
$('account-name').addEventListener('click', () => {
  const open = $('account-popover').hidden
  $('account-popover').hidden = !open
  $('account-name').setAttribute('aria-expanded', String(open))
  if (open) $('logout').focus()
})
document.addEventListener('click', event => {
  if (!$('account-row').contains(event.target)) closeAccount()
})
document.addEventListener('focusin', event => {
  if (!$('account-row').contains(event.target)) closeAccount()
})
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('account-popover').hidden) { event.preventDefault(); closeAccount(true) }
})
async function restoreTask(account, revision) {
  const key = `pomo:extension:task:${account}`
  try {
    const stored = await chrome.storage.local.get(key)
    if (account !== lastAccount || revision !== selectionRevision) return
    if (typeof stored[key] === 'string') selectedTaskId = stored[key]
    taskOptionsKey = ''
    renderTasks()
    draw()
  } catch { /* Keep the in-memory selection if storage is unavailable. */ }
}
function persistTask() {
  selectionRevision += 1
  if (lastAccount) void chrome.storage.local.set({ [`pomo:extension:task:${lastAccount}`]: selectedTaskId }).catch(() => {})
}
$('task-select').addEventListener('change', () => {
  selectedTaskId = $('task-select').value
  taskOptionsKey = ''
  persistTask()
})
$('time-track').addEventListener('change', () => void command('mode', { mode: $('time-track').checked ? 'TIME_TRACKING' : 'WORK' }))
async function send(action, extra = {}) {
  return chrome.runtime.sendMessage({ source: 'pomo:extension:popup', action, ...extra })
}
async function refresh() {
  if (requestPending || polling) return
  polling = true
  try {
    const response = await send('state')
    if (requestPending) return
    if (response.error === 'AUTH_REQUIRED') { applyState({ authenticated: false }); feedback('AUTH_REQUIRED', true); return }
    if (response.error) throw new Error(response.error)
    applyState(response.state)
  } catch { offline = true; draw() }
  finally { polling = false }
}
async function command(action, extra = {}) {
  if (!state?.authenticated || requestPending || state.busy || offline) return false
  requestPending = true
  feedback('')
  draw()
  try {
    const response = await send(action, { sessionId: state.sessionId, updatedAt: state.updatedAt, ...extra })
    if (response.state) applyState(response.state)
    if (response.error) {
      if (response.error === 'AUTH_REQUIRED') applyState({ authenticated: false })
      feedback(response.error, true)
      return false
    }
    return true
  } catch { offline = true; feedback('TIMEOUT', true); return false }
  finally { requestPending = false; draw(); void refresh() }
}
$('primary').addEventListener('click', () => void command(state?.sessionId ? state.running ? 'pause' : 'resume' : 'start', { task: tasks.find(task => task.id === selectedTaskId)?.title || '' }))
$('stop').addEventListener('click', () => void command('stop'))
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => void command('mode', { mode: button.dataset.mode })))
$('settings-form').addEventListener('input', event => { dirty = true; event.target.removeAttribute('aria-invalid') })
$('settings-form').addEventListener('submit', async event => {
  event.preventDefault()
  if (requestPending || !state?.authenticated) return
  const settings = {}
  for (const key of fields) {
    const input = $(key)
    const value = Number(input.value)
    if (!input.value || !Number.isInteger(value) || value < Number(input.min) || value > Number(input.max)) {
      input.setAttribute('aria-invalid', 'true')
      $('feedback').textContent = t('invalidField').replace('{min}', input.min).replace('{max}', input.max)
      $('feedback').dataset.error = 'true'
      input.focus()
      return
    }
    settings[key] = value
  }
  if (await command('settings', { settings })) { dirty = false; feedback('saved'); if (state) applyState(state) }
})
$('login').addEventListener('click', async () => {
  if (requestPending) return
  requestPending = true
  draw()
  try {
    const response = await send('login', { siteUrl: $('site-url').value })
    if (response.error) { feedback(response.error, true); $('site-url').setAttribute('aria-invalid', 'true'); return }
    $('site-url').removeAttribute('aria-invalid')
    feedback('loginPending')
    if (state) state.loginPending = true
  } catch { feedback('ACTION_FAILED', true) }
  finally { requestPending = false; draw() }
})
$('logout').addEventListener('click', async () => {
  if (requestPending) return
  requestPending = true
  draw()
  try {
    const response = await send('logout')
    if (response.error) { feedback(response.error, true); return }
    closeAccount()
    applyState(response.state)
    $('login').focus()
    feedback('')
  } catch { feedback('ACTION_FAILED', true) }
  finally { requestPending = false; draw() }
})
$('open-site').addEventListener('click', async () => {
  try { await chrome.tabs.create({ url: state?.siteUrl || 'https://pomo-co.work' }) }
  catch { feedback('ACTION_FAILED', true) }
})
localize()
draw()
void refresh()
window.setInterval(draw, 1000)
window.setInterval(() => void refresh(), 3000)
