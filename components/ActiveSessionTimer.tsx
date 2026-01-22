'use client'

import { useState, useEffect } from 'react'

interface ActiveSession {
  id: string
  task: string
  type: string
  startedAt: string
  duration: number
}

interface ActiveSessionTimerProps {
  activeSession: ActiveSession | undefined
  isUserOnline: boolean
  isUserWorking: boolean
}

const getSessionTypeLabel = (type: string) => {
  switch (type) {
    case 'WORK': return 'Work'
    case 'SHORT_BREAK': return 'Short Break'
    case 'LONG_BREAK': return 'Long Break'
    case 'TIME_TRACKING': return 'Time Tracking'
    default: return type
  }
}

export default function ActiveSessionTimer({ activeSession, isUserOnline, isUserWorking }: ActiveSessionTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!activeSession) {
      setTimeRemaining(null)
      setProgress(0)
      return
    }

    const calculateTimeRemaining = () => {
      const startTime = new Date(activeSession.startedAt).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)
      const totalDuration = activeSession.duration * 60
      const remaining = Math.max(0, totalDuration - elapsed)
      
      const mins = Math.floor(remaining / 60)
      const secs = remaining % 60
      
      const progressPercent = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100))
      setProgress(progressPercent)
      
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    setTimeRemaining(calculateTimeRemaining())
    
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining())
    }, 1000)

    return () => clearInterval(interval)
  }, [activeSession])

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 w-full lg:w-auto lg:min-w-[280px] lg:max-w-[280px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 ${isUserOnline ? 'bg-green-400' : 'bg-gray-400'} rounded-full ${isUserOnline ? 'pulse-dot' : ''}`}></div>
          <span className={`text-sm font-medium ${isUserOnline ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-slate-400'}`}>
            {isUserOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-slate-400">
          {isUserWorking ? 'Currently Working' : 'Not Working'}
        </span>
      </div>
      {isUserWorking && activeSession ? (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-900 dark:text-white">{activeSession.task}</div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-slate-400">{getSessionTypeLabel(activeSession.type)}</span>
            <span className="font-bold text-red-600 dark:text-red-400 text-lg">{timeRemaining}</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
            <div 
              className="bg-red-500 h-1.5 rounded-full transition-all" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      ) : (
        <div className="text-center py-2 text-gray-500 dark:text-slate-400 text-sm">
          Not currently working
        </div>
      )}
    </div>
  )
}
