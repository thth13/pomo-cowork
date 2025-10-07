'use client'

import { useState } from 'react'
import { useConnectionStore } from '@/store/useConnectionStore'

export default function ConnectionDebug() {
  const [isVisible, setIsVisible] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const { forceResetPresence, totalOnlineCount, onlineUserCount, anonymousOnlineCount } = useConnectionStore()

  const handleReset = async () => {
    setIsResetting(true)
    try {
      await forceResetPresence()
      alert('Presence data reset successfully')
    } catch (error) {
      alert('Failed to reset presence data')
    } finally {
      setIsResetting(false)
    }
  }

  if (!isVisible) {
    return (
      <div 
        className="fixed bottom-4 right-4 w-4 h-4 bg-transparent cursor-pointer"
        onClick={(e) => {
          if (e.detail === 5) { // 5 быстрых кликов
            setIsVisible(true)
          }
        }}
      />
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-slate-800 text-white p-4 rounded-lg shadow-lg text-sm max-w-xs">
      <div className="mb-2">
        <strong>Connection Debug</strong>
        <button 
          onClick={() => setIsVisible(false)}
          className="float-right text-slate-400 hover:text-white"
        >
          ×
        </button>
      </div>
      <div className="space-y-1 text-xs">
        <div>Total: {totalOnlineCount}</div>
        <div>Users: {onlineUserCount}</div>
        <div>Anonymous: {anonymousOnlineCount}</div>
      </div>
      <button
        onClick={handleReset}
        disabled={isResetting}
        className="mt-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 px-2 py-1 rounded text-xs w-full"
      >
        {isResetting ? 'Resetting...' : 'Reset Presence'}
      </button>
    </div>
  )
}