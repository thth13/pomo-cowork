import 'react-kofi/dist/kofi.css'
import './globals.css'
import './appearance.css'
import './community.css'
import './ambient-sounds.css'
import './journal-picker.css'
import './wrapped.css'
import './achievements.css'
import WrappedProvider from '@/components/wrapped/WrappedProvider'
import '@fortawesome/fontawesome-svg-core/styles.css'
import { config } from '@fortawesome/fontawesome-svg-core'
import Link from 'next/link'
import Script from 'next/script'
import { Bebas_Neue, Cormorant_Garamond, Inter, Orbitron, Space_Grotesk, VT323 } from 'next/font/google'
import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AppearanceProvider } from '@/components/AppearanceProvider'
import ConnectionDebug from '@/components/ConnectionDebug'
import AuthProvider from '@/components/AuthProvider'
import OfflineToast from '@/components/OfflineToast'
import FeedbackWidget from '@/components/FeedbackWidget'
import KofiWidget from '@/components/KofiWidget'
import GtmClient from '@/components/GtmClient'
import { I18nProvider } from '@/components/I18nProvider'
import RankUpToast from '@/components/RankUpToast'
import AchievementNotifications from '@/components/achievements/AchievementNotifications'
import JournalToast from '@/components/journal/JournalToast'
import PremiumGrantModal from '@/components/PremiumGrantModal'

config.autoAddCss = false

const inter = Inter({ subsets: ['latin'] })
const orbitron = Orbitron({ subsets: ['latin'], weight: '500', variable: '--font-timer-orbitron', preload: false })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: '500', variable: '--font-timer-space', preload: false })
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: '500', variable: '--font-timer-cormorant', preload: false })
const bebas = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-timer-bebas', preload: false })
const terminal = VT323({ subsets: ['latin'], weight: '400', variable: '--font-timer-terminal', preload: false })

export const metadata: Metadata = {
  metadataBase: new URL('https://pomo-co.work'),
  title: 'Pomo Cowork',
  description: 'Pomodoro Timer is a collaborative pomodoro coworking app that keeps your focus and team in sync.',
  icons: {
    icon: [
      { url: '/icons/favicon-16.png?v=3', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32.png?v=3', sizes: '32x32', type: 'image/png' },
    ],
    apple: { url: '/icons/favicon-192.png?v=3', sizes: '192x192', type: 'image/png' },
    shortcut: '/icons/favicon-32.png?v=3',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Pomodoro Timer',
    description: 'Collaborative pomodoro coworking timer with live activity from your squad.',
    type: 'website',
    locale: 'en_US',
    url: 'https://pomo-co.work',
    images: [
      {
        url: '/assets/meta/og-main.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'Pomodoro Timer UI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pomodoro Timer',
    description: 'Collaborative pomodoro coworking timer with live activity from your squad.',
    images: ['/assets/meta/og-main.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-TEKE22N2N5" />
        <Script async src="https://www.googletagmanager.com/gtag/js?id=AW-11075064387" />
        <Script
          id="gtag-init"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-TEKE22N2N5');
              gtag('config', 'AW-11075064387');
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('theme-storage');
                const theme = stored ? JSON.parse(stored).state.theme : 'light';
                document.documentElement.classList.add(theme);
              } catch (e) {
                document.documentElement.classList.add('light');
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} ${orbitron.variable} ${spaceGrotesk.variable} ${cormorant.variable} ${bebas.variable} ${terminal.variable}`}>
        <ThemeProvider>
          <I18nProvider>
            <AppearanceProvider>
              <AuthProvider>
                <GtmClient />
                <RankUpToast />
                <AchievementNotifications />
                <PremiumGrantModal />
              <JournalToast />
                <WrappedProvider>{children}</WrappedProvider>
                <KofiWidget />
                <div className="hidden sm:block">
                  <FeedbackWidget />
                </div>
                <ConnectionDebug />
                <OfflineToast />
              </AuthProvider>
            </AppearanceProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
