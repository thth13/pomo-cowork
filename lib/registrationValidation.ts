import { publicUsername, validUsername } from '@/lib/journal/validation'

export const registrationFields = ['email', 'username', 'password', 'confirmPassword'] as const
export type RegistrationField = typeof registrationFields[number]
export type RegistrationErrorCode = 'emailRequired' | 'emailInvalid' | 'emailTaken' | 'usernameRequired' | 'usernameInvalid' | 'usernameTaken' | 'passwordRequired' | 'passwordTooShort' | 'confirmPasswordRequired' | 'passwordMismatch'
export type RegistrationFieldErrors = Partial<Record<RegistrationField, RegistrationErrorCode>>

export function normalizeRegistrationUsername(value: string): string {
  return publicUsername(value.normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]+/g, '')
    .replace(/\s+/g, ' ').trim())
}

export function validateRegistration(values: {
  email?: unknown
  username?: unknown
  password?: unknown
  confirmPassword?: unknown
}): RegistrationFieldErrors {
  const errors: RegistrationFieldErrors = {}
  const email = typeof values.email === 'string' ? values.email.trim() : ''
  const username = typeof values.username === 'string' ? normalizeRegistrationUsername(values.username) : ''
  const password = typeof values.password === 'string' ? values.password : ''
  const confirmation = typeof values.confirmPassword === 'string' ? values.confirmPassword : ''

  if (!email) errors.email = 'emailRequired'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'emailInvalid'
  if (!username) errors.username = 'usernameRequired'
  else if (!validUsername(username)) errors.username = 'usernameInvalid'
  if (!password) errors.password = 'passwordRequired'
  else if (password.length < 4) errors.password = 'passwordTooShort'
  if (!confirmation) errors.confirmPassword = 'confirmPasswordRequired'
  else if (confirmation !== password) errors.confirmPassword = 'passwordMismatch'

  return errors
}
