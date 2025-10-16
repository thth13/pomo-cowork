'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import AuthModal from './AuthModal'
import { useConnectionStore } from '@/store/useConnectionStore'
import ThemeToggle from './ThemeToggle'
import { User } from 'lucide-react'

export default function Navbar() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const { user, isAuthenticated } = useAuthStore()
  const { totalOnlineCount } = useConnectionStore()
  const pathname = usePathname()

  return (
    <>
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-8 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-clock text-white text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pomo Cowork</h1>
              {/* <p className="text-sm text-gray-500 dark:text-slate-400">Pomodoro Coworking</p> */}
            </div>
          </Link>
          
          <nav className="flex items-center space-x-2">
            <Link 
              href="/" 
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pathname === '/' 
                  ? 'bg-red-500 text-white' 
                  : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
              }`}
            >
              <i className="fa-solid fa-clock mr-2"></i>Timer
            </Link>
            <Link 
              href="/users" 
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pathname === '/users' 
                  ? 'bg-red-500 text-white' 
                  : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
              }`}
            >
              <i className="fa-solid fa-users mr-2"></i>Search
            </Link>
            <Link 
              href="/stats" 
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pathname === '/stats' 
                  ? 'bg-red-500 text-white' 
                  : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
              }`}
            >
              <i className="fa-solid fa-chart-line mr-2"></i>Stats
            </Link>
          </nav>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-300">
              <div className="w-2 h-2 bg-green-400 rounded-full pulse-dot"></div>
              <span>{totalOnlineCount} online</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <Link href="/settings" className="p-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                <i className="fa-solid fa-cog"></i>
              </Link>
              {isAuthenticated && user ? (
                <Link href={`/user/${user.id}`} className="w-8 h-8 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center text-gray-700 dark:text-slate-200 font-semibold overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </Link>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="btn-primary text-sm px-4 py-2"
                >
                  Login
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
