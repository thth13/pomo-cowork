'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/useAuthStore'
import Navbar from '@/components/Navbar'
import PomodoroTimer from '@/components/PomodoroTimer'
import ActiveSessions from '@/components/ActiveSessions'
import AuthModal from '@/components/AuthModal'
import { registerServiceWorker } from '@/lib/serviceWorker'
import { getRoomGradientClass } from '@/lib/roomGradient'
import { useRoomStore } from '@/store/useRoomStore'
import dynamic from 'next/dynamic'
const Chat = dynamic(() => import('@/components/Chat'), { ssr: false, loading: () => null })
import TaskList, { TaskListRef } from '@/components/TaskList'
import WorkHistory from '@/components/WorkHistory'

export default function HomePage() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const currentRoomId = useRoomStore((s) => s.currentRoomId)
  const currentRoomBackgroundGradientKey = useRoomStore((s) => s.currentRoomBackgroundGradientKey)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  const taskListRef = useRef<TaskListRef>(null)

  const roomGradientClass = getRoomGradientClass(currentRoomId, currentRoomBackgroundGradientKey)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Обработка OAuth callback токена
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const authToken = params.get('auth_token')
      const authError = params.get('auth_error')

      if (authToken) {
        localStorage.setItem('token', authToken)
        
        // Очищаем URL от параметров
        window.history.replaceState({}, '', '/')
        
        // Перепроверяем авторизацию
        checkAuth()
      } else if (authError) {
        console.error('Auth error:', authError)
        // Очищаем URL от параметров
        window.history.replaceState({}, '', '/')
      }
    }
  }, [checkAuth])

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full border-2 border-slate-200 dark:border-slate-800 border-t-rose-500 animate-spin" />
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
            Loading
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen ${
        roomGradientClass ?? 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800'
      }`}
    >
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
