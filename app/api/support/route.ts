import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTokenFromHeader, verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface SupportPayload {
  name?: string
  email?: string
  subject?: string
  message: string
}

const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SupportPayload

    const name = body.name?.trim() || undefined
    const email = body.email?.trim()
    const subject = body.subject?.trim() || undefined
    const message = body.message?.trim()

    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    if (!message || message.length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (name && name.length > 120) {
      return NextResponse.json({ error: 'Name is too long' }, { status: 400 })
    }

    if (subject && subject.length > 200) {
      return NextResponse.json({ error: 'Subject is too long' }, { status: 400 })
    }

    if (message.length > 4000) {
      return NextResponse.json({ error: 'Message is too long' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)
    const decoded = token ? verifyToken(token) : null

    const supportMessage = await prisma.supportMessage.create({
      data: {
        userId: decoded?.userId,
        name,
        email: email ?? '',
        subject,
        message,
      },
    })

    return NextResponse.json({ id: supportMessage.id }, { status: 201 })
  } catch (error) {
    console.error('Support message error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
