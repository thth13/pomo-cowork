'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Award } from 'lucide-react'
import NotificationToast from '@/components/NotificationToast'
import { useI18n } from '@/components/I18nProvider'
import { useAuthStore } from '@/store/useAuthStore'
import { useTimerStore } from '@/store/useTimerStore'
import { achievementApi } from '@/lib/achievements/client'
import { achievementsCopy } from '@/lib/i18n/achievements'
import { TASK_CHANGED_EVENT } from '@/hooks/useQuickTasks'
import type { AchievementProfile, AchievementView } from '@/lib/achievements/definitions'
interface SyncResult { profile: AchievementProfile; pending: string[]; focusing: boolean }

export default function AchievementNotifications() {
  const { language } = useI18n(), copy = achievementsCopy[language]
  const userId = useAuthStore(s => s.user?.id), username = useAuthStore(s => s.user?.username)
  const isAnonymous = useAuthStore(s => s.user?.isAnonymous), token = useAuthStore(s => s.token)
  const currentSession = useTimerStore(s => s.currentSession)
  const [queue, setQueue] = useState<AchievementView[]>([])
  const [serverFocusing, setServerFocusing] = useState(false)
  const [rankToast, setRankToast] = useState(false)
  const shown = useRef(new Set<string>())
  const [claiming, setClaiming] = useState(false)
  const dismiss = useCallback(() => setQueue([]), [])

  useEffect(() => {
    if (!token || !userId || isAnonymous) { setQueue([]); return }
    const controller = new AbortController()
    let busy = false
    let dirty = false
    let lastSynced = 0
    let timeout: ReturnType<typeof setTimeout> | undefined
    shown.current.clear(); setQueue([])
    async function sync() {
      if (busy || document.hidden || controller.signal.aborted) return
      dirty = false
      busy = true
      try {
        const result = await achievementApi<SyncResult>('sync', {
          method: 'POST', signal: controller.signal,
          body: JSON.stringify({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
        })
        if (controller.signal.aborted) return
        lastSynced = Date.now()
        setServerFocusing(result.focusing)
        window.dispatchEvent(new CustomEvent('achievements-updated', { detail: { userId: userId, profile: result.profile } }))
        // These are pending candidates; claim atomically immediately before display.
        setQueue(previous => previous.length ? previous : result.profile.items.filter(item => result.pending.includes(item.id) && !shown.current.has(item.id)))
      } catch { /* Keep persisted notifications pending; the next sync retries. */ }
      finally {
        busy = false
        if (dirty && !controller.signal.aborted) scheduleUpdate()
      }
    }
    const refreshIfStale = () => {
      if (dirty || Date.now() - lastSynced >= 5 * 60_000) void sync()
    }
    function scheduleUpdate() {
      dirty = true
      clearTimeout(timeout)
      // Completion persistence and task counters finish before evaluating awards.
      timeout = setTimeout(() => { if (dirty) void sync() }, 1000)
    }
    void sync()
    const interval = window.setInterval(refreshIfStale, 5 * 60_000)
    document.addEventListener('visibilitychange', refreshIfStale)
    window.addEventListener('session-completed', scheduleUpdate)
    window.addEventListener(TASK_CHANGED_EVENT, scheduleUpdate)
    const unsubscribe = useTimerStore.subscribe((state, previous) => {
      if (previous.currentSession && !state.currentSession) scheduleUpdate()
    })
    return () => {
      controller.abort(); clearInterval(interval); clearTimeout(timeout); unsubscribe()
      document.removeEventListener('visibilitychange', refreshIfStale)
      window.removeEventListener('session-completed', scheduleUpdate)
      window.removeEventListener(TASK_CHANGED_EVENT, scheduleUpdate)
    }
  }, [token, userId, isAnonymous])

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const listener = () => { setRankToast(true); clearTimeout(timeout); timeout = setTimeout(() => setRankToast(false), 9000) }
    window.addEventListener('rank-up', listener)
    return () => { window.removeEventListener('rank-up', listener); clearTimeout(timeout) }
  }, [])

  const pausedFocus = !!currentSession && ['WORK', 'TIME_TRACKING'].includes(currentSession.type)
  const blocked = pausedFocus || serverFocusing || rankToast
  const [claimed, setClaimed] = useState<string[]>([])
  useEffect(() => { setClaimed([]) }, [userId])
  useEffect(() => {
    if (!queue.length || blocked || claiming || queue.every(item => claimed.includes(item.id))) return
    const account = userId
    setClaiming(true)
    achievementApi<{ claimed: string[] }>('notifications', {
      method: 'POST', body: JSON.stringify({ ids: queue.map(item => item.id) }),
    }).then(result => {
      if (useAuthStore.getState().user?.id !== account) return
      result.claimed.forEach(id => shown.current.add(id))
      setClaimed(result.claimed)
      setQueue(previous => previous.filter(item => result.claimed.includes(item.id)))
    }).catch(() => { if (useAuthStore.getState().user?.id === account) setQueue([]) })
      .finally(() => setClaiming(false))
  }, [queue, blocked, claimed, claiming, userId])

  const visible = !blocked && queue.length > 0 && queue.every(item => claimed.includes(item.id))
  const first = queue[0]
  return <NotificationToast
    isVisible={visible} onClose={dismiss} type="success" variant="rank-up" duration={10000}
    notificationKey={queue.map(item => item.id).join(',')}
    title={queue.length > 1 ? `${queue.length} ${copy.newMany}` : copy.new}
    message={first ? (language === 'es' ? first.nameEs : first.name) + (queue.length > 1 ? ` +${queue.length - 1}` : '') : ''}
    description={first ? (queue.length === 1 ? (language === 'es' ? first.descriptionEs : first.description) : queue.slice(1, 4).map(item => language === 'es' ? item.nameEs : item.name).join(' · ')) : ''}
    icon={<Award size={26} aria-hidden="true" />} accent="var(--pixel-growth)"
    action={username ? <Link href={`/@${encodeURIComponent(username)}?tab=achievements#achievements`} onClick={dismiss}>{copy.view} →</Link> : undefined}
  />
}
