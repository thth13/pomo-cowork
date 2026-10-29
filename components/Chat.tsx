"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SendHorizonal, Loader2 } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useRoomStore } from '@/store/useRoomStore'
import { useSocket } from '@/hooks/useSocket'
import type { ChatHistoryRequest, ChatHistoryResponse, ChatMessage } from '@/types'
import Image from 'next/image'
import AuthModal from '@/components/AuthModal'
import { ChatMessagesSkeleton } from '@/components/ChatSkeleton'
import GuestAvatar from '@/components/GuestAvatar'
import ParticipantName, { getParticipantIdentity } from '@/components/ParticipantName'
import { useI18n } from '@/components/I18nProvider'

interface TypingState {
  username: string
  isTyping: boolean
}

interface ChatProps {
  matchHeightSelector?: string
  isVisible?: boolean
}

interface HistoryLoad extends ChatHistoryRequest {
  token: string | null
  awaitingSocket: boolean
  removedIds: Set<string>
}

function mergeMessages(history: ChatMessage[], current: ChatMessage[], load: HistoryLoad) {
  const byId = new Map<string, ChatMessage>()
  for (const message of [...history, ...current]) {
    if ((message.roomId ?? null) === load.roomId && !load.removedIds.has(message.id)) byId.set(message.id, message)
  }
  return Array.from(byId.values()).sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id))
}

// Shared across mounts so reopening Chat cannot reuse an outstanding request ID.
let historyRequestSequence = 0

export default function Chat({ matchHeightSelector, isVisible = true }: ChatProps) {
  const router = useRouter()
  const { t } = useI18n()
  const { user, token, isAuthenticated } = useAuthStore()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const canWrite = isAuthenticated && Boolean(user && !user.isAnonymous) && Boolean(token)
  const { currentRoomId } = useRoomStore()
  const {
    sendChatMessage,
    requestChatHistory,
    onChatMessage,
    offChatMessage,
    onChatHistory,
    offChatHistory,
    onChatRemove,
    offChatRemove,
    emitChatTyping,
    onChatTyping,
    offChatTyping
  } = useSocket()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [historyVersion, setHistoryVersion] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [typing, setTyping] = useState<TypingState | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [matchedHeight, setMatchedHeight] = useState<number | undefined>(undefined)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [oldestMessageId, setOldestMessageId] = useState<string | null>(null)
  const currentRoomIdRef = useRef<string | null>(currentRoomId ?? null)
  const historyLoadRef = useRef<HistoryLoad | null>(null)

  useEffect(() => {
    if (!isVisible) return
    const frame = requestAnimationFrame(() => {
      const list = listRef.current
      if (list) list.scrollTop = list.scrollHeight
    })
    return () => cancelAnimationFrame(frame)
  }, [isVisible])

  useEffect(() => {
    currentRoomIdRef.current = currentRoomId ?? null
  }, [currentRoomId])

  const getActionColor = (actionType?: string) => {
    switch (actionType) {
      case 'work_start':
        return 'text-red-600 dark:text-red-400'
      case 'break_start':
        return 'text-green-600 dark:text-green-400'
      case 'long_break_start':
        return 'text-blue-600 dark:text-blue-400'
      case 'session_complete':
        return 'text-emerald-600 dark:text-emerald-400'
      case 'time_tracking_start':
        return 'text-indigo-600 dark:text-indigo-400'
      default:
        return 'text-slate-600 dark:text-slate-400'
    }
  }

  useEffect(() => {
    // Height matching with timer panel
    if (!matchHeightSelector) return
    if (typeof window === 'undefined') return

    const el = document.querySelector(matchHeightSelector) as HTMLElement | null
    if (!el) return

    const apply = () => {
      setMatchedHeight(el.getBoundingClientRect().height)
    }

    apply()

    const ro = new ResizeObserver(() => apply())
    ro.observe(el)

    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [matchHeightSelector])

  useEffect(() => {
    if (!isVisible) return
    const handleHistory = (response: ChatHistoryResponse) => {
      const load = historyLoadRef.current
      // A room switch can load its history via HTTP while an older socket
      // request is still waiting for access. Never infer scope from messages.
      if (!load?.awaitingSocket || !response ||
          response.requestId !== load.requestId || response.roomId !== load.roomId ||
          (useRoomStore.getState().currentRoomId ?? null) !== load.roomId ||
          useAuthStore.getState().token !== load.token || !Array.isArray(response.messages)) return
      load.awaitingSocket = false
      setMessages(current => mergeMessages(response.messages, current, load))
      // Socket history is a bounded cache and has no database pagination cursor.
      setHasMore(false)
      setOldestMessageId(null)
      setLoading(false)
      scrollToBottom()
    }

    const handleNew = (msg: ChatMessage) => {
      const load = historyLoadRef.current
      if (!load || (useRoomStore.getState().currentRoomId ?? null) !== load.roomId ||
          useAuthStore.getState().token !== load.token || (msg.roomId ?? null) !== load.roomId) return
      setMessages(current => mergeMessages(current, [msg], load))
      scrollToBottomSmooth()

    }

    const handleRemove = (messageId: string) => {
      historyLoadRef.current?.removedIds.add(messageId)
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
    }

    const handleTyping = (payload: { username: string; isTyping: boolean; roomId?: string | null }) => {
      const roomId = currentRoomIdRef.current
      if ((payload.roomId ?? null) !== roomId) return
      if (!payload.isTyping) {
        setTyping(null)
        return
      }
      setTyping({ username: payload.username, isTyping: true })
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => setTyping(null), 2500)
    }

    onChatHistory(handleHistory)
    onChatMessage(handleNew)
    onChatRemove(handleRemove)
    onChatTyping(handleTyping)

    return () => {
      offChatHistory(handleHistory)
      offChatMessage(handleNew)
      offChatRemove(handleRemove)
      offChatTyping(handleTyping)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible])

  useEffect(() => {
    if (!isVisible) return
    const onAccessRestored = () => {
      if (useRoomStore.getState().currentRoomId) setHistoryVersion(value => value + 1)
    }
    window.addEventListener('pomo:room-access-restored', onAccessRestored)
    return () => window.removeEventListener('pomo:room-access-restored', onAccessRestored)
  }, [isVisible])

  useEffect(() => {
    if (!isVisible) return
    const controller = new AbortController()
    const load: HistoryLoad = {
      requestId: `${Date.now()}:${++historyRequestSequence}`,
      roomId: currentRoomId ?? null,
      token,
      awaitingSocket: false,
      removedIds: new Set(),
    }
    historyLoadRef.current = load
    const isCurrentLoad = () => !controller.signal.aborted && historyLoadRef.current === load &&
      (useRoomStore.getState().currentRoomId ?? null) === load.roomId && useAuthStore.getState().token === load.token
    const requestSocketHistory = () => {
      if (!isCurrentLoad()) return
      load.awaitingSocket = true
      requestChatHistory({ requestId: load.requestId, roomId: load.roomId })
    }
    // On opening or room change: reset and reload history
    setLoading(true)
    setLoadingMore(false)
    setMessages([])
    setHasMore(true)
    setOldestMessageId(null)

    const roomQuery = currentRoomId ? `&roomId=${encodeURIComponent(currentRoomId)}` : ''
    fetch(`/api/chat/messages?take=20${roomQuery}`, {
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: 'no-store',
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { items: ChatMessage[]; hasMore: boolean; nextCursor: string | null } | null) => {
        if (!isCurrentLoad()) return
        if (data?.items) {
          load.awaitingSocket = false
          setMessages(current => mergeMessages(data.items, current, load))
          setHasMore(data.hasMore)
          setOldestMessageId(data.nextCursor)
          setLoading(false)
          scrollToBottom()
        } else {
          requestSocketHistory()
        }
      })
      .catch(requestSocketHistory)
    return () => {
      controller.abort()
      if (historyLoadRef.current === load) historyLoadRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoomId, isVisible, token, historyVersion])

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight
      }
    })
  }

  const scrollToBottomSmooth = () => {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
      }
    })
  }

  const loadMoreMessages = useCallback(async () => {
    const load = historyLoadRef.current
    if (!load || !hasMore || loadingMore || !oldestMessageId) return

    setLoadingMore(true)
    
    try {
      const roomQuery = currentRoomId ? `&roomId=${encodeURIComponent(currentRoomId)}` : ''
      const response = await fetch(`/api/chat/messages?take=20&cursor=${oldestMessageId}${roomQuery}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('Failed to load messages')
      
      const data: { items: ChatMessage[]; hasMore: boolean; nextCursor: string | null } = await response.json()
      if (historyLoadRef.current !== load || useAuthStore.getState().token !== token || useRoomStore.getState().currentRoomId !== currentRoomId) return
      
      // Сохраняем текущую высоту скролла
      const scrollContainer = listRef.current
      if (!scrollContainer) return
      
      const oldScrollHeight = scrollContainer.scrollHeight
      const oldScrollTop = scrollContainer.scrollTop
      
      // Добавляем старые сообщения в начало
      setMessages(prev => mergeMessages(data.items, prev, load))
      setHasMore(data.hasMore)
      setOldestMessageId(data.nextCursor)
      
      // Восстанавливаем позицию скролла после добавления новых сообщений
      requestAnimationFrame(() => {
        if (scrollContainer) {
          const newScrollHeight = scrollContainer.scrollHeight
          scrollContainer.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight)
        }
      })
    } catch (error) {
      console.error('Error loading more messages:', error)
    } finally {
      if (historyLoadRef.current === load) setLoadingMore(false)
    }
  }, [hasMore, loadingMore, oldestMessageId, currentRoomId, token])

  // Обработчик скролла для определения когда загружать старые сообщения
  useEffect(() => {
    const scrollContainer = listRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      // Если прокрутили близко к верху (в пределах 100px)
      if (scrollContainer.scrollTop < 100 && hasMore && !loadingMore) {
        loadMoreMessages()
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [hasMore, loadingMore, loadMoreMessages, oldestMessageId])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canWrite) {
      setIsAuthModalOpen(true)
      return
    }
    const text = input.trim()
    if (!text) return
    const load = historyLoadRef.current
    if (!load) return
    const isCurrentLoad = () => historyLoadRef.current === load && useAuthStore.getState().token === load.token &&
      (useRoomStore.getState().currentRoomId ?? null) === load.roomId
    if (!isCurrentLoad()) return

    // Optimistic UI update
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      userId: user?.id || null,
      username: user?.username || 'Guest',
      avatarUrl: user?.avatarUrl || undefined,
      roomId: currentRoomId ?? null,
      text,
      timestamp: Date.now(),
      type: 'message'
    }
    setMessages(prev => [...prev, optimisticMessage])
    setInput("")
    scrollToBottomSmooth()

    try {
      // Save to database
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user?.id || null,
          username: user?.username || 'Guest',
          roomId: currentRoomId ?? null,
          text
        })
      })

      if (response.ok) {
        const savedMessage = await response.json() as ChatMessage
        // Replace optimistic message with real one
        if (isCurrentLoad()) setMessages(prev => mergeMessages(
          prev.filter(m => m.id !== optimisticMessage.id),
          [{ ...savedMessage, avatarUrl: savedMessage.avatarUrl ?? user?.avatarUrl }], load,
        ))
        // Send via socket for other users
        if (useAuthStore.getState().token === load.token) sendChatMessage({
          messageId: savedMessage.id,
          text,
          userId: user?.id || null,
          roomId: currentRoomId ?? null,
          username: user?.username || 'Guest',
          avatarUrl: user?.avatarUrl ?? null
        })
      } else {
        if (isCurrentLoad() && (response.status === 401 || response.status === 403)) setIsAuthModalOpen(true)
        throw new Error('Failed to save message')
      }
    } catch (error) {
      console.error('Error saving message:', error)
      // Remove optimistic message on error
      if (isCurrentLoad()) {
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
        setInput(current => current || text)
      }
    }
  }

  const onInputChange = (v: string) => {
    setInput(v)
    if (!canWrite) return
    emitChatTyping(true, {
      userId: user?.id || null,
      username: user?.username || 'Guest',
      avatarUrl: user?.avatarUrl ?? null,
      roomId: currentRoomId ?? null
    })
  }

  const meName = useMemo(() => user?.username ?? 'Guest', [user])

  // Группируем сообщения по датам
  const messagesWithDates = useMemo(() => {
    const result: Array<ChatMessage | { type: 'date'; date: string }> = []
    let lastDate: string | null = null

    messages.forEach((msg) => {
      const msgDate = new Date(msg.timestamp).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short'
      })

      if (msgDate !== lastDate) {
        result.push({ type: 'date', date: msgDate })
        lastDate = msgDate
      }

      result.push(msg)
    })

    return result
  }, [messages])

  return (
    <div ref={containerRef} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">General Chat</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full pulse-dot"></div>
            {/* <span className="text-sm text-gray-600 dark:text-slate-300">online participants</span> */}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} className="chat-messages flex-1 p-4 space-y-4">
        {loadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 dark:text-slate-500" />
          </div>
        )}
        {loading ? (
          <ChatMessagesSkeleton />
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-slate-400 py-6">No messages. Be the first!</div>
        ) : (
          messagesWithDates.map((item, idx) => {
            // Date separator
            if ('type' in item && item.type === 'date') {
              return (
                <div key={`date-${idx}`} className="flex justify-center my-4">
                  <div className="px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded-full text-xs font-medium text-gray-600 dark:text-slate-300">
                    {item.date}
                  </div>
                </div>
              )
            }

            // Message (system or regular)
            const m = item as ChatMessage

            const systemAllowedActions = ['work_start', 'time_tracking_start']
            if (m.type === 'system' && (!m.action?.type || !systemAllowedActions.includes(m.action.type))) {
              return null
            }
            const actionTime = new Date(m.timestamp).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit'
            })
            const taskLabel = m.action?.task?.trim()
            const { isGuest, displayName } = getParticipantIdentity(m.username, t.activeSessions.guest)

            return (
              <div key={m.id}>
                {m.type === 'system' ? (
                  <div className="flex items-start space-x-3">
                    <button
                      type="button"
                      onClick={() => m.userId && router.push(`/user/${m.userId}`)}
                      disabled={!m.userId}
                      aria-label={displayName}
                      className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:hover:opacity-100"
                    >
                      {m.avatarUrl ? (
                        <Image
                          src={m.avatarUrl}
                          alt=""
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      ) : isGuest ? (
                        <GuestAvatar userId={m.userId ?? m.username} />
                      ) : (
                        <div className="w-full h-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center text-gray-700 dark:text-slate-200 font-semibold">
                          {m.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <button
                          type="button"
                          onClick={() => m.userId && router.push(`/user/${m.userId}`)}
                          disabled={!m.userId}
                          className="text-left text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-red-500 dark:hover:text-red-400 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:hover:text-current"
                        >
                          <ParticipantName username={m.username} guestLabel={t.activeSessions.guest} />
                        </button>
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                          {actionTime}
                        </span>
                      </div>
                      <div className={`text-sm font-semibold ${getActionColor(m.action?.type)}`}>
                        {m.action?.type === 'time_tracking_start'
                          ? `started a time tracking session "${taskLabel || 'focus'}"`
                          : `started a ${taskLabel || 'focus'} session${m.action?.duration ? ` for ${m.action.duration} min` : ''}`}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-3">
                    {m.avatarUrl ? (
                      <Image 
                        src={m.avatarUrl} 
                        alt={m.username}
                        width={32}
                        height={32}
                        onClick={() => m.userId && router.push(`/user/${m.userId}`)}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div 
                        onClick={() => m.userId && router.push(`/user/${m.userId}`)}
                        className="w-8 h-8 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center text-gray-700 dark:text-slate-200 font-semibold flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        {m.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span 
                          onClick={() => m.userId && router.push(`/user/${m.userId}`)}
                          className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        >
                          {m.username}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                          {new Date(m.timestamp).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-slate-300">{m.text}</div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}

        {typing && (
          <div className="text-xs text-gray-500 dark:text-slate-400">{typing.username} is typing...</div>
        )}
      </div>

      {/* Input */}
      <form noValidate onSubmit={onSubmit} className="p-4 border-t border-gray-200 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          {user?.avatarUrl ? (
            <Image 
              src={user.avatarUrl} 
              alt={meName}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center text-gray-700 dark:text-slate-200 font-semibold flex-shrink-0">
              {meName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 relative">
            <input 
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Write a message..." 
              className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent pr-10"
            />
            <button 
              type="submit"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          </div>
        </div>
      </form>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode="register" />
    </div>
  )
}
