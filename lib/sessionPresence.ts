import { createHmac, timingSafeEqual } from 'crypto'

// A guest's public user ID is not a credential. This capability is returned only
// when creating the session and permits presence for that one session, not login.
export function createSessionPresenceToken(sessionId: string, userId: string) {
  return createHmac('sha256', process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production')
    .update(JSON.stringify(['session-presence-v1', sessionId, userId])).digest('hex')
}

export function verifySessionPresenceToken(value: unknown, sessionId: string, userId: string) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) return false
  return timingSafeEqual(Buffer.from(value, 'hex'), Buffer.from(createSessionPresenceToken(sessionId, userId), 'hex'))
}
