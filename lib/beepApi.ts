import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isValidAnonymousId } from '@/lib/anonymousProfile'

export const beepJson = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
export async function beepAccount(request: NextRequest) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return null
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) return null
  const token = getTokenFromHeader(request.headers.get('authorization'))
  if (!token) {
    const anonymousId = request.headers.get('x-anonymous-id')?.trim()
    if (!isValidAnonymousId(anonymousId)) return null
    return prisma.user.findFirst({ where: { id: anonymousId, isAnonymous: true }, select: { id: true } })
  }
  const identity = token ? verifyToken(token) : null
  if (!identity || typeof identity.userId !== 'string') return null
  return prisma.user.findUnique({ where: { id: identity.userId }, select: { id: true } })
}
