"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { SendHorizonal, Loader2 } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useSocket } from '@/hooks/useSocket'
import type { ChatMessage } from '@/types'

interface TypingState {
  username: string
  isTyping: boolean
}

interface ChatProps {
  matchHeightSelector?: string
}

export default function Chat({ matchHeightSelector }: ChatProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const {
    sendChatMessage,
    requestChatHistory,
    onChatMessage,
    offChatMessage,
    onChatHistory,
    offChatHistory,
    emitChatTyping,
    onChatTyping,
    offChatTyping
  } = useSocket()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [typing, setTyping] = useState<TypingState | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [matchedHeight, setMatchedHeight] = useState<number | undefined>(undefined)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [oldestMessageId, setOldestMessageId] = useState<string | null>(null)

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
      default:
        return 'text-slate-600 dark:text-slate-400'
    }
  }

  const formatActionMessage = (action?: { type: string; duration?: number; task?: string }) => {
    if (!action) return 'performed an action'

    switch (action.type) {
      case 'work_start':
        return action.duration ? `started working for ${action.duration} minutes` : 'started working'
      case 'break_start':
        return 'started a break'
      case 'long_break_start':
        return 'started a long break'
      case 'session_complete':
        return action.task ? `completed "${action.task}"` : 'completed a session'
      default:
        return 'performed an action'
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
    const handleHistory = (history: ChatMessage[]) => {
      setMessages(history)
      setLoading(false)
      scrollToBottom()
    }

    const handleNew = (msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-99), msg])
      scrollToBottomSmooth()

    }

    const handleTyping = (payload: { username: string; isTyping: boolean }) => {
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
    onChatTyping(handleTyping)
    
    // Загружаем последние 20 сообщений
    fetch('/api/chat/messages?take=20')
      .then((r) => r.ok ? r.json() : null)
      .then((data: { items: ChatMessage[]; hasMore: boolean; nextCursor: string | null } | null) => {
        if (data?.items) {
          setMessages(data.items)
          setHasMore(data.hasMore)
          setOldestMessageId(data.nextCursor)
          setLoading(false)
          scrollToBottom()
        } else {
          requestChatHistory()
        }
      })
      .catch(() => requestChatHistory())

    return () => {
      offChatHistory(handleHistory)
      offChatMessage(handleNew)
      offChatTyping(handleTyping)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const loadMoreMessages = async () => {
    if (!hasMore || loadingMore || !oldestMessageId) return

    setLoadingMore(true)
    
    try {
      const response = await fetch(`/api/chat/messages?take=20&cursor=${oldestMessageId}`)
      if (!response.ok) throw new Error('Failed to load messages')
      
      const data: { items: ChatMessage[]; hasMore: boolean; nextCursor: string | null } = await response.json()
      
      // Сохраняем текущую высоту скролла
      const scrollContainer = listRef.current
      if (!scrollContainer) return
      
      const oldScrollHeight = scrollContainer.scrollHeight
      const oldScrollTop = scrollContainer.scrollTop
      
      // Добавляем старые сообщения в начало
      setMessages(prev => [...data.items, ...prev])
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
      setLoadingMore(false)
    }
  }

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
  }, [hasMore, loadingMore, oldestMessageId])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return

    // Optimistic UI update
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      userId: user?.id || null,
      username: user?.username || 'Guest',
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || null,
          username: user?.username || 'Guest',
          text
        })
      })

      if (response.ok) {
        const savedMessage = await response.json() as ChatMessage
        // Replace optimistic message with real one
        setMessages(prev => prev.map(m => 
          m.id === optimisticMessage.id ? savedMessage : m
        ))
        // Send via socket for other users
        sendChatMessage(text)
      } else {
        throw new Error('Failed to save message')
      }
    } catch (error) {
      console.error('Error saving message:', error)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
      // Still send via socket as fallback
      sendChatMessage(text)
    }
  }

  const onInputChange = (v: string) => {
    setInput(v)
    emitChatTyping(true)
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
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">General Chat</h3>
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
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24" />
                    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-16" />
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
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
            
            return (
              <div key={m.id}>
                {m.type === 'system' ? (
                  <div className="flex justify-center">
                    <div className={`text-xs px-3 py-1 rounded-full ${
                      m.action?.type === 'work_start' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                      m.action?.type === 'break_start' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                      m.action?.type === 'long_break_start' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                      m.action?.type === 'session_complete' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                      'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                    }`}>
                      {m.username} {
                        m.action?.type === 'work_start' 
                          ? `started a focus session${m.action.task ? ` "${m.action.task}"` : ''}${m.action.duration ? ` for ${m.action.duration} min` : ''}`
                          : m.action?.type === 'break_start' 
                          ? 'started a short break' 
                          : m.action?.type === 'long_break_start' 
                          ? 'started a long break' 
                          : m.action?.type === 'session_complete'
                          ? `completed${m.action.task ? ` "${m.action.task}"` : ' a focus session'} 🎉`
                          : formatActionMessage(m.action)
                      }
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-3">
                    {m.avatarUrl ? (
                      <img 
                        src={m.avatarUrl} 
                        alt={m.username}
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
      <form onSubmit={onSubmit} className="p-4 border-t border-gray-200 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          {user?.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={meName}
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
    </div>
  )
}
