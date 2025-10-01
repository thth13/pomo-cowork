import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// GET /api/settings - Get user settings
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: payload.userId }
    })

    if (!settings) {
      // Create default settings if they don't exist
      const newSettings = await prisma.userSettings.create({
        data: {
          userId: payload.userId,
          workDuration: 25,
          shortBreak: 5,
          longBreak: 15,
          longBreakAfter: 4,
          soundEnabled: true,
          soundVolume: 0.5,
          notificationsEnabled: true,
        }
      })
      return NextResponse.json(newSettings)
    }

    return NextResponse.json(settings)

  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}

// PUT /api/settings - Update user settings
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const {
      workDuration,
      shortBreak,
      longBreak,
      longBreakAfter,
      soundEnabled,
      soundVolume,
      notificationsEnabled
    } = await request.json()

    // Validate input
    if (
      workDuration < 1 || workDuration > 60 ||
      shortBreak < 1 || shortBreak > 30 ||
      longBreak < 1 || longBreak > 60 ||
      longBreakAfter < 2 || longBreakAfter > 10 ||
      soundVolume < 0 || soundVolume > 1
    ) {
      return NextResponse.json(
        { error: 'Invalid settings values' },
        { status: 400 }
      )
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: payload.userId },
      update: {
        workDuration,
        shortBreak,
        longBreak,
        longBreakAfter,
        soundEnabled,
        soundVolume,
        notificationsEnabled,
      },
      create: {
        userId: payload.userId,
        workDuration,
        shortBreak,
        longBreak,
        longBreakAfter,
        soundEnabled,
        soundVolume,
        notificationsEnabled,
      }
    })

    return NextResponse.json(settings)

  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
