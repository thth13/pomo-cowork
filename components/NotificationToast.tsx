'use client'

import { useEffect, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'

interface NotificationToastProps {
  message: string
  isVisible: boolean
  onClose: () => void
  type?: 'info' | 'warning' | 'error' | 'success'
  duration?: number
  variant?: 'default' | 'rank-up'
  notificationKey?: string
  title?: string
  description?: string
  icon?: ReactNode
  accent?: string
}

export default function NotificationToast({ 
  message, 
  isVisible, 
  onClose, 
  type = 'warning',
  duration = 3000,
  variant = 'default',
  notificationKey,
  title,
  description,
  icon,
  accent,
}: NotificationToastProps) {
  const { t } = useI18n()
  const reducedMotion = useReducedMotion()
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(false)
  const paused = hovered || focused || hidden

  useEffect(() => {
    if (!isVisible) {
      setHovered(false)
      setFocused(false)
    }
  }, [isVisible])

  useEffect(() => {
    const update = () => setHidden(document.hidden)
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  useEffect(() => {
    if (isVisible && duration > 0 && !paused) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose, paused, notificationKey])

  const pauseHandlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocus: () => setFocused(true),
    onBlur: (event: FocusEvent<HTMLDivElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
    },
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    },
  }

  if (variant === 'rank-up') {
    return (
      <div className="notification-corner" data-i18n-ignore>
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {isVisible ? `${title} ${message}. ${description}` : ''}
        </div>
        <AnimatePresence mode="wait">
          {isVisible && (
            <motion.div
              key={notificationKey}
              className="rank-toast"
              style={{ '--rank-accent': accent } as CSSProperties}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.98 }}
              transition={reducedMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 340, damping: 24 }}
              {...pauseHandlers}
            >
              <div className="rank-toast-emblem" aria-hidden="true">{icon}</div>
              <div className="rank-toast-copy">
                <p className="rank-toast-eyebrow">{title}</p>
                <p className="rank-toast-name">{message}</p>
                <p className="rank-toast-description">{description}</p>
              </div>
              <button type="button" className="rank-toast-close" onClick={onClose} aria-label={t.common.close}>
                <X size={16} aria-hidden="true" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const getStyles = () => {
    switch (type) {
      case 'error':
        return 'bg-red-600 shadow-red-900/30'
      case 'success':
        return 'bg-green-600 shadow-green-900/30'
      case 'info':
        return 'bg-blue-600 shadow-blue-900/30'
      case 'warning':
      default:
        return 'bg-amber-600 shadow-amber-900/30'
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
          {...pauseHandlers}
        >
          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 text-white shadow-lg ${getStyles()}`}>
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span role="status" className="text-sm font-semibold">{message}</span>
            <button
              onClick={onClose}
              className="ml-2 flex-shrink-0 hover:opacity-80 transition-opacity"
              type="button"
              aria-label={t.common.close}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
