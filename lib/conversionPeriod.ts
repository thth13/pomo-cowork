export const CONVERSION_TIMEZONE = 'Europe/Kyiv'

export function kyivDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CONVERSION_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-')
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function shiftCalendarDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function defaultConversionPeriod(now = new Date()) {
  const today = kyivDate(now)
  return { start: shiftCalendarDate(today, -7), end: shiftCalendarDate(today, -1) }
}

export function conversionPercent(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator * 100 : null
}

export function conversionMetrics(counts: { newVisitors: number; anonymous: number; registered: number; active: number }) {
  const profiles = counts.anonymous + counts.registered
  const visitors = counts.newVisitors + profiles
  return {
    profiles, visitors,
    visitToAnonymous: conversionPercent(profiles, visitors),
    anonymousToRegistered: conversionPercent(counts.registered, profiles),
    visitToRegistered: conversionPercent(counts.registered, visitors),
    activeConversion: conversionPercent(counts.active, visitors),
  }
}
