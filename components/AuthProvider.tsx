'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useTimerStore } from '@/store/useTimerStore'
import TimerRuntime from '@/components/TimerRuntime'
import { registerServiceWorker } from '@/lib/serviceWorker'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { checkAuth } = useAuthStore()
  
  useEffect(() => {
    checkAuth()
    void registerServiceWorker()
  }, [checkAuth])

  useEffect(() => {
    // Selection belongs to the timer, even when its task window was never opened.
    try {
      const raw = localStorage.getItem('selectedTask')
      const saved = raw ? JSON.parse(raw) : null
      if (saved && typeof saved.id === 'string' && !useTimerStore.getState().selectedTask) {
        useTimerStore.getState().setSelectedTask({
          id: saved.id,
          parentId: typeof saved.parentId === "string" ? saved.parentId : null,
          projectTitle: typeof saved.projectTitle === "string" ? saved.projectTitle : undefined,
          title: typeof saved.title === 'string' ? saved.title : '',
          description: typeof saved.description === 'string' ? saved.description : undefined,
        })
      }
    } catch {
      // Unavailable or invalid storage must not prevent using the timer.
    }
    return useTimerStore.subscribe((state, previous) => {
      if (state.selectedTask === previous.selectedTask) return
      try {
        if (state.selectedTask) localStorage.setItem('selectedTask', JSON.stringify(state.selectedTask))
        else localStorage.removeItem('selectedTask')
      } catch { /* Keep selection in memory when storage is unavailable. */ }
    })
  }, [])

  return <><TimerRuntime />{children}</>
}
