import { create } from 'zustand'
import { PomodoroSession, SessionStatus } from '@/types'
import { useAuthStore } from '@/store/useAuthStore'
import { useTimerStore } from '@/store/useTimerStore'
import { DailyFlowSnapshot, emptyDailyFlow, localDay, parseDailyFlow, rollFlowDay, settleCursor, syncFlowTimer } from '@/lib/dailyFlow'

interface DailyFlowState {
  data: DailyFlowSnapshot
  storageKey: string | null
  ready: boolean
  persistedRevision: string
  restorePending: boolean
  engaged: boolean
  error: 'storage' | 'invalid' | 'conflict' | null
  hydrate: (owner: string) => void
  update: (change: (data: DailyFlowSnapshot) => void) => boolean
  syncTimer: () => void
  reconcileTimer: (session: PomodoroSession | null, lastSession: PomodoroSession | null, relatedSession?: PomodoroSession | null) => void
  reload: () => void
  retry: () => void
}

export const useDailyFlowStore = create<DailyFlowState>((set, get) => ({
  data: emptyDailyFlow(), storageKey: null, ready: false, persistedRevision: '', restorePending: false, engaged: false, error: null,
  hydrate: owner => {
    const storageKey = `pomo:daily-flow:v1:${owner}`
    if (get().storageKey === storageKey) return
    let data = emptyDailyFlow()
    let error: DailyFlowState['error'] = null
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const saved = parseDailyFlow(raw)
        if (saved) data = saved
        else error = 'invalid'
      }
    } catch { error = 'storage' }
    if (!data.timer) rollFlowDay(data)
    // The account timer must reconcile with the server before counting closed-tab time.
    const restorePending = Boolean(data.timer && useAuthStore.getState().token)
    set({ data, storageKey, persistedRevision: data.revision, restorePending, ready: true, engaged: false, error })
  },
  update: change => {
    const state = get()
    if (!state.ready || !state.storageKey || state.error === 'invalid' || state.error === 'conflict') return false
    try {
      const raw = localStorage.getItem(state.storageKey)
      const saved = raw ? parseDailyFlow(raw) : null
      if (saved && saved.revision !== state.persistedRevision) {
        set({ error: 'conflict', engaged: false })
        return false
      }
    } catch { /* Retain usable in-memory work and report the failed save below. */ }
    const data: DailyFlowSnapshot = JSON.parse(JSON.stringify(state.data))
    change(data)
    data.revision = crypto.randomUUID()
    let error: DailyFlowState['error'] = null
    try { localStorage.setItem(state.storageKey, JSON.stringify(data)) } catch { error = 'storage' }
    set({ data, error, persistedRevision: error ? state.persistedRevision : data.revision })
    return true
  },
  syncTimer: () => {
    const state = get()
    if (!state.ready || state.restorePending || (!state.engaged && !state.data.cursor && !state.data.timer && state.data.day === localDay())) return
    const timer = useTimerStore.getState()
    const owner = state.storageKey?.slice('pomo:daily-flow:v1:'.length)
    if (timer.currentSession && timer.currentSession.userId !== owner) return
    state.update(data => syncFlowTimer(data, timer.currentSession, timer.isRunning, timer.timeRemaining, state.engaged, Date.now()))
  },
  reconcileTimer: (session, lastSession, relatedSession) => {
    const state = get()
    if (!state.restorePending) return
    const pending = state.data.cursor
    // A newer ordinary session must not hide an earlier Flow session's early stop.
    if (pending && !pending.sessionId.startsWith('temp_')
      && session?.id !== pending.sessionId && lastSession?.id !== pending.sessionId
      && (relatedSession === undefined || (relatedSession !== null && relatedSession.id !== pending.sessionId))) return
    state.update(data => {
      const cursor = data.cursor
      if (cursor) {
        const actual = [session, lastSession, relatedSession].find(item => item?.id === cursor.sessionId)
        if (actual) {
          const running = actual.status === SessionStatus.ACTIVE
          const elapsed = running ? Math.floor((Date.now() - Date.parse(actual.startedAt)) / 1000)
            : actual.status === SessionStatus.COMPLETED ? actual.duration * 60
              : cursor.duration - (actual.remainingSeconds ?? actual.timeRemaining ?? cursor.duration)
          const endedAt = actual.endedAt ? Date.parse(actual.endedAt) : actual.pausedAt ? Date.parse(actual.pausedAt) : Date.now()
          cursor.startedAt = Date.parse(actual.startedAt)
          cursor.running = running
          settleCursor(data, running ? Date.now() : endedAt, elapsed)
        } else {
          settleCursor(data, Date.now())
        }
        if (!session || session.id !== cursor.sessionId) data.cursor = null
      }
      data.timer = session ? { session, remaining: session.remainingSeconds ?? session.timeRemaining ?? session.duration * 60, running: session.status === SessionStatus.ACTIVE } : null
      rollFlowDay(data)
    })
    set({ restorePending: false })
  },
  reload: () => {
    const key = get().storageKey
    if (!key) return
    set({ storageKey: null })
    get().hydrate(key.slice('pomo:daily-flow:v1:'.length))
  },
  retry: () => {
    const { data, storageKey, error } = get()
    if (!storageKey || error !== 'storage') return
    try {
      localStorage.setItem(storageKey, JSON.stringify(data))
      set({ error: null, persistedRevision: data.revision })
    } catch { /* Keep the unsaved data and inline recovery action. */ }
  },
}))

export function addFlowDraft(data: DailyFlowSnapshot) {
  const titles = data.draft.split(/\r?\n/).map(title => title.trim()).filter(Boolean)
  titles.forEach(title => {
    const id = crypto.randomUUID()
    data.tasks.push({ id, title, createdDay: localDay(), completedDay: null, completedAt: null, focusByDay: {} })
    data.queue.push(id)
  })
  data.draft = ''
  if (titles.length && (data.phase === 'done' || data.phase === 'finished')) data.phase = 'planning'
}

/** Guest sessions have no account restore endpoint; reuse the shared timer restore. */
export function restoreGuestFlowTimer() {
  const flow = useDailyFlowStore.getState()
  if (!flow.ready || flow.error === 'invalid' || flow.error === 'conflict' || useAuthStore.getState().token) return
  const saved = flow.data.timer
  if (!saved || useTimerStore.getState().currentSession) return
  const remaining = saved.running
    ? Math.max(0, saved.session.duration * 60 - Math.floor((Date.now() - Date.parse(saved.session.startedAt)) / 1000))
    : saved.remaining
  if (remaining > 0) {
    useTimerStore.getState().restoreSession({ ...saved.session,
      status: saved.running ? SessionStatus.ACTIVE : SessionStatus.PAUSED,
      remainingSeconds: remaining, timeRemaining: remaining,
    })
  } else {
    flow.update(next => { settleCursor(next, Date.now()); next.cursor = null; next.timer = null; rollFlowDay(next) })
  }
}
