import { create } from 'zustand'
import { TaskOption } from '@/types/task'
import type { PomodoroSession, SessionType } from '@/types'

export interface TimerPresentation {
  timerWindow: Window | null
  onCompleted: (session: PomodoroSession) => void | Promise<void>
  onRemoteEnd: (completed: boolean, type: SessionType) => void
  onRemoteMode: (type: SessionType) => void
}

// Task lists use the mounted timer's start flow, including persistence and sync.
export const useTimerActionsStore = create<{
  startTask: ((task: TaskOption) => Promise<void>) | null
  busy: boolean
  presentation: TimerPresentation | null
}>(() => ({ startTask: null, busy: false, presentation: null }))
