'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff } from 'lucide-react'

export default function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false)
  const [showStatus, setShowStatus] = useState(true)

  useEffect(() => {
    // Check connection to external WebSocket server
    const checkConnection = async () => {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000'
      const healthUrl = `${socketUrl.replace(/\/$/, '')}/health`

      try {
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        })

        if (!response.ok) {
          throw new Error('Socket health unreachable')
        }

        setIsConnected(true)
      } catch (error) {
        setIsConnected(false)
      }
    }

    checkConnection()
    const interval = setInterval(checkConnection, 5000)

    // Hide status after 10 seconds if everything is fine
    const hideTimer = setTimeout(() => {
      if (isConnected) {
        setShowStatus(false)
      }
    }, 10000)

    return () => {
      clearInterval(interval)
      clearTimeout(hideTimer)
    }
  }, [isConnected])

  if (!showStatus && isConnected) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg ${
          isConnected 
            ? 'bg-secondary-50 border border-secondary-200 text-secondary-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}
      >
        {isConnected ? (
          <>
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">No server connection</span>
          </>
        )}
        
      </motion.div>
    </AnimatePresence>
  )
}
