export interface AnonymousProfile {
  id: string
  username: string
  email: string
}

const ANONYMOUS_EMAIL_DOMAIN = 'guest.local'
const USERNAME_PREFIX = 'Guest #'
const USERNAME_SEGMENT_LENGTH = 10
const LEGACY_ANONYMOUS_ID_PATTERN = /^anon_\d+_[a-z0-9]+$/
const UUID_ANONYMOUS_ID_PATTERN =
  /^anon_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const isValidAnonymousId = (anonymousId: unknown): anonymousId is string => {
  return typeof anonymousId === 'string' && (
    LEGACY_ANONYMOUS_ID_PATTERN.test(anonymousId) ||
    UUID_ANONYMOUS_ID_PATTERN.test(anonymousId)
  )
}

const sanitizeAnonymousId = (anonymousId: string): string => {
  return anonymousId.replace(/[^a-zA-Z0-9]/g, '')
}

const buildUsername = (sanitizedId: string): string => {
  const baseSegment = sanitizedId.slice(-USERNAME_SEGMENT_LENGTH) || sanitizedId
  if (!baseSegment) {
    const fallback = Math.random().toString(36).slice(2, 2 + USERNAME_SEGMENT_LENGTH).toUpperCase()
    return `${USERNAME_PREFIX}${fallback}`
  }

  return `${USERNAME_PREFIX}${baseSegment.toUpperCase()}`
}

export const buildAnonymousProfile = (anonymousId: string): AnonymousProfile => {
  const sanitizedId = sanitizeAnonymousId(anonymousId)
  const normalizedId = sanitizedId || `guest${Date.now()}`
  const username = buildUsername(normalizedId)
  const email = `${normalizedId.toLowerCase()}@${ANONYMOUS_EMAIL_DOMAIN}`

  return {
    id: anonymousId,
    username,
    email
  }
}

export const isAnonymousEmail = (email: string): boolean => {
  return email.endsWith(`@${ANONYMOUS_EMAIL_DOMAIN}`)
}
