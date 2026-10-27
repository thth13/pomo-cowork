'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useI18n } from '@/components/I18nProvider'
import { userProfileHref } from '@/lib/userProfile'
import CommunityDialog from '@/components/CommunityDialog'

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
  const [selectedEntry, setSelectedEntry] = useState<PaywallEventEntry | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)
  const deleteController = useRef<AbortController | null>(null)
  const refreshButton = useRef<HTMLButtonElement>(null)
  const focusAfterDelete = useRef(false)

  useEffect(() => {
    setSelectedEntry(null)
    setDeleteError(null)
    setDeleted(false)
    setDeleting(false)
    return () => {
      deleteController.current?.abort()
      deleteController.current = null
    }
  }, [token])

  useEffect(() => {
    if (!loading && focusAfterDelete.current) {
      focusAfterDelete.current = false
      refreshButton.current?.focus({ preventScroll: true })
    }
  }, [loading])

  async function deleteEntry() {
    if (!selectedEntry || deleteController.current) return
    const controller = new AbortController()
    deleteController.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    setDeleting(true)
    setDeleteError(null)
    try {
      const authToken = token ?? localStorage.getItem('token')
      if (!authToken) {
        setDeleteError(es ? 'Inicia sesión de nuevo para eliminar eventos.' : 'Sign in again to delete events.')
        return
      }
      const response = await fetch(`/api/admin/paywall-events?id=${encodeURIComponent(selectedEntry.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
        signal: controller.signal,
      })
      if (deleteController.current !== controller) return
      if (!response.ok) {
        setDeleteError(response.status === 401
          ? (es ? 'Inicia sesión de nuevo para eliminar eventos.' : 'Sign in again to delete events.')
          : response.status === 403
            ? (es ? 'Solo los administradores pueden eliminar eventos.' : 'Only administrators can delete events.')
            : (es ? 'No se pudo eliminar el evento. Vuelve a intentarlo.' : 'Could not delete event. Try again.'))
        return
      }
      setSelectedEntry(null)
      setDeleted(true)
      focusAfterDelete.current = true
      setRevision(value => value + 1)
    } catch {
      if (deleteController.current === controller) {
        setDeleteError(es ? 'No se pudo confirmar la eliminación. Vuelve a intentarlo.' : 'Could not confirm deletion. Try again.')
      }
    } finally {
      window.clearTimeout(timeout)
      if (deleteController.current === controller) {
        deleteController.current = null
        setDeleting(false)
      }
    }
  }

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
        <button ref={refreshButton} type="button" className={buttonClass} disabled={loading || deleting} onClick={() => setRevision(value => value + 1)}>
          {es ? 'Actualizar' : 'Refresh'}
        </button>
      </div>

      <div role="status" className="text-sm text-slate-600 dark:text-slate-300">
        {deleted && (es ? 'Evento eliminado.' : 'Event deleted.')}
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
                  {[es ? 'Usuario' : 'User', es ? 'Acción' : 'Action', 'Plan', es ? 'Página' : 'Page', es ? 'Fecha (Kyiv)' : 'Time (Kyiv)', es ? 'Gestionar' : 'Manage'].map(label => (
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
                    <td className="px-4 py-3">
                      <button type="button" className={`${buttonClass} text-red-600 dark:text-red-400`} disabled={deleting} onClick={() => {
                        setDeleteError(null)
                        setDeleted(false)
                        setSelectedEntry(entry)
                      }}>
                        {es ? 'Eliminar' : 'Delete'}
                      </button>
                    </td>
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
            <button type="button" className={buttonClass} disabled={deleting || data.page <= 1} onClick={() => goToPage(data.page - 1)}>{es ? 'Anterior' : 'Previous'}</button>
            <button type="button" className={buttonClass} disabled={deleting || data.page * data.pageSize >= data.total} onClick={() => goToPage(data.page + 1)}>{es ? 'Siguiente' : 'Next'}</button>
          </div>
        </nav>
      )}
      <CommunityDialog
        open={!!selectedEntry}
        title={es ? '¿Eliminar evento?' : 'Delete event?'}
        description={es ? 'Este evento se eliminará permanentemente. Esta acción no se puede deshacer.' : 'This event will be permanently deleted. This cannot be undone.'}
        variant="project-action"
        busy={deleting}
        onClose={() => { if (!deleting) setSelectedEntry(null) }}
      >
        {selectedEntry && <p className="break-words text-sm text-slate-600 dark:text-slate-300">
          {selectedEntry.user?.username ?? (es ? 'Usuario desconocido' : 'Unknown user')}
          {' · '}{selectedEntry.event === 'paywall_open' ? (es ? 'Abrió la ventana' : 'Opened modal') : (es ? 'Clic en continuar al pago' : 'Clicked Continue to checkout')}
          {' · '}{selectedEntry.pagePath}
          {' · '}{new Intl.DateTimeFormat(es ? 'es-ES' : 'en-GB', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Europe/Kyiv' }).format(new Date(selectedEntry.createdAt))} (Kyiv)
        </p>}
        {deleteError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>}
        <div className="mt-4 flex justify-end gap-3" aria-busy={deleting}>
          <button type="button" className={buttonClass} disabled={deleting} onClick={() => setSelectedEntry(null)}>{es ? 'Cancelar' : 'Cancel'}</button>
          <button type="button" className={`${buttonClass} min-w-[7rem] text-red-600 dark:text-red-400`} disabled={deleting} onClick={() => void deleteEntry()}>
            {deleting ? (es ? 'Eliminando…' : 'Deleting…') : (es ? 'Eliminar' : 'Delete')}
          </button>
        </div>
      </CommunityDialog>
    </section>
  )
}
