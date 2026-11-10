import { createHash } from 'crypto'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

// A separate signing key keeps invitation links distinct from login tokens.
const secret = createHash('sha256')
  .update(`room-invite:${process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'}`)
  .digest('hex')

export function createRoomInviteLinkToken(roomId: string, inviterId: string) {
  return jwt.sign({ roomId, inviterId }, secret, {
    algorithm: 'HS256', audience: 'room-invite', expiresIn: '7d',
  })
}

export async function canInviteToRoom(roomId: string, userId: string) {
  return Boolean(await prisma.room.findFirst({
    where: { id: roomId, OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    select: { id: true },
  }))
}

export async function verifyRoomInviteLink(token: string, roomId: string) {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'], audience: 'room-invite' })
    if (typeof payload === 'string' || payload.roomId !== roomId || typeof payload.inviterId !== 'string') return false
    // Leaving or being removed from the room invalidates this person's links.
    return await canInviteToRoom(roomId, payload.inviterId)
  } catch {
    return false
  }
}
