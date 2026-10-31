import { addDays, calculatePomodoros } from './studyPlanner'
import type { StudyTimerSnapshot } from '@/hooks/useLocalStudyTimer'

export const EXAM_PLANNER_KEY = 'pomo:exam-study-planner:v1'
export type ExamPlan = { exam: string; deadline: string; start: string; days: number; hours: number; sessions: number; dailyMinutes: number; spare: number }
export type ExamTimer = StudyTimerSnapshot & { phase: 'focus' | 'break' }
export type ExamSnapshot = {
  version: 1; exam: string; deadline: string; hours: string; plan: ExamPlan | null
  page: number; completed: string[]; selection: { day: number; block: number } | null; timer: ExamTimer | null
}

export function parseExamSnapshot(raw: string): ExamSnapshot {
  if (raw.length > 100000) throw new Error('Invalid saved plan')
  const s = JSON.parse(raw)
  const text = (v: unknown, max: number) => typeof v === 'string' && v.length <= max
  const integer = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
  if (!s || s.version !== 1 || !text(s.exam, 80) || !text(s.deadline, 10) || !text(s.hours, 64)) throw new Error('Invalid draft')
  const p = s.plan
  if (p !== null) {
    if (!p || !text(p.exam, 80) || !p.exam.trim() || !integer(p.days, 1, 90) || typeof p.hours !== 'number' || p.hours < .5 || p.hours > 8 || addDays(p.start, p.days) !== p.deadline) throw new Error('Invalid plan')
    const c = calculatePomodoros(p.hours * 60, 25, 5)
    if (p.sessions !== c.sessions || p.dailyMinutes !== c.totalMinutes || p.spare !== c.unusedMinutes) throw new Error('Invalid schedule')
  }
  const validId = (id: unknown) => {
    if (!p || typeof id !== 'string' || !/^\d+:\d+$/.test(id)) return false
    const [day, block] = id.split(':').map(Number)
    return integer(day, 0, p.days - 1) && integer(block, 0, p.sessions - 1) && id === `${day}:${block}`
  }
  if (!Array.isArray(s.completed) || s.completed.length > 1440 || !s.completed.every(validId) || new Set(s.completed).size !== s.completed.length || !integer(s.page, 0, p ? Math.ceil(p.days / 7) - 1 : 0)) throw new Error('Invalid progress')
  if (s.selection !== null && (!s.selection || !validId(`${s.selection.day}:${s.selection.block}`) || !Number.isInteger(s.selection.day) || !Number.isInteger(s.selection.block))) throw new Error('Invalid selection')
  const t = s.timer
  if (t !== null) {
    if (!s.selection || !t || !['focus', 'break'].includes(t.phase) || !['idle', 'running', 'paused', 'finished'].includes(t.status) || !Number.isFinite(t.remainingMs) || t.remainingMs < 0 || t.remainingMs > (t.phase === 'focus' ? 1500000 : 300000)) throw new Error('Invalid timer')
    if (t.phase === 'break' && (s.selection.block >= p.sessions - 1 || !s.completed.includes(`${s.selection.day}:${s.selection.block}`))) throw new Error('Invalid break')
    if (t.status === 'running' ? !Number.isFinite(t.endsAt) || t.endsAt < 0 || t.endsAt > Date.now() + 1500000 : t.endsAt !== null) throw new Error('Invalid timer deadline')
  }
  return s as ExamSnapshot
}
