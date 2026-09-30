import { seoSlugs } from '@/lib/seoRoutes'
export const reservedUsernames = new Set(['feed', 'login', 'signup', 'settings', 'pricing', 'blog', 'api', 'admin', 'rooms', 'users', 'projects', 'journal', 'discover', 'profile', 'support', 'terms', 'privacy', 'user', 'stats', 'statistics', 'habits', 'leaderboard', 'ranks', 'refund', ...seoSlugs])
export function publicUsername(value: string) {
  return value.normalize('NFKC').trim().toLowerCase()
}
export function validUsername(value: string) {
  return /^[a-z0-9][a-z0-9_-]{2,29}$/.test(value) && !reservedUsernames.has(value)
}
export function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 70).replace(/^-|-$/g, '') || 'project'
}
export const projectStatuses = (['PLANNING', 'BUILDING', 'PAUSED', 'COMPLETED', 'ARCHIVED'] as const)
export const postTypes = (['UPDATE', 'MILESTONE', 'WEEKLY_UPDATE'] as const)
export const milestoneTypes = (['CUSTOM', 'LAUNCHED', 'FIRST_USER', '100_USERS', 'FIRST_REVENUE', '100_MRR', '1000_MRR'] as const)
