'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { useConnectionStore } from '@/store/useConnectionStore'

export default function OfflineToast() {
  const { isConnected } = useConnectionStore()
  const [visible, setVisible] = useState(false)
  const hasEverConnectedRef = useRef(false)

  useEffect(() => {
    if (isConnected) {
      hasEverConnectedRef.current = true
      setVisible(false)
      return
    }

    // Show toast only after we were online at least once
    if (hasEverConnectedRef.current) {
      setVisible(true)
    }
  }, [isConnected])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
        >
          <div className="flex items-center gap-3 rounded-xl bg-red-600 px-4 py-3 text-white shadow-lg shadow-red-900/30">
            <WifiOff className="h-5 w-5" />
            <span className="text-sm font-semibold">You are offline. Trying to reconnect...</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
