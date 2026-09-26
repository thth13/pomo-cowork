import type { Metadata } from 'next'
import HomeWorkspace from '@/components/HomeWorkspace'
import PomodoroOverview from '@/components/PomodoroOverview'
import { HOME_TITLE, HOME_DESCRIPTION } from '@/lib/homeSeo'

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Pomo Cowork',
    images: [{
      url: '/assets/meta/og-main.png',
      width: 1200,
      height: 630,
      alt: 'Pomo Cowork online Pomodoro timer',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ['/assets/meta/og-main.png'],
  },
}

export default function HomePage() {
  return (
    <main className="pomodoro-home garden-page">
      <HomeWorkspace overview={<PomodoroOverview />} />
    </main>
  )
}
