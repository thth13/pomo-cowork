'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Highcharts from 'highcharts'
import CommunityDialog from '@/components/CommunityDialog'
import ProfileAchievements from '@/components/achievements/ProfileAchievements'
import { useI18n } from '@/components/I18nProvider'
import { communityCopy } from '@/lib/i18n/community'
import { ranksCopy } from '@/lib/i18n/ranks'
import { getRank } from '@/lib/ranks'
import { enUS, es } from 'date-fns/locale'
import Image from 'next/image'
import { ArrowLeft, Clock, TrendingUp, Calendar, Coffee, Flame, Pencil, LogOut, Crown, Eye, MessageSquare, Send, Sprout, Trash2 } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useConnectionStore } from '@/store/useConnectionStore'
import Navbar from '@/components/Navbar'
import ActiveSessionTimer from '@/components/ActiveSessionTimer'
import WeeklyActivityChart from '@/components/WeeklyActivityChart'
import PersonalNavigation from '@/components/PersonalNavigation'
import PersonalPageSkeleton from '@/components/PersonalPageSkeleton'

interface UserProfile {
  user: {
    id: string
    username: string
    avatarUrl?: string
    description?: string
    createdAt: string
    totalSessions: number
    experience: number
    isPro?: boolean
    lastSeenAt?: string | null
    profileViews?: number
  }
  stats: {
    totalSessions: number
    completedSessions: number
    totalWorkHours: number
    completionRate: number
  }
  activeSession?: {
    id: string
    task: string
    type: string
    startedAt: string
    duration: number
  }
  recentSessions: Array<{
    id: string
    task: string
    type: string
    status: string
    duration: number
    createdAt: string
    completedAt?: string
  }>
}

interface UserStats {
  totalPomodoros: number
  totalFocusMinutes: number
  avgPomodorosPerDay: number
  activeDays: number
  focusTimeThisMonth: number
  currentStreak: number
  yearlyHeatmap: HeatmapDay[]
  weeklyActivity: Array<{
    date: string
    pomodoros: number
    minutes: number
  }>
}

interface HeatmapDay {
  week: number
  dayOfWeek: number
  pomodoros: number
  minutes: number
  date: string
}

interface HeatmapColumn {
  week: number
  days: Array<HeatmapDay | null>
}

interface WallMessage {
  id: string
  message: string
  createdAt: string
  author: {
    id: string
    username: string
    avatarUrl?: string | null
  }
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { language, t } = useI18n()
  const copy = communityCopy[language]
  const locale = language === 'es' ? 'es-ES' : 'en-US'
  const dateLocale = language === 'es' ? es : enUS
  const heatmapDayLabels = Array.from({ length: 7 }, (_, day) => new Date(2024, 0, 7 + day).toLocaleDateString(locale, { weekday: 'short' }))
  const { user: currentUser, logout } = useAuthStore()
  const { theme } = useThemeStore()
  const { onlineUserIds } = useConnectionStore()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wallMessages, setWallMessages] = useState<WallMessage[]>([])
  const [wallLoading, setWallLoading] = useState(true)
  const [wallLoadingMore, setWallLoadingMore] = useState(false)
  const [wallError, setWallError] = useState<string | null>(null)
  const [wallMessageText, setWallMessageText] = useState('')
  const [wallSubmitting, setWallSubmitting] = useState(false)
  const [wallDeletingId, setWallDeletingId] = useState<string | null>(null)
  const [wallHasMore, setWallHasMore] = useState(false)
  const [wallCursor, setWallCursor] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [pendingWallDelete, setPendingWallDelete] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [wallRetry, setWallRetry] = useState(0)

  const userId = params?.id as string
  const isDark = theme === 'dark'
  const isOwnProfile = currentUser?.id === userId
  const canPostWallMessage = Boolean(currentUser && !isOwnProfile)

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    let timedOut = false
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort() }, 20000)
    setError(null)
    setProfile(null)
    setUserStats(null)
    setSelectedDay(null)
    setPendingWallDelete(null)
    setWallMessageText('')
    const fetchUserProfile = async () => {
      try {
        setLoading(true)
        const [profileResponse, statsResponse] = await Promise.all([
          fetch(`/api/users/${userId}`, { signal: controller.signal }),
          fetch(`/api/users/${userId}/stats`, { signal: controller.signal })
        ])
        
        if (profileResponse.ok) {
          const data = await profileResponse.json()
          if (active) setProfile(data)
        } else {
          if (active) setError(copy.userNotFound)
        }

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          if (active) setUserStats(statsData)
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
        if (active && (!controller.signal.aborted || timedOut)) setError(copy.profileError)
      } finally {
        window.clearTimeout(timeout)
        if (active) setLoading(false)
      }
    }

    if (userId) {
      fetchUserProfile()
    }
    return () => { active = false; controller.abort(); window.clearTimeout(timeout) }
  }, [userId, retry, copy.userNotFound, copy.profileError])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setWallMessages([])
    const timeout = window.setTimeout(() => controller.abort(), 20000)
    const fetchWallMessages = async () => {
      if (!userId) return
      try {
        setWallLoading(true)
        setWallError(null)
        setWallCursor(null)
        const response = await fetch(`/api/users/${userId}/wall?take=5`, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(copy.wallLoadError)
        }
        const data = await response.json()
        if (!active) return
        setWallMessages(data.messages || [])
        setWallHasMore(Boolean(data.hasMore))
        setWallCursor(data.nextCursor || null)
      } catch (error) {
        console.error('Error loading wall messages:', error)
        if (active) setWallError(copy.wallLoadError)
      } finally {
        window.clearTimeout(timeout)
        if (active) setWallLoading(false)
      }
    }

    fetchWallMessages()
    return () => { active = false; controller.abort(); window.clearTimeout(timeout) }
  }, [userId, retry, wallRetry, copy.wallLoadError])

  const loadMoreWallMessages = async () => {
    if (!userId || !wallHasMore || wallLoadingMore || !wallCursor) return
    try {
      setWallLoadingMore(true)
      const response = await fetch(`/api/users/${userId}/wall?take=5&cursor=${wallCursor}`)
      if (!response.ok) {
        throw new Error(copy.wallLoadError)
      }
      const data = await response.json()
      setWallMessages((prev) => [...prev, ...(data.messages || [])])
      setWallHasMore(Boolean(data.hasMore))
      setWallCursor(data.nextCursor || null)
    } catch (error) {
      console.error('Error loading more wall messages:', error)
      setWallError('Failed to load more wall messages')
    } finally {
      setWallLoadingMore(false)
    }
  }

  const handleWallSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canPostWallMessage || wallSubmitting) return

    const message = wallMessageText.trim()
    if (!message) {
      setWallError(copy.messageRequired)
      return
    }

    try {
      setWallSubmitting(true)
      setWallError(null)
      const token = localStorage.getItem('token')
      if (!token) {
        setWallError(copy.loginRequired)
        return
      }

      const response = await fetch(`/api/users/${userId}/wall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      })

      const payload = await response.json()
      if (!response.ok) {
        setWallError(payload?.error || copy.wallSendError)
        return
      }

      setWallMessages((prev) => [payload, ...prev])
      setWallMessageText('')
    } catch (error) {
      console.error('Error sending wall message:', error)
      setWallError(copy.wallSendError)
    } finally {
      setWallSubmitting(false)
    }
  }

  const handleWallDelete = async (messageId: string) => {
    if (wallDeletingId) return

    try {
      setWallDeletingId(messageId)
      setWallError(null)
      const token = localStorage.getItem('token')
      if (!token) {
        setWallError(copy.loginRequired)
        return
      }

      const response = await fetch(`/api/users/${userId}/wall?messageId=${messageId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const payload = await response.json()
      if (!response.ok) {
        setWallError(payload?.error || copy.wallDeleteError)
        return
      }

      setWallMessages((prev) => prev.filter((message) => message.id !== messageId))
      return true
    } catch (error) {
      console.error('Error deleting wall message:', error)
      setWallError(copy.wallDeleteError)
    } finally {
      setWallDeletingId(null)
    }
  }

  useEffect(() => {
    if (!userId || isOwnProfile || typeof window === 'undefined') {
      return
    }

    const viewKey = `profile_viewed:${userId}`
    const lastViewedRaw = localStorage.getItem(viewKey)
    const lastViewed = lastViewedRaw ? Number(lastViewedRaw) : 0
    const now = Date.now()
    const tenMinutes = 10 * 60 * 1000

    if (!Number.isFinite(lastViewed) || now - lastViewed >= tenMinutes) {
      localStorage.setItem(viewKey, now.toString())
      const token = localStorage.getItem('token')
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
      fetch(`/api/users/${userId}/view`, { method: 'POST', headers }).catch((error) => {
        console.error('Error incrementing profile views:', error)
      })
    }
  }, [userId, isOwnProfile])

  // Generate weekly activity data - memoized to prevent recalculation
  const weeklyData = useMemo(() => {
    if (!userStats) return []
    
    return userStats.weeklyActivity.map(item => parseFloat((item.minutes / 60).toFixed(4)))
  }, [userStats])

  const totalPomodoros = userStats?.totalPomodoros || 0
  const totalFocusMinutes = userStats?.totalFocusMinutes || 0
  const totalFocusHours = Math.floor(totalFocusMinutes / 60)
  const totalFocusMinutesRemainder = totalFocusMinutes % 60
  const totalFocusDisplay = `${totalFocusHours}h ${totalFocusMinutesRemainder}m`
  const avgPomodorosPerDay = userStats?.avgPomodorosPerDay || 0
  const avgPomodorosDisplay = Number.isFinite(avgPomodorosPerDay)
    ? (Number.isInteger(avgPomodorosPerDay) ? avgPomodorosPerDay.toString() : avgPomodorosPerDay.toFixed(1))
    : '0'
  const yearlyHeatmap = userStats?.yearlyHeatmap || []
  const heatmapMaxDailyMinutes = yearlyHeatmap.reduce((max, day) => Math.max(max, day.minutes), 0)
  const totalHeatmapMinutes = yearlyHeatmap.reduce((sum, day) => sum + day.minutes, 0)
  const totalHeatmapHours = Math.floor(totalHeatmapMinutes / 60)
  const totalHeatmapRemainder = String(totalHeatmapMinutes % 60).padStart(2, '0')

  const heatmapColumnsMap = new Map<number, HeatmapColumn>()
  yearlyHeatmap.forEach((day) => {
    let column = heatmapColumnsMap.get(day.week)

    if (!column) {
      column = {
        week: day.week,
        days: Array.from({ length: 7 }, () => null)
      }
      heatmapColumnsMap.set(day.week, column)
    }

    column.days[day.dayOfWeek] = day
  })

  const heatmapColumns = Array.from(heatmapColumnsMap.values()).sort((left, right) => left.week - right.week)
  const heatmapMonthMarkers: Array<{ label: string; column: number }> = []
  let previousMonthKey = ''

  heatmapColumns.forEach((column, columnIndex) => {
    const firstTrackedDay = column.days.find((day): day is HeatmapDay => day !== null)

    if (!firstTrackedDay) {
      return
    }

    const date = new Date(firstTrackedDay.date + 'T00:00:00')
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`

    if (monthKey !== previousMonthKey) {
      previousMonthKey = monthKey
      heatmapMonthMarkers.push({
        label: date.toLocaleDateString(locale, { month: 'short' }),
        column: columnIndex
      })
    }
  })

  const weeklyCategories = useMemo(() => {
    return userStats?.weeklyActivity?.map(item => {
      const [year, month, day] = item.date.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return date.toLocaleDateString(locale, { weekday: 'short' })
    }) || []
  }, [userStats?.weeklyActivity, locale])

  // Check if user is online (connected to socket)
  const isUserOnline = onlineUserIds[userId] === true
  const isUserWorking = profile?.activeSession ? true : false

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatHeatmapHours = (minutes: number) => {
    const hours = minutes / 60
    return `${hours.toFixed(1).replace(/\.0$/, '')}h`
  }

  const getHeatmapIntensity = (minutes: number) => {
    if (minutes <= 0 || heatmapMaxDailyMinutes <= 0) {
      return 0
    }

    const ratio = minutes / heatmapMaxDailyMinutes

    if (ratio >= 0.8) {
      return 4
    }

    if (ratio >= 0.55) {
      return 3
    }

    if (ratio >= 0.3) {
      return 2
    }

    return 1
  }

  const formatHeatmapCellLabel = (day: HeatmapDay | null) => {
    if (!day) {
      return copy.noActivity
    }

    const formattedDate = new Date(day.date + 'T00:00:00').toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })

    if (day.minutes <= 0) {
      return `${formattedDate}: 0h`
    }

    return `${formattedDate}: ${formatHeatmapHours(day.minutes)}`
  }

  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case 'WORK': return copy.work
      case 'SHORT_BREAK': return copy.shortBreak
      case 'LONG_BREAK': return copy.longBreak
      case 'TIME_TRACKING': return copy.tracking
      default: return type
    }
  }

  const getLastSeenLabel = (lastSeenAt?: string | null) => {
    if (!lastSeenAt) {
      return copy.longAgo
    }

    const lastSeenDate = new Date(lastSeenAt)
    if (Number.isNaN(lastSeenDate.getTime())) {
      return copy.longAgo
    }

    return `${copy.lastSeen} ${formatDistanceToNowStrict(lastSeenDate, { addSuffix: true, locale: dateLocale })}`
  }

  const formatRelativeDate = (dateString: string) => {
    const parsed = new Date(dateString)
    if (Number.isNaN(parsed.getTime())) {
      return copy.justNow
    }
    return formatDistanceToNowStrict(parsed, { addSuffix: true, locale: dateLocale })
  }

  const selectedHeatmapDay = yearlyHeatmap.find(day => day.date === selectedDay)
  const firstHeatmapDay = heatmapColumns.flatMap(column => column.days).find(day => day !== null)
  const experience = profile?.user.experience ?? 0
  const rank = getRank(experience)

  if (loading || error || !profile) {
    return <div className="community-page garden-page profile-page" lang={language} data-no-translate><Navbar compact /><main className={`community-layout${isOwnProfile ? ' personal-page-frame' : ''}`}>
      {isOwnProfile && <PersonalNavigation />}
      {!isOwnProfile && <div className="mb-6 flex justify-end"><Link href="/" className="community-button"><ArrowLeft size={16} aria-hidden="true" />{copy.back}</Link></div>}
      {loading ? <PersonalPageSkeleton variant="profile" /> : <div className="community-panel community-state">
        <Sprout aria-hidden="true" /><h1>{copy.userNotFound}</h1><p>{error}</p><button type="button" className="community-button" onClick={() => setRetry(value => value + 1)}>{copy.retry}</button>
      </div>}
    </main></div>
  }

  return (
    <div className="community-page garden-page profile-page" lang={language} data-no-translate>
      <Navbar compact />
      <main className={`community-layout${isOwnProfile ? ' personal-page-frame' : ''}`}>
        {isOwnProfile && <PersonalNavigation />}
        {!isOwnProfile && <div className="mb-6 flex justify-end"><Link href="/" className="community-button"><ArrowLeft size={16} aria-hidden="true" />{copy.back}</Link></div>}
        <header className="profile-header">
          {profile.user.avatarUrl ? <Image src={profile.user.avatarUrl} alt="" width={88} height={88} className="community-avatar profile-avatar" /> : <span className="community-avatar profile-avatar" aria-hidden="true">{profile.user.username.charAt(0).toUpperCase()}</span>}
          <div className="profile-identity">
            <div className="profile-name"><h1>{profile.user.username}</h1>{profile.user.isPro && <span className="community-badge community-badge-accent"><Crown size={12} aria-hidden="true" />PRO</span>}</div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Link href="/ranks" className="community-badge profile-rank-link" title={ranksCopy[language].link} aria-label={`${copy.rank}: ${t.todayContribution.ranks[rank.id]} · ${ranksCopy[language].link}`}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: rank.ring }} aria-hidden="true" />
                {copy.rank}: {t.todayContribution.ranks[rank.id]}
              </Link>
              <span className="community-badge tabular-nums">{experience.toLocaleString(locale)} EXP</span>
            </div>
            {profile.user.description && <p className="profile-bio">{profile.user.description}</p>}
            <div className="profile-meta"><span><Calendar size={13} aria-hidden="true" />{copy.joined} {formatDate(profile.user.createdAt)}</span><span><Eye size={13} aria-hidden="true" />{(profile.user.profileViews ?? 0).toLocaleString(locale)} {copy.views}</span></div>
            {!isUserOnline && <p className="community-muted mt-2">{getLastSeenLabel(profile.user.lastSeenAt)}</p>}
            {isOwnProfile && <div className="community-actions mt-4"><Link href="/settings" className="community-button"><Pencil size={14} aria-hidden="true" />{copy.edit}</Link><button type="button" className="community-button" onClick={handleLogout}><LogOut size={14} aria-hidden="true" />{copy.logout}</button></div>}
          </div>
          <ActiveSessionTimer activeSession={profile.activeSession} isUserOnline={isUserOnline} isUserWorking={isUserWorking} />
        </header>

        {userStats ? <section className="community-metrics profile-metrics" aria-label={copy.workTime}>
          <div className="community-metric"><span><Clock size={14} aria-hidden="true" />{copy.workTime}</span><strong>{totalFocusDisplay}</strong></div>
          <div className="community-metric"><span><Flame size={14} aria-hidden="true" />{copy.pomodoros}</span><strong>{totalPomodoros.toLocaleString(locale)}</strong></div>
          <div className="community-metric"><span><Calendar size={14} aria-hidden="true" />{copy.streak}</span><strong>{(userStats.currentStreak || 0).toLocaleString(locale)}</strong></div>
          <div className="community-metric"><span><TrendingUp size={14} aria-hidden="true" />{copy.perDay}</span><strong>{avgPomodorosDisplay}</strong></div>
        </section> : <p className="community-error" role="status">{copy.statsUnavailable}</p>}

        <ProfileAchievements userId={profile.user.id} />

        <div className="profile-columns">
          <div className="community-stack">
            <section className="community-panel" aria-labelledby="profile-yearly-heading">
              <header className="community-panel-heading"><div><h2 id="profile-yearly-heading">{copy.yearly}</h2><p>{copy.yearlyHint}</p></div>{userStats && <span className="community-badge">{totalHeatmapHours}:{totalHeatmapRemainder}</span>}</header>
              {heatmapColumns.length ? <>
                <div className="profile-heatmap-scroll">
                  <div className="profile-heatmap-months" style={{ width: heatmapColumns.length * 13 }}>{heatmapMonthMarkers.map(marker => <span key={`${marker.label}-${marker.column}`} style={{ left: `${marker.column * 13}px` }}>{marker.label}</span>)}</div>
                  <div className="profile-heatmap" role="group" aria-label={copy.yearly}>
                    <div className="profile-heatmap-labels" aria-hidden="true">{heatmapDayLabels.map((label, index) => <span key={index}>{index % 2 ? label : ''}</span>)}</div>
                    {heatmapColumns.map(column => <div className="profile-heatmap-column" key={column.week}>{column.days.map((day, index) => day ? <button
                      key={day.date} type="button" className="profile-heatmap-cell" data-level={getHeatmapIntensity(day.minutes)} data-date={day.date}
                      title={formatHeatmapCellLabel(day)} aria-label={formatHeatmapCellLabel(day)} aria-pressed={selectedDay === day.date}
                      tabIndex={(selectedDay ?? firstHeatmapDay?.date) === day.date ? 0 : -1}
                      onClick={() => setSelectedDay(day.date)} onFocus={() => setSelectedDay(day.date)}
                      onKeyDown={event => {
                        const offsets: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }
                        if (!(event.key in offsets) && event.key !== 'Home' && event.key !== 'End') return
                        event.preventDefault()
                        const cells = Array.from(event.currentTarget.closest('.profile-heatmap')?.querySelectorAll<HTMLButtonElement>('button[data-date]') ?? [])
                        const current = cells.indexOf(event.currentTarget)
                        const target = event.key === 'Home' ? 0 : event.key === 'End' ? cells.length - 1 : Math.max(0, Math.min(cells.length - 1, current + offsets[event.key]))
                        cells[target]?.focus()
                      }}
                    /> : <span key={`empty-${index}`} className="profile-heatmap-cell invisible" aria-hidden="true" />)}</div>)}
                  </div>
                </div>
                <div className="profile-heatmap-caption"><span role="status">{selectedHeatmapDay ? formatHeatmapCellLabel(selectedHeatmapDay) : copy.yearlyHint}</span><span className="profile-heatmap-key" aria-hidden="true">{copy.less}{[0, 1, 2, 3, 4].map(level => <span key={level} className="profile-heatmap-cell" data-level={level} />)}{copy.moreActivity}</span></div>
              </> : <p className="community-muted">{userStats ? copy.noActivity : copy.statsUnavailable}</p>}
            </section>
            <section className="community-panel"><header className="community-panel-heading"><div><h2>{copy.weekly}</h2><p>{copy.weekHint}</p></div></header>
              {userStats ? <WeeklyActivityChart Highcharts={Highcharts} weeklyData={weeklyData} weeklyCategories={weeklyCategories} isDark={isDark} weeklyActivity={userStats.weeklyActivity} /> : <p className="community-muted">{copy.statsUnavailable}</p>}
            </section>
            <section className="community-panel" aria-labelledby="profile-wall-heading">
              <header className="community-panel-heading"><h2 id="profile-wall-heading"><MessageSquare size={18} aria-hidden="true" />{copy.wall}</h2><span className="community-badge">{copy.wallHint}</span></header>
              {canPostWallMessage ? <form noValidate onSubmit={handleWallSubmit}>
                <label className="community-field"><span>{copy.message}</span><textarea className="resize-none" value={wallMessageText} onChange={event => setWallMessageText(event.target.value)} rows={3} maxLength={500} placeholder={copy.messageHint} disabled={wallSubmitting} aria-describedby={wallError ? 'profile-wall-error' : undefined} /></label>
                <div className="profile-wall-form-footer"><span className="community-muted">{wallMessageText.length}/500</span><button type="submit" className="community-button community-button-primary" disabled={wallSubmitting || wallMessageText.trim().length === 0} aria-busy={wallSubmitting}><Send size={14} aria-hidden="true" />{wallSubmitting ? copy.sending : copy.post}</button></div>
              </form> : <p className="community-muted">{isOwnProfile ? copy.ownWall : copy.loginWall}</p>}
              {wallError && <div id="profile-wall-error" className="community-error mt-4" role="alert"><p>{wallError}</p>{wallError === copy.wallLoadError && <button type="button" className="community-button" onClick={() => setWallRetry(value => value + 1)}>{copy.retry}</button>}</div>}
              <div className="profile-wall-list">
                {wallLoading ? <p className="community-muted" role="status">{copy.loadingMessages}</p> : wallMessages.length === 0 ? <p className="community-muted">{copy.noMessages}</p> : wallMessages.map(message => <article className="profile-wall-message" key={message.id}>
                  <Link href={`/user/${message.author.id}`} aria-label={message.author.username}>{message.author.avatarUrl ? <Image src={message.author.avatarUrl} alt="" width={40} height={40} className="community-avatar" /> : <span className="community-avatar" aria-hidden="true">{message.author.username.charAt(0).toUpperCase()}</span>}</Link>
                  <div><header><Link href={`/user/${message.author.id}`}>{message.author.username}</Link><time dateTime={message.createdAt}>{formatRelativeDate(message.createdAt)}</time></header><p>{message.message}</p></div>
                  {(isOwnProfile || currentUser?.id === message.author.id) && <button type="button" className="community-icon-button profile-wall-delete" aria-label={copy.deleteMessage} title={copy.deleteMessage} disabled={Boolean(wallDeletingId)} onClick={() => { setWallError(null); setPendingWallDelete(message.id) }}><Trash2 size={14} aria-hidden="true" /></button>}
                </article>)}
              </div>
              {wallHasMore && !wallLoading && <button type="button" className="community-button mt-4" disabled={wallLoadingMore} onClick={loadMoreWallMessages}>{wallLoadingMore ? copy.loadingMessages : copy.more}</button>}
            </section>
          </div>
          <aside className="community-panel" aria-labelledby="profile-recent-heading">
            <header className="community-panel-heading"><h2 id="profile-recent-heading">{copy.recent}</h2></header>
            {profile.recentSessions.length ? <div className="profile-recent-list">{profile.recentSessions.map(session => <div key={session.id} className="profile-session">
              {session.type === 'WORK' || session.type === 'TIME_TRACKING' ? <Clock size={16} aria-hidden="true" /> : <Coffee size={16} aria-hidden="true" />}
              <div><strong>{getSessionTypeLabel(session.type)}</strong><p>{session.task}</p></div><div className="profile-session-time"><strong>{session.duration}:00</strong><time dateTime={session.createdAt}>{formatTime(session.createdAt)}</time></div>
            </div>)}</div> : <p className="community-muted">{copy.noSessions}</p>}
          </aside>
        </div>
      </main>
      <CommunityDialog open={Boolean(pendingWallDelete)} title={copy.deleteMessageTitle} description={copy.deleteMessageHint} busy={Boolean(wallDeletingId)} onClose={() => setPendingWallDelete(null)}>
        {wallError && <p className="community-error" role="alert">{wallError}</p>}
        <div className="community-dialog-actions"><button type="button" className="community-button" disabled={Boolean(wallDeletingId)} onClick={() => setPendingWallDelete(null)}>{copy.cancel}</button><button type="button" className="community-button community-button-danger" disabled={Boolean(wallDeletingId)} onClick={async () => { if (pendingWallDelete && await handleWallDelete(pendingWallDelete)) setPendingWallDelete(null) }}>{copy.deleteMessage}</button></div>
      </CommunityDialog>
    </div>
  )
}
