'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useI18n } from '@/components/I18nProvider'
import { userProfileHref } from '@/lib/userProfile'

interface PaywallEventEntry {
  id: string
  event: 'paywall_open' | 'paywall_checkout_click'
  plan: 'monthly' | 'yearly' | null
  pagePath: string
  isAuthenticated: boolean
  userId: string | null
  createdAt: string
  user: { id: string; username: string; email: string; isAnonymous: boolean } | null
}

interface EventPage {
  events: PaywallEventEntry[]
  page: number
  pageSize: number
  total: number
}

const buttonClass = 'community-button cursor-pointer focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50'

export default function AdminPaywallEvents() {
  const token = useAuthStore(state => state.token)
  const { language } = useI18n()
  const es = language === 'es'
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const rawPage = Number(searchParams.get('paywallPage') ?? 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const [data, setData] = useState<EventPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<'auth' | 'forbidden' | 'load' | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    let active = true
    setLoading(true)
    setError(null)
    setData(null)

    async function load() {
      try {
        const authToken = token ?? localStorage.getItem('token')
        if (!authToken) {
          setError('auth')
          return
        }
        const response = await fetch(`/api/admin/paywall-events?page=${page}`, {
          headers: { Authorization: `Bearer ${authToken}` },
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!active) return
        if (!response.ok) {
          setError(response.status === 401 ? 'auth' : response.status === 403 ? 'forbidden' : 'load')
          return
        }
        const result = await response.json() as EventPage
        if (active) setData(result)
      } catch {
        if (active) setError('load')
      } finally {
        window.clearTimeout(timeout)
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [token, page, revision])

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('paywallPage', String(nextPage))
    router.replace(`${pathname}?${params}`, { scroll: false })
  }

  const errorMessage = error === 'auth'
    ? (es ? 'Inicia sesión de nuevo para ver los eventos.' : 'Sign in again to view events.')
    : error === 'forbidden'
      ? (es ? 'Solo los administradores pueden ver estos eventos.' : 'Only administrators can view these events.')
      : (es ? 'No se pudieron cargar los eventos. Vuelve a intentarlo.' : 'Could not load events. Try again.')

  return (
    <section className="mt-10 space-y-4" aria-labelledby="paywall-events-title" data-no-translate>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="paywall-events-title" className="text-lg font-semibold text-slate-900 dark:text-white">
            {es ? 'Actividad de Upgrade to Pro' : 'Upgrade to Pro activity'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {es ? 'Aperturas y clics en el pago, del más reciente al más antiguo.' : 'Modal opens and checkout clicks, newest first.'}
          </p>
        </div>
        <button type="button" className={buttonClass} disabled={loading} onClick={() => setRevision(value => value + 1)}>
          {es ? 'Actualizar' : 'Refresh'}
        </button>
      </div>

      <div className="min-h-[16rem] rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" aria-busy={loading}>
        {loading && <p className="p-6 text-sm" role="status">{es ? 'Cargando eventos…' : 'Loading events…'}</p>}
        {error && <p className="p-6 text-sm text-red-600 dark:text-red-400" role="alert">{errorMessage}</p>}
        {!loading && !error && data?.events.length === 0 && (
          <p className="p-6 text-sm text-slate-500">{es ? 'Aún no hay eventos. Aparecerán cuando alguien abra Upgrade to Pro.' : 'No events yet. They will appear when someone opens Upgrade to Pro.'}</p>
        )}
        {!loading && !error && !!data?.events.length && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{es ? 'Actividad de Upgrade to Pro' : 'Upgrade to Pro activity'}</caption>
              <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  {[es ? 'Usuario' : 'User', es ? 'Acción' : 'Action', 'Plan', es ? 'Página' : 'Page', es ? 'Fecha (Kyiv)' : 'Time (Kyiv)'].map(label => (
                    <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {data.events.map(entry => (
                  <tr key={entry.id}>
                    <td className="max-w-xs break-words px-4 py-3">
                      {entry.user ? <>
                        <Link href={userProfileHref(entry.user)} className="font-semibold underline decoration-slate-300 underline-offset-4 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 dark:hover:text-rose-300">{entry.user.username}</Link>
                        {!entry.user.isAnonymous && <div className="text-xs text-slate-500 dark:text-slate-400">{entry.user.email}</div>}
                        <div className="text-xs text-slate-500 dark:text-slate-400">ID: {entry.user.id}</div>
                        {!entry.isAuthenticated && <div className="text-xs text-slate-500 dark:text-slate-400">{es ? 'Invitado' : 'Guest'}</div>}
                      </> : <span className="text-slate-500">{es ? 'Usuario desconocido' : 'Unknown user'}</span>}
                    </td>
                    <td className="px-4 py-3">{entry.event === 'paywall_open' ? (es ? 'Abrió la ventana' : 'Opened modal') : (es ? 'Clic en continuar al pago' : 'Clicked Continue to checkout')}</td>
                    <td className="px-4 py-3">{entry.plan === 'yearly' ? (es ? 'Anual' : 'Yearly') : entry.plan === 'monthly' ? (es ? 'Mensual' : 'Monthly') : '—'}</td>
                    <td className="max-w-xs break-words px-4 py-3">{entry.pagePath}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums"><time dateTime={entry.createdAt}>{new Intl.DateTimeFormat(es ? 'es-ES' : 'en-GB', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Europe/Kyiv' }).format(new Date(entry.createdAt))}</time></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && data && data.total > 0 && (
        <nav className="flex flex-wrap items-center justify-between gap-3 text-sm" aria-label={es ? 'Páginas de eventos' : 'Event pages'}>
          <span role="status">{(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} / {data.total}</span>
          <div className="flex gap-2">
            <button type="button" className={buttonClass} disabled={data.page <= 1} onClick={() => goToPage(data.page - 1)}>{es ? 'Anterior' : 'Previous'}</button>
            <button type="button" className={buttonClass} disabled={data.page * data.pageSize >= data.total} onClick={() => goToPage(data.page + 1)}>{es ? 'Siguiente' : 'Next'}</button>
          </div>
        </nav>
      )}
    </section>
  )
}
