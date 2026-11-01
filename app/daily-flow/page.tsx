import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Daily Flow | Pomo Cowork',
  description: 'One task at a time. Finish your day with a focused Pomodoro queue.',
  robots: { index: false, follow: false },
}

export default function DailyFlowPage() {
  redirect('/?mode=daily-flow')
}
