import assert from 'node:assert/strict'
import test from 'node:test'
import { SessionStatus, SessionType, type PomodoroSession } from '@/types'
import { dayFocus, emptyDailyFlow, localDay, parseDailyFlow, settleCursor, syncFlowTimer, taskFocus } from './dailyFlow'

const start = new Date(2026, 9, 20, 12).getTime()
function fixture() {
  const data = emptyDailyFlow()
  data.day = localDay(start)
  data.phase = 'focus'
  data.tasks = ['a', 'b'].map(id => ({ id, title: `Task ${id}`, createdDay: data.day, completedDay: null, completedAt: null, focusByDay: {} }))
  data.queue = ['a', 'b']
  return data
}
function session(id: string, at = start, type = SessionType.WORK): PomodoroSession {
  return { id, userId: 'user', task: 'Daily Flow', duration: 25, type, status: SessionStatus.ACTIVE, startedAt: new Date(at).toISOString() }
}

test('work accumulates across sessions while breaks never complete a task', () => {
  const data = fixture()
  const first = session('one')
  syncFlowTimer(data, first, true, 1500, true, start)
  syncFlowTimer(data, first, true, 1440, true, start + 60_000)
  syncFlowTimer(data, null, false, 300, true, start + 60_000)
  const rest = session('rest', start + 60_000, SessionType.SHORT_BREAK)
  syncFlowTimer(data, rest, true, 300, true, start + 60_000)
  syncFlowTimer(data, rest, true, 0, true, start + 360_000)
  const second = session('two', start + 360_000)
  syncFlowTimer(data, second, true, 1500, true, start + 360_000)
  syncFlowTimer(data, second, true, 1260, true, start + 600_000)
  assert.equal(taskFocus(data.tasks[0]), 300)
  assert.equal(data.tasks[0].completedAt, null)
  assert.deepEqual(data.queue, ['a', 'b'])
})

test('pause and adjusted resume exclude all idle time', () => {
  const data = fixture()
  const work = session('one')
  syncFlowTimer(data, work, true, 1500, true, start)
  syncFlowTimer(data, { ...work, status: SessionStatus.PAUSED }, false, 1440, true, start + 60_000)
  syncFlowTimer(data, { ...work, status: SessionStatus.PAUSED }, false, 1440, true, start + 600_000)
  const resumed = { ...work, startedAt: new Date(start + 540_000).toISOString() }
  syncFlowTimer(data, resumed, true, 1440, true, start + 600_000)
  syncFlowTimer(data, resumed, true, 1380, true, start + 660_000)
  assert.equal(taskFocus(data.tasks[0]), 120)
})

test('switching tasks within one session partitions its time', () => {
  const data = fixture()
  const work = session('one')
  syncFlowTimer(data, work, true, 1500, true, start)
  settleCursor(data, start + 60_000)
  data.tasks[0].completedDay = data.day
  data.tasks[0].completedAt = new Date(start + 60_000).toISOString()
  data.queue.shift()
  data.cursor!.taskId = 'b'
  syncFlowTimer(data, work, true, 1320, true, start + 180_000)
  assert.equal(taskFocus(data.tasks[0]), 60)
  assert.equal(taskFocus(data.tasks[1]), 120)
  assert.equal(dayFocus(data, data.day), 180)
})

test('server ID replacement and repeated checkpoints never duplicate work', () => {
  const data = fixture()
  syncFlowTimer(data, session('temp_one'), true, 1500, true, start)
  syncFlowTimer(data, session('temp_one'), true, 1490, true, start + 10_000)
  syncFlowTimer(data, session('server_one'), true, 1480, true, start + 20_000)
  syncFlowTimer(data, session('server_one'), true, 1480, true, start + 20_000)
  const restored = parseDailyFlow(JSON.stringify(data))!
  assert.ok(restored)
  syncFlowTimer(restored, session('server_one'), true, 1470, true, start + 30_000)
  assert.equal(taskFocus(restored.tasks[0]), 30)
})

test('closed-tab recovery is capped at session end and split at local midnight', () => {
  const at = new Date(2026, 9, 20, 23, 59, 50).getTime()
  const data = fixture()
  data.day = localDay(at)
  const work = { ...session('night', at), duration: 0.5 }
  syncFlowTimer(data, work, true, 30, true, at)
  const nextDay = new Date(2026, 9, 21, 12).getTime()
  syncFlowTimer(data, null, false, 0, false, nextDay)
  assert.equal(taskFocus(data.tasks[0]), 30)
  assert.equal(dayFocus(data, localDay(at)), 10)
  assert.equal(dayFocus(data, localDay(nextDay)), 20)
  assert.equal(data.phase, 'planning')
  assert.deepEqual(data.queue, ['a', 'b'])
})

test('joining an existing session counts only subsequent focus', () => {
  const data = fixture()
  const work = session('existing')
  syncFlowTimer(data, work, true, 1200, true, start + 300_000)
  syncFlowTimer(data, work, true, 1140, true, start + 360_000)
  assert.equal(taskFocus(data.tasks[0]), 60)
})

test('unreadable or inconsistent snapshots are rejected', () => {
  assert.equal(parseDailyFlow('{'), null)
  const data = fixture()
  data.queue = ['missing']
  assert.equal(parseDailyFlow(JSON.stringify(data)), null)
  const invalid = fixture()
  invalid.tasks[0].focusByDay[invalid.day] = -1
  assert.equal(parseDailyFlow(JSON.stringify(invalid)), null)
})
