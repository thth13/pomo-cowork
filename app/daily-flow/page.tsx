import type { Metadata } from 'next'
import DailyFlow from '@/components/DailyFlow'
import Navbar from '@/components/Navbar'
import './daily-flow.css'

export const metadata: Metadata = {
  title: 'Daily Flow | Pomo Cowork',
  description: 'One task at a time. Finish your day with a focused Pomodoro queue.',
  robots: { index: false, follow: false },
}

export default function DailyFlowPage() {
  return <div className="garden-page daily-flow-page"><Navbar compact /><DailyFlow /></div>
}
