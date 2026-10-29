import type { Metadata } from 'next'
import NotificationsHistory from './NotificationsHistory'

export const metadata: Metadata = {
  title: 'Notifications | Pomo Cowork',
  robots: { index: false, follow: false },
}

export default function NotificationsPage() {
  return <NotificationsHistory />
}
