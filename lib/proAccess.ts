// Shared by server authorization and browser feature gates; keep database imports out.
export function hasActiveProAccess(user: {
  isPro?: boolean
  proExpiresAt?: Date | string | null
} | null | undefined): boolean {
  if (!user?.isPro) return false
  return !user.proExpiresAt || new Date(user.proExpiresAt) > new Date()
}
