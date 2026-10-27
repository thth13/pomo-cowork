'use client'

import { useConnectionStore } from '@/store/useConnectionStore'
import { useI18n } from '@/components/I18nProvider'

export default function UserOnlineIndicator({ userId }: { userId: string }) {
  const isOnline = useConnectionStore((state) => state.isConnected && state.onlineUserIds[userId] === true)
  const { t } = useI18n()

  if (!isOnline) return null

  return (
    <span
      className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-400 dark:border-slate-900"
      title={t.activeSessions.online}
    >
      <span className="sr-only">{t.activeSessions.online}</span>
    </span>
  )
}
