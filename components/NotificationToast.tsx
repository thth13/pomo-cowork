'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'

interface NotificationToastProps {
  message: string
  isVisible: boolean
  onClose: () => void
  type?: 'info' | 'warning' | 'error' | 'success'
  duration?: number
}

export default function NotificationToast({ 
  message, 
  isVisible, 
  onClose, 
  type = 'warning',
  duration = 3000 
}: NotificationToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose])

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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
        >
          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 text-white shadow-lg ${getStyles()}`}>
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-semibold">{message}</span>
            <button
              onClick={onClose}
              className="ml-2 flex-shrink-0 hover:opacity-80 transition-opacity"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
