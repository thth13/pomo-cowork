'use client'

import { useEffect, useId, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { Send, Square } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useI18n } from '@/components/I18nProvider'
import { beepDetail, beepRequestHeaders, BeepRequestError } from '@/lib/beepClient'
import { logBeepClick, logBeepEvent } from '@/lib/beepEvents'
import { beepStreamEvents } from '@/lib/beepStream'
import { beepHistory, BEEP_MESSAGE_LIMIT, type BeepMessage, type BeepConversationInfo } from '@/lib/beepChat'
import styles from './WalkingCompanion.module.css'

const copy = {
  en: {
    label: 'Message Mr. Beep', placeholder: 'Ask me anything…', send: 'Send message', stop: 'Stop reply', you: 'You', beep: 'Mr. Beep · AI', retry: 'Try again',
    reload: 'Reload conversation', earlier: 'Earlier messages', pending: 'A reply is being generated in this conversation. Reload to check.', conflict: 'This conversation changed in another window. Reload before continuing.', save_failed: 'The reply could not be saved. Reload to check the conversation.',
    unavailable: 'I couldn’t reply just now. Please try again.', not_configured: 'My AI chat isn’t connected yet. Please try again later.', rate_limit: 'Let’s pause for a minute before the next message.', provider_busy: 'My AI service is busy. Please try again in a minute.', unauthorized: 'Your sign-in has expired. Sign in again or continue as a guest.', timeout: 'That took too long. You can try again.', cancelled: 'Reply stopped. You can try again.',
  },
  es: {
    label: 'Mensaje para Mr. Beep', placeholder: 'Pregúntame lo que quieras…', send: 'Enviar mensaje', stop: 'Detener respuesta', you: 'Tú', beep: 'Mr. Beep · IA', retry: 'Reintentar',
    reload: 'Recargar conversación', earlier: 'Mensajes anteriores', pending: 'Se está generando una respuesta. Recarga para comprobarlo.', conflict: 'La conversación cambió en otra ventana. Recarga antes de continuar.', save_failed: 'No se pudo guardar la respuesta. Recarga para comprobar la conversación.',
    unavailable: 'No he podido responder. Inténtalo de nuevo.', not_configured: 'Mi chat con IA aún no está conectado. Vuelve más tarde.', rate_limit: 'Esperemos un minuto antes del siguiente mensaje.', provider_busy: 'El servicio de IA está ocupado. Inténtalo en un minuto.', unauthorized: 'Tu sesión ha caducado. Vuelve a iniciar sesión o continúa como invitado.', timeout: 'La respuesta tardó demasiado. Puedes reintentar.', cancelled: 'Respuesta detenida. Puedes reintentar.',
  },
}
type ChatError = 'unavailable' | 'not_configured' | 'rate_limit' | 'provider_busy' | 'unauthorized' | 'timeout' | 'cancelled' | 'conflict' | 'save_failed'

interface Props {
  messages: BeepMessage[]
  onMessagesChange: Dispatch<SetStateAction<BeepMessage[]>>
  onSpeakingChange: (speaking: boolean) => void
  conversation: BeepConversationInfo | null
  onConversationChange: (conversation: BeepConversationInfo) => void
  onBusyChange?: (busy: boolean) => void
  variant?: 'bubble' | 'page'
  locked?: boolean
  onReload?: () => void
  onEarlier?: () => void
  earlierLoading?: boolean
}

export default function BeepChat({ messages, onMessagesChange, onSpeakingChange, conversation, onConversationChange, onBusyChange, variant = 'bubble', locked = false, onReload, onEarlier, earlierLoading }: Props) {
  const { language } = useI18n()
  const text = copy[language]
  const pathname = usePathname()
  const token = useAuthStore(state => state.token)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const followEnd = useRef(true)
  const [error, setError] = useState<ChatError | null>(messages.at(-1)?.role === 'user' || ['failed', 'interrupted'].includes(messages.at(-1)?.status ?? '') ? 'cancelled' : null)
  const requestRef = useRef<AbortController | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mounted = useRef(true)
  const inputId = useId()

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      requestRef.current?.abort()
      onBusyChange?.(false)
      onSpeakingChange(false)
    }
  }, [onSpeakingChange, onBusyChange])

  useEffect(() => {
    const log = logRef.current
    if (log && followEnd.current) log.scrollTop = log.scrollHeight
  }, [messages, busy, error, streamingText])

  useEffect(() => {
    const input = inputRef.current
    if (input) { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 112)}px` }
  }, [draft])

  async function send(question?: string, retry = false) {
    const content = (question ?? draft).trim()
    if (requestRef.current || locked || variant === 'page' && !conversation || !content || content.length > BEEP_MESSAGE_LIMIT) return
    logBeepEvent(retry ? 'chat_retry' : 'chat_send', variant === 'page' ? 'page' : 'chat')
    const retryMessages = messages.at(-1)?.role === 'assistant' ? messages.slice(0, -1) : messages
    const lastUser = retryMessages.at(-1)
    const requestId = retry && lastUser?.requestId ? lastUser.requestId : crypto.randomUUID()
    let savedConversation = conversation ?? { id: crypto.randomUUID(), revision: 0 }
    if (savedConversation) onConversationChange(savedConversation)
    const nextMessages: BeepMessage[] = retry ? retryMessages.map((message, index) => index === retryMessages.length - 1 ? { ...message, requestId, status: 'pending' } : message) : [...messages, { role: 'user', content, requestId, status: 'pending' }]
    const controller = new AbortController()
    requestRef.current = controller
    setBusy(true)
    onBusyChange?.(true)
    setStreamingText('')
    followEnd.current = true
    setError(null)
    setDraft('')
    onSpeakingChange(false)
    onMessagesChange(variant === 'page' ? nextMessages : nextMessages.slice(-40))
    let timedOut = false
    const timeout = setTimeout(() => { timedOut = true; controller.abort() }, 45_000)
    let answer = ''
    let completed = false
    try {
      if (retry && savedConversation) {
        try {
          const detail = await beepDetail(savedConversation.id, token, controller.signal)
          if (!mounted.current || useAuthStore.getState().token !== token) return
          savedConversation = detail.conversation
          onConversationChange(savedConversation)
          const latest = detail.messages.at(-1)
          const alreadySaved = detail.messages.some(message => message.requestId === requestId)
          const changed = !alreadySaved && detail.conversation.revision !== (conversation?.revision ?? 0)
          if (detail.active || changed || alreadySaved && latest?.requestId !== requestId || latest?.requestId === requestId && latest.status === 'completed') {
            onMessagesChange(detail.messages)
            if (!alreadySaved) setDraft(content)
            setError(latest?.requestId === requestId && latest.status === 'completed' ? null : 'conflict')
            return
          }
        } catch (failure) {
          if (!(failure instanceof BeepRequestError) || failure.status !== 404) throw failure
        }
      }
      const response = await fetch('/api/beep/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...beepRequestHeaders(token) },
        body: JSON.stringify({ messages: beepHistory(nextMessages), ...(savedConversation ? { conversationId: savedConversation.id, revision: savedConversation.revision, requestId } : {}), context: { page: pathname, language, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, device: window.matchMedia('(max-width: 719px)').matches ? 'mobile' : 'desktop' } }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null
        const known: ChatError[] = ['not_configured', 'rate_limit', 'provider_busy', 'unauthorized', 'timeout', 'conflict', 'save_failed']
        if (mounted.current && useAuthStore.getState().token === token) {
          setError(known.includes(result?.error as ChatError) ? result!.error as ChatError : 'unavailable')
          if (result?.error === 'conflict') setDraft(content)
        }
        return
      }
      if (!response.body) throw new Error('Missing stream')
      for await (const event of beepStreamEvents(response.body)) {
        if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
        if (!mounted.current || useAuthStore.getState().token !== token) return
        if (event.error) throw new Error(event.error === 'timeout' ? 'timeout' : event.error === 'save_failed' ? 'save_failed' : 'unavailable')
        if (event.conversationId && typeof event.revision === 'number') onConversationChange({ id: event.conversationId, revision: event.revision })
        if (event.delta) {
          answer = (answer + event.delta).slice(0, 5000)
          setStreamingText(answer)
          onSpeakingChange(true)
        }
        if (event.done) { completed = true; break }
      }
      if (!completed || !answer.trim()) throw new Error('Incomplete stream')
    } catch (cause) {
      if (mounted.current && useAuthStore.getState().token === token) setError(cause instanceof Error && cause.message === 'save_failed' ? 'save_failed' : timedOut || cause instanceof Error && cause.message === 'timeout' ? 'timeout' : controller.signal.aborted ? 'cancelled' : 'unavailable')
    } finally {
      clearTimeout(timeout)
      if (requestRef.current === controller) requestRef.current = null
      if (mounted.current && useAuthStore.getState().token === token) {
        if (answer) onMessagesChange(previous => {
          const updated = [...previous.map(message => message.requestId === requestId ? { ...message, status: completed ? 'completed' : 'interrupted' } : message), { role: 'assistant', content: answer, requestId, status: completed ? 'completed' : 'interrupted' } as BeepMessage]
          return variant === 'page' ? updated : updated.slice(-40)
        })
        setStreamingText('')
        setBusy(false)
        onBusyChange?.(false)
        onSpeakingChange(false)
      }
    }
  }

  const retryQuestion = messages.at(-1)?.role === 'user' ? messages.at(-1) : messages.at(-2)

  return <div data-beep-log-surface={variant === 'page' ? 'page' : 'chat'} onClickCapture={logBeepClick} className={`${styles.beepChat} ${variant === 'page' ? styles.chatPage : ''}`}>
    {(messages.length > 0 || busy) && <div ref={logRef} className={styles.chatLog} role="log" aria-label={text.label} aria-live="polite" aria-busy={busy} tabIndex={0}
      onScroll={event => { const log = event.currentTarget; followEnd.current = log.scrollHeight - log.scrollTop - log.clientHeight < 48 }}>
      {onEarlier && <button type="button" data-beep-action="chat_earlier" disabled={earlierLoading || busy} onClick={() => { followEnd.current = false; onEarlier() }}>{text.earlier}</button>}
      {messages.map((message, index) => <div key={index} className={styles.chatMessage} data-role={message.role}>
        <span className="sr-only">{message.role === 'user' ? text.you : text.beep}</span>
        <p>{message.content}</p>
      </div>)}
      {busy && <div className={styles.chatMessage} data-role="assistant">
        <span className="sr-only">{text.beep}</span>
        <p>{streamingText}<span className={styles.chatCursor} aria-hidden="true" /></p>
      </div>}
    </div>}
    {locked && <div className={styles.chatError} role="status"><p>{text.pending}</p>{onReload && <button type="button" data-beep-action="chat_reload" onClick={onReload}>{text.reload}</button>}</div>}
    {error && <div className={styles.chatError} role="alert">
      <p>{text[error]}</p>
      {!['conflict', 'save_failed'].includes(error) && retryQuestion?.role === 'user' && <button type="button" disabled={busy || locked} onClick={() => { void send(retryQuestion.content, true) }}>{text.retry}</button>}
      {conversation && <button type="button" data-beep-action="chat_reload" disabled={busy} onClick={() => {
        if (onReload) { onReload(); setError(null); return }
        void beepDetail(conversation.id, token).then(detail => {
          if (mounted.current && useAuthStore.getState().token === token) { onConversationChange(detail.conversation); onMessagesChange(detail.messages); setError(detail.active ? 'conflict' : null) }
        }).catch(() => { if (mounted.current) setError('unavailable') })
      }}>{text.reload}</button>}
    </div>}
    <form noValidate className={styles.chatForm} onSubmit={event => { event.preventDefault(); void send() }}>
      <label className="sr-only" htmlFor={inputId}>{text.label}</label>
      <textarea ref={inputRef} id={inputId} value={draft} maxLength={BEEP_MESSAGE_LIMIT} rows={1} disabled={locked} placeholder={text.placeholder}
        onChange={event => setDraft(event.target.value)} onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send() }
        }} />
      {busy ? <button type="button" data-beep-action="chat_stop" title={text.stop} aria-label={text.stop} onClick={() => requestRef.current?.abort()}><Square size={15} aria-hidden="true" /></button> : <button type="submit" title={text.send} aria-label={text.send} disabled={locked || !draft.trim()}><Send size={17} aria-hidden="true" /></button>}
    </form>
  </div>
}
