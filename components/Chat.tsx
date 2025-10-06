"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { SendHorizonal, Loader2 } from 'lucide-react'
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
  const [typing, setTyping] = useState<TypingState | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [matchedHeight, setMatchedHeight] = useState<number | undefined>(undefined)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const saveSystemMessage = async (systemMessage: ChatMessage) => {
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: systemMessage.userId,
          username: systemMessage.username,
          type: 'system',
          action: systemMessage.action
        })
      })
    } catch (error) {
      console.error('Error saving system message:', error)
    }
  }

  const getActionColor = (actionType?: string) => {
    switch (actionType) {
      case 'work_start':
        return 'bg-red-500 hover:bg-red-600 border-red-600'
      case 'break_start':
        return 'bg-green-500 hover:bg-green-600 border-green-600'
      case 'long_break_start':
        return 'bg-blue-500 hover:bg-blue-600 border-blue-600'
      case 'timer_stop':
        return 'bg-gray-500 hover:bg-gray-600 border-gray-600'
      default:
        return 'bg-gray-500 hover:bg-gray-600 border-gray-600'
    }
  }

  const formatActionMessage = (username: string, action?: { type: string; duration?: number }) => {
    if (!action) return `${username} performed an action`

    switch (action.type) {
      case 'work_start':
        return `🍅 ${username} started working for ${action.duration} minutes`
      case 'break_start':
        return `☕ ${username} started a break`
      case 'long_break_start':
        return `🌟 ${username} started a long break`
      case 'timer_stop':
        return `⏹️ ${username} stopped the timer`
      default:
        return `${username} performed an action`
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
      
      // Save system messages to DB
      if (msg.type === 'system') {
        saveSystemMessage(msg)
      }
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
      // Try fetch via API first
      fetch('/api/chat/messages?take=50')
        .then((r) => r.ok ? r.json() : null)
        .then((data: { items: ChatMessage[] } | null) => {
          if (data?.items) {
            setMessages(data.items)
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

  return (
    <div ref={containerRef} className="card p-0 overflow-hidden flex flex-col min-h-0" style={matchedHeight ? { height: matchedHeight } : undefined}>
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
        <div className="font-semibold text-slate-700 dark:text-slate-300">Live Chat</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">You are: {meName}</div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-6">No messages yet. Be the first!</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="text-sm">
              {m.type === 'system' ? (
                <div className="flex justify-center my-3">
                  <div className={`px-4 py-2 rounded-full text-xs font-medium text-white shadow-sm transition-all duration-200 border ${getActionColor(m.action?.type)}`}>
                    {formatActionMessage(m.username, m.action)}
                  </div>
                </div>
              ) : (
                <>
                  <span className="font-medium text-slate-700 dark:text-slate-300 mr-2">{m.username}:</span>
                  <span className="text-slate-700 dark:text-slate-300 break-words">{m.text}</span>
                  <span className="ml-2 text-[10px] text-slate-400 dark:text-slate-500 align-middle">{new Date(m.timestamp).toLocaleTimeString()}</span>
                </>
              )}
            </div>
          ))
        )}

        {typing && (
          <div className="text-xs text-slate-500 dark:text-slate-400">{typing.username} is typing...</div>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-slate-200 dark:border-slate-700 px-3 py-2">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Type a message"
            className="flex-1 input"
            aria-label="Message"
          />
          <button type="submit" className="btn-primary flex items-center gap-1">
            <SendHorizonal className="w-4 h-4" />
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
