import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import StatisticsDashboard from '@/components/statistics/StatisticsDashboard'
import './statistics.css'

export const metadata: Metadata = {
  title: 'My statistics | Pomo Cowork',
  robots: { index: false, follow: false },
}

export default function StatisticsPage() {
  return <div className="garden-page insights-page"><Navbar compact /><StatisticsDashboard /></div>
}
