import { SessionType } from '@/types'


/**
 * Получить следующий тип сессии на основе завершенных сессий и текущего состояния.
 * Вместо cur используется completedSessions. Нет "Конец" — только бесконечный цикл.
 */
export function getNextSessionType(
  sessionType: SessionType,
  completedWorkSessions: number,
  lastCur: number,
  overflowCount: number,
  isNotOverflow: boolean,
): SessionType {
  // main.dart label calculation
  const randMax = 3
  let newCur = completedWorkSessions + 1
  let newLastCur = lastCur
  let newOverflowCount = overflowCount
  let newIsNotOverflow = isNotOverflow
  let label = ''

  if (newCur + newLastCur === 1 && newOverflowCount > 0) {
    newOverflowCount = 0
  }

  if (newIsNotOverflow) {
    if (newCur < randMax) {
      label = 'Давай'
    } else if (newCur === randMax) {
      if (Math.random() < 0.5) {
        label = 'Нельзя'
      } else {
        newOverflowCount += 1
        label = 'Давай'
        newIsNotOverflow = false
        newLastCur = newCur
        newCur = 0
      }
    } else {
      // вместо "Конец" — сброс и новый цикл
      newIsNotOverflow = true
      newCur += newLastCur
      newLastCur = 0
      label = 'Давай' // продолжаем цикл
    }
  } else {
    if (Math.random() < 0.5) {
      label = 'Нельзя'
      if (newOverflowCount > 0) {
        newOverflowCount -= 1
        if (newOverflowCount <= Math.floor((newCur + newLastCur) / 10)) {
          newIsNotOverflow = true
          newCur += newLastCur
          newLastCur = 0
        }
      }
    } else {
      label = 'Давай'
      newOverflowCount += 1
    }
  }

  if (label === 'Нельзя') {
    return SessionType.LONG_BREAK
  }
  // classic Pomodoro fallback
  return sessionType === SessionType.WORK ? SessionType.SHORT_BREAK : SessionType.WORK
}
