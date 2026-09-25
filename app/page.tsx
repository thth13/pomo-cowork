'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import Navbar from '@/components/Navbar'
import PomodoroTimer from '@/components/PomodoroTimer'
import ActiveSessions from '@/components/ActiveSessions'
import { registerServiceWorker } from '@/lib/serviceWorker'
import dynamic from 'next/dynamic'
const Chat = dynamic(() => import('@/components/Chat'), { ssr: false, loading: () => null })
import TaskList, { TaskListRef } from '@/components/TaskList'
import WorkHistory from '@/components/WorkHistory'
import TodayContribution from '@/components/TodayContribution'
import { useI18n } from '@/components/I18nProvider'
// import PocketGarden from '@/components/PocketGarden'
import { gardenCopy } from '@/lib/i18n/garden'
import { MessageCircle, History, ListTodo, Medal } from 'lucide-react'
import WorkspaceWindow from '@/components/WorkspaceWindow'
import { getRank } from '@/lib/ranks'

export default function HomePage() {
  const { user, isLoading, checkAuth } = useAuthStore()
  const { t, language } = useI18n()
  const copy = gardenCopy[language]
  const [mounted, setMounted] = useState(false)
  const taskListRef = useRef<TaskListRef>(null)
  const rank = getRank(user?.experience ?? 0)
  type PanelId = 'chat' | 'history' | 'tasks' | 'progress'
  const [openPanels, setOpenPanels] = useState<PanelId[]>([])
  const [panelOrder, setPanelOrder] = useState<PanelId[]>([])
  const bringToFront = (id: PanelId) => setPanelOrder((current) => [...current.filter((panel) => panel !== id), id])
  const closePanel = (id: PanelId) => setOpenPanels((current) => current.filter((panel) => panel !== id))
  const panels = [
    { id: 'chat', title: copy.chat, icon: MessageCircle },
    { id: 'history', title: copy.history, icon: History },
    { id: 'tasks', title: copy.tasks, icon: ListTodo },
    { id: 'progress', title: t.todayContribution.yourProgress, icon: Medal },
  ] as const

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Обработка OAuth callback токена
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const authToken = params.get('auth_token')
      const authError = params.get('auth_error')

      if (authToken) {
        localStorage.setItem('token', authToken)
        
        // Очищаем URL от параметров
        window.history.replaceState({}, '', '/')
        
        // Перепроверяем авторизацию
        checkAuth()
      } else if (authError) {
        console.error('Auth error:', authError)
        // Очищаем URL от параметров
        window.history.replaceState({}, '', '/')
      }
    }
  }, [checkAuth])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const ref = url.searchParams.get('ref')

    if (ref) {
      localStorage.setItem('referral_code', ref)
      void fetch('/api/referrals/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: ref }),
      })
      url.searchParams.delete('ref')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [])

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    // Регистрация Service Worker для фонового таймера
    registerServiceWorker()
  }, [])

  const handleSessionComplete = async () => {
    // Обновляем список задач после завершения сессии
    if (taskListRef.current) {
      await taskListRef.current.refreshTasks()
    }
  }

  // Show loading while checking auth
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full border-2 border-slate-200 dark:border-slate-800 border-t-rose-500 animate-spin" />
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
            {t.common.loading}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen garden-page">
      <Navbar />
      <main className="focus-page-layout">
        <section className="focus-station" aria-label={t.nav.timer}>
          <PomodoroTimer onSessionComplete={handleSessionComplete} />
        </section>
        <ActiveSessions variant="page" />
        {/* <PocketGarden /> */}
      </main>
      <div className="workspace-dock" data-no-translate>
        {panels.map(({ id, title, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-haspopup="dialog"
            aria-controls={`workspace-${id}`}
            aria-expanded={openPanels.includes(id)}
            onClick={() => {
              if (openPanels.includes(id)) closePanel(id)
              else {
                setOpenPanels((current) => [...current, id])
                bringToFront(id)
              }
            }}
          >
            <Icon size={19} aria-hidden="true" />
            <span className="workspace-dock-label">
              <span>{title}</span>
              {id === 'progress' && <span className="workspace-dock-rank">{copy.yourRank}: {t.todayContribution.ranks[rank.id]}</span>}
            </span>
          </button>
        ))}
      </div>
      {panels.map(({ id, title }, index) => (
        <WorkspaceWindow key={id} id={`workspace-${id}`} title={title} open={openPanels.includes(id)} offset={index * 28} layer={Math.max(0, panelOrder.indexOf(id))} onActivate={() => bringToFront(id)} onClose={() => closePanel(id)}>
          {id === 'tasks' ? <TaskList ref={taskListRef} /> : id === 'chat' ? <Chat isVisible={openPanels.includes('chat')} /> : id === 'progress' ? <TodayContribution /> : <WorkHistory />}
        </WorkspaceWindow>
      ))}
    </div>
  )
}
