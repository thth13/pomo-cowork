'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/useAuthStore'
import Navbar from '@/components/Navbar'
import PomodoroTimer from '@/components/PomodoroTimer'
import ActiveSessions from '@/components/ActiveSessions'
import AuthModal from '@/components/AuthModal'
import { registerServiceWorker } from '@/lib/serviceWorker'
import dynamic from 'next/dynamic'
const Chat = dynamic(() => import('@/components/Chat'), { ssr: false, loading: () => null })
import TaskList, { TaskListRef } from '@/components/TaskList'
import WorkHistory from '@/components/WorkHistory'

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuthStore()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  const taskListRef = useRef<TaskListRef>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    // Регистрация Service Worker для фонового таймера
    registerServiceWorker()
  }, [])

  const handleSessionComplete = async () => {
    // Обновляем список задач после завершения сессии
    if (taskListRef.current) {
      await taskListRef.current.refreshTasks()
    }
  }

  // Show loading while checking auth
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32">
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-400 via-orange-400 to-red-500 blur-xl opacity-70"
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-[6%] rounded-full border border-white/50 dark:border-white/10 backdrop-blur"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute inset-[16%] rounded-full bg-white/80 dark:bg-slate-900/80 shadow-xl shadow-rose-400/30 dark:shadow-slate-900/60"
              animate={{ scale: [1, 0.94, 1], opacity: [1, 0.85, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute inset-[32%] rounded-full bg-gradient-to-br from-rose-400 via-orange-400 to-red-500"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 12, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-200 tracking-wide">
            <span>Loading</span>
            <div className="flex gap-1">
              {[0, 1, 2].map((idx) => (
                <motion.span
                  key={idx}
                  className="h-2 w-2 rounded-full bg-rose-400"
                  animate={{ opacity: [0.4, 1, 0.4], y: [0, -4, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.15 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          {/* Левая колонка - Таймер и Активные сессии */}
          <div className="col-span-12 lg:col-span-8">
            {/* Timer Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8 sm:mb-12 lg:mb-16"
            >
              <PomodoroTimer onSessionComplete={handleSessionComplete} />
            </motion.section>

            {/* Active Sessions Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <ActiveSessions />
            </motion.section>
          </div>

          {/* Правая колонка - Список задач, Чат и История */}
          <div className="col-span-12 lg:col-span-4 space-y-4 sm:space-y-6 lg:space-y-8">
            <TaskList ref={taskListRef} />
            <Chat />
            <WorkHistory />
          </div>
        </div>
      </main>
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  )
}
