'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, RefreshCw } from 'lucide-react'
import Navbar from '@/components/Navbar'
import PersonalNavigation from '@/components/PersonalNavigation'
import AuthModal from '@/components/AuthModal'
import BeepChat from '@/components/companion/BeepChat'
import { useAuthStore } from '@/store/useAuthStore'
import { useI18n } from '@/components/I18nProvider'
import { beepDetail, beepFetch, BeepRequestError } from '@/lib/beepClient'
import type { BeepConversationDetail, BeepConversationInfo, BeepMessage } from '@/lib/beepChat'
import './beep.css'

const copy = {
  en: { title: 'Mr. Beep', history: 'Conversations', empty: 'No conversations yet.', loading: 'Loading…', error: 'Couldn’t load conversations.', missing: 'This conversation is unavailable.', retry: 'Try again', signIn: 'Sign in to see your conversations', more: 'Show more', back: 'All conversations', expired: 'Your sign-in has expired. Sign in again.', refresh: 'Refresh conversations' },
  es: { title: 'Mr. Beep', history: 'Conversaciones', empty: 'Aún no hay conversaciones.', loading: 'Cargando…', error: 'No se pudieron cargar las conversaciones.', missing: 'Esta conversación no está disponible.', retry: 'Reintentar', signIn: 'Inicia sesión para ver tus conversaciones', more: 'Mostrar más', back: 'Todas las conversaciones', expired: 'Tu sesión ha caducado. Vuelve a iniciar sesión.', refresh: 'Actualizar conversaciones' },
}
const silent = () => {}
interface ListItem extends BeepConversationInfo { createdAt: string; updatedAt: string }
interface ListPage { conversations: ListItem[]; nextCursor: string | null }

export default function BeepHistory({ conversationId }: { conversationId?: string }) {
  const { token, isLoading } = useAuthStore()
  const { language } = useI18n()
  const text = copy[language]
  const [authOpen, setAuthOpen] = useState(false)
  return <div className="garden-page beep-history-page" data-i18n-ignore>
    <Navbar compact />
    <main className="personal-page-frame beep-history-frame">
      <PersonalNavigation />
      <h1 className="sr-only">{text.history}</h1>
      {isLoading ? <LoadingSkeleton label={text.loading} dialogue={Boolean(conversationId)} shell /> : !token ? <div className="beep-history-state"><button type="button" className="btn btn-primary" onClick={() => setAuthOpen(true)}>{text.signIn}</button></div> :
        <Workspace key={token} token={token} conversationId={conversationId} onSignIn={() => setAuthOpen(true)} />}
    </main>
    <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
  </div>
}

function Workspace({ token, conversationId, onSignIn }: { token: string; conversationId?: string; onSignIn: () => void }) {
  const { language } = useI18n()
  const text = copy[language]
  const [items, setItems] = useState<ListItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<number | null>(null)
  const [listVersion, setListVersion] = useState(0)
  const [detailVersion, setDetailVersion] = useState(0)
  const [conversation, setConversation] = useState<BeepConversationInfo | null>(null)
  const [messages, setMessages] = useState<BeepMessage[]>([])
  const [before, setBefore] = useState<number | null>(null)
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(Boolean(conversationId))
  const [error, setError] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [earlierLoading, setEarlierLoading] = useState(false)
  const [earlierError, setEarlierError] = useState(false)
  const mounted = useRef(true)
  const extraRequests = useRef(new Set<AbortController>())
  const routeRef = useRef(conversationId)
  routeRef.current = conversationId
  useEffect(() => {
    mounted.current = true
    const requests = extraRequests.current
    return () => { mounted.current = false; requests.forEach(request => request.abort()) }
  }, [])
  const current = useCallback(() => mounted.current && useAuthStore.getState().token === token, [token])

  useEffect(() => {
    if (conversationId) return
    const controller = new AbortController()
    setListLoading(true)
    setListError(null)
    void beepFetch<ListPage>('/api/beep/conversations', token, controller.signal).then(result => {
      if (controller.signal.aborted || !current()) return
      setItems(result.conversations); setCursor(result.nextCursor)
    }).catch(failure => {
      if (!controller.signal.aborted && current()) setListError(failure instanceof BeepRequestError ? failure.status : 503)
    }).finally(() => { if (!controller.signal.aborted && current()) setListLoading(false) })
    return () => controller.abort()
  }, [token, listVersion, current, conversationId])

  useEffect(() => {
    const controller = new AbortController()
    setBusy(false); setEarlierLoading(false); setEarlierError(false); setError(null); setMessages([]); setConversation(null); setBefore(null); setActive(false)
    if (!conversationId) { setLoading(false); return }
    setLoading(true)
    void beepDetail(conversationId, token, controller.signal).then(result => {
      if (controller.signal.aborted || !current()) return
      setConversation(result.conversation); setMessages(result.messages); setBefore(result.nextBefore); setActive(result.active)
    }).catch(failure => {
      if (!controller.signal.aborted && current()) setError(failure instanceof BeepRequestError ? failure.status : 503)
    }).finally(() => { if (!controller.signal.aborted && current()) setLoading(false) })
    return () => controller.abort()
  }, [conversationId, token, detailVersion, current])


  async function more() {
    if (!cursor || listLoading) return
    const controller = new AbortController()
    extraRequests.current.add(controller)
    setListLoading(true); setListError(null)
    try {
      const result = await beepFetch<ListPage>(`/api/beep/conversations?cursor=${encodeURIComponent(cursor)}`, token, controller.signal)
      if (!current() || controller.signal.aborted) return
      setItems(previous => Array.from(new Map([...previous, ...result.conversations].map(item => [item.id, item])).values()))
      setCursor(result.nextCursor)
    } catch (failure) { if (current() && !controller.signal.aborted) setListError(failure instanceof BeepRequestError ? failure.status : 503) }
    finally { extraRequests.current.delete(controller); if (current()) setListLoading(false) }
  }
  async function earlier() {
    if (before === null || !conversationId || earlierLoading) return
    const controller = new AbortController()
    extraRequests.current.add(controller)
    setEarlierLoading(true); setEarlierError(false)
    try {
      const result = await beepFetch<BeepConversationDetail>(`/api/beep/conversations/${conversationId}?before=${before}`, token, controller.signal)
      if (!current() || controller.signal.aborted || routeRef.current !== conversationId) return
      setMessages(previous => [...result.messages, ...previous]); setBefore(result.nextBefore)
    } catch { if (current() && routeRef.current === conversationId) setEarlierError(true) }
    finally { extraRequests.current.delete(controller); if (current()) setEarlierLoading(false) }
  }
  const formatDate = (date: string) => new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-US', { dateStyle: 'medium' }).format(new Date(date))
  const expired = error === 401 || listError === 401

  return <div className="beep-history-layout" data-view={conversationId ? 'conversation' : 'list'}>
    {!conversationId ? <section className="beep-history-list-view" aria-label={text.history}>
      <div className="beep-history-list-heading"><h2>{text.history}</h2><button type="button" aria-label={text.refresh} title={text.refresh} disabled={listLoading} onClick={() => setListVersion(value => value + 1)}><RefreshCw size={15} aria-hidden="true" /></button></div>
      {listLoading && !items.length && <LoadingSkeleton label={text.loading} />}
      {!listLoading && !listError && !items.length && <p className="beep-history-muted">{text.empty}</p>}
      <nav className="beep-conversation-list" aria-label={text.history}>{items.map(item => <Link key={item.id} href={`/beep/${item.id}`}>
        <span>{item.title}</span><time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time><ChevronRight size={16} aria-hidden="true" />
      </Link>)}</nav>
      {listLoading && items.length > 0 && <LoadingSkeleton label={text.loading} rows={2} />}
      {listError && <div role="alert" className="beep-history-error"><p>{listError === 401 ? text.expired : text.error}</p><button type="button" onClick={() => listError === 401 ? onSignIn() : setListVersion(value => value + 1)}>{listError === 401 ? text.signIn : text.retry}</button></div>}
      {cursor && <button type="button" disabled={listLoading} onClick={() => { void more() }}>{text.more}</button>}
    </section> : <section className="beep-history-conversation" aria-label={text.title}>
      <header className="beep-conversation-heading"><Link href="/beep" className="beep-conversation-back"><ArrowLeft size={16} aria-hidden="true" /><span>{text.back}</span></Link><h2>{conversation?.title || text.history}</h2></header>
      {earlierError && <div className="beep-history-error" role="alert"><p>{text.error}</p><button type="button" disabled={earlierLoading || busy} onClick={() => { void earlier() }}>{text.retry}</button></div>}
      {loading ? <LoadingSkeleton label={text.loading} dialogue /> : error ? <div className="beep-history-error" role="alert"><p>{expired ? text.expired : error === 404 ? text.missing : text.error}</p><button type="button" onClick={() => expired ? onSignIn() : setDetailVersion(value => value + 1)}>{expired ? text.signIn : text.retry}</button></div> : conversation?.id === conversationId &&
        <BeepChat key={`${conversationId}:${detailVersion}`} messages={messages} onMessagesChange={setMessages} conversation={conversation}
          onConversationChange={value => setConversation(previous => ({ ...previous, ...value }))} onSpeakingChange={silent} onBusyChange={setBusy} variant="page" locked={active}
          onReload={() => setDetailVersion(value => value + 1)} onEarlier={before !== null ? () => { void earlier() } : undefined} earlierLoading={earlierLoading} />}
    </section>}
  </div>
}

function LoadingSkeleton({ label, dialogue = false, shell = false, rows = 5 }: { label: string; dialogue?: boolean; shell?: boolean; rows?: number }) {
  return <div className={shell ? 'beep-history-layout beep-loading-shell' : 'beep-loading'} data-view={dialogue ? 'conversation' : 'list'} role="status" aria-label={label} aria-busy="true">
    <div className={`beep-skeleton-content ${dialogue ? 'beep-skeleton-dialogue' : 'beep-skeleton-list'}`} aria-hidden="true">
      {shell && <div className="beep-skeleton-heading"><span className="personal-skeleton-line beep-skeleton-title" /></div>}
      {dialogue ? <>
        <div className="beep-skeleton-messages">
          <div className="beep-skeleton-message beep-skeleton-user"><span className="personal-skeleton-line" /><span className="personal-skeleton-line beep-skeleton-short" /></div>
          <div className="beep-skeleton-message beep-skeleton-assistant"><span className="personal-skeleton-line" /><span className="personal-skeleton-line" /><span className="personal-skeleton-line beep-skeleton-short" /></div>
          <div className="beep-skeleton-message beep-skeleton-user"><span className="personal-skeleton-line" /></div>
          <div className="beep-skeleton-message beep-skeleton-assistant"><span className="personal-skeleton-line" /><span className="personal-skeleton-line beep-skeleton-short" /></div>
        </div>
        <div className="beep-skeleton-composer"><span className="personal-skeleton-line beep-skeleton-placeholder" /><span className="personal-skeleton-line beep-skeleton-icon" /></div>
      </> : Array.from({ length: rows }, (_, index) => <div key={index} className="beep-skeleton-row">
        <span className={`personal-skeleton-line beep-skeleton-name beep-skeleton-name-${index % 3}`} /><span className="personal-skeleton-line beep-skeleton-date" /><span className="personal-skeleton-line beep-skeleton-chevron" />
      </div>)}
    </div>
  </div>
}
