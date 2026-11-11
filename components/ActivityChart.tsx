'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import './ActivityChart.css'
import { useI18n } from '@/components/I18nProvider'

export type ActivityPeriod = '7' | '30' | '365'
type ActivityData = {
  weeklyActivity?: Array<{ date: string; minutes: number }>
  activityRange?: { start: string; end: string }
}

export default function ActivityChart({ stats, activityPeriod, activityOffset, onPeriodChange, onOffsetChange }: {
  stats: ActivityData | null
  activityPeriod: ActivityPeriod
  activityOffset: number
  onPeriodChange: (period: ActivityPeriod) => void
  onOffsetChange: (direction: 'prev' | 'next') => void
}) {
  const { t, language } = useI18n()
  const locale = language === 'es' ? 'es-ES' : 'en-US'
  const dropdownId = useId()
  const [activityDropdownOpen, setActivityDropdownOpen] = useState(false)
  const activityDropdownRef = useRef<HTMLDivElement>(null)
  const formatDuration = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(Math.floor(minutes % 60)).padStart(2, '0')}`
  const handleActivityPeriodChange = (period: ActivityPeriod) => {
    setActivityDropdownOpen(false)
    activityDropdownRef.current?.querySelector('button')?.focus()
    onPeriodChange(period)
  }
  const handleActivityOffsetChange = onOffsetChange
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activityDropdownRef.current && !activityDropdownRef.current.contains(e.target as Node)) {
        setActivityDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const weeklyChartOptions: Highcharts.Options = {
    chart: { type: 'column', height: 240, backgroundColor: 'transparent', style: { fontFamily: 'Inter, system-ui, sans-serif' }, animation: false },
    title: { text: '' },
    credits: { enabled: false },
    xAxis: {
      categories: stats?.weeklyActivity?.map(item => {
        if (activityPeriod === '365') {
          const [year, month] = item.date.split('-')
          const date = new Date(parseInt(year), parseInt(month) - 1, 1)
          return date.toLocaleDateString(locale, { month: 'short' })
        } else {
          const date = new Date(item.date + 'T00:00:00')
          if (activityPeriod === '7') {
            const days = language === 'es'
              ? ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
              : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            return days[date.getDay()]
          } else {
            return date.getDate().toString()
          }
        }
      }) || [],
      lineColor: 'var(--pixel-line)',
      tickColor: 'var(--pixel-line)',
      labels: {
        rotation: 0,
        step: activityPeriod === '30' ? 2 : 1,
        style: { color: 'var(--pixel-muted)' }
      }
    },
    yAxis: {
      title: {
        text: t.stats.hours,
        style: { color: 'var(--pixel-muted)' }
      },
      gridLineColor: 'var(--pixel-screen)',
      labels: {
        formatter: function() { return formatDuration((this.value as number) * 60) },
        style: { color: 'var(--pixel-muted)' }
      }
    },
    legend: { enabled: false },
    tooltip: {
      backgroundColor: 'var(--pixel-paper)',
      borderColor: 'var(--pixel-line)',
      borderRadius: 2,
      shadow: false,
      style: { color: 'var(--pixel-ink)' },
      formatter: function() {
        return '<b>' + formatDuration((this.y as number) * 60) + ` ${t.stats.hoursLowercase}</b>`
      }
    },
    plotOptions: {
      series: { animation: false },
      column: {
        borderRadius: 0,
        pointPadding: 0.1,
        groupPadding: 0.1
      }
    },
    series: [{
      type: 'column',
      name: t.stats.hours,
      data: stats?.weeklyActivity?.map(s => parseFloat((s.minutes / 60).toFixed(4))) || [],
      color: 'var(--pixel-accent)'
    }]
  }

  const activityItems = stats?.weeklyActivity || []
  const activityTotalMinutes = activityItems.reduce((sum, item) => sum + item.minutes, 0)
  const activityActiveUnits = activityItems.filter((item) => item.minutes > 0).length
  const activityActiveUnitsLabel = activityPeriod === '365'
    ? `${activityActiveUnits} ${t.stats.activeMonths}`
    : `${activityActiveUnits} ${t.stats.activeDays}`

  const getActivityRangeLabel = () => {
    if (!stats?.activityRange) return ''
    const start = new Date(stats.activityRange.start + 'T00:00:00')
    const end = new Date(stats.activityRange.end + 'T00:00:00')
    if (activityPeriod === '365') {
      return start.getFullYear().toString()
    }
    if (activityPeriod === '30') {
      return start.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    }

    const startDay = start.getDate()
    const endDay = end.getDate()
    const startMonth = start.toLocaleDateString(locale, { month: 'short' })
    const endMonth = end.toLocaleDateString(locale, { month: 'short' })
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
      if (activityPeriod === '7') return t.stats.thisWeek
      if (activityPeriod === '30') return t.stats.thisMonth
      return t.stats.thisYear
    }
    if (activityPeriod === '7') return t.stats.week
    if (activityPeriod === '30') return t.stats.month
    return t.stats.year
  }

  return <div className="activity-chart">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
            <div className="activity-period-controls">
              <button
                type="button"
                onClick={() => handleActivityOffsetChange('prev')}
                className="activity-period-arrow"
                aria-label={t.stats.previousPeriod}
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>

              <div className="relative min-w-0" ref={activityDropdownRef}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setActivityDropdownOpen(false)
                    activityDropdownRef.current?.querySelector('button')?.focus()
                  }
                }}>
                <button
                  type="button"
                  onClick={() => setActivityDropdownOpen(prev => !prev)}
                  aria-expanded={activityDropdownOpen}
                  aria-controls={dropdownId}
                  className="activity-period-trigger"
                >
                  <span>{getActivityRangeLabel() || getActivityPeriodLabel()}</span>
                  <ChevronDown size={13} aria-hidden="true" />
                </button>

                {activityDropdownOpen && (
                  <div id={dropdownId} className="activity-period-menu">
                    <button
                      type="button"
                      onClick={() => handleActivityPeriodChange('7')}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        activityPeriod === '7' && activityOffset === 0
                          ? 'bg-[var(--pixel-screen)] text-[var(--pixel-ink)] font-medium'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {t.stats.thisWeek}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActivityPeriodChange('30')}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        activityPeriod === '30' && activityOffset === 0
                          ? 'bg-[var(--pixel-screen)] text-[var(--pixel-ink)] font-medium'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {t.stats.thisMonth}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActivityPeriodChange('365')}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        activityPeriod === '365' && activityOffset === 0
                          ? 'bg-[var(--pixel-screen)] text-[var(--pixel-ink)] font-medium'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {t.stats.thisYear}
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleActivityOffsetChange('next')}
                disabled={activityOffset === 0}
                className="activity-period-arrow"
                aria-label={t.stats.nextPeriod}
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDuration(activityTotalMinutes)} {t.stats.totalHours}
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400">
                {activityActiveUnitsLabel}
              </div>
            </div>
          </div>
          <HighchartsReact highcharts={Highcharts} options={weeklyChartOptions} />
  </div>
}
