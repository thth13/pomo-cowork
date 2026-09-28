export const seoSlugs = [
  'pomodoro-timer',
  'study-timer',
  'focus-timer',
  'timer-for-studying',
  'online-pomodoro-timer',
  'study-with-me',
  'study-with-friends',
  'pomodoro-with-friends',
  'study-timer-with-friends',
  'online-study-room',
  '25-minute-timer',
  '30-minute-timer',
  '45-minute-timer',
  '50-minute-timer',
] as const

export type SeoSlug = typeof seoSlugs[number]

export const seoToolLabels: Record<SeoSlug, string> = {
  'pomodoro-timer': 'Pomodoro Timer',
  'study-timer': 'Study Timer',
  'focus-timer': 'Focus Timer',
  'timer-for-studying': 'Timer for Studying',
  'online-pomodoro-timer': 'Online Pomodoro Timer',
  'study-with-me': 'Study With Me',
  'study-with-friends': 'Study With Friends',
  'pomodoro-with-friends': 'Pomodoro With Friends',
  'study-timer-with-friends': 'Study Timer With Friends',
  'online-study-room': 'Online Study Room',
  '25-minute-timer': '25 Minute Timer',
  '30-minute-timer': '30 Minute Timer',
  '45-minute-timer': '45 Minute Timer',
  '50-minute-timer': '50 Minute Timer',
}

export function isSeoPath(pathname: string) {
  return seoSlugs.some((slug) => pathname === `/${slug}` || pathname === `/${slug}/`)
}
