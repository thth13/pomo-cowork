import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Habits from '@/components/Habits'
import PersonalNavigation from '@/components/PersonalNavigation'

export const metadata: Metadata = {
  title: 'Habits | Pomo Cowork',
  robots: { index: false, follow: false },
}

export default function HabitsPage() {
  return <div className="garden-page habits-page"><Navbar compact /><main className="habits-page-content personal-page-frame"><PersonalNavigation /><Habits /></main></div>
}
