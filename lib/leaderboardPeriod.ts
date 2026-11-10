export type LeaderboardPeriod = 'day' | 'week' | 'month' | 'year' | 'custom'

interface PeriodWindow {
  start: Date
  end: Date
  label: string
}

type SupportedLocale = 'en-US' | 'es-ES'

export const isLeaderboardPeriod = (value: string | null): value is LeaderboardPeriod => {
  return value === 'day' || value === 'week' || value === 'month' || value === 'year' || value === 'custom'
}

const startOfLocalDay = (date: Date) => {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

const addDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const formatShortDate = (date: Date, locale: SupportedLocale) => {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

const formatFullDate = (date: Date, locale: SupportedLocale) => {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const formatDateRange = (start: Date, endExclusive: Date, locale: SupportedLocale) => {
  const end = addDays(endExclusive, -1)
  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()
  const sameDay = sameMonth && start.getDate() === end.getDate()

  if (sameDay) {
    return formatFullDate(start, locale)
  }

  if (sameMonth) {
    return `${start.toLocaleString(locale, { month: 'short' })} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`
  }

  if (sameYear) {
    return `${formatShortDate(start, locale)} - ${formatShortDate(end, locale)}, ${start.getFullYear()}`
  }

  return `${formatFullDate(start, locale)} - ${formatFullDate(end, locale)}`
}

export const getPeriodWindow = (period: LeaderboardPeriod, offset: number, locale: SupportedLocale, customStart?: string, customEnd?: string): PeriodWindow => {
  const now = new Date()
  const safeOffset = Math.max(0, offset)

  if (period === 'custom') {
    const start = customStart ? startOfLocalDay(new Date(customStart)) : startOfLocalDay(now)
    const end = customEnd ? addDays(startOfLocalDay(new Date(customEnd)), 1) : addDays(startOfLocalDay(now), 1)
    return {
      start,
      end,
      label: formatDateRange(start, end, locale),
    }
  }

  if (period === 'day') {
    const start = startOfLocalDay(addDays(now, -safeOffset))
    const end = addDays(start, 1)
    return {
      start,
      end,
      label: formatDateRange(start, end, locale),
    }
  }

  if (period === 'week') {
    const start = startOfLocalDay(addDays(now, -safeOffset * 7))
    const day = start.getDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    start.setDate(start.getDate() - diffToMonday)
    const end = addDays(start, 7)
    return {
      start,
      end,
      label: formatDateRange(start, end, locale),
    }
  }

  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() - safeOffset, 1)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    return {
      start,
      end,
      label: formatDateRange(start, end, locale),
    }
  }

  const start = new Date(now.getFullYear() - safeOffset, 0, 1)
  const end = new Date(start.getFullYear() + 1, 0, 1)
  return {
    start,
    end,
    label: formatDateRange(start, end, locale),
  }
}

