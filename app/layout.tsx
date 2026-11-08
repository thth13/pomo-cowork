import 'react-kofi/dist/kofi.css'
import './globals.css'
import StandalonePageBoundary from '@/components/StandalonePageBoundary'
import DocumentHtml from '@/components/DocumentHtml'
import './appearance.css'
import './feedback.css'
import './community.css'
import './ambient-sounds.css'
import './daily-goal.css'
import './journal-picker.css'
import './wrapped.css'
import './achievements.css'
import './window-design.css'
import './site-appearance.css'
import './product-updates.css'
import ProductUpdateProvider from '@/components/ProductUpdateProvider'
import WrappedProvider from '@/components/wrapped/WrappedProvider'
import '@fortawesome/fontawesome-svg-core/styles.css'
import { config } from '@fortawesome/fontawesome-svg-core'
import Link from 'next/link'
import { Bebas_Neue, Cormorant_Garamond, Inter, Orbitron, Space_Grotesk, VT323 } from 'next/font/google'
import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AppearanceProvider } from '@/components/AppearanceProvider'
import { FREE_WINDOW_DESIGNS } from '@/lib/appearance'
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
import WalkingCompanion from '@/components/companion/WalkingCompanion'
import PersistentTimerProvider from '@/components/PersistentTimerProvider'

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
    <DocumentHtml>
      <head>
        <link rel="describedby" href="/llms.txt" type="text/plain" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
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
              try {
                const appearance = JSON.parse(localStorage.getItem('pomo:appearance:v1') || 'null');
                const design = appearance && appearance.windowDesign;
                document.documentElement.dataset.windowDesign = ${JSON.stringify(FREE_WINDOW_DESIGNS)}.includes(design) ? design : 'glass';
              } catch (e) {
                document.documentElement.dataset.windowDesign = 'glass';
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} ${orbitron.variable} ${spaceGrotesk.variable} ${cormorant.variable} ${bebas.variable} ${terminal.variable}`}>
        <GtmClient />
        <StandalonePageBoundary
          application={
            <ThemeProvider>
              <I18nProvider>
                <AppearanceProvider>
                  <AuthProvider>
                    <RankUpToast />
                    <AchievementNotifications />
                    <PremiumGrantModal />
                    <ProductUpdateProvider />
                  <JournalToast />
                    <PersistentTimerProvider>
                      <WrappedProvider>{children}</WrappedProvider>
                    </PersistentTimerProvider>
                    <WalkingCompanion />
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
          }
        >
          {children}
        </StandalonePageBoundary>
      </body>
    </DocumentHtml>
  )
}
