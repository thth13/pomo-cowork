export interface SessionForStats {
  startedAt: Date | string
  createdAt?: Date | string
  endedAt?: Date | string | null
  completedAt?: Date | string | null
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

  if (start && end) {
    const deltaMs = end.getTime() - start.getTime()
    const minutes = Math.round(Math.max(0, deltaMs) / 60000)
    return Math.max(1, minutes)
  }

  return Math.max(1, Math.round(session.duration))
}
