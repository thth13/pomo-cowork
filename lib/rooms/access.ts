import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'

/** The same visibility boundary applies to room details, statistics and live activity. */
export async function getRoomAccess(roomId: string, authorization: string | null) {
  const token = getTokenFromHeader(authorization)
  const userId = token ? verifyToken(token)?.userId ?? null : null
  const room = await prisma.room.findFirst({
    where: {
      id: roomId,
      ...(userId
        ? { OR: [{ privacy: 'PUBLIC' }, { ownerId: userId }, { members: { some: { userId } } }] }
        : { privacy: 'PUBLIC' }),
    },
    select: { id: true, ownerId: true },
  })
  return { room, userId }
}
