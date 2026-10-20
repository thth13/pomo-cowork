'use client'

import { ArrowLeftRight, LockKeyhole } from 'lucide-react'
import { useRoomStore } from '@/store/useRoomStore'
import { useTimerStore } from '@/store/useTimerStore'
import { useI18n } from './I18nProvider'

export default function RoomSwitch() {
  const { t } = useI18n()
  const { currentRoomId, currentRoomName, lastRoomId, lastRoomName, lastRoomBackgroundGradientKey, setCurrentRoom, resetToGlobal } = useRoomStore()
  const disabled = useTimerStore(state => Boolean(state.isRunning && state.currentSession))

  if (!currentRoomId && !lastRoomId) return null

  const name = currentRoomId ? currentRoomName : t.room.global
  const hint = disabled
    ? t.room.stopToSwitch
    : `${t.room.switchTo} ${currentRoomId ? t.room.global : lastRoomName}`
  const Icon = disabled ? LockKeyhole : ArrowLeftRight

  return (
    <button
      type="button"
      className="workspace-room-switch"
      disabled={disabled}
      title={`${t.room.label}: ${name}. ${hint}`}
      aria-label={`${t.room.label}: ${name}. ${hint}`}
      onClick={() => {
        const timer = useTimerStore.getState()
        if (timer.isRunning && timer.currentSession) return
        if (currentRoomId) resetToGlobal()
        else if (lastRoomId) setCurrentRoom({ id: lastRoomId, name: lastRoomName, backgroundGradientKey: lastRoomBackgroundGradientKey })
      }}
    >
      <span>{t.room.label}: {name}</span>
      <Icon size={13} strokeWidth={1.5} aria-hidden="true" />
    </button>
  )
}
