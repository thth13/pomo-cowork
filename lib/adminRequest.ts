import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { isAdminUser } from '@/lib/admin'
import { prisma } from '@/lib/db'

export async function authorizeAdmin(request: NextRequest): Promise<NextResponse | null> {
  const token = getTokenFromHeader(request.headers.get('authorization'))
  const payload = token ? verifyToken(token) : null
  if (!payload) return NextResponse.json({ error: 'Sign in again to access administration.' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, email: true } })
  if (!user || !isAdminUser(user)) return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 })
  return null
}
