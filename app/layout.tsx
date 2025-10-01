import './globals.css'
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://pomo-co.work'),
  title: 'Pomodo Timer',
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
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
          {children}
        </div>
      </body>
    </html>
  )
}
