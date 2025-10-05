'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/useAuthStore'
import { useSocket } from '@/hooks/useSocket'
import Navbar from '@/components/Navbar'
import PomodoroTimer from '@/components/PomodoroTimer'
import ActiveSessions from '@/components/ActiveSessions'
import AuthModal from '@/components/AuthModal'
import { registerServiceWorker } from '@/lib/serviceWorker'
import dynamic from 'next/dynamic'
const Chat = dynamic(() => import('@/components/Chat'), { ssr: false, loading: () => null })

export default function HomePage() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Initialize socket connection for all users
  useSocket()

  useEffect(() => {
    setMounted(true)
    checkAuth()
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

  // Show loading while checking auth
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <span className="text-lg text-slate-600">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-slate-800 mb-4">
            Pomodoro Timer
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Boost your productivity with the Pomodoro Technique.
            See what other users are working on in real-time.
          </p>
        </motion.div> */}

        {/* Main Content */}
        <div className="space-y-12">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <PomodoroTimer />
          </motion.section>

          {/* Active Sessions Section - показываем всем */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ActiveSessions />
          </motion.section>

          {/* Guest Call to Action */}
          {!isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center space-y-8"
            >
              {/* Call to Action */}
              <div className="card max-w-md mx-auto">
                <div className="text-center space-y-4">
                  <h2 className="text-2xl font-bold text-slate-800">
                    Save Your Progress
                  </h2>
                  <p className="text-slate-600">
                    Create an account to save your session history, view detailed statistics
                    and track your progress over time.
                  </p>
                  <motion.button
                    onClick={() => setShowAuthModal(true)}
                    className="btn-primary px-8 py-3 text-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Create Account
                  </motion.button>
                </div>
              </div>

              {/* Features */}
              <div className="grid md:grid-cols-3 gap-6 mt-12">
                {[
                  {
                    title: 'Pomodoro Technique',
                    description: 'Work for 25 minutes, rest for 5. A proven method for boosting productivity.',
                    icon: '⏰'
                  },
                  {
                    title: 'Real-time Activity',
                    description: 'See what other users are working on right now.',
                    icon: '👥'
                  },
                  {
                    title: 'Statistics',
                    description: 'Track your progress with detailed charts and metrics.',
                    icon: '📊'
                  }
                ].map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="card text-center"
                  >
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600">
                      {feature.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
        <div className="mt-12">
          <Chat matchHeightSelector="[data-timer-panel]" />
        </div>
      </main>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  )
}
