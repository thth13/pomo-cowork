import test from 'node:test'
import assert from 'node:assert/strict'
import { ACHIEVEMENTS, ENABLED_ACHIEVEMENTS, isEarned } from './definitions'
import { buildAchievementStatistics, type AchievementEvent, type AchievementSession } from './engine'
let nextId = 0
function session(date: string, duration = 25, extra: Partial<AchievementSession> = {}): AchievementSession {
  const end = new Date(date)
  return { id: String(++nextId), type: 'WORK', status: 'COMPLETED', duration, startedAt: new Date(end.getTime() - duration * 60000), completedAt: end, endedAt: end, projectId: null, ...extra }
}
const metrics = (sessions: AchievementSession[], timezone = 'UTC', events: AchievementEvent[] = []) => buildAchievementStatistics(sessions, events, 0, timezone).metrics

test('every enabled threshold requires real progress, with inverse rank thresholds', () => {
  for (const definition of ENABLED_ACHIEVEMENTS) {
    assert.equal(isEarned(definition, {}), false, definition.id)
    assert.equal(isEarned(definition, { [definition.metric]: definition.threshold }), true, definition.id)
    assert.equal(isEarned(definition, { [definition.metric]: definition.metric === 'rank' ? definition.threshold + 1 : definition.threshold - 1 }), false, definition.id)
  }
  assert.equal(new Set(ACHIEVEMENTS.map(d => d.id)).size, ACHIEVEMENTS.length)
  assert.equal(ENABLED_ACHIEVEMENTS.some(d => d.metric === 'sameTask'), false)
})
test('breaks, cancelled Pomodoros and incomplete sessions do not earn focus milestones', () => {
  const result = metrics([
    session('2026-09-01T12:00:00Z', 300, { type: 'SHORT_BREAK' }),
    session('2026-09-01T12:00:00Z', 300, { status: 'CANCELLED' }),
    session('2026-09-01T12:00:00Z', 300, { status: 'ACTIVE' }),
    session('2026-09-01T12:00:00Z', 30),
  ])
  assert.equal(result.focusHours, .5)
  assert.equal(result.sessions, 1)
})
test('focus thresholds use integer minutes before converting to hours', () => {
  assert.equal(metrics(Array.from({ length: 50 }, () => session('2026-09-01T12:00:00Z', 6))).focusHours, 5)
})
test('streaks use 25-minute days, sum sessions, and retain historical maximum', () => {
  const result = metrics([
    session('2026-09-01T12:00:00Z', 15), session('2026-09-01T13:00:00Z', 10),
    session('2026-09-02T12:00:00Z'), session('2026-09-03T12:00:00Z'),
    session('2026-09-04T12:00:00Z', 24), session('2026-09-05T12:00:00Z'),
  ])
  assert.equal(result.streak, 3)
  assert.equal(result.consistentDays, 0)
})
test('calendar dates follow timezone and DST rather than elapsed 24-hour buckets', () => {
  const rows = [session('2026-03-07T17:00:00Z', 60), session('2026-03-08T16:00:00Z', 60), session('2026-03-09T16:00:00Z', 60)]
  assert.equal(metrics(rows, 'America/New_York').consistentDays, 3)
  const midnight = [session('2026-09-01T23:50:00Z', 60), session('2026-09-02T00:30:00Z', 60)]
  assert.equal(metrics(midnight).dayHours, 1)
  assert.equal(metrics(midnight, 'Europe/Kyiv').dayHours, 2)
})
test('Monday–Sunday weeks and missing calendar weeks break runs', () => {
  const rows = [session('2026-08-31T12:00:00Z', 300), session('2026-09-07T12:00:00Z', 300), session('2026-09-21T12:00:00Z', 300)]
  assert.equal(metrics(rows).consistentWeeks, 2)
  const week = Array.from({ length: 7 }, (_, i) => session(`2026-09-${String(i + 7).padStart(2, '0')}T12:00:00Z`))
  assert.equal(metrics(week).weekDays, 7)
  assert.equal(metrics([session('2026-09-06T12:00:00Z', 300), session('2026-09-07T12:00:00Z', 300)]).weekHours, 5)
})
test('projects are measured individually, not combined', () => {
  const result = buildAchievementStatistics([
    session('2026-09-01T12:00:00Z', 180, { projectId: 'a' }),
    session('2026-09-02T12:00:00Z', 120, { projectId: 'b' }),
  ], [], 10, 'UTC')
  assert.equal(result.metrics.projectHours, 3)
  assert.equal(result.projectId, 'a')
  assert.equal(result.metrics.tasks, 10)
})
test('coworking and uninterrupted sequences require captured events', () => {
  const rows = Array.from({ length: 10 }, () => session('2026-09-01T12:00:00Z'))
  assert.equal(metrics(rows).coworking, undefined)
  assert.equal(metrics(rows).uninterrupted, undefined)
  const events: AchievementEvent[] = Array.from({ length: 10 }, (_, i) => ({
    key: String(i), kind: i === 4 ? 'cancelled' : 'completed', createdAt: new Date(2026, 8, 1, i),
    data: { peers: ['peer', 'peer'], room: true },
  }))
  const result = metrics(rows, 'UTC', events)
  assert.equal(result.uninterrupted, 5)
  assert.equal(result.coworking, 9)
  assert.equal(result.peers, 1)
  assert.equal(result.buddy, 9)
  assert.equal(result.rooms, 9)
})
test('secret clock conditions and inactivity include intervening cancelled activity', () => {
  assert.equal(metrics([session('2026-12-25T03:59:00Z')]).christmas, 1)
  assert.equal(metrics([session('2026-01-01T04:00:00Z')]).night, undefined)
  assert.equal(metrics([session('2026-01-01T07:00:00Z')]).early, undefined)
  assert.ok((metrics([session('2026-01-01T12:00:00Z'), session('2026-05-01T12:00:00Z')]).awayDays ?? 0) >= 100)
  assert.ok((metrics([session('2026-01-01T12:00:00Z'), session('2026-04-30T12:00:00Z', 25, { status: 'CANCELLED' }), session('2026-05-01T12:00:00Z')]).awayDays ?? 0) < 30)
})
