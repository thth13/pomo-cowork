import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import RanksGuide from '@/components/RanksGuide'
import './ranks.css'

export const metadata: Metadata = {
  title: 'Ranks & experience | Pomo Cowork',
  description: 'Explore all nine focus ranks and learn how sessions, experience points, and daily streak bonuses help you progress.',
}

export default function RanksPage() {
  return <div className="garden-page ranks-page"><Navbar compact /><RanksGuide /></div>
}
