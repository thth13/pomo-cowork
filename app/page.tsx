'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/useAuthStore'
import Navbar from '@/components/Navbar'
import PomodoroTimer from '@/components/PomodoroTimer'
import ActiveSessions from '@/components/ActiveSessions'
import AuthModal from '@/components/AuthModal'
import { registerServiceWorker } from '@/lib/serviceWorker'
import dynamic from 'next/dynamic'
const Chat = dynamic(() => import('@/components/Chat'), { ssr: false, loading: () => null })
import TaskList from '@/components/TaskList'
import WorkHistory from '@/components/WorkHistory'

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuthStore()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [mounted, setMounted] = useState(false)

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

  // Show loading while checking auth
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <span className="text-lg text-slate-600 dark:text-slate-400">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-12 gap-8">
          {/* Левая колонка - Таймер и Активные сессии */}
          <div className="col-span-12 lg:col-span-8">
            {/* Timer Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-16"
            >
              <PomodoroTimer />
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
          <div className="col-span-12 lg:col-span-4 space-y-8">
            <TaskList />
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
