import './globals.css'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/ThemeProvider'
import ConnectionDebug from '@/components/ConnectionDebug'
import AuthProvider from '@/components/AuthProvider'
import OfflineToast from '@/components/OfflineToast'
import InitialLoader from '@/components/InitialLoader'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://pomo-co.work'),
  title: 'Pomo Cowork',
  description: 'Pomodo Timer is a collaborative pomodoro coworking app that keeps your focus and team in sync.',
  icons: {
    icon: [
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: { url: '/icons/favicon-192.png', sizes: '192x192', type: 'image/png' },
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Pomodo Timer',
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
        alt: 'Pomodo Timer UI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pomodo Timer',
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
    <html lang="ru">
      <head>
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
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <InitialLoader />
            {children}
            <footer className="border-t border-gray-200 bg-white/80 px-4 py-6 text-xs text-gray-500 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-3">
                <span>© 2026 Pomo Cowork</span>
                <span className="text-gray-300 dark:text-slate-600">•</span>
                <Link href="/terms" className="transition-colors hover:text-gray-800 dark:hover:text-slate-200">
                  Terms of service
                </Link>
                <span className="text-gray-300 dark:text-slate-600">•</span>
                <Link href="/privacy" className="transition-colors hover:text-gray-800 dark:hover:text-slate-200">
                  Privacy policy
                </Link>
              </div>
            </footer>
            <ConnectionDebug />
            <OfflineToast />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
