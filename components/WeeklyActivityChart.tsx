'use client'

import { memo } from 'react'
import dynamic from 'next/dynamic'

const HighchartsReact = dynamic(() => import('highcharts-react-official'), { ssr: false })

interface WeeklyActivityChartProps {
  Highcharts: any
  weeklyData: number[]
  weeklyCategories: string[]
  isDark: boolean
  weeklyActivity?: Array<{ date: string; pomodoros: number }>
}

const WeeklyActivityChart = memo(function WeeklyActivityChart({ 
  Highcharts, 
  weeklyData, 
  weeklyCategories, 
  isDark,
  weeklyActivity 
}: WeeklyActivityChartProps) {
  if (!Highcharts) return null

  const weeklyOptions: Highcharts.Options = {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      height: 320,
    },
    title: {
      text: undefined,
    },
    credits: {
      enabled: false,
    },
    xAxis: {
      categories: weeklyCategories.length > 0 ? weeklyCategories : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      lineColor: isDark ? '#475569' : '#e5e7eb',
      tickColor: isDark ? '#475569' : '#e5e7eb',
      lineWidth: 0,
      tickWidth: 0,
      labels: {
        style: { color: isDark ? '#cbd5e1' : '#6b7280' }
      }
    },
    yAxis: {
      title: {
        text: undefined,
      },
      gridLineWidth: 1,
      gridLineColor: isDark ? '#334155' : '#f3f4f6',
      labels: {
        style: { color: isDark ? '#cbd5e1' : '#6b7280' }
      }
    },
    legend: {
      enabled: false,
    },
    plotOptions: {
      column: {
        borderRadius: 4,
        pointPadding: 0.2,
        groupPadding: 0.1,
        color: '#3b82f6',
      }
    },
    tooltip: {
      formatter: function(this: any) {
        const index = this.point?.index ?? 0
        const entry = weeklyActivity?.[index]
        if (!entry) {
          return `<b>${this.x}</b><br/>Pomodoros: ${this.y || 0}`
        }
        const [year, month, day] = entry.date.split('-').map(Number)
        const date = new Date(year, month - 1, day)
        const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        return `<b>${label}</b><br/>Pomodoros: ${this.y || 0}`
      }
    },
    series: [{
      type: 'column',
      data: weeklyData,
    }]
  }

  return <HighchartsReact highcharts={Highcharts} options={weeklyOptions} />
})

export default WeeklyActivityChart
