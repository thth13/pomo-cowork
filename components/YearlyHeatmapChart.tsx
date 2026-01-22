'use client'

import { memo } from 'react'
import dynamic from 'next/dynamic'

const HighchartsReact = dynamic(() => import('highcharts-react-official'), { ssr: false })

interface YearlyHeatmapChartProps {
  Highcharts: any
  heatmapData: Array<[number, number, number]>
  isDark: boolean
  yearlyHeatmap?: Array<{
    week: number
    dayOfWeek: number
    pomodoros: number
    date: string
  }>
}

const YearlyHeatmapChart = memo(function YearlyHeatmapChart({ 
  Highcharts, 
  heatmapData, 
  isDark,
  yearlyHeatmap 
}: YearlyHeatmapChartProps) {
  if (!Highcharts) return null

  const heatmapOptions: Highcharts.Options = {
    chart: { 
      type: 'heatmap', 
      backgroundColor: 'transparent',
      height: 140,
      spacing: [0, 0, 0, 0]
    },
    title: { text: '' },
    credits: { enabled: false },
    xAxis: {
      visible: false,
      min: 0,
      gridLineWidth: 0,
      lineWidth: 0
    },
    yAxis: {
      categories: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      title: { text: '' },
      reversed: true,
      labels: {
        style: { 
          fontSize: '10px',
          color: isDark ? '#cbd5e1' : '#6b7280'
        }
      },
      gridLineWidth: 0,
      lineWidth: 0
    },
    colorAxis: {
      min: 0,
      max: 10,
      stops: isDark ? [
        [0, '#334155'],
        [0.25, '#14532d'],
        [0.5, '#166534'],
        [0.75, '#15803d'],
        [1, '#22c55e']
      ] : [
        [0, '#ebedf0'],
        [0.25, '#c6e48b'],
        [0.5, '#7bc96f'],
        [0.75, '#239a3b'],
        [1, '#196127']
      ]
    },
    legend: { enabled: false },
    tooltip: {
      formatter: function() {
        const point = this as any
        const dataPoint = yearlyHeatmap?.find(
          item => item.week === point.x && item.dayOfWeek === point.y
        )
        const dateStr = dataPoint?.date || ''
        return '<b>' + point.value + '</b> pomodoros<br>' + 
               (dateStr ? new Date(dateStr).toLocaleDateString('en-US') : '')
      }
    },
    plotOptions: {
      heatmap: {
        borderWidth: 2,
        borderColor: isDark ? '#1e293b' : '#ffffff',
        dataLabels: { enabled: false }
      }
    },
    series: [{
      type: 'heatmap',
      name: 'Pomodoros',
      data: heatmapData,
      colsize: 1,
      rowsize: 1
    }]
  }

  return <HighchartsReact highcharts={Highcharts} options={heatmapOptions} />
})

export default YearlyHeatmapChart
