import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] })
    }

    // Search users by username
    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: query
        }
      },
      select: {
        id: true,
        username: true,
        createdAt: true,
        _count: {
          select: {
            sessions: true
          }
        }
      },
      take: 10,
      orderBy: {
        sessions: {
          _count: 'desc'
        }
      }
    })

    return NextResponse.json({ users })

  } catch (error) {
    console.error('Error searching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
