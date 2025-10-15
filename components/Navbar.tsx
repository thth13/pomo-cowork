'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import AuthModal from './AuthModal'
import { useConnectionStore } from '@/store/useConnectionStore'

export default function Navbar() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const { user, isAuthenticated } = useAuthStore()
  const { totalOnlineCount } = useConnectionStore()

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-clock text-white text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">PomoCo</h1>
              <p className="text-sm text-gray-500">Pomodoro Coworking</p>
            </div>
          </Link>
          
          <nav className="flex items-center space-x-2">
            <Link 
              href="/" 
              className="px-4 py-2 rounded-lg font-medium transition-all hover:bg-gray-100 text-gray-700"
            >
              <i className="fa-solid fa-clock mr-2"></i>Таймер
            </Link>
            <Link 
              href="/stats" 
              className="px-4 py-2 rounded-lg font-medium transition-all hover:bg-gray-100 text-gray-700"
            >
              <i className="fa-solid fa-chart-line mr-2"></i>Статистика
            </Link>
          </nav>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-400 rounded-full pulse-dot"></div>
              <span>{totalOnlineCount} online</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link href="/settings" className="p-2 text-gray-600 hover:text-gray-900 transition-colors">
                <i className="fa-solid fa-cog"></i>
              </Link>
              {isAuthenticated && user ? (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="btn-primary text-sm px-4 py-2"
                >
                  Войти
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  )
}
