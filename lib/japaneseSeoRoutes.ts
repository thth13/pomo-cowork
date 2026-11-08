// Standalone Japanese tools, independent of the application's English/Spanish locale.
export const japaneseSeoSlugs = ['pomodoro-timer', 'focus-timer', '25-minute-timer'] as const
export type JapaneseSeoSlug = typeof japaneseSeoSlugs[number]

export function isJapaneseSeoPath(pathname: string) {
  return japaneseSeoSlugs.some(slug => pathname === `/ja/${slug}` || pathname === `/ja/${slug}/`)
}
