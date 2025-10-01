// Utility for managing anonymous users

import { buildAnonymousProfile } from './anonymousProfile'

const ANONYMOUS_ID_KEY = 'anonymous_user_id'

const generateAnonymousId = (): string => {
  return `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export const getOrCreateAnonymousId = (): string => {
  if (typeof window === 'undefined') {
    return generateAnonymousId()
  }

  const existingId = window.localStorage.getItem(ANONYMOUS_ID_KEY)
  if (existingId) {
    return existingId
  }

  const newId = generateAnonymousId()
  window.localStorage.setItem(ANONYMOUS_ID_KEY, newId)
  return newId
}

export const getAnonymousProfile = () => {
  const anonymousId = getOrCreateAnonymousId()
  return buildAnonymousProfile(anonymousId)
}

export const getAnonymousUsername = (): string => {
  return getAnonymousProfile().username
}

export const getAnonymousEmail = (): string => {
  return getAnonymousProfile().email
}

export const clearAnonymousId = (): void => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(ANONYMOUS_ID_KEY)
}
