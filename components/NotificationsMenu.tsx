import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope } from '@fortawesome/free-solid-svg-icons'
import { ClipLoader } from 'react-spinners'
import type { NotificationItem } from '@/types'
import type { RefObject } from 'react'

interface NotificationsMenuProps {
  variant: 'desktop' | 'mobile'
  isOpen: boolean
  unreadCount: number
  notificationsLoading: boolean
  notifications: NotificationItem[]
  inviteAction: { id: string; kind: 'accept' | 'decline' } | null
  onToggle: () => void | Promise<void>
  onAcceptInvite: (notification: NotificationItem) => void
  onDeclineInvite: (notification: NotificationItem) => void
  containerRef?: RefObject<HTMLDivElement>
}

export default function NotificationsMenu({
  variant,
  isOpen,
  unreadCount,
  notificationsLoading,
  notifications,
  inviteAction,
  onToggle,
  onAcceptInvite,
  onDeclineInvite,
  containerRef,
}: NotificationsMenuProps) {
  const buttonClassName =
    variant === 'desktop'
      ? 'relative p-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors'
      : 'relative w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-all'

  const badgeClassName =
    variant === 'desktop'
      ? 'absolute top-1 right-0 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] leading-[16px] text-center'
      : 'absolute top-0 right-0 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] leading-[16px] text-center'

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={onToggle}
        className={buttonClassName}
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <FontAwesomeIcon icon={faEnvelope} className="text-base" />
        {unreadCount > 0 && (
          <span className={badgeClassName}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-gray-200 bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
          </div>

          {notificationsLoading && notifications.length === 0 ? (
            <div className="px-4 py-6 flex items-center justify-center">
              <ClipLoader size={18} color="#ef4444" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">No notifications</div>
          ) : (
            <div className="max-h-96 overflow-auto">
              {notifications.map((n) => {
                const isInvite =
                  n.readAt === null &&
                  n.type === 'ROOM_INVITE' &&
                  n.roomInvite &&
                  n.roomInvite.status === 'PENDING'
                const isUnread = n.readAt === null
                const isAccepting = inviteAction?.id === n.id && inviteAction.kind === 'accept'
                const isDeclining = inviteAction?.id === n.id && inviteAction.kind === 'decline'
                const isInviteBusy = isAccepting || isDeclining
                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-gray-100 dark:border-slate-700 last:border-b-0 ${
                      isUnread ? 'bg-gray-50 dark:bg-slate-800/60' : 'bg-transparent'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{n.message}</div>

                    {isInvite && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onAcceptInvite(n)}
                          disabled={isInviteBusy}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center gap-2"
                        >
                          {isAccepting && (
                            <span className="h-3.5 w-3.5 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                          )}
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeclineInvite(n)}
                          disabled={isInviteBusy}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-60 flex items-center gap-2"
                        >
                          {isDeclining && (
                            <span className="h-3.5 w-3.5 rounded-full border-2 border-gray-400/50 dark:border-slate-400/50 border-t-gray-600 dark:border-t-slate-200 animate-spin" />
                          )}
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
