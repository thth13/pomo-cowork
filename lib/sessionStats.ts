export interface SessionForStats {
  startedAt: Date | string
  createdAt?: Date | string
  endedAt?: Date | string | null
  completedAt?: Date | string | null
  pausedAt?: Date | string | null
  remainingSeconds?: number | null
  duration: number // minutes (planned or stored)
}

const toDate = (value?: Date | string | null): Date | null => {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

export const getSessionEnd = (session: SessionForStats): Date | null => {
  return toDate(session.completedAt) ?? toDate(session.endedAt)
}

export const getSessionAttributionDate = (session: SessionForStats): Date => {
  return (
    getSessionEnd(session) ??
    toDate(session.startedAt) ??
    toDate(session.createdAt) ??
    new Date(0)
  )
}

export const getEffectiveMinutes = (session: SessionForStats): number => {
  const start = toDate(session.startedAt) ?? toDate(session.createdAt)
  const end = getSessionEnd(session)

  // Prefer stored remaining seconds (accurate for manual stops and pauses).
  if (typeof session.remainingSeconds === 'number' && Number.isFinite(session.remainingSeconds)) {
    const plannedSeconds = Math.max(0, Math.round(session.duration * 60))
    const remainingSeconds = Math.max(0, Math.round(session.remainingSeconds))
    if (plannedSeconds > 0 && remainingSeconds <= plannedSeconds) {
      const workedSeconds = plannedSeconds - remainingSeconds
      const workedMinutes = Math.round(workedSeconds / 60)
      if (workedSeconds > 0 && workedMinutes === 0) {
        return 1
      }
      return Math.max(0, workedMinutes)
    }
  }

  if (start && end) {
    const pausedAt = toDate(session.pausedAt)
    const effectiveEnd = pausedAt && pausedAt < end ? pausedAt : end

    const deltaMs = effectiveEnd.getTime() - start.getTime()
    const rawMinutes = Math.round(Math.max(0, deltaMs) / 60000)
    const cappedMinutes = Number.isFinite(session.duration)
      ? Math.min(rawMinutes, Math.max(0, Math.round(session.duration)))
      : rawMinutes

    if (deltaMs > 0 && cappedMinutes === 0) {
      return 1
    }

    return Math.max(0, cappedMinutes)
  }

  return Math.max(0, Math.round(session.duration))
}
