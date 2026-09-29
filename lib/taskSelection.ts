import { SessionType } from '@/types'

export function isTaskSelectionLocked(session: { type: SessionType } | null): boolean {
  return !!session && session.type !== SessionType.SHORT_BREAK && session.type !== SessionType.LONG_BREAK
}
