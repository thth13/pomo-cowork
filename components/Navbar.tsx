'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import AuthModal from './AuthModal'
import { useConnectionStore } from '@/store/useConnectionStore'
import ThemeToggle from './ThemeToggle'
import { User, Menu, X } from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Image from 'next/image'
import { useRoomStore } from '@/store/useRoomStore'
import { NotificationItem } from '@/types'
import {
  faArrowRightFromBracket,
  faArrowUpRightFromSquare,
  faChartLine,
  faClock,
  faCog,
  faUsers,
  faEnvelope
} from '@fortawesome/free-solid-svg-icons'

const NotificationsSkeleton = () => (
  <div className="px-4 py-3 space-y-3 animate-pulse">
    <div className="rounded-xl border border-gray-100 dark:border-slate-700 px-3 py-2">
      <div className="h-4 w-40 bg-gray-200 dark:bg-slate-700 rounded" />
      <div className="mt-2 h-3 w-56 bg-gray-200 dark:bg-slate-700 rounded" />
      <div className="mt-2 flex gap-2">
        <div className="h-7 w-16 bg-gray-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-7 w-16 bg-gray-200 dark:bg-slate-700 rounded-lg" />
      </div>
    </div>
  </div>
)

export default function Navbar() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [inviteAction, setInviteAction] = useState<{ id: string; kind: 'accept' | 'decline' } | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)
  const notificationsRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const { user, isAuthenticated, logout, token } = useAuthStore()
  const { setCurrentRoom } = useRoomStore()
  const { totalOnlineCount, isConnected, isChecking } = useConnectionStore()
  const pathname = usePathname()
  const connectionStatusClass = isChecking
    ? 'bg-yellow-400'
    : isConnected
      ? 'bg-green-400'
      : 'bg-red-500'
  
  // Initialize socket connection globally
  useSocket()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    if (isMenuOpen || isMobileMenuOpen || isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen, isMobileMenuOpen, isNotificationsOpen])

  const authHeaders = useMemo(() => {
    const t = token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
    return t ? { Authorization: `Bearer ${t}` } : null
  }, [token])

  const fetchNotifications = async () => {
    if (!authHeaders) return
    setNotificationsLoading(true)
    try {
      const res = await fetch('/api/notifications', { headers: authHeaders })
      if (!res.ok) return
      const data = (await res.json()) as { unreadCount: number; notifications: NotificationItem[] }
      const all = Array.isArray(data.notifications) ? data.notifications : []
      const visible = all.filter((n) => n.readAt === null)
      setUnreadCount(visible.length)
      setNotifications(visible)
    } finally {
      setNotificationsLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !authHeaders) {
      setUnreadCount(0)
      setNotifications([])
      return
    }

    fetchNotifications()
    const id = window.setInterval(() => {
      fetchNotifications()
    }, 30000)

    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authHeaders])

  const markRead = async (id: string) => {
    if (!authHeaders) return
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ read: true }),
    }).catch(() => null)
  }

  const acceptInvite = async (notification: NotificationItem) => {
    if (!authHeaders) return
    const inviteId = notification.roomInviteId
    const roomId = notification.roomInvite?.roomId
    const roomName = notification.roomInvite?.room?.name
    if (!inviteId || !roomId || !roomName) return

    setInviteAction({ id: notification.id, kind: 'accept' })
    try {
      const res = await fetch(`/api/room-invites/${inviteId}/accept`, {
        method: 'POST',
        headers: authHeaders,
      })
      if (!res.ok) return

      await markRead(notification.id)
      await fetchNotifications()
      setCurrentRoom({ id: roomId, name: roomName })
      setIsNotificationsOpen(false)
      router.push(`/rooms/${roomId}`)
    } finally {
      setInviteAction(null)
    }
  }

  const declineInvite = async (notification: NotificationItem) => {
    if (!authHeaders) return
    const inviteId = notification.roomInviteId
    if (!inviteId) return

    setInviteAction({ id: notification.id, kind: 'decline' })
    try {
      const res = await fetch(`/api/room-invites/${inviteId}/decline`, {
        method: 'POST',
        headers: authHeaders,
      })
      if (!res.ok) return

      await markRead(notification.id)
      await fetchNotifications()
    } finally {
      setInviteAction(null)
    }
  }

  const handleLogout = () => {
    logout()
    setIsMenuOpen(false)
    setIsMobileMenuOpen(false)
    router.push('/')
  }

  const handleMobileLinkClick = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 md:px-8 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/" className="flex items-center space-x-2 md:space-x-3">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
              <FontAwesomeIcon icon={faClock} className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Pomo Cowork</h1>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-2">
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
              href="/rooms" 
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pathname.startsWith('/rooms') 
                  ? 'bg-red-500 text-white' 
                  : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
              }`}
            >
              <FontAwesomeIcon icon={faUsers} className="mr-2" />
              <span className="relative inline-flex items-center">
                <span>Rooms</span>
                <span className="pointer-events-none absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 rounded-full border border-amber-200 bg-amber-50 px-1 py-[1px] text-[8px] font-semibold uppercase leading-none tracking-wide text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300">
                  beta
                </span>
              </span>
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
          
          {/* Desktop Right Side */}
            <div className="hidden lg:flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-300">
              <div className={`w-2 h-2 rounded-full pulse-dot ${connectionStatusClass}`}></div>
              <span>{totalOnlineCount} online</span>
            </div>
            
            <div className="flex items-center space-x-3">
              {isAuthenticated && user ? (
                <>
                  <div className="relative" ref={notificationsRef}>
                    <button
                      type="button"
                      onClick={async () => {
                        const next = !isNotificationsOpen
                        setIsNotificationsOpen(next)
                        if (next) await fetchNotifications()
                      }}
                      className="relative p-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                      aria-label="Notifications"
                      aria-haspopup="true"
                      aria-expanded={isNotificationsOpen}
                    >
                      <FontAwesomeIcon icon={faEnvelope} className="text-base" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-0 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] leading-[16px] text-center">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {isNotificationsOpen && (
                      <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-gray-200 bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 z-50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
                        </div>

                        {notificationsLoading && notifications.length === 0 ? (
                          <NotificationsSkeleton />
                        ) : notifications.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">No notifications</div>
                        ) : (
                          <div className="max-h-96 overflow-auto">
                            {notifications.map((n) => {
                              const isInvite =
                                n.readAt === null &&
                                n.type === 'ROOM_INVITE' &&
                                n.roomInvite &&
                                n.roomInvite.status === 'PENDING'
                              const isUnread = n.readAt === null
                              const isAccepting = inviteAction?.id === n.id && inviteAction.kind === 'accept'
                              const isDeclining = inviteAction?.id === n.id && inviteAction.kind === 'decline'
                              const isInviteBusy = isAccepting || isDeclining
                              return (
                                <div
                                  key={n.id}
                                  className={`px-4 py-3 border-b border-gray-100 dark:border-slate-700 last:border-b-0 ${
                                    isUnread ? 'bg-gray-50 dark:bg-slate-800/60' : 'bg-transparent'
                                  }`}
                                >
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</div>
                                  <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{n.message}</div>

                                  {isInvite && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => acceptInvite(n)}
                                        disabled={isInviteBusy}
                                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center gap-2"
                                      >
                                        {isAccepting && (
                                          <span className="h-3.5 w-3.5 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                                        )}
                                        Accept
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => declineInvite(n)}
                                        disabled={isInviteBusy}
                                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-60 flex items-center gap-2"
                                      >
                                        {isDeclining && (
                                          <span className="h-3.5 w-3.5 rounded-full border-2 border-gray-400/50 dark:border-slate-400/50 border-t-gray-600 dark:border-t-slate-200 animate-spin" />
                                        )}
                                        Decline
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen(prev => !prev)}
                      className="w-9 h-9 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center text-gray-700 dark:text-slate-200 font-semibold overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all"
                      aria-haspopup="true"
                      aria-expanded={isMenuOpen}
                    >
                      {user.avatarUrl ? (
                        <Image src={user.avatarUrl} alt={user.username} width={48} height={48} className="w-full h-full object-cover" />
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
                </>
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

          {/* Mobile Right Side */}
          <div className="flex lg:hidden items-center space-x-3">
            <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-slate-300">
              <div className={`w-2 h-2 rounded-full pulse-dot ${connectionStatusClass}`}></div>
              <span className="hidden sm:inline">{totalOnlineCount}</span>
            </div>

            {isAuthenticated && user ? (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(prev => !prev)}
                className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-all"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="btn-primary text-sm px-3 py-2"
              >
                Login
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && isAuthenticated && user && (
          <div 
            ref={mobileMenuRef}
            className="lg:hidden mt-4 pt-4 border-t border-gray-200 dark:border-slate-700"
          >
            {/* User Info */}
            <div className="px-4 py-3 mb-2 bg-gray-50 dark:bg-slate-700 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center text-gray-700 dark:text-slate-200 font-semibold overflow-hidden">
                  {user.avatarUrl ? (
                    <Image src={user.avatarUrl} alt={user.username} width={40} height={40} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.username}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1 mb-3">
              <Link 
                href="/" 
                onClick={handleMobileLinkClick}
                className={`flex items-center px-4 py-3 rounded-lg font-medium transition-all ${
                  pathname === '/' 
                    ? 'bg-red-500 text-white' 
                    : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
                }`}
              >
                <FontAwesomeIcon icon={faClock} className="mr-3 w-4" />
                Timer
              </Link>
              <Link 
                href="/rooms" 
                onClick={handleMobileLinkClick}
                className={`flex items-center px-4 py-3 rounded-lg font-medium transition-all ${
                  pathname.startsWith('/rooms') 
                    ? 'bg-red-500 text-white' 
                    : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
                }`}
              >
                <FontAwesomeIcon icon={faUsers} className="mr-3 w-4" />
                <span className="relative inline-flex items-center">
                  <span>Rooms</span>
                  <span className="pointer-events-none absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 rounded-full border border-amber-200 bg-amber-50 px-1 py-[1px] text-[8px] font-semibold uppercase leading-none tracking-wide text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300">
                    beta
                  </span>
                </span>
              </Link>
              <Link 
                href="/users" 
                onClick={handleMobileLinkClick}
                className={`flex items-center px-4 py-3 rounded-lg font-medium transition-all ${
                  pathname === '/users' 
                    ? 'bg-red-500 text-white' 
                    : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
                }`}
              >
                <FontAwesomeIcon icon={faUsers} className="mr-3 w-4" />
                Search
              </Link>
              <Link
                href="/stats"
                onClick={handleMobileLinkClick}
                className={`flex items-center px-4 py-3 rounded-lg font-medium transition-all ${
                  pathname === '/stats'
                    ? 'bg-red-500 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
                }`}
              >
                <FontAwesomeIcon icon={faChartLine} className="mr-3 w-4 text-xs" />
                Stats
              </Link>
            </nav>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-slate-700 my-3"></div>

            {/* User Menu Items */}
            <div className="space-y-1">
              <Link
                href={`/user/${user.id}`}
                onClick={handleMobileLinkClick}
                className="flex items-center justify-between px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <span>Profile</span>
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" />
              </Link>
              <Link
                href="/settings"
                onClick={handleMobileLinkClick}
                className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <FontAwesomeIcon icon={faCog} className="mr-3 text-xs w-4" />
                <span>Settings</span>
              </Link>
              
              {/* Theme Toggle */}
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-slate-300">Theme</span>
                <ThemeToggle />
              </div>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <FontAwesomeIcon icon={faArrowRightFromBracket} className="mr-3 text-xs w-4" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  )
}
