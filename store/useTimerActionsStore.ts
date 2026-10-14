import { create } from 'zustand'
import { TaskOption } from '@/types/task'

// Task lists use the mounted timer's start flow, including persistence and sync.
export const useTimerActionsStore = create<{
  startTask: ((task: TaskOption) => Promise<void>) | null
  busy: boolean
}>(() => ({ startTask: null, busy: false }))
