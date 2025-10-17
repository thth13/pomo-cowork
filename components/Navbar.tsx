'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import AuthModal from './AuthModal'
import { useConnectionStore } from '@/store/useConnectionStore'
import ThemeToggle from './ThemeToggle'
import { User } from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowRightFromBracket,
  faArrowUpRightFromSquare,
  faChartLine,
  faClock,
  faCog,
  faUsers
} from '@fortawesome/free-solid-svg-icons'

export default function Navbar() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { totalOnlineCount } = useConnectionStore()
  const pathname = usePathname()
  
  // Initialize socket connection globally
  useSocket()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const handleLogout = () => {
    logout()
    setIsMenuOpen(false)
    router.push('/')
  }

  return (
    <>
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-8 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
              <FontAwesomeIcon icon={faClock} className="text-white text-lg" />
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
              <FontAwesomeIcon icon={faClock} className="mr-2" />Timer
            </Link>
            <Link 
              href="/users" 
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pathname === '/users' 
                  ? 'bg-red-500 text-white' 
                  : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
              }`}
            >
              <FontAwesomeIcon icon={faUsers} className="mr-2" />Search
            </Link>
            <Link
              href="/stats"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pathname === '/stats'
                  ? 'bg-red-500 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
              }`}
            >
              <FontAwesomeIcon icon={faChartLine} className="mr-2 text-xs" />Stats
            </Link>
          </nav>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-300">
              <div className="w-2 h-2 bg-green-400 rounded-full pulse-dot"></div>
              <span>{totalOnlineCount} online</span>
            </div>
            
            <div className="flex items-center space-x-3">
              {isAuthenticated && user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(prev => !prev)}
                    className="w-9 h-9 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center text-gray-700 dark:text-slate-200 font-semibold overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all"
                    aria-haspopup="true"
                    aria-expanded={isMenuOpen}
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-gray-200 bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 z-50">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.username}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user.email}</p>
                      </div>
                      <div className="py-2">
                        <Link
                          href={`/user/${user.id}`}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <span>Profile</span>
                          <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" />
                        </Link>
                        {/* Stats link перенесён во внешний nav-bar */}
                        <Link
                          href="/settings"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <FontAwesomeIcon icon={faCog} className="text-xs" />
                          <span>Settings</span>
                        </Link>
                        <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">Theme</span>
                            <ThemeToggle />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <FontAwesomeIcon icon={faArrowRightFromBracket} className="text-xs" />
                          <span>Log out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
