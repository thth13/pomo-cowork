import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'

interface RegistrationData {
  email: string
  username: string
  password: string
  avatarUrl?: string
}

export async function registerAnonymousUser(anonymousId: string, data: RegistrationData) {
  return prisma.$transaction(async transaction => {
    // User foreign keys use ON UPDATE CASCADE, preserving all guest data.
    const user = await transaction.user.update({
      where: { id: anonymousId, isAnonymous: true },
      data: { ...data, id: randomUUID(), isAnonymous: false },
      include: { settings: true },
    })
    await transaction.chatMessage.updateMany({
      where: { userId: user.id },
      data: { username: user.username },
    })
    return user
  })
}
