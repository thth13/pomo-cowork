import { isIP } from 'node:net'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'
import { isValidAnonymousId } from '@/lib/anonymousProfile'
import { consumeVisitor, lockVisitor, VISITOR_COOKIE } from '@/lib/guestVisits'
import { getRequestCountry } from '@/lib/userCountry'
import { buildVisitorDetails } from '@/lib/visitorDetails'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get('sec-fetch-site') === 'cross-site') {
      return new NextResponse(null, { status: 403 })
    }
    const body = await request.json().catch(() => null)
    const cookieId = request.cookies.get(VISITOR_COOKIE)?.value
    const id = isValidAnonymousId(body?.anonymousId) ? body.anonymousId : cookieId
    const token = getTokenFromHeader(request.headers.get('authorization'))
    const payload = token ? verifyToken(token) : null
    const authenticated = payload ? await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } }) : null
    // Do not classify an account as a new visitor while its auth check is unavailable.
    if (token && !authenticated) return new NextResponse(null, { status: 401 })
    if (!isValidAnonymousId(id)) {
      return new NextResponse(null, { status: authenticated ? 204 : 400, headers: { 'Cache-Control': 'no-store' } })
    }

    const pagePath = typeof body?.pagePath === 'string' ? body.pagePath : ''
    if (!authenticated && (!pagePath.startsWith('/') || pagePath.startsWith('//') || /[?#\u0000-\u001f]/.test(pagePath) || pagePath.length > 500)) {
      return new NextResponse(null, { status: 400 })
    }
    // IP comes from the request's proxy headers, never the body.
    const rawIp = (request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip'))?.trim()
    const ipAddress = rawIp && isIP(rawIp) ? rawIp : null

    await prisma.$transaction(async tx => {
      await lockVisitor(tx, id)
      const [identity, account] = await Promise.all([
        tx.visitorIdentity.findUnique({ where: { id } }),
        tx.user.findUnique({ where: { id }, select: { id: true } }),
      ])
      if (authenticated || account || identity?.converted) {
        await consumeVisitor(tx, id)
        return
      }
      // Keep the initial landing page and timestamp across reloads and navigation.
      await tx.visitorIdentity.upsert({ where: { id }, create: { id }, update: {} })
      await tx.guestVisit.upsert({
        where: { id }, update: {},
        create: { id, pagePath, ipAddress, countryCode: getRequestCountry(request), details: buildVisitorDetails(request, body?.details) },
      })
    })
    const response = new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
    response.cookies.set(VISITOR_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 })
    return response
  } catch (error) {
    console.error('Guest visit tracking failed:', error)
    return new NextResponse(null, { status: 500 })
  }
}
