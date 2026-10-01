'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { previousMonthStart, type MonthlyWrapped } from '@/lib/wrapped/analytics'
import NotificationToast from '@/components/NotificationToast'
import { CalendarDays } from 'lucide-react'
import { monthLabel } from '@/lib/wrapped/analytics'
import WrappedViewer from './WrappedViewer'
import CommunityDialog from '@/components/CommunityDialog'
import { useI18n } from '@/components/I18nProvider'
import { wrappedCopy } from '@/lib/i18n/wrapped'

type HistoryItem = Pick<MonthlyWrapped, 'monthStart' | 'monthEnd'>
type ResponseData = { report: MonthlyWrapped; history: HistoryItem[]; pending: boolean }
interface WrappedContextValue {
  history: HistoryItem[]
  loading: boolean
  error: boolean
  openMonth: (month?: string) => Promise<void>
  refresh: () => void
}
const WrappedContext = createContext<WrappedContextValue | null>(null)
export const useWrapped = () => useContext(WrappedContext)

export default function WrappedProvider({ children }: { children: ReactNode }) {
  const { token, user, isLoading } = useAuthStore()
  const { language } = useI18n()
  const copy = wrappedCopy[language]
  const userId = user?.id
  const [toast, setToast] = useState<{ owner: string; report: MonthlyWrapped } | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const [archive, setArchive] = useState<{ owner: string; items: HistoryItem[] } | null>(null)
  const [visible, setVisible] = useState<{ owner: string; report: MonthlyWrapped } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const generation = useRef(0)
  const currentOwner = useRef(token)
  currentOwner.current = token
  const [retry, setRetry] = useState(0)
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const load = useCallback(async (month?: string): Promise<ResponseData> => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20_000)
    try {
      const query = new URLSearchParams({ timezone, ...(month ? { month } : {}) })
      const response = await fetch(`/api/wrapped?${query}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal })
      if (!response.ok) throw new Error('Recap unavailable')
      return await response.json() as ResponseData
    } finally { clearTimeout(timeout) }
  }, [token, timezone])
  const openMonth = useCallback(async (month?: string) => {
    if (!token) return
    const id = ++generation.current
    setLoading(true); setError(false)
    try {
      const data = await load(month)
      if (id !== generation.current || currentOwner.current !== token) return
      setArchive({ owner: token, items: data.history })
      if (data.report.totalFocusMinutes > 0) {
        const response = await fetch('/api/wrapped', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ monthStart: data.report.monthStart }), signal: AbortSignal.timeout(20_000) })
        if (!response.ok) throw new Error('Unable to save viewed state')
        if (id !== generation.current || currentOwner.current !== token) return
        window.dispatchEvent(new Event('notifications-updated'))
      }
      setToast(null)
      setVisible({ owner: token, report: data.report })
    } catch { if (id === generation.current && currentOwner.current === token) setError(true) }
    finally { if (id === generation.current && currentOwner.current === token) setLoading(false) }
  }, [token, load])
  useEffect(() => {
    setArchive(null); setVisible(null); setToast(null); setError(false); setLoading(false)
    if (isLoading || !token || !userId) return
    let cancelled = false
    let running = false
    let checkedMonth = ''
    const check = async () => {
      if (running || document.visibilityState !== 'visible') return
      const month = previousMonthStart(timezone)
      if (checkedMonth === month) return
      running = true
      const id = generation.current
      try {
        const data = await load()
        if (cancelled || currentOwner.current !== token || generation.current !== id) return
        setArchive({ owner: token, items: data.history })
        window.dispatchEvent(new Event('notifications-updated'))
        if (data.report.totalFocusMinutes <= 0 || !data.pending) { checkedMonth = month; setError(false); return }
        // Workspace windows stay mounted while hidden and are non-modal.
        // Only a modal or an occupied toast corner should defer the invitation;
        // the report and inbox notification have already been saved above.
        if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]:not([hidden]), .rank-toast')) return
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 20_000)
        let claimed = false
        try {
          const response = await fetch('/api/wrapped', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ monthStart: data.report.monthStart, action: 'notify' }), signal: controller.signal })
          if (!response.ok) throw new Error('Unable to claim recap')
          const result: { claimed: boolean } = await response.json()
          claimed = result.claimed
        } finally { clearTimeout(timeout) }
        if (cancelled || currentOwner.current !== token || generation.current !== id) return
        checkedMonth = month
        setError(false)
        if (claimed) setToast({ owner: token, report: data.report })
      } catch { if (!cancelled) setError(true) }
      finally { running = false }
    }
    void check()
    const interval = setInterval(() => { void check() }, 60_000)
    const onFocus = () => { void check() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => { cancelled = true; clearInterval(interval); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus) }
  }, [token, userId, isLoading, timezone, load, retry])
  useEffect(() => {
    const open = (event: Event) => { void openMonth((event as CustomEvent<string>).detail) }
    window.addEventListener('open-monthly-wrapped', open)
    return () => window.removeEventListener('open-monthly-wrapped', open)
  }, [openMonth])
  const pending = toast && toast.owner === token ? toast.report : null
  const report = visible && visible.owner === token ? visible.report : null
  return <WrappedContext.Provider value={{ history: archive && archive.owner === token ? archive.items : [], loading, error, openMonth, refresh: () => setRetry(value => value + 1) }}>
    {children}
    <NotificationToast variant="monthly-wrapped" type="info" isVisible={!!pending} onClose={dismissToast} duration={12000}
      notificationKey={pending?.monthStart} title={copy.title} message={copy.notification}
      description={pending ? `${monthLabel(pending, language)} · ${copy.notificationBody}` : ''}
      icon={<CalendarDays size={26} aria-hidden="true" />} accent="var(--pixel-growth)"
      action={<><button type="button" disabled={loading} className="wrapped-toast-action" onClick={() => { void openMonth(pending?.monthStart) }}>{loading ? copy.loading : copy.open} →</button>{error && <p role="alert">{copy.error}</p>}</>} />
    {error && !pending && <NotificationToast message={copy.error} isVisible onClose={() => setError(false)} type="error" />}

    {report && report.totalFocusMinutes > 0 && <WrappedViewer key={`${token}:${report.monthStart}`} report={report} onClose={() => setVisible(null)} />}
    {report && report.totalFocusMinutes === 0 && <EmptyRecap onClose={() => setVisible(null)} />}
  </WrappedContext.Provider>
}

function EmptyRecap({ onClose }: { onClose: () => void }) {
  const { language } = useI18n()
  const copy = wrappedCopy[language]
  return <CommunityDialog open title={copy.recaps} onClose={onClose}><p>{copy.noActivity}</p><p>{copy.empty}</p><button type="button" className="btn" onClick={onClose}>{copy.done}</button></CommunityDialog>
}
