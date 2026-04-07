'use client'

import { useCallback, useEffect, useRef, useState, type FocusEvent as ReactFocusEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import Navbar from '@/components/Navbar'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore } from '@/store/useThemeStore'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faClock, 
  faStopwatch, 
  faCalendarCheck, 
  faCalendarDays, 
  faFire, 
  faArrowUp, 
  faCalendar, 
  faBullseye, 
  faTasks,
  faCheck,
  faTimes
} from '@fortawesome/free-solid-svg-icons'
import LatestActivity from '@/components/LatestActivity'
import AuthModal from '@/components/AuthModal'
import { PaywallModal } from '@/components/PaywallModal'

interface Stats {
  totalPomodoros: number
  totalFocusMinutes: number
  currentStreak: number
  avgMinutesPerDay: number
  focusTimeThisMonth: number
  weeklyActivity: Array<{ date: string; pomodoros: number; minutes: number }>
  yearlyHeatmap: HeatmapDay[]
  heatmapPeriod: {
    selected: string
    availableYears: number[]
    totalMinutes: number
    activeDays: number
    bestDayMinutes: number
    rangeStart: string
    rangeEnd: string
  }
  monthlyBreakdown: Array<{ month: string; monthIndex: number; pomodoros: number; minutes: number }>
  lastSevenDaysTimeline: Array<{
    date: string
    dayLabel: string
    totalFocusMinutes: number
    totalPomodoros: number
    sessions: Array<{
      id: string
      type: string
      status: string
      task: string
      start: string
      end: string
      duration: number
    }>
  }>
  productivityTrends: {
    bestTime: { start: string; end: string; efficiency: number }
    bestDay: { name: string; avgPomodoros: string }
    avgSessionDuration: number
    weeklyTasks: { completed: number; total: number }
  }
  taskStats: {
    total: number
    completed: number
    pending: number
    completionRate: number
    byPriority: {
      critical: number
      high: number
      medium: number
      low: number
    }
    topByPomodoros: Array<{
      id: string
      title: string
      completedPomodoros: number
      plannedPomodoros: number
      completed: boolean
      priority: string
    }>
    estimationAccuracy: number
    totalPlannedPomodoros: number
    totalCompletedPomodoros: number
  }
  taskTimeDistribution: Array<{
    task: string
    minutes: number
  }>
  activityRange: {
    start: string
    end: string
  }
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

interface HeatmapTooltip {
  label: string
  x: number
  y: number
}

const heatmapDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const heatmapCellClasses = [
  'bg-[#E7ECF3] border border-[#D7DFEA]',
  'bg-[#CFE0FF] border border-[#B8D0FF]',
  'bg-[#9EC0FF] border border-[#86B1FF]',
  'bg-[#5D95FF] border border-[#4B85F1]',
  'bg-[#2563EB] border border-[#1D4ED8] shadow-[0_8px_18px_rgba(37,99,235,0.24)]'
]

export default function StatsPage() {
  const { isAuthenticated, token, isLoading: authLoading, user } = useAuthStore()
  const { theme } = useThemeStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [activityLoading, setActivityLoading] = useState(false)
  const [heatmapLoading, setHeatmapLoading] = useState(false)
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false)
  const chartReady = true
  const [activityPeriod, setActivityPeriod] = useState<'7' | '30' | '365'>('7')
  const [activityOffset, setActivityOffset] = useState(0)
  const [activityDropdownOpen, setActivityDropdownOpen] = useState(false)
  const [heatmapRange, setHeatmapRange] = useState('rolling')
  const [timelineOffset, setTimelineOffset] = useState(0)
  const [showPaywall, setShowPaywall] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [heatmapTooltip, setHeatmapTooltip] = useState<HeatmapTooltip | null>(null)
  const activityPeriodRef = useRef(activityPeriod)
  const activityOffsetRef = useRef(activityOffset)
  const heatmapRangeRef = useRef(heatmapRange)
  const timelineOffsetRef = useRef(timelineOffset)
  const activityDropdownRef = useRef<HTMLDivElement>(null)
  
  const isDark = theme === 'dark'
  const isPro = Boolean(user?.isPro && (!user?.proExpiresAt || new Date(user.proExpiresAt) > new Date()))
  const shouldPromptRegister = !isAuthenticated || user?.isAnonymous

  const openPaywallOrRegister = () => {
    if (shouldPromptRegister) {
      setIsAuthModalOpen(true)
      return
    }

    setShowPaywall(true)
  }

  useEffect(() => {
    activityPeriodRef.current = activityPeriod
  }, [activityPeriod])

  useEffect(() => {
    activityOffsetRef.current = activityOffset
  }, [activityOffset])

  useEffect(() => {
    heatmapRangeRef.current = heatmapRange
  }, [heatmapRange])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activityDropdownRef.current && !activityDropdownRef.current.contains(e.target as Node)) {
        setActivityDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    timelineOffsetRef.current = timelineOffset
  }, [timelineOffset])

  useEffect(() => {
    setHasFetchedOnce(false)
  }, [token])

  type FetchMode = 'full' | 'timeline' | 'activity' | 'heatmap' | 'silent'

  const fetchStats = useCallback(async (options?: { mode?: FetchMode; period?: '7' | '30' | '365'; offset?: number; heatmapRange?: string; activityOffset?: number }) => {
    if (!token) {
      return
    }

    const mode = options?.mode ?? 'full'
    const period = options?.period ?? activityPeriodRef.current
    const selectedHeatmapRange = options?.heatmapRange ?? heatmapRangeRef.current
    const offset = Math.max(0, options?.offset ?? timelineOffsetRef.current)
    const actOffset = Math.max(0, options?.activityOffset ?? activityOffsetRef.current)

    if (mode === 'timeline') {
      setTimelineLoading(true)
    } else if (mode === 'activity') {
      setActivityLoading(true)
    } else if (mode === 'heatmap') {
      setHeatmapLoading(true)
    } else if (mode === 'full') {
      setLoading(true)
    }

    try {
      const response = await fetch(`/api/stats?period=${period}&timelineOffset=${offset}&heatmapRange=${selectedHeatmapRange}&activityOffset=${actOffset}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        if (typeof data?.heatmapPeriod?.selected === 'string') {
          setHeatmapRange(data.heatmapPeriod.selected)
          heatmapRangeRef.current = data.heatmapPeriod.selected
        }
        setHasFetchedOnce(true)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      if (mode === 'timeline') {
        setTimelineLoading(false)
      } else if (mode === 'activity') {
        setActivityLoading(false)
      } else if (mode === 'heatmap') {
        setHeatmapLoading(false)
      } else if (mode === 'full') {
        setLoading(false)
      }
    }
  }, [token])

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (isAuthenticated && token) {
      fetchStats({ mode: hasFetchedOnce ? 'silent' : 'full' })
    } else if (!isAuthenticated) {
      setLoading(false)
    }
  }, [authLoading, fetchStats, isAuthenticated, token])

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = Math.floor(minutes % 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const formatHours = (minutes: number) => {
    const hours = minutes / 60

    if (Number.isInteger(hours)) {
      return `${hours}h`
    }

    return `${hours.toFixed(1).replace(/\.0$/, '')}h`
  }

  const weeklyChartOptions: Highcharts.Options = {
    chart: { type: 'column', backgroundColor: 'transparent' },
    title: { text: '' },
    credits: { enabled: false },
    xAxis: {
      categories: stats?.weeklyActivity?.map(item => {
        if (activityPeriod === '365') {
          const [year, month] = item.date.split('-')
          const date = new Date(parseInt(year), parseInt(month) - 1, 1)
          return date.toLocaleDateString('en-US', { month: 'short' })
        } else {
          const date = new Date(item.date + 'T00:00:00')
          if (activityPeriod === '7') {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            return days[date.getDay()]
          } else {
            return date.getDate().toString()
          }
        }
      }) || [],
      lineColor: isDark ? '#475569' : '#e5e7eb',
      tickColor: isDark ? '#475569' : '#e5e7eb',
      labels: {
        rotation: 0,
        step: activityPeriod === '30' ? 2 : 1,
        style: { color: isDark ? '#cbd5e1' : '#6b7280' }
      }
    },
    yAxis: {
      title: { 
        text: 'Hours',
        style: { color: isDark ? '#cbd5e1' : '#6b7280' }
      },
      gridLineColor: isDark ? '#334155' : '#f3f4f6',
      labels: {
        formatter: function() { return formatDuration((this.value as number) * 60) },
        style: { color: isDark ? '#cbd5e1' : '#6b7280' }
      }
    },
    legend: { enabled: false },
    tooltip: {
      formatter: function() {
        return '<b>' + formatDuration((this.y as number) * 60) + ' hours</b>'
      }
    },
    plotOptions: {
      column: {
        borderRadius: 4,
        pointPadding: 0.1,
        groupPadding: 0.1
      }
    },
    series: [{
      type: 'column',
      name: 'Hours',
      data: stats?.weeklyActivity?.map(s => parseFloat((s.minutes / 60).toFixed(4))) || [],
      color: '#3b82f6'
    }]
  }

  const monthlyChartOptions: Highcharts.Options = {
    chart: { type: 'line', backgroundColor: 'transparent' },
    title: { text: '' },
    credits: { enabled: false },
    xAxis: {
      categories: stats?.monthlyBreakdown?.map(m => m.month) || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      lineColor: isDark ? '#475569' : '#e5e7eb',
      tickColor: isDark ? '#475569' : '#e5e7eb',
      labels: {
        style: { color: isDark ? '#cbd5e1' : '#6b7280' }
      }
    },
    yAxis: {
      title: { 
        text: 'Hours',
        style: { color: isDark ? '#cbd5e1' : '#6b7280' }
      },
      gridLineColor: isDark ? '#334155' : '#f3f4f6',
      labels: {
        formatter: function() { return formatDuration((this.value as number) * 60) },
        style: { color: isDark ? '#cbd5e1' : '#6b7280' }
      }
    },
    legend: { enabled: false },
    tooltip: {
      formatter: function() {
        return '<b>' + formatDuration((this.y as number) * 60) + ' hours</b>'
      }
    },
    plotOptions: {
      line: {
        marker: {
          enabled: true,
          radius: 4
        },
        lineWidth: 3
      }
    },
    series: [{
      type: 'line',
      name: 'Hours per Month',
      data: stats?.monthlyBreakdown?.map(m => parseFloat((m.minutes / 60).toFixed(4))) || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      color: '#3b82f6'
    }]
  }

  const taskTimePalette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']
  const taskTimeDistribution = (stats?.taskTimeDistribution || []).filter(item => item.minutes > 0)
  const totalTaskTimeMinutes = taskTimeDistribution.reduce((sum, item) => sum + item.minutes, 0)
  const sortedTaskTimeDistribution = [...taskTimeDistribution].sort((a, b) => b.minutes - a.minutes)
  const taskTimeData = sortedTaskTimeDistribution.map((item, index) => ({
    name: item.task,
    y: item.minutes,
    minutes: item.minutes,
    hoursLabel: formatHours(item.minutes),
    percentage: totalTaskTimeMinutes > 0 ? (item.minutes / totalTaskTimeMinutes) * 100 : 0,
    color: taskTimePalette[index % taskTimePalette.length]
  }))
  const taskTimeDisplayData = (() => {
    const topItems = taskTimeData.slice(0, 10)
    const otherMinutes = taskTimeData.slice(10).reduce((sum, item) => sum + item.minutes, 0)

    if (otherMinutes <= 0) {
      return topItems
    }

    return [
      ...topItems,
      {
        name: 'Other',
        y: otherMinutes,
        minutes: otherMinutes,
        hoursLabel: formatHours(otherMinutes),
        percentage: totalTaskTimeMinutes > 0 ? (otherMinutes / totalTaskTimeMinutes) * 100 : 0,
        color: '#94a3b8'
      }
    ]
  })()

  const taskTimeChartOptions: Highcharts.Options = {
    chart: { type: 'pie', backgroundColor: 'transparent' },
    title: { text: '' },
    credits: { enabled: false },
    tooltip: {
      pointFormat: '<b>{point.options.hoursLabel}</b> ({point.percentage:.1f}%)'
    },
    legend: { enabled: false },
    plotOptions: {
      pie: {
        innerSize: '55%',
        borderWidth: 0,
        dataLabels: { enabled: false }
      }
    },
    series: [{
      type: 'pie',
      name: 'Focus time',
      data: taskTimeDisplayData as any
    }]
  }

  const totalPomodoros = stats?.totalPomodoros || 0
  const totalHours = Math.floor((stats?.totalFocusMinutes || 0) / 60)
  const totalMinutesRemainder = (stats?.totalFocusMinutes || 0) % 60
  const currentStreak = stats?.currentStreak || 0
  const avgTimePerDay = stats?.avgMinutesPerDay || 0
  const focusTimeThisMonth = Math.floor((stats?.focusTimeThisMonth || 0) / 60)
  const focusTimeThisMonthMinutes = (stats?.focusTimeThisMonth || 0) % 60
  const resolvedHeatmapRange = stats?.heatmapPeriod?.selected || heatmapRange
  const yearlyHeatmap = stats?.yearlyHeatmap || []
  const heatmapMaxDailyMinutes = yearlyHeatmap.reduce((max, day) => Math.max(max, day.minutes), 0)

  const totalHeatmapMinutes = yearlyHeatmap.reduce((sum, day) => sum + day.minutes, 0)
  const totalHeatmapHours = Math.floor(totalHeatmapMinutes / 60)
  const totalHeatmapRemainderList = String(totalHeatmapMinutes % 60).padStart(2, '0')
  const activeHeatmapDays = yearlyHeatmap.filter((day) => day.minutes > 0)
  const heatmapBestDay = activeHeatmapDays.reduce<HeatmapDay | null>((bestDay, day) => {
    if (!bestDay || day.minutes > bestDay.minutes) {
      return day
    }

    return bestDay
  }, null)
  const heatmapLatestActiveDay = activeHeatmapDays.reduce<HeatmapDay | null>((latestDay, day) => {
    if (!latestDay || day.date > latestDay.date) {
      return day
    }

    return latestDay
  }, null)

  let heatmapCurrentStreak = 0
  if (heatmapLatestActiveDay) {
    const activeHeatmapDates = new Set(activeHeatmapDays.map((day) => day.date))
    let streakDate = new Date(heatmapLatestActiveDay.date + 'T00:00:00')

    while (activeHeatmapDates.has(streakDate.toISOString().slice(0, 10))) {
      heatmapCurrentStreak += 1
      streakDate.setDate(streakDate.getDate() - 1)
    }
  }

  const heatmapRangeCaption = resolvedHeatmapRange === 'rolling' ? 'Last 365 days' : resolvedHeatmapRange

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
        label: date.toLocaleDateString('en-US', { month: 'short' }),
        column: columnIndex
      })
    }
  })

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
      return 'No tracked activity'
    }

    const formattedDate = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })

    if (day.minutes <= 0) {
      return `${formattedDate}: 0h`
    }

    return `${formattedDate}: ${formatHours(day.minutes)}`
  }

  const showHeatmapTooltipAt = (label: string, x: number, y: number) => {
    setHeatmapTooltip({
      label,
      x,
      y
    })
  }

  const showHeatmapTooltip = (label: string, event: ReactMouseEvent<HTMLButtonElement>) => {
    showHeatmapTooltipAt(label, event.clientX, event.clientY)
  }

  const showHeatmapTooltipFromFocus = (label: string, event: ReactFocusEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    showHeatmapTooltipAt(label, bounds.left + bounds.width / 2, bounds.top)
  }

  const hideHeatmapTooltip = () => {
    setHeatmapTooltip(null)
  }

  const lastSevenDays = stats?.lastSevenDaysTimeline || []
  const bestDayName = stats?.productivityTrends?.bestDay?.name || 'No data'
  const activityItems = stats?.weeklyActivity || []
  const activityTotalMinutes = activityItems.reduce((sum, item) => sum + item.minutes, 0)
  const activityActiveUnits = activityItems.filter((item) => item.minutes > 0).length
  const activityActiveUnitsLabel = activityPeriod === '365'
    ? `${activityActiveUnits} active months`
    : `${activityActiveUnits} active days`

  const getSessionColor = (type: string) => {
    switch (type) {
      case 'WORK':
        return 'bg-red-500'
      case 'TIME_TRACKING':
        return 'bg-indigo-500'
      case 'SHORT_BREAK':
        return 'bg-emerald-500'
      case 'LONG_BREAK':
        return 'bg-blue-500'
      default:
        return 'bg-slate-500'
    }
  }

  const formatTimeRange = (start: string, end: string) => {
    const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
    const startStr = new Date(start).toLocaleTimeString('en-US', opts)
    const endStr = new Date(end).toLocaleTimeString('en-US', opts)
    return `${startStr} - ${endStr}`
  }

  const timeLabels = [0, 6, 12, 18, 24]

  const getTimelineRangeLabel = () => {
    if (!lastSevenDays.length) return ''
    const timestamps = lastSevenDays.map(day => new Date(day.date).getTime())
    const minDate = new Date(Math.min(...timestamps))
    const maxDate = new Date(Math.max(...timestamps))
    const formatOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    return `${minDate.toLocaleDateString('en-US', formatOpts)} — ${maxDate.toLocaleDateString('en-US', formatOpts)}`
  }

  const handleTimelineOffsetChange = (nextOffset: number) => {
    const safeOffset = Math.max(0, nextOffset)
    setTimelineOffset(safeOffset)
    timelineOffsetRef.current = safeOffset
    fetchStats({ mode: hasFetchedOnce ? 'timeline' : 'full', offset: safeOffset })
  }

  const handleActivityPeriodChange = (period: '7' | '30' | '365') => {
    setActivityPeriod(period)
    activityPeriodRef.current = period
    setActivityOffset(0)
    activityOffsetRef.current = 0
    setActivityDropdownOpen(false)
    fetchStats({ mode: hasFetchedOnce ? 'activity' : 'full', period, activityOffset: 0 })
  }

  const handleActivityOffsetChange = (direction: 'prev' | 'next') => {
    const newOffset = direction === 'prev' ? activityOffset + 1 : Math.max(0, activityOffset - 1)
    setActivityOffset(newOffset)
    activityOffsetRef.current = newOffset
    fetchStats({ mode: hasFetchedOnce ? 'activity' : 'full', activityOffset: newOffset })
  }

  const getActivityRangeLabel = () => {
    if (!stats?.activityRange) return ''
    const start = new Date(stats.activityRange.start + 'T00:00:00')
    const end = new Date(stats.activityRange.end + 'T00:00:00')
    if (activityPeriod === '365') {
      return start.getFullYear().toString()
    }
    if (activityPeriod === '30') {
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }

    const startDay = start.getDate()
    const endDay = end.getDate()
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
    const startYear = start.getFullYear()
    const endYear = end.getFullYear()

    if (startMonth === endMonth && startYear === endYear) {
      return `${startDay}-${endDay} ${endMonth} ${endYear}`
    }

    if (startYear === endYear) {
      return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${endYear}`
    }

    return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`
  }

  const getActivityPeriodLabel = () => {
    if (activityOffset === 0) {
      if (activityPeriod === '7') return 'This week'
      if (activityPeriod === '30') return 'This month'
      return 'This year'
    }
    if (activityPeriod === '7') return 'Week'
    if (activityPeriod === '30') return 'Month'
    return 'Year'
  }

  const handleHeatmapRangeChange = (nextRange: string) => {
    setHeatmapRange(nextRange)
    heatmapRangeRef.current = nextRange
    fetchStats({ mode: hasFetchedOnce ? 'heatmap' : 'full', heatmapRange: nextRange })
  }

  const SkeletonCard = () => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
        <div className="h-4 w-12 bg-gray-200 dark:bg-slate-700 rounded"></div>
      </div>
      <div className="h-8 w-24 bg-gray-200 dark:bg-slate-700 rounded mb-2"></div>
      <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
    </div>
  )

  const SkeletonChart = () => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 animate-pulse">
      <div className="h-6 w-40 bg-gray-200 dark:bg-slate-700 rounded mb-6"></div>
      <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
    </div>
  )

  const ProPaywall = ({ children }: { children?: ReactNode }) => (
    <div className="relative mb-8">
      <div className="pointer-events-none select-none opacity-25 blur-[10px] saturate-50">
        {children ?? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <SkeletonChart />
              <SkeletonChart />
            </div>
            <div className="mb-8">
              <SkeletonChart />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <SkeletonChart />
              <SkeletonChart />
            </div>
          </>
        )}
      </div>

      <div className="absolute inset-0 flex items-start justify-center px-4 pt-4 sm:pt-6">
        <div className="w-full max-w-xl bg-white/90 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 px-3 py-1 text-xs font-semibold mb-4 shadow-lg">
            PRO
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Upgrade to Pro to unlock extended statistics
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">
            Heatmap, activity timelines, productivity trends, and task analytics are available in Pro.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={openPaywallOrRegister}
              className="inline-flex items-center justify-center rounded-xl bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm font-semibold transition-colors"
            >
              Buy Pro
            </button>
            {/* <a
              href="/settings"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Manage subscription
            </a> */}
          </div>

          {!isAuthenticated && (
            <div className="mt-4 text-xs text-gray-500 dark:text-slate-400">
              Sign in to purchase and activate Pro on your account.
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const HeatmapSection = (
    <div
      className="relative mb-8"
      aria-busy={heatmapLoading}
    >
      {heatmapLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[24px] bg-white/70 backdrop-blur-sm">
          <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {heatmapTooltip && (
        <div
          className="pointer-events-none fixed z-[70] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.14)]"
          style={{ left: heatmapTooltip.x + 12, top: heatmapTooltip.y - 36 }}
        >
          {heatmapTooltip.label}
        </div>
      )}

      <div className="relative rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {totalHeatmapHours}:{totalHeatmapRemainderList} Total hours {resolvedHeatmapRange === 'rolling' ? 'in the last 365 days' : `in ${resolvedHeatmapRange}`}
          </div>
          <select
            value={resolvedHeatmapRange}
            onChange={(event) => handleHeatmapRangeChange(event.target.value)}
            className="h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-medium text-gray-700 dark:text-slate-300 outline-none transition-colors hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 focus:ring-2 focus:ring-indigo-500"
            aria-label="Select heatmap year range"
          >
            <option value="rolling">Last 365 days</option>
            {(stats?.heatmapPeriod?.availableYears || []).map((year) => (
              <option key={year} value={year.toString()}>{year}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="w-fit mx-auto">
            <div className="flex gap-3">
              <div className="mt-[28px] flex w-fit shrink-0 flex-col gap-[3px] md:gap-[4px] text-[10px] font-medium text-gray-400 dark:text-slate-500">
                {heatmapDayLabels.map((label, index) => (
                  <div key={label} className="flex h-[16px] md:h-[17px] items-center justify-end pr-1 leading-none">
                    {index % 2 === 1 ? label : ''}
                  </div>
                ))}
              </div>

              <div className="w-fit shrink-0">
                <div className="relative mb-3 h-4 overflow-hidden">
                  {heatmapMonthMarkers.map((marker, markerIndex) => {
                    const left = heatmapColumns.length <= 1
                      ? 0
                      : (marker.column / Math.max(heatmapColumns.length - 1, 1)) * 100
                    const isFirstMarker = markerIndex === 0
                    const isLastMarker = markerIndex === heatmapMonthMarkers.length - 1

                    return (
                      <span
                        key={`${marker.label}-${marker.column}`}
                        className="absolute top-0 text-xs font-medium text-gray-500 dark:text-slate-400"
                        style={{
                          left: `${left}%`,
                          transform: isFirstMarker
                            ? 'translateX(0)'
                            : isLastMarker
                              ? 'translateX(-100%)'
                              : 'translateX(-10%)'
                        }}
                      >
                        {marker.label}
                      </span>
                    )
                  })}
                </div>

                <div className="flex gap-[3px] md:gap-[4px]">
                  {heatmapColumns.map((column) => (
                    <div key={column.week} className="flex flex-col gap-[3px] md:gap-[4px]">
                      {column.days.map((day, dayIndex) => {
                        if (!day) {
                          return <div key={`${column.week}-${dayIndex}-empty`} className="h-[16px] w-[16px] md:h-[17px] md:w-[17px]" />
                        }

                        const intensity = getHeatmapIntensity(day.minutes)
                        const label = formatHeatmapCellLabel(day)

                        return (
                          <button
                            type="button"
                            key={`${column.week}-${dayIndex}`}
                            title={label}
                            aria-label={label}
                            onMouseEnter={(event) => showHeatmapTooltip(label, event)}
                            onMouseMove={(event) => showHeatmapTooltip(label, event)}
                            onMouseLeave={hideHeatmapTooltip}
                            onFocus={(event) => showHeatmapTooltipFromFocus(label, event)}
                            onBlur={hideHeatmapTooltip}
                            className={`h-[16px] w-[16px] md:h-[17px] md:w-[17px] rounded-[4px] transition-transform duration-150 hover:scale-110 focus:scale-110 focus:outline-none ${heatmapCellClasses[intensity]}`}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end text-xs text-gray-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Less</span>
            <div className="flex items-center gap-[3px]">
              {heatmapCellClasses.map((cellClass, index) => (
                <div key={index} className={`h-[15px] w-[15px] rounded-[3px] md:h-[16px] md:w-[16px] ${cellClass}`} />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-center">
            <div className="text-2xl font-bold text-slate-900">{formatDuration(heatmapBestDay?.minutes || 0)}</div>
            <div className="text-sm font-medium text-slate-700">Best Day</div>
            <div className="text-xs text-slate-500">Hours</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-center">
            <div className="text-2xl font-bold text-slate-900">{activeHeatmapDays.length}</div>
            <div className="text-sm font-medium text-slate-700">Active Days</div>
            <div className="text-xs text-slate-500">{heatmapRangeCaption}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-center">
            <div className="text-2xl font-bold text-slate-900">{heatmapCurrentStreak}</div>
            <div className="text-sm font-medium text-slate-700">Current Streak</div>
            <div className="text-xs text-slate-500">days in a row</div>
          </div>
        </div>
      </div>
    </div>
  )



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Statistics</h1>
          <p className="text-gray-600 dark:text-slate-300">Track your productivity and progress</p>
        </div>

        {loading ? (
          <>
            {/* Skeleton Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>

            {/* Skeleton Advanced */}
            {isPro ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <SkeletonChart />
                  <SkeletonChart />
                </div>
                <div className="mb-8">
                  <SkeletonChart />
                </div>
                <div className="mb-8">
                  <SkeletonChart />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
                  <SkeletonChart />
                  <SkeletonChart />
                </div>
              </>
            ) : (
              <ProPaywall />
            )}
          </>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faClock} className="text-red-600 text-lg" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{totalPomodoros.toLocaleString()}</div>
                <div className="text-sm text-gray-600 dark:text-slate-300">Total Pomodoros</div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faStopwatch} className="text-blue-600 text-lg" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{totalHours}h {totalMinutesRemainder}m</div>
                <div className="text-sm text-gray-600 dark:text-slate-300">Total Focus Time</div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faCalendarCheck} className="text-orange-600 text-lg" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{currentStreak}</div>
                <div className="text-sm text-gray-600 dark:text-slate-300">Current Streak</div>
                <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">days in a row</div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faCalendarDays} className="text-purple-600 text-lg" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{avgTimePerDay}m</div>
                <div className="text-sm text-gray-600 dark:text-slate-300">Average Daily Time</div>
                <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">On active days</div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faFire} className="text-green-600 text-lg" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{focusTimeThisMonth}h {focusTimeThisMonthMinutes}m</div>
                <div className="text-sm text-gray-600 dark:text-slate-300">Focus Time</div>
                <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">This month</div>
              </div>
            </div>

            {!isPro ? (
              <ProPaywall>
                {!chartReady ? (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                      <SkeletonChart />
                      <SkeletonChart />
                    </div>
                    <div className="mb-8">
                      <SkeletonChart />
                    </div>
                    <div className="mb-8">
                      <SkeletonChart />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
                      <SkeletonChart />
                      <SkeletonChart />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                      <LatestActivity
                        token={token}
                        isAuthenticated={isAuthenticated}
                        onChange={() => fetchStats({ mode: hasFetchedOnce ? 'silent' : 'full' })}
                      />

                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 relative" aria-busy={timelineLoading}>
                        {timelineLoading && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl">
                            <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
                          <div className="flex flex-col gap-1">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Last 7 Days</h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Recent focus timelines</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleTimelineOffsetChange(timelineOffset + 7)}
                              className="text-xs px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                              aria-label="Previous week"
                            >
                              &lt;
                            </button>
                            <div className="text-xs font-medium text-gray-700 dark:text-slate-200 min-w-[130px] text-center">
                              {getTimelineRangeLabel() || '—'}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleTimelineOffsetChange(Math.max(0, timelineOffset - 7))}
                              disabled={timelineOffset === 0}
                              className={`text-xs px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors ${
                                timelineOffset === 0
                                  ? 'text-gray-400 dark:text-slate-500 cursor-not-allowed'
                                  : 'text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
                              }`}
                              aria-label="Next week"
                            >
                              &gt;
                            </button>
                          </div>
                        </div>

                        {lastSevenDays.length === 0 ? (
                          <div className="text-sm text-gray-500 dark:text-slate-400 text-center py-10">
                            No sessions for the last week yet.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {lastSevenDays.map(day => {
                              const focusSessions = day.sessions.filter(session => session.type === 'WORK' || session.type === 'TIME_TRACKING')
                              return (
                                <div key={day.date} className="flex items-center">
                                  <div className="relative flex-1 h-8 rounded-lg border border-gray-100 dark:border-slate-700 bg-slate-900/5 dark:bg-slate-900 overflow-hidden min-w-[260px]">
                                    <div className="pointer-events-none absolute inset-0">
                                      {Array.from({ length: 25 }).map((_, idx) => {
                                        // Пропускаем первую (0) и последнюю (24) линии
                                        if (idx === 0 || idx === 24) return null

                                        const left = (idx / 24) * 100
                                        const isMajor = idx % 6 === 0
                                        return (
                                          <div
                                            key={idx}
                                            className={`absolute ${isMajor ? 'h-full bg-gray-300 dark:bg-slate-600' : 'h-1/2 top-1/4 bg-gray-200 dark:bg-slate-700'}`}
                                            style={{ width: '1px', left: `${left}%` }}
                                          />
                                        )
                                      })}
                                    </div>

                                    {focusSessions.length > 0 &&
                                      focusSessions.map(session => {
                                        const start = new Date(session.start)
                                        const end = new Date(session.end)
                                        const startMinutes = (start.getHours() * 60) + start.getMinutes()
                                        const endMinutes = Math.min(1440, (end.getHours() * 60) + end.getMinutes())
                                        const durationMinutes = Math.max(1, endMinutes - startMinutes || session.duration)
                                        const left = Math.max(0, (startMinutes / 1440) * 100)
                                        const width = Math.min(100 - left, (durationMinutes / 1440) * 100)
                                        return (
                                          <div
                                            key={session.id}
                                            className={`absolute top-1/2 -translate-y-1/2 h-5 rounded-md ${getSessionColor(session.type)} shadow-sm`}
                                            style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
                                            title={`${formatTimeRange(session.start, session.end)} · ${session.task}`}
                                          >
                                            <span className="absolute inset-0 bg-white/10 dark:bg-slate-900/10 rounded-md" />
                                          </div>
                                        )
                                      })}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        <div className="relative mt-2 h-5 text-[11px] text-gray-500 dark:text-slate-400">
                          {timeLabels.map((label, idx) => {
                            const left = (label / 24) * 100
                            const translateX = idx === 0 ? '0%' : idx === timeLabels.length - 1 ? '-100%' : '-50%'
                            return (
                              <span
                                key={label}
                                className="absolute top-0"
                                style={{ left: `${left}%`, transform: `translateX(${translateX})` }}
                              >
                                {String(label).padStart(2, '0')}:00
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Weekly Chart */}
                    <div className="mb-8">
                      <div
                        className="relative bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6"
                        aria-busy={activityLoading}
                      >
                        {activityLoading && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl">
                            <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {activityPeriod === '7' && 'Weekly Activity'}
                            {activityPeriod === '30' && 'Monthly Activity'}
                            {activityPeriod === '365' && 'Yearly Activity'}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => handleActivityPeriodChange('7')}
                              className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                                activityPeriod === '7'
                                  ? 'text-white bg-blue-500'
                                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              7d
                            </button>
                            <button
                              onClick={() => handleActivityPeriodChange('30')}
                              className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                                activityPeriod === '30'
                                  ? 'text-white bg-blue-500'
                                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              30d
                            </button>
                            <button
                              onClick={() => handleActivityPeriodChange('365')}
                              className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                                activityPeriod === '365'
                                  ? 'text-white bg-blue-500'
                                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              Year
                            </button>
                          </div>
                        </div>
                        <HighchartsReact highcharts={Highcharts} options={weeklyChartOptions} />
                      </div>
                    </div>

                    {HeatmapSection}

                    {/* Productivity Trends & Monthly Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Productivity Trends</h3>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-xl">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                <FontAwesomeIcon icon={faArrowUp} className="text-green-600 dark:text-green-400 text-sm" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">Best Time</div>
                                <div className="text-xs text-gray-500 dark:text-slate-400">
                                  {stats?.productivityTrends?.bestTime?.start || '00:00'} - {stats?.productivityTrends?.bestTime?.end || '00:00'}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-gray-900 dark:text-white">{stats?.productivityTrends?.bestTime?.efficiency || 0}%</div>
                              <div className="text-xs text-gray-500 dark:text-slate-400">efficiency</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-xl">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <FontAwesomeIcon icon={faCalendar} className="text-blue-600 dark:text-blue-400 text-sm" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">Best Day</div>
                                <div className="text-xs text-gray-500 dark:text-slate-400">{bestDayName}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-gray-900 dark:text-white">{stats?.productivityTrends?.bestDay?.avgPomodoros || '0'}</div>
                              <div className="text-xs text-gray-500 dark:text-slate-400">avg. pomodoros</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-xl">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                <FontAwesomeIcon icon={faBullseye} className="text-purple-600 dark:text-purple-400 text-sm" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">Focus Mode</div>
                                <div className="text-xs text-gray-500 dark:text-slate-400">Average duration</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-gray-900 dark:text-white">{stats?.productivityTrends?.avgSessionDuration || 0}m</div>
                              <div className="text-xs text-gray-500 dark:text-slate-400">per session</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-xl">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                                <FontAwesomeIcon icon={faTasks} className="text-orange-600 dark:text-orange-400 text-sm" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">Completed Tasks</div>
                                <div className="text-xs text-gray-500 dark:text-slate-400">This week</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-gray-900 dark:text-white">{stats?.productivityTrends?.weeklyTasks?.completed || 0}</div>
                              <div className="text-xs text-gray-500 dark:text-slate-400">of {stats?.productivityTrends?.weeklyTasks?.total || 0}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Monthly Breakdown</h3>
                        <HighchartsReact highcharts={Highcharts} options={monthlyChartOptions} />
                      </div>
                    </div>

                    {/* Task Statistics */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Task Time Distribution</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">By total focus minutes</p>
                      </div>

                      {taskTimeDisplayData.length === 0 ? (
                        <div className="text-sm text-gray-500 dark:text-slate-400 py-8 text-center">
                          No tracked focus time by task yet.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 sm:gap-6 items-center">
                          <div>
                            <HighchartsReact highcharts={Highcharts} options={taskTimeChartOptions} />
                          </div>
                          <div className="space-y-3">
                            {taskTimeDisplayData.map(item => (
                              <div key={item.name} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-3 h-3 rounded-full shrink-0"
                                    style={{ backgroundColor: item.color }}
                                  />
                                  <span className="text-sm text-gray-800 dark:text-slate-100 truncate">{item.name}</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                  {item.hoursLabel} ({item.percentage.toFixed(1)}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </ProPaywall>
            ) : !chartReady ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <SkeletonChart />
                  <SkeletonChart />
                </div>
                <div className="mb-8">
                  <SkeletonChart />
                </div>
                <div className="mb-8">
                  <SkeletonChart />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
                  <SkeletonChart />
                  <SkeletonChart />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <LatestActivity
                    token={token}
                    isAuthenticated={isAuthenticated}
                    onChange={() => fetchStats({ mode: hasFetchedOnce ? 'silent' : 'full' })}
                  />

                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 relative" aria-busy={timelineLoading}>
                    {timelineLoading && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl">
                        <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Last 7 Days</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Recent focus timelines</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleTimelineOffsetChange(timelineOffset + 7)}
                          className="text-xs px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                          aria-label="Previous week"
                        >
                          &lt;
                        </button>
                        <div className="text-xs font-medium text-gray-700 dark:text-slate-200 min-w-[130px] text-center">
                          {getTimelineRangeLabel() || '—'}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTimelineOffsetChange(Math.max(0, timelineOffset - 7))}
                          disabled={timelineOffset === 0}
                          className={`text-xs px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors ${
                            timelineOffset === 0
                              ? 'text-gray-400 dark:text-slate-500 cursor-not-allowed'
                              : 'text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
                          }`}
                          aria-label="Next week"
                        >
                          &gt;
                        </button>
                      </div>
                    </div>

                    {lastSevenDays.length === 0 ? (
                      <div className="text-sm text-gray-500 dark:text-slate-400 text-center py-10">
                        No sessions for the last week yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {lastSevenDays.map(day => {
                          const focusSessions = day.sessions.filter(session => session.type === 'WORK' || session.type === 'TIME_TRACKING')
                          const dayLabel = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short'
                          })
                          return (
                            <div key={day.date} className="flex items-center gap-2">
                              <div className="shrink-0 text-right text-xs font-semibold text-gray-900 dark:text-white">
                                {dayLabel}
                              </div>
                              <div className="relative flex-1 h-8 rounded-lg border border-gray-100 dark:border-slate-700 bg-slate-900/5 dark:bg-slate-900 overflow-hidden min-w-[260px]">
                                <div className="pointer-events-none absolute inset-0">
                                  {Array.from({ length: 25 }).map((_, idx) => {
                                    // Пропускаем первую (0) и последнюю (24) линии
                                    if (idx === 0 || idx === 24) return null

                                    const left = (idx / 24) * 100
                                    const isMajor = idx % 6 === 0
                                    return (
                                      <div
                                        key={idx}
                                        className={`absolute ${isMajor ? 'h-full bg-gray-300 dark:bg-slate-600' : 'h-1/2 top-1/4 bg-gray-200 dark:bg-slate-700'}`}
                                        style={{ width: '1px', left: `${left}%` }}
                                      />
                                    )
                                  })}
                                </div>

                                {focusSessions.length > 0 &&
                                  focusSessions.map(session => {
                                    const start = new Date(session.start)
                                    const end = new Date(session.end)
                                    const startMinutes = (start.getHours() * 60) + start.getMinutes()
                                    const endMinutes = Math.min(1440, (end.getHours() * 60) + end.getMinutes())
                                    const durationMinutes = Math.max(1, endMinutes - startMinutes || session.duration)
                                    const left = Math.max(0, (startMinutes / 1440) * 100)
                                    const width = Math.min(100 - left, (durationMinutes / 1440) * 100)
                                    return (
                                      <div
                                        key={session.id}
                                        className={`absolute top-1/2 -translate-y-1/2 h-5 rounded-md ${getSessionColor(session.type)} shadow-sm`}
                                        style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
                                        title={`${formatTimeRange(session.start, session.end)} · ${session.task}`}
                                      >
                                        <span className="absolute inset-0 bg-white/10 dark:bg-slate-900/10 rounded-md" />
                                      </div>
                                    )
                                  })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <div className="mt-2 flex items-start gap-2">
                      <div className="w-12 shrink-0" />
                      <div className="relative flex-1 h-5 text-[11px] text-gray-500 dark:text-slate-400 min-w-[260px]">
                        {timeLabels.map((label, idx) => {
                          const left = (label / 24) * 100
                          const translateX = idx === 0 ? '0%' : idx === timeLabels.length - 1 ? '-100%' : '-50%'
                          return (
                            <span
                              key={label}
                              className="absolute top-0"
                              style={{ left: `${left}%`, transform: `translateX(${translateX})` }}
                            >
                              {String(label).padStart(2, '0')}:00
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Weekly Chart */}
                <div className="mb-8">
                  <div
                    className="relative bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6"
                    aria-busy={activityLoading}
                  >
                    {activityLoading && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl">
                        <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={() => handleActivityOffsetChange('prev')}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                          aria-label="Previous period"
                        >
                          &lt;
                        </button>

                        <div className="relative" ref={activityDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setActivityDropdownOpen(prev => !prev)}
                            className="inline-flex h-9 min-w-[190px] items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 px-4 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-center"
                          >
                            {getActivityRangeLabel() || getActivityPeriodLabel()}
                          </button>

                          {activityDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg py-1 min-w-[160px]">
                              <button
                                type="button"
                                onClick={() => handleActivityPeriodChange('7')}
                                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                  activityPeriod === '7' && activityOffset === 0
                                    ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 font-medium'
                                    : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                              >
                                This week
                              </button>
                              <button
                                type="button"
                                onClick={() => handleActivityPeriodChange('30')}
                                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                  activityPeriod === '30' && activityOffset === 0
                                    ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 font-medium'
                                    : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                              >
                                This month
                              </button>
                              <button
                                type="button"
                                onClick={() => handleActivityPeriodChange('365')}
                                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                  activityPeriod === '365' && activityOffset === 0
                                    ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 font-medium'
                                    : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                              >
                                This year
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleActivityOffsetChange('next')}
                          disabled={activityOffset === 0}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 transition-colors ${
                            activityOffset === 0
                              ? 'text-gray-400 dark:text-slate-500 cursor-not-allowed'
                              : 'text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
                          }`}
                          aria-label="Next period"
                        >
                          &gt;
                        </button>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDuration(activityTotalMinutes)} Total hours
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                          {activityActiveUnitsLabel}
                        </div>
                      </div>
                    </div>
                    <HighchartsReact highcharts={Highcharts} options={weeklyChartOptions} />
                  </div>
                </div>

                {HeatmapSection}

                {/* Productivity Trends & Monthly Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Productivity Trends</h3>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <FontAwesomeIcon icon={faArrowUp} className="text-green-600 dark:text-green-400 text-sm" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">Best Time</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">
                              {stats?.productivityTrends?.bestTime?.start || '00:00'} - {stats?.productivityTrends?.bestTime?.end || '00:00'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{stats?.productivityTrends?.bestTime?.efficiency || 0}%</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">efficiency</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <FontAwesomeIcon icon={faCalendar} className="text-blue-600 dark:text-blue-400 text-sm" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">Best Day</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">{bestDayName}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{stats?.productivityTrends?.bestDay?.avgPomodoros || '0'}</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">avg. pomodoros</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                            <FontAwesomeIcon icon={faBullseye} className="text-purple-600 dark:text-purple-400 text-sm" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">Focus Mode</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">Average duration</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{stats?.productivityTrends?.avgSessionDuration || 0}m</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">per session</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                            <FontAwesomeIcon icon={faTasks} className="text-orange-600 dark:text-orange-400 text-sm" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">Completed Tasks</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">This week</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{stats?.productivityTrends?.weeklyTasks?.completed || 0}</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">of {stats?.productivityTrends?.weeklyTasks?.total || 0}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Monthly Breakdown</h3>
                    <HighchartsReact highcharts={Highcharts} options={monthlyChartOptions} />
                  </div>
                </div>

                {/* Task Statistics */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Task Time Distribution</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">By total focus minutes</p>
                  </div>

                  {taskTimeDisplayData.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-slate-400 py-8 text-center">
                      No tracked focus time by task yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 sm:gap-6 items-center">
                      <div>
                        <HighchartsReact highcharts={Highcharts} options={taskTimeChartOptions} />
                      </div>
                      <div className="space-y-3">
                        {taskTimeDisplayData.map(item => (
                          <div key={item.name} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-sm text-gray-800 dark:text-slate-100 truncate">{item.name}</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                              {item.hoursLabel} ({item.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

          </>
        )}

        {/* Achievements */}
        {/* <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6"
        >
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Achievements</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl text-center hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <FontAwesomeIcon icon={faMedal} className="text-yellow-600 dark:text-yellow-400 text-2xl" />
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">First Pomodoro</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">Unlocked</div>
            </div>

            <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl text-center hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <FontAwesomeIcon icon={faFire} className="text-orange-600 dark:text-orange-400 text-2xl" />
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">Week Streak</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">Unlocked</div>
            </div>

            <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl text-center hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <FontAwesomeIcon icon={faCrown} className="text-purple-600 dark:text-purple-400 text-2xl" />
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">1000 Pomodoros</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">Unlocked</div>
            </div>

            <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl text-center opacity-50">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <FontAwesomeIcon icon={faRocket} className="text-gray-400 dark:text-slate-500 text-2xl" />
              </div>
              <div className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">5000 Pomodoros</div>
              <div className="text-xs text-gray-400 dark:text-slate-500">{totalPomodoros}/5000</div>
            </div>
          </div>
        </motion.div> */}

      </main>
      {!isPro && showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode="register" />
    </div>
  )
}
