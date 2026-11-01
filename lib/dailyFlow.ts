import { PomodoroSession, SessionStatus, SessionType } from '@/types'

export type FlowPhase = 'planning' | 'focus' | 'done' | 'finished'
export interface FlowTask {
  id: string
  title: string
  createdDay: string
  completedDay: string | null
  completedAt: string | null
  focusByDay: Record<string, number>
  deleted?: boolean
}
export interface FlowCursor {
  sessionId: string
  taskId: string
  startedAt: number
  duration: number
  accounted: number
  running: boolean
  checkedAt: number
}
export interface DailyFlowSnapshot {
  version: 1
  revision: string
  day: string
  phase: FlowPhase
  tasks: FlowTask[]
  queue: string[]
  draft: string
  cursor: FlowCursor | null
  timer: { session: PomodoroSession; remaining: number; running: boolean } | null
}
export function localDay(at = Date.now()): string {
  const date = new Date(at)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function emptyDailyFlow(): DailyFlowSnapshot {
  return { version: 1, revision: '', day: localDay(), phase: 'planning', tasks: [], queue: [], draft: '', cursor: null, timer: null }
}
const isDay = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const at = Date.parse(`${value}T12:00:00`)
  return Number.isFinite(at) && localDay(at) === value
}
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

/** Validate before restoring; never replace unreadable saved work with an empty day. */
export function parseDailyFlow(raw: string): DailyFlowSnapshot | null {
  try {
    const v: unknown = JSON.parse(raw)
    if (!record(v) || v.version !== 1 || typeof v.revision !== 'string' || !isDay(v.day)
      || !['planning', 'focus', 'done', 'finished'].includes(String(v.phase))
      || typeof v.draft !== 'string' || !Array.isArray(v.tasks) || !Array.isArray(v.queue)) return null
    if (!v.tasks.every(t => record(t) && typeof t.id === 'string' && typeof t.title === 'string'
      && isDay(t.createdDay) && (t.completedDay === null || isDay(t.completedDay))
      && (t.completedAt === null || (typeof t.completedAt === 'string' && Number.isFinite(Date.parse(t.completedAt))))
      && (t.deleted === undefined || typeof t.deleted === 'boolean')
      && record(t.focusByDay) && Object.entries(t.focusByDay).every(([day, seconds]) => isDay(day) && finite(seconds)))) return null
    const tasks = v.tasks as FlowTask[]
    const ids = new Set(tasks.map(t => t.id))
    if (ids.size !== tasks.length || new Set(v.queue).size !== v.queue.length
      || !v.queue.every(id => typeof id === 'string' && tasks.some(t => t.id === id && !t.completedDay && !t.deleted))) return null
    if (tasks.some(task => !task.completedDay && !task.deleted && !(v.queue as unknown[]).includes(task.id))) return null
    const timer = v.timer
    if (timer !== null && (!record(timer) || !record(timer.session) || !finite(timer.remaining)
      || timer.remaining > Number(timer.session.duration) * 60
      || typeof timer.running !== 'boolean' || typeof timer.session.id !== 'string'
      || typeof timer.session.userId !== 'string' || typeof timer.session.task !== 'string'
      || !finite(timer.session.duration) || timer.session.duration > 1440
      || !Object.values(SessionType).includes(timer.session.type as SessionType)
      || !Object.values(SessionStatus).includes(timer.session.status as SessionStatus)
      || typeof timer.session.startedAt !== 'string' || !Number.isFinite(Date.parse(timer.session.startedAt)))) return null
    const c = v.cursor
    if (c !== null && (!record(c) || typeof c.sessionId !== 'string' || typeof c.taskId !== 'string'
      || !ids.has(c.taskId) || c.taskId !== v.queue[0] || !finite(c.startedAt) || !finite(c.duration) || c.duration > 86400 || !finite(c.accounted)
      || c.accounted > c.duration || typeof c.running !== 'boolean' || !finite(c.checkedAt))) return null
    return v as unknown as DailyFlowSnapshot
  } catch { return null }
}

export function taskFocus(task: FlowTask): number {
  return Object.values(task.focusByDay).reduce((sum, seconds) => sum + seconds, 0)
}
export function dayFocus(data: DailyFlowSnapshot, day: string): number {
  return data.tasks.reduce((sum, task) => sum + (task.focusByDay[day] ?? 0), 0)
}

/** Split focus at local midnight, including DST days, without counting pauses. */
function addFocus(task: FlowTask, from: number, seconds: number) {
  let remaining = seconds
  let at = from
  while (remaining > 0) {
    const date = new Date(at)
    const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime()
    const amount = Math.min(remaining, Math.max(0.001, (midnight - at) / 1000))
    const day = localDay(at)
    task.focusByDay[day] = (task.focusByDay[day] ?? 0) + amount
    at += amount * 1000
    remaining -= amount
  }
}

export function cursorElapsed(cursor: FlowCursor, now: number): number {
  return cursor.running ? Math.min(cursor.duration, Math.max(0, Math.floor((now - cursor.startedAt) / 1000))) : cursor.accounted
}
export function settleCursor(data: DailyFlowSnapshot, now: number, elapsed?: number) {
  const cursor = data.cursor
  if (!cursor) return
  const total = Math.min(cursor.duration, Math.max(cursor.accounted, elapsed ?? cursorElapsed(cursor, now)))
  const delta = total - cursor.accounted
  const task = data.tasks.find(task => task.id === cursor.taskId)
  if (task && delta > 0) {
    // startedAt is adjusted by the shared timer on resume, so its elapsed axis is pause-safe.
    const end = cursor.running ? Math.min(now, cursor.startedAt + cursor.duration * 1000) : now
    addFocus(task, end - delta * 1000, delta)
  }
  cursor.accounted = total
  cursor.checkedAt = now
}
export function rollFlowDay(data: DailyFlowSnapshot, now = Date.now()) {
  if (data.day === localDay(now)) return
  data.day = localDay(now)
  data.phase = 'planning'
  data.cursor = null
  data.timer = null
}

export function syncFlowTimer(data: DailyFlowSnapshot, session: PomodoroSession | null, running: boolean, remaining: number, engaged: boolean, now: number) {
  const previous = data.cursor
  if (engaged || (data.timer && (!session || data.timer.session.id === session.id))) {
    data.timer = session ? { session: { ...session }, remaining, running } : null
  }
  const sameSession = previous && session && (previous.sessionId === session.id
    || (previous.sessionId.startsWith('temp_') && !session.id.startsWith('temp_') && previous.startedAt === Date.parse(session.startedAt)))
  if (previous) {
    if (sameSession && session) previous.startedAt = Date.parse(session.startedAt)
    const elapsed = sameSession && session ? Math.max(0, Math.min(session.duration * 60, running
      ? Math.floor((now - Date.parse(session.startedAt)) / 1000)
      : session.duration * 60 - remaining)) : undefined
    settleCursor(data, now, elapsed)
  }
  if (data.day !== localDay(now)) {
    rollFlowDay(data, now)
    return
  }
  const isFocus = session && (session.type === SessionType.WORK || session.type === SessionType.TIME_TRACKING)
  const taskId = data.queue[0]
  if (!session || !isFocus || data.phase !== 'focus' || !taskId || (!engaged && !sameSession)) {
    data.cursor = null
    return
  }
  const elapsed = Math.min(session.duration * 60, Math.max(0, running
    ? Math.floor((now - Date.parse(session.startedAt)) / 1000)
    : session.duration * 60 - remaining))
  data.cursor = {
    sessionId: session.id, taskId, startedAt: Date.parse(session.startedAt), duration: session.duration * 60,
    accounted: sameSession && previous ? Math.max(previous.accounted, elapsed) : elapsed,
    running, checkedAt: now,
  }
}
