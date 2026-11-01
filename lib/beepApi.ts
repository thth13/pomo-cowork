import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const beepJson = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
export async function beepAccount(request: NextRequest) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return null
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) return null
  const token = getTokenFromHeader(request.headers.get('authorization'))
  const identity = token ? verifyToken(token) : null
  if (!identity || typeof identity.userId !== 'string') return null
  return prisma.user.findUnique({ where: { id: identity.userId }, select: { id: true } })
}
