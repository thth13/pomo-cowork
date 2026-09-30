'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { previousMonday, type WeeklyWrapped } from '@/lib/wrapped/analytics'
import WrappedViewer from './WrappedViewer'
import CommunityDialog from '@/components/CommunityDialog'
import { useI18n } from '@/components/I18nProvider'
import { wrappedCopy } from '@/lib/i18n/wrapped'

type HistoryItem = Pick<WeeklyWrapped, 'weekStart' | 'weekEnd'>
type ResponseData = { report: WeeklyWrapped; history: HistoryItem[] }
interface WrappedContextValue {
  history: HistoryItem[]
  loading: boolean
  error: boolean
  openWeek: (week?: string) => Promise<void>
  refresh: () => void
}
const WrappedContext = createContext<WrappedContextValue | null>(null)
export const useWrapped = () => useContext(WrappedContext)

export default function WrappedProvider({ children }: { children: ReactNode }) {
  const { token, user, isLoading } = useAuthStore()
  const userId = user?.id
  const [archive, setArchive] = useState<{ owner: string; items: HistoryItem[] } | null>(null)
  const [visible, setVisible] = useState<{ owner: string; report: WeeklyWrapped } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const generation = useRef(0)
  const currentOwner = useRef(token)
  currentOwner.current = token
  const [retry, setRetry] = useState(0)
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const load = useCallback(async (week?: string): Promise<ResponseData> => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20_000)
    try {
      const query = new URLSearchParams({ timezone, ...(week ? { week } : {}) })
      const response = await fetch(`/api/wrapped?${query}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal })
      if (!response.ok) throw new Error('Recap unavailable')
      return await response.json() as ResponseData
    } finally { clearTimeout(timeout) }
  }, [token, timezone])
  const openWeek = useCallback(async (week?: string) => {
    if (!token) return
    const id = ++generation.current
    setLoading(true); setError(false)
    try {
      const data = await load(week)
      if (id !== generation.current || currentOwner.current !== token) return
      setArchive({ owner: token, items: data.history })
      setVisible({ owner: token, report: data.report })
    } catch { if (id === generation.current && currentOwner.current === token) setError(true) }
    finally { if (id === generation.current && currentOwner.current === token) setLoading(false) }
  }, [token, load])
  useEffect(() => {
    setArchive(null); setVisible(null); setError(false); setLoading(false)
    if (isLoading || !token || !userId) return
    let cancelled = false
    let running = false
    let checkedWeek = ''
    const check = async () => {
      if (running || document.visibilityState !== 'visible') return
      const week = previousMonday(timezone)
      if (checkedWeek === week || document.querySelector('dialog[open], [role="dialog"]')) return
      running = true
      const id = generation.current
      try {
        const data = await load()
        if (cancelled || currentOwner.current !== token || generation.current !== id) return
        setArchive({ owner: token, items: data.history })
        if (data.report.totalFocusMinutes <= 0) { checkedWeek = week; setError(false); return }
        if (document.querySelector('dialog[open], [role="dialog"]')) return
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 20_000)
        let claimed = false
        try {
          const response = await fetch('/api/wrapped', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ weekStart: data.report.weekStart }), signal: controller.signal })
          if (!response.ok) throw new Error('Unable to claim recap')
          const result: { claimed: boolean } = await response.json()
          claimed = result.claimed
        } finally { clearTimeout(timeout) }
        if (cancelled || currentOwner.current !== token || generation.current !== id) return
        checkedWeek = week
        setError(false)
        if (claimed) setVisible({ owner: token, report: data.report })
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
  const report = visible && visible.owner === token ? visible.report : null
  return <WrappedContext.Provider value={{ history: archive && archive.owner === token ? archive.items : [], loading, error, openWeek, refresh: () => setRetry(value => value + 1) }}>
    {children}
    {report && report.totalFocusMinutes > 0 && <WrappedViewer key={`${token}:${report.weekStart}`} report={report} onClose={() => setVisible(null)} />}
    {report && report.totalFocusMinutes === 0 && <EmptyRecap onClose={() => setVisible(null)} />}
  </WrappedContext.Provider>
}

function EmptyRecap({ onClose }: { onClose: () => void }) {
  const { language } = useI18n()
  const copy = wrappedCopy[language]
  return <CommunityDialog open title={copy.recaps} onClose={onClose}><p>{copy.noActivity}</p><p>{copy.empty}</p><button type="button" className="btn" onClick={onClose}>{copy.done}</button></CommunityDialog>
}
