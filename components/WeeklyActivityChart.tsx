'use client'

import { memo } from 'react'
import dynamic from 'next/dynamic'
import { useI18n } from '@/components/I18nProvider'
import { communityCopy } from '@/lib/i18n/community'

const HighchartsReact = dynamic(() => import('highcharts-react-official'), { ssr: false })

interface WeeklyActivityChartProps {
  Highcharts: any
  weeklyData: number[]
  weeklyCategories: string[]
  isDark: boolean
  weeklyActivity?: Array<{ date: string; pomodoros: number; minutes: number }>
}

const WeeklyActivityChart = memo(function WeeklyActivityChart({ 
  Highcharts, 
  weeklyData, 
  weeklyCategories, 
  weeklyActivity 
}: WeeklyActivityChartProps) {
  const { language } = useI18n()
  const copy = communityCopy[language]
  const locale = language === 'es' ? 'es-ES' : 'en-US'
  if (!Highcharts) return null

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = Math.floor(minutes % 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const weeklyOptions: Highcharts.Options = {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      height: 270,
      animation: false,
      style: { fontFamily: 'inherit' },
    },
    title: {
      text: undefined,
    },
    credits: {
      enabled: false,
    },
    xAxis: {
      categories: weeklyCategories.length > 0 ? weeklyCategories : Array.from({ length: 7 }, (_, index) => new Date(2024, 0, 8 + index).toLocaleDateString(locale, { weekday: 'short' })),
      lineColor: 'var(--pixel-line)',
      tickColor: 'var(--pixel-line)',
      lineWidth: 0,
      tickWidth: 0,
      labels: {
        style: { color: 'var(--pixel-muted)' }
      }
    },
    yAxis: {
      title: {
        text: copy.hours,
      },
      gridLineWidth: 1,
      gridLineColor: 'var(--pixel-line)',
      labels: {
        formatter: function(this: Highcharts.AxisLabelsFormatterContextObject) {
          return formatDuration((this.value as number) * 60)
        },
        style: { color: 'var(--pixel-muted)' }
      }
    },
    legend: {
      enabled: false,
    },
    plotOptions: {
      series: { animation: false },
      column: {
        borderRadius: 0,
        borderWidth: 0,
        pointPadding: 0.2,
        groupPadding: 0.1,
        color: 'var(--pixel-growth)',
      }
    },
    tooltip: {
      backgroundColor: 'var(--pixel-paper)',
      borderColor: 'var(--pixel-line)',
      borderRadius: 2,
      style: { color: 'var(--pixel-ink)' },
      formatter: function(this: any) {
        const index = this.point?.index ?? 0
        const entry = weeklyActivity?.[index]
        if (!entry) {
          return `<b>${this.x}</b><br/>${formatDuration((this.y || 0) * 60)} ${copy.hours}`
        }
        const [year, month, day] = entry.date.split('-').map(Number)
        const date = new Date(year, month - 1, day)
        const label = date.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })
        return `<b>${label}</b><br/>${formatDuration(entry.minutes)} ${copy.hours}`
      }
    },
    series: [{
      type: 'column',
      name: copy.hours,
      data: weeklyData,
    }]
  }

  return <HighchartsReact highcharts={Highcharts} options={weeklyOptions} />
})

export default WeeklyActivityChart
