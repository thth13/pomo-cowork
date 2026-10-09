'use client'

import { useEffect, useLayoutEffect, useState, useRef, type ReactNode } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import Navbar from '@/components/Navbar'
import PomodoroTimer from '@/components/PomodoroTimer'
import ActiveSessions from '@/components/ActiveSessions'
import { registerServiceWorker } from '@/lib/serviceWorker'
import dynamic from 'next/dynamic'
import ChatSkeleton from '@/components/ChatSkeleton'
const Chat = dynamic(() => import('@/components/Chat'), { ssr: false, loading: () => <ChatSkeleton /> })
import TaskList, { TaskListRef } from '@/components/TaskList'
import WorkHistory from '@/components/WorkHistory'
import TodayContribution from '@/components/TodayContribution'
import { useI18n } from '@/components/I18nProvider'
// import PocketGarden from '@/components/PocketGarden'
import { gardenCopy } from '@/lib/i18n/garden'
import { MessageCircle, History, ListTodo, Medal, HelpCircle, ListChecks, ChevronRight, Headphones } from 'lucide-react'
import Habits from '@/components/Habits'
import { habitsCopy } from '@/lib/i18n/habits'
import WorkspaceWindow from '@/components/WorkspaceWindow'
import { getRank } from '@/lib/ranks'
import { HOME_TITLE } from '@/lib/homeSeo'
import FocusSounds from '@/components/FocusSounds'
import { useAmbientSounds } from '@/hooks/useAmbientSounds'
import { ambientSoundsCopy } from '@/lib/i18n/ambientSounds'
import ResetWrappedNotificationButton from '@/components/wrapped/ResetWrappedNotificationButton'

type PanelId = 'chat' | 'history' | 'tasks' | 'progress' | 'about' | 'habits' | 'sounds'
const WORKING_COLLAPSED_STORAGE_KEY = 'pomo:working:collapsed:v1'
const OPEN_PANELS_STORAGE_KEY = 'pomo:windows:open:v2'
const isPanelId = (value: unknown): value is PanelId =>
  value === 'chat' || value === 'history' || value === 'tasks' || value === 'progress' || value === 'habits' || value === 'sounds'

export default function HomeWorkspace({ overview }: { overview: ReactNode }) {
  const { user, isLoading, checkAuth } = useAuthStore()
  const { t, language } = useI18n()
  const copy = gardenCopy[language]
  const ambientMixer = useAmbientSounds()
  const [mounted, setMounted] = useState(false)
  const [workingCollapsed, setWorkingCollapsed] = useState(false)
  const workingContentRef = useRef<HTMLDivElement>(null)
  const workingHeightRef = useRef<number | null>(null)
  const workingAnimationRef = useRef<Animation | null>(null)
  const taskListRef = useRef<TaskListRef>(null)
  const rank = getRank(user?.experience ?? 0)
  const [openPanels, setOpenPanels] = useState<PanelId[]>([])
  const [panelOrder, setPanelOrder] = useState<PanelId[]>([])
  const [tooltipPanel, setTooltipPanel] = useState<PanelId | null>(null)
  const bringToFront = (id: PanelId) => setPanelOrder((current) => [...current.filter((panel) => panel !== id), id])
  const closePanel = (id: PanelId) => {
    if (window.matchMedia('(max-width: 719px)').matches && document.getElementById(`workspace-${id}`)?.contains(document.activeElement)) {
      document.querySelector<HTMLButtonElement>('[data-workspace-menu-trigger]')?.focus({ preventScroll: true })
    }
    setOpenPanels((current) => current.filter((panel) => panel !== id))
  }
  const panels = [
    { id: 'chat', title: copy.chat, icon: MessageCircle },
    { id: 'history', title: copy.history, icon: History },
    { id: 'tasks', title: copy.tasks, icon: ListTodo },
    { id: 'habits', title: habitsCopy[language].title, icon: ListChecks },
    { id: 'progress', title: t.todayContribution.yourProgress, icon: Medal },
    { id: 'sounds', title: ambientSoundsCopy[language].title, icon: Headphones },
    { id: 'about', title: copy.aboutTimer, icon: HelpCircle },
  ] as const

  useEffect(() => {
    try {
      const stored = localStorage.getItem(OPEN_PANELS_STORAGE_KEY)
      const saved: unknown = JSON.parse(stored ?? localStorage.getItem('pomo:windows:open:v1') ?? '[]')
      if (Array.isArray(saved)) {
        const restored = Array.from(new Set(saved.filter(isPanelId)))
        setOpenPanels(restored)
        setPanelOrder(restored)
      }
    } catch {
      // Invalid or unavailable storage must not prevent using the windows.
    }
    try {
      setWorkingCollapsed(localStorage.getItem(WORKING_COLLAPSED_STORAGE_KEY) === 'true')
    } catch {
      // The rail stays open when storage is unavailable.
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    // Wait for restoration so the initial empty state cannot overwrite saved windows.
    if (!mounted) return
    try {
      // Help only opens on request, never automatically on the next visit.
      localStorage.setItem(OPEN_PANELS_STORAGE_KEY, JSON.stringify(openPanels.filter((id) => id !== 'about')))
    } catch {
      // Keep window state in memory when browser storage is unavailable.
    }
  }, [mounted, openPanels])

  const toggleWorking = () => {
    if (window.matchMedia('(max-width: 719px)').matches) {
      workingHeightRef.current = workingContentRef.current?.getBoundingClientRect().height ?? null
      workingAnimationRef.current?.cancel()
    }
    const next = !workingCollapsed
    setWorkingCollapsed(next)
    try {
      localStorage.setItem(WORKING_COLLAPSED_STORAGE_KEY, String(next))
    } catch {
      // Keep the choice in memory when storage is unavailable.
    }
  }

  useLayoutEffect(() => {
    const content = workingContentRef.current
    const previousHeight = workingHeightRef.current
    workingHeightRef.current = null
    if (!content || previousHeight === null ||
      !window.matchMedia('(max-width: 719px)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const nextHeight = content.getBoundingClientRect().height
    const animation = content.animate([
      { height: `${previousHeight}px`, overflow: 'hidden' },
      { height: `${nextHeight}px`, overflow: 'hidden' },
    ], { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
    workingAnimationRef.current = animation
    return () => {
      animation.cancel()
      workingAnimationRef.current = null
    }
  }, [workingCollapsed])

  useEffect(() => {
    if (!tooltipPanel) return
    const dismissTooltip = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTooltipPanel(null)
    }
    document.addEventListener('keydown', dismissTooltip)
    return () => document.removeEventListener('keydown', dismissTooltip)
  }, [tooltipPanel])

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

  const workspaceLoading = !mounted || isLoading

  const renderPanelButtons = (closeMenu?: () => void) => panels.map(({ id, title, icon: Icon }) => (
    <button
      key={id}
      type="button"
      aria-label={id === 'sounds' && ambientMixer.activeCount > 0 ? `${title}: ${ambientMixer.activeCount} ${ambientSoundsCopy[language].active}` : id === 'progress' ? `${title}: ${t.todayContribution.ranks[rank.id]}` : title}
      aria-describedby={!closeMenu && tooltipPanel === id ? `workspace-${id}-tooltip` : undefined}
      aria-haspopup="dialog"
      aria-controls={`workspace-${id}`}
      aria-expanded={openPanels.includes(id)}
      onPointerEnter={(event) => {
        if (!closeMenu && event.pointerType !== 'touch') setTooltipPanel(id)
      }}
      onPointerLeave={() => setTooltipPanel(null)}
      onFocus={(event) => {
        if (!closeMenu && event.currentTarget.matches(':focus-visible')) setTooltipPanel(id)
      }}
      onBlur={() => setTooltipPanel(null)}
      onClick={() => {
        setTooltipPanel(null)
        if (openPanels.includes(id)) closePanel(id)
        else {
          setOpenPanels((current) => [...current, id])
          bringToFront(id)
        }
        if (closeMenu) {
          closeMenu()
          const wasOpen = openPanels.includes(id)
          requestAnimationFrame(() => {
            const target = wasOpen
              ? document.querySelector<HTMLButtonElement>('[data-workspace-menu-trigger]')
              : document.querySelector<HTMLButtonElement>(`#workspace-${id} .workspace-window-handle`)
            target?.focus({ preventScroll: true })
          })
        }
      }}
    >
      <Icon size={19} aria-hidden="true" />
      {id === 'sounds' && ambientMixer.activeCount > 0 && <span className="focus-sounds-badge" aria-hidden="true">{ambientMixer.activeCount}</span>}
      {closeMenu && <span>{title}</span>}
      {!closeMenu && tooltipPanel === id && (
        <span id={`workspace-${id}-tooltip`} role="tooltip" className="workspace-dock-tooltip">
          {id === 'progress' ? `${title}: ${t.todayContribution.ranks[rank.id]}` : title}
        </span>
      )}
    </button>
  ))

  return (
    <div className="workspace-page garden-page">
      <ResetWrappedNotificationButton />
      {workspaceLoading ? (
        <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full border-2 border-slate-200 dark:border-slate-800 border-t-rose-500 animate-spin" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
              {t.common.loading}
            </span>
          </div>
        </div>
      ) : (
        <>
          <Navbar compact workspaceActions={renderPanelButtons} />
          <div className="focus-page-layout">
            <section id="workspace-timer" className="focus-station" aria-label={t.nav.timer}>
              <PomodoroTimer idleTitle={HOME_TITLE} onSessionComplete={handleSessionComplete} />
            </section>
            <aside id="workspace-working" className="working-sidebar" data-collapsed={workingCollapsed} aria-label={t.activeSessions.title}>
              <div className="working-sidebar-header">
                <button
                  type="button"
                  className="working-sidebar-toggle"
                  aria-expanded={!workingCollapsed}
                  aria-controls="workspace-working-content"
                  aria-label={workingCollapsed ? copy.expandWorking : copy.collapseWorking}
                  title={workingCollapsed ? copy.expandWorking : copy.collapseWorking}
                  onClick={toggleWorking}
                  data-no-translate
                >
                  <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
              <div ref={workingContentRef} id="workspace-working-content" className="working-sidebar-content">
                <ActiveSessions variant="page" detailsVisible={!workingCollapsed} />
              </div>
            </aside>
            {/* <PocketGarden /> */}
          </div>
          <div className="workspace-dock" data-tooltip-open={tooltipPanel !== null} data-no-translate>
            {renderPanelButtons()}
          </div>
        </>
      )}
      {/* Keep help in the initial HTML; mount data panels on their first opening.
          Retain visited bodies so closing a window preserves drafts. */}
      {panels.map(({ id, title }, index) => workspaceLoading && id !== 'about' ? null : (
        <WorkspaceWindow key={id} id={`workspace-${id}`} title={title} open={openPanels.includes(id)} offset={index * 28} layer={Math.max(0, panelOrder.indexOf(id))} onActivate={() => bringToFront(id)} onClose={() => closePanel(id)}>
          {(id === 'about' || openPanels.includes(id) || panelOrder.includes(id)) && (id === 'sounds' ? <FocusSounds mixer={ambientMixer} /> : id === 'about' ? overview : id === 'habits' ? <Habits compact isVisible={openPanels.includes(id)} /> : id === 'tasks' ? <TaskList ref={taskListRef} isVisible={openPanels.includes(id)} /> : id === 'chat' ? <Chat isVisible={openPanels.includes('chat')} /> : id === 'progress' ? <TodayContribution isVisible={openPanels.includes(id)} /> : <WorkHistory isVisible={openPanels.includes(id)} />)}
        </WorkspaceWindow>
      ))}
    </div>
  )
}
