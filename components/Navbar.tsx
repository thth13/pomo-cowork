'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useId, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import AuthModal from './AuthModal'
import { useConnectionStore } from '@/store/useConnectionStore'
import ThemeToggle from './ThemeToggle'
import { Crown, User, Menu, X, ListChecks, Timer, Users, Trophy, LineChart, BarChart3, BookOpen, Settings, LogOut, ChevronRight } from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Image from 'next/image'
import { useRoomStore } from '@/store/useRoomStore'
import { NotificationItem } from '@/types'
import NotificationsMenu from './NotificationsMenu'
import PixelSprout from '@/components/PixelSprout'
import { habitsCopy } from '@/lib/i18n/habits'
import { gardenCopy } from '@/lib/i18n/garden'
import { statisticsCopy } from '@/lib/i18n/statistics'
import { useI18n } from '@/components/I18nProvider'
import RankAvatarFrame from '@/components/RankAvatarFrame'
import { getRankProgress } from '@/lib/ranks'
import {
  faArrowRightFromBracket,
  faArrowUpRightFromSquare,
  faChartLine,
  faBookOpen,
  faClock,
  faCog,
  faUsers
} from '@fortawesome/free-solid-svg-icons'

const NOTIFICATIONS_REFRESH_MS = 2 * 60 * 1000

export default function Navbar({ compact = false, workspaceActions }: { compact?: boolean; workspaceActions?: (closeMenu: () => void) => ReactNode }) {
  const compactMenuId = useId()
  const accountPreviewId = useId()
  const [isAccountPreviewOpen, setIsAccountPreviewOpen] = useState(false)
  const compactTriggerRef = useRef<HTMLButtonElement>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [inviteAction, setInviteAction] = useState<{ id: string; kind: 'accept' | 'decline' } | null>(null)
  const autoReadRef = useRef<Set<string>>(new Set())
  const openedReadRef = useRef<Set<string>>(new Set())
  const menuRef = useRef<HTMLDivElement | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)
  const notificationsRef = useRef<HTMLDivElement | null>(null)
  const mobileNotificationsRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const { user, isAuthenticated, logout, token } = useAuthStore()
  const { setCurrentRoom, currentRoomId } = useRoomStore()
  const { totalOnlineCount, isConnected, isChecking } = useConnectionStore()
  const { t, language } = useI18n()
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
      const isInsideNotifications =
        notificationsRef.current?.contains(event.target as Node) ||
        mobileNotificationsRef.current?.contains(event.target as Node)
      if (!isInsideNotifications) {
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

  useEffect(() => {
    if (!isAccountPreviewOpen) return
    const dismissPreview = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAccountPreviewOpen(false)
    }
    window.addEventListener('keydown', dismissPreview)
    return () => window.removeEventListener('keydown', dismissPreview)
  }, [isAccountPreviewOpen])

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

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchNotifications()
      }
    }

    void fetchNotifications()
    const id = window.setInterval(refreshWhenVisible, NOTIFICATIONS_REFRESH_MS)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authHeaders])

  useEffect(() => {
    const handleRankUp = () => {
      void fetchNotifications()
    }

    window.addEventListener('rank-up', handleRankUp)
    window.addEventListener('notifications-updated', handleRankUp)
    return () => { window.removeEventListener('rank-up', handleRankUp); window.removeEventListener('notifications-updated', handleRankUp) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHeaders])

  const markRead = useCallback(async (id: string) => {
    if (!authHeaders) return
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ read: true }),
    }).catch(() => null)
  }, [authHeaders])

  // todo: remove
  useEffect(() => {
    if (!authHeaders || notifications.length === 0) return
    const resolvedInvites = notifications.filter(
      (n) =>
        n.readAt === null &&
        n.type === 'ROOM_INVITE' &&
        n.roomInvite &&
        n.roomInvite.status !== 'PENDING'
    )
    const toMark = resolvedInvites.filter((n) => !autoReadRef.current.has(n.id))
    if (toMark.length === 0) return
    toMark.forEach((n) => autoReadRef.current.add(n.id))

    const idsToRemove = new Set(toMark.map((n) => n.id))
    void (async () => {
      await Promise.all(toMark.map((n) => markRead(n.id)))
      setNotifications((prev) => prev.filter((n) => !idsToRemove.has(n.id)))
      setUnreadCount((prev) => Math.max(0, prev - toMark.length))
    })()
  }, [notifications, authHeaders, markRead])
  // todo

  useEffect(() => {
    if (!isNotificationsOpen) return
    if (!authHeaders || notifications.length === 0) return
    markVisibleAsRead(notifications)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNotificationsOpen, notifications, authHeaders])

  const markVisibleAsRead = (items: NotificationItem[]) => {
    if (!authHeaders) return
    const toMark = items.filter(
      (n) =>
        n.readAt === null &&
        !openedReadRef.current.has(n.id) &&
        !(n.type === 'ROOM_INVITE' && n.roomInvite?.status === 'PENDING')
    )
    if (toMark.length === 0) return

    toMark.forEach((n) => openedReadRef.current.add(n.id))
    const readAt = new Date().toISOString()
    const idsToMark = new Set(toMark.map((n) => n.id))
    setNotifications((prev) =>
      prev.map((n) => (idsToMark.has(n.id) ? { ...n, readAt } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - toMark.length))
    void Promise.all(toMark.map((n) => markRead(n.id)))
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

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!authHeaders) return
    if (notification.type === 'MONTHLY_WRAPPED' && notification.wrappedMonth) {
      setIsNotificationsOpen(false)
      window.dispatchEvent(new CustomEvent('open-monthly-wrapped', { detail: notification.wrappedMonth }))
      return
    }
    if (notification.type !== 'WALL_MESSAGE') return

    await markRead(notification.id)
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    setIsNotificationsOpen(false)

    const targetProfileId = notification.wallMessage?.profileUserId
    if (targetProfileId) {
      router.push(`/user/${targetProfileId}`)
    }
  }

  const handleMobileLinkClick = () => {
    setIsMobileMenuOpen(false)
  }

  const openAvatarNotifications = () => {
    setIsAccountPreviewOpen(false)
    setIsMenuOpen(false)
    setIsMobileMenuOpen(false)
    setIsNotificationsOpen(true)
    void fetchNotifications().catch(() => undefined)
  }

  const unreadLabel = unreadCount > 0
    ? (language === 'es' ? `Notificaciones sin leer: ${unreadCount}` : `Unread notifications: ${unreadCount}`)
    : ''
  const avatarUnreadBadge = isAuthenticated && user && unreadCount > 0 ? (
    <span className="avatar-unread-badge" role="img" aria-label={unreadLabel}>
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  ) : null
  const rankProgress = getRankProgress(user?.experience)
  const accountDetails = user ? (
    <div className="workspace-account-details">
      <div className="workspace-account-name">
        <strong>{user.username}</strong>
        {user.isPro && (!user.proExpiresAt || new Date(user.proExpiresAt) > new Date()) && (
          <span className="workspace-account-pro"><Crown size={12} aria-hidden="true" />Pro</span>
        )}
      </div>
      <p className="workspace-account-email">{user.email}</p>
      <div className="workspace-account-rank">
        <strong>{t.todayContribution.ranks[rankProgress.rank.id]}</strong>
        <span>{new Intl.NumberFormat(language).format(user.experience ?? 0)} XP</span>
      </div>
      <div className="workspace-account-progress" aria-hidden="true">
        <span style={{ width: `${rankProgress.percent}%`, background: rankProgress.rank.color }} />
      </div>
      <p className="workspace-account-next">
        {rankProgress.nextRank
          ? `${statisticsCopy[language].nextRank}: ${t.todayContribution.ranks[rankProgress.nextRank.id]} · ${new Intl.NumberFormat(language).format(rankProgress.current)} / ${new Intl.NumberFormat(language).format(rankProgress.required)} XP`
          : statisticsCopy[language].highestRank}
      </p>
    </div>
  ) : null

  return (
    <>
      <header
        ref={compact ? mobileMenuRef : undefined}
        className={compact ? 'workspace-navigation' : 'pixel-navbar bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 md:px-8 py-4'}
        onKeyDown={compact ? (event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            if (isAccountPreviewOpen) {
              setIsAccountPreviewOpen(false)
            } else if (isNotificationsOpen) {
              setIsNotificationsOpen(false)
              mobileNotificationsRef.current?.querySelector('button')?.focus()
            } else {
              setIsMobileMenuOpen(false)
              compactTriggerRef.current?.focus()
            }
          }
        } : undefined}
      >
        {compact && (
          <div className="workspace-navigation-control">
            <div
              className="workspace-account"
              onMouseEnter={() => { if (!isMobileMenuOpen && unreadCount === 0) setIsAccountPreviewOpen(true) }}
              onMouseLeave={() => setIsAccountPreviewOpen(false)}
              onFocus={() => { if (!isMobileMenuOpen && unreadCount === 0) setIsAccountPreviewOpen(true) }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setIsAccountPreviewOpen(false)
              }}
            >
              {isAuthenticated && user ? (
                unreadCount > 0 ? (
                  <button type="button" className="workspace-account-trigger"
                    aria-label={unreadLabel} aria-haspopup="true" aria-expanded={isNotificationsOpen}
                    onClick={openAvatarNotifications}>
                  <RankAvatarFrame experience={user.experience} thickness={2} className="h-8 w-8">
                    {user.avatarUrl ? (
                      <Image src={user.avatarUrl} alt="" width={32} height={32} className="h-full w-full object-cover" />
                    ) : (
                      <span className="workspace-account-fallback"><User size={17} aria-hidden="true" /></span>
                    )}
                  </RankAvatarFrame>
                  {avatarUnreadBadge}
                  </button>
                ) : (
                <Link
                  href={`/user/${encodeURIComponent(user.id)}`}
                  className="workspace-account-trigger"
                  aria-label={unreadLabel || `${t.nav.profile}: ${user.username}`}
                  aria-describedby={isAccountPreviewOpen ? accountPreviewId : undefined}
                  onClick={() => { setIsAccountPreviewOpen(false); setIsMobileMenuOpen(false) }}
                >
                  <RankAvatarFrame experience={user.experience} thickness={2} className="h-8 w-8">
                    {user.avatarUrl ? (
                      <Image src={user.avatarUrl} alt="" width={32} height={32} className="h-full w-full object-cover" />
                    ) : (
                      <span className="workspace-account-fallback"><User size={17} aria-hidden="true" /></span>
                    )}
                  </RankAvatarFrame>
                  {avatarUnreadBadge}
                </Link>
                )
              ) : (
                <button type="button" className="workspace-account-trigger" aria-label={t.nav.login} title={t.nav.login}
                  onClick={() => { setIsMobileMenuOpen(false); setIsAuthModalOpen(true) }}>
                  <span className="workspace-account-guest"><User size={19} aria-hidden="true" /></span>
                </button>
              )}
              {isAuthenticated && user && !isMobileMenuOpen && (
                <NotificationsMenu
                  variant="mobile"
                  inline
                  hideTrigger
                  isOpen={isNotificationsOpen}
                  unreadCount={unreadCount}
                  notificationsLoading={notificationsLoading}
                  notifications={notifications}
                  inviteAction={inviteAction}
                  onToggle={() => setIsNotificationsOpen(false)}
                  onAcceptInvite={acceptInvite}
                  onDeclineInvite={declineInvite}
                  onNotificationClick={handleNotificationClick}
                  containerRef={mobileNotificationsRef}
                />
              )}
              {isAuthenticated && user && isAccountPreviewOpen && !isMobileMenuOpen && (
                <div className="workspace-account-preview">
                  <div id={accountPreviewId} role="tooltip" className="workspace-account-card">{accountDetails}</div>
                </div>
              )}
            </div>
            <button
              ref={compactTriggerRef}
              type="button"
              className="workspace-navigation-trigger"
              data-workspace-menu-trigger={compact ? '' : undefined}
              aria-expanded={isMobileMenuOpen}
              aria-controls={compactMenuId}
              onClick={() => {
                setIsMobileMenuOpen((open) => !open)
                setIsAccountPreviewOpen(false)
                setIsNotificationsOpen(false)
              }}
            >
              {isMobileMenuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
              <span>{gardenCopy[language].menu}</span>
            </button>
          </div>
        )}
        {!compact && <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/" className="flex items-center space-x-2 md:space-x-3">
            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-500/20 rounded-xl flex items-center justify-center">
              <PixelSprout className="w-10 h-10" />
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
                  ? 'bg-rose-600 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
              }`}
            >
              <FontAwesomeIcon icon={faClock} className="mr-2" />{t.nav.timer}
            </Link>
            <Link 
              href={currentRoomId ? `/rooms/${currentRoomId}` : '/rooms'}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pathname.startsWith('/rooms') 
                  ? 'bg-rose-600 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
              }`}
            >
              <FontAwesomeIcon icon={faUsers} className="mr-2" />
              <span className="relative inline-flex items-center">
                <span>{t.nav.rooms}</span>
                <span className="pointer-events-none absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 rounded-full border border-amber-200 bg-amber-50 px-1 py-[1px] text-[8px] font-semibold uppercase leading-none tracking-wide text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300">
                  {t.common.beta}
                </span>
              </span>
            </Link>
            <Link 
              href="/leaderboard"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pathname === '/leaderboard'
                  ? 'bg-rose-600 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
              }`}
            >
              <FontAwesomeIcon icon={faUsers} className="mr-2" />{t.nav.leaderboard}
            </Link>
            <div className="flex flex-col items-start">
            <Link
              href="/stats"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pathname === '/stats'
                  ? 'bg-rose-600 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
              }`}
            >
              <FontAwesomeIcon icon={faChartLine} className="mr-2 text-xs" />{t.nav.stats}
            </Link>
            <Link href="/statistics" aria-current={pathname === '/statistics' ? 'page' : undefined} className={`inline-flex items-center px-4 py-1 rounded-lg text-xs font-medium transition-all ${pathname === '/statistics' ? 'bg-rose-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'}`}>
              {statisticsCopy[language].newView}
            </Link>
            </div>
            <Link href="/habits" aria-current={pathname === '/habits' ? 'page' : undefined} className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all ${pathname === '/habits' ? 'bg-rose-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'}`}>
              <ListChecks size={16} className="mr-2" aria-hidden="true" />{habitsCopy[language].title}
            </Link>
            <Link
              href="/blog"
              aria-current={pathname.startsWith('/blog') ? 'page' : undefined}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${pathname.startsWith('/blog') ? 'bg-rose-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'}`}
            >
              <FontAwesomeIcon icon={faBookOpen} className="mr-2" />Blog
            </Link>
          </nav>
          
          {/* Desktop Right Side */}
            <div className="hidden lg:flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-300">
              <div className={`w-2 h-2 rounded-full pulse-dot ${connectionStatusClass}`}></div>
              <span>{totalOnlineCount} {t.nav.online}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              {isAuthenticated && user ? (
                <>
                  <NotificationsMenu
                    variant="desktop"
                    isOpen={isNotificationsOpen}
                    unreadCount={unreadCount}
                    notificationsLoading={notificationsLoading}
                    notifications={notifications}
                    inviteAction={inviteAction}
                    onToggle={async () => {
                      const next = !isNotificationsOpen
                      setIsNotificationsOpen(next)
                      if (next) await fetchNotifications()
                    }}
                    onAcceptInvite={acceptInvite}
                    onDeclineInvite={declineInvite}
                    onNotificationClick={handleNotificationClick}
                    containerRef={notificationsRef}
                  />

                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => { if (unreadCount > 0) openAvatarNotifications(); else setIsMenuOpen(prev => !prev) }}
                      className="relative w-10 h-10 rounded-full overflow-visible text-gray-700 dark:text-slate-200 font-semibold transition-transform hover:scale-105"
                      aria-label={unreadLabel || `${t.nav.profile}: ${user.username}`}
                      aria-haspopup="true"
                      aria-expanded={unreadCount > 0 ? isNotificationsOpen : isMenuOpen}
                    >
                      <RankAvatarFrame
                        experience={user.experience}
                        thickness={3}
                        tooltip="progress"
                        tooltipAlign="right"
                        className="h-full w-full"
                      >
                        {user.avatarUrl ? (
                          <Image src={user.avatarUrl} alt={user.username} width={48} height={48} className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-gray-300 dark:bg-slate-600">
                            <User className="w-4 h-4" />
                          </span>
                        )}
                      </RankAvatarFrame>
                      {avatarUnreadBadge}
                      {user.isPro && (!user.proExpiresAt || new Date(user.proExpiresAt) > new Date()) && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 shadow-lg w-5 h-5">
                          <Crown className="w-3 h-3" />
                        </span>
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
                          href={`/user/${encodeURIComponent(user.id)}`}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <span>{t.nav.profile}</span>
                          <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" />
                        </Link>
                        <Link href="/projects" onClick={() => setIsMenuOpen(false)} className="flex px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-800">{language === 'es' ? 'Mis proyectos' : 'My projects'}</Link>
                        <Link href="/feed" onClick={() => setIsMenuOpen(false)} className="flex px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-800">{language === 'es' ? 'Novedades' : 'Feed'}</Link>
                        <Link href="/settings/profile" onClick={() => setIsMenuOpen(false)} className="flex px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-800">{language === 'es' ? 'Editar perfil' : 'Edit profile'}</Link>
                        <Link
                          href="/settings"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <FontAwesomeIcon icon={faCog} className="text-xs" />
                          <span>{t.nav.settings}</span>
                        </Link>
                        <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">{t.common.theme}</span>
                            <ThemeToggle />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <FontAwesomeIcon icon={faArrowRightFromBracket} className="text-xs" />
                          <span>{t.nav.logout}</span>
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
                  {t.nav.login}
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
              <>
                <NotificationsMenu
                  variant="mobile"
                  isOpen={isNotificationsOpen}
                  unreadCount={unreadCount}
                  notificationsLoading={notificationsLoading}
                  notifications={notifications}
                  inviteAction={inviteAction}
                  onToggle={async () => {
                    const next = !isNotificationsOpen
                    setIsNotificationsOpen(next)
                    if (next) await fetchNotifications()
                  }}
                  onAcceptInvite={acceptInvite}
                  onDeclineInvite={declineInvite}
                  onNotificationClick={handleNotificationClick}
                  containerRef={mobileNotificationsRef}
                />

                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(prev => !prev)}
                  className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-all"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="btn-primary text-sm px-3 py-2"
              >
                {t.nav.login}
              </button>
            )}
          </div>
        </div>}

        {/* Shared disclosure navigation, also used by the compact homepage. */}
        {isMobileMenuOpen && (compact || (isAuthenticated && user)) && (
          <div 
            id={compact ? compactMenuId : undefined}
            ref={compact ? undefined : mobileMenuRef}
            className={compact ? "workspace-navigation-panel" : "lg:hidden mt-4 pt-4 border-t border-gray-200 dark:border-slate-700"}
          >
            {compact && workspaceActions && (
              <div className="workspace-mobile-actions">
                {workspaceActions(handleMobileLinkClick)}
              </div>
            )}
            {compact && (
              <div className="workspace-menu-heading">
                <div>
                  <p className="workspace-menu-title">{gardenCopy[language].menu}</p>
                  <span className="workspace-menu-presence"><span className={`h-1.5 w-1.5 ${connectionStatusClass}`} />{totalOnlineCount} {t.nav.online}</span>
                </div>
                {isAuthenticated && user && (
                  <NotificationsMenu
                    variant="mobile"
                    inline
                    isOpen={isNotificationsOpen}
                    unreadCount={unreadCount}
                    notificationsLoading={notificationsLoading}
                    notifications={notifications}
                    inviteAction={inviteAction}
                    onToggle={async () => {
                      const next = !isNotificationsOpen
                      setIsNotificationsOpen(next)
                      if (next) await fetchNotifications()
                    }}
                    onAcceptInvite={acceptInvite}
                    onDeclineInvite={declineInvite}
                    onNotificationClick={handleNotificationClick}
                    containerRef={mobileNotificationsRef}
                  />
                )}
              </div>
            )}
            {/* Account details remain available to touch users in the disclosure. */}
            {compact && isAuthenticated && user && <div className="workspace-menu-touch-account">{accountDetails}</div>}
            {!compact && isAuthenticated && user && (
            <div className="px-4 py-3 mb-2 bg-gray-50 dark:bg-slate-700 rounded-xl">
              <div className="flex items-center space-x-3">
                <button type="button" aria-label={unreadLabel || `${t.nav.profile}: ${user.username}`} onClick={() => { if (unreadCount > 0) openAvatarNotifications(); else router.push(`/user/${encodeURIComponent(user.id)}`) }} className="relative w-11 h-11 rounded-full overflow-visible text-gray-700 dark:text-slate-200 font-semibold">
                  <RankAvatarFrame
                    experience={user.experience}
                    thickness={3}
                    className="h-full w-full"
                  >
                    {user.avatarUrl ? (
                      <Image src={user.avatarUrl} alt={user.username} width={44} height={44} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-gray-300 dark:bg-slate-600">
                        <User className="w-5 h-5" />
                      </span>
                    )}
                  </RankAvatarFrame>
                  {avatarUnreadBadge}
                  {user.isPro && (!user.proExpiresAt || new Date(user.proExpiresAt) > new Date()) && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 shadow-lg w-5 h-5">
                      <Crown className="w-3 h-3" />
                    </span>
                  )}
                </button>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.username}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
            </div>

            )}

            <nav className="workspace-menu-links" aria-label={gardenCopy[language].menu}>
              {[
                { href: '/', label: t.nav.timer, icon: Timer, active: pathname === '/' },
                { href: currentRoomId ? `/rooms/${currentRoomId}` : '/rooms', label: t.nav.rooms, icon: Users, active: pathname.startsWith('/rooms'), beta: true },
                { href: '/leaderboard', label: t.nav.leaderboard, icon: Trophy, active: pathname === '/leaderboard' },
                { href: '/stats', label: t.nav.stats, icon: LineChart, active: pathname === '/stats' },
                { href: '/statistics', label: statisticsCopy[language].navigation, icon: BarChart3, active: pathname === '/statistics' },
                { href: '/habits', label: habitsCopy[language].title, icon: ListChecks, active: pathname === '/habits' },
                { href: '/feed', label: language === 'es' ? 'Novedades' : 'Feed', icon: BookOpen, active: pathname === '/feed' },
                { href: '/blog', label: 'Blog', icon: BookOpen, active: pathname.startsWith('/blog') },
              ].map(({ href, label, icon: Icon, active, beta }) => (
                <Link key={href} href={href} onClick={handleMobileLinkClick}
                  aria-current={active ? 'page' : undefined} className="workspace-menu-item">
                  <Icon size={16} aria-hidden="true" />
                  <span className="workspace-menu-label">{label}</span>
                  {beta && <span className="workspace-menu-badge">{t.common.beta}</span>}
                  {active && <ChevronRight size={14} className="workspace-menu-current" aria-hidden="true" />}
                </Link>
              ))}
            </nav>

            {/* User Menu Items */}
            <div className="workspace-menu-settings">
              {isAuthenticated && user && <>
              <Link
                href={`/user/${encodeURIComponent(user.id)}`}
                onClick={handleMobileLinkClick}
                className="workspace-menu-item"
                aria-current={pathname === `/user/${encodeURIComponent(user.id)}` ? 'page' : undefined}
              >
                <User size={16} aria-hidden="true" />
                <span className="workspace-menu-label">{t.nav.profile}</span>
              </Link>
              <Link href="/projects" onClick={handleMobileLinkClick} className="workspace-menu-item"><BookOpen size={16} aria-hidden="true"/><span className="workspace-menu-label">{language === 'es' ? 'Mis proyectos' : 'My projects'}</span></Link>
              <Link href="/settings/profile" onClick={handleMobileLinkClick} className="workspace-menu-item"><User size={16} aria-hidden="true"/><span className="workspace-menu-label">{language === 'es' ? 'Editar perfil' : 'Edit profile'}</span></Link>
              <Link
                href="/settings"
                onClick={handleMobileLinkClick}
                className="workspace-menu-item"
                aria-current={pathname === '/settings' ? 'page' : undefined}
              >
                <Settings size={16} aria-hidden="true" />
                <span className="workspace-menu-label">{t.nav.settings}</span>
              </Link>
              
              </>}

              {/* Theme Toggle */}
              <div className="workspace-menu-theme">
                <span>{t.common.theme}</span>
                <ThemeToggle variant="menu" />
              </div>

              {/* Logout */}
              {isAuthenticated && user ? <button
                type="button"
                onClick={handleLogout}
                className="workspace-menu-item workspace-menu-logout"
              >
                <LogOut size={16} aria-hidden="true" />
                <span>{t.nav.logout}</span>
              </button> : <button
                type="button"
                className="workspace-menu-item workspace-menu-login"
                onClick={() => { setIsMobileMenuOpen(false); setIsAuthModalOpen(true) }}
              >{t.nav.login}</button>}
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
