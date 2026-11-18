import type { User } from '@prisma/client'

const splitEnvList = (value: string | undefined): string[] => {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export const isAdminUser = (user: Pick<User, 'id' | 'email'>): boolean => {
  const adminEmails = splitEnvList(process.env.ADMIN_EMAILS)
  const adminUserIds = splitEnvList(process.env.ADMIN_USER_IDS)

  if (adminUserIds.length > 0 && adminUserIds.includes(user.id)) {
    return true
  }

  if (adminEmails.length > 0 && adminEmails.includes(user.email)) {
    return true
  }

  return false
}
