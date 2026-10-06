'use client'

import { useI18n } from '@/components/I18nProvider'

export function ChatMessagesSkeleton() {
  const { t } = useI18n()

  return (
    <div className="space-y-4" role="status" aria-label={t.common.loading}>
      {Array.from({ length: 7 }, (_, index) => (
        <div key={index} className="flex items-start gap-3" aria-hidden="true">
          <div className="personal-skeleton-line !h-8 !w-8 flex-shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="personal-skeleton-line !h-3 !w-20" />
              <div className="personal-skeleton-line !h-2 !w-10" />
            </div>
            <div className={`personal-skeleton-line ${index % 2 === 0 ? '!w-full' : '!w-3/4'}`} />
            {index % 3 === 0 && <div className="personal-skeleton-line !w-1/2" />}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ChatSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 h-[600px] flex flex-col">
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700" aria-hidden="true">
        <div className="personal-skeleton-line !w-24" />
      </div>
      <div className="chat-messages flex-1 p-4">
        <ChatMessagesSkeleton />
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex items-center gap-3 flex-shrink-0" aria-hidden="true">
        <div className="personal-skeleton-line !h-8 !w-8 flex-shrink-0" />
        <div className="personal-skeleton-line !h-10 flex-1" />
      </div>
    </div>
  )
}
