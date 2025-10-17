import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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

    const data = await request.json()

    // Handle user profile updates
    if (data.username !== undefined || data.email !== undefined || data.description !== undefined) {
      const updateData: any = {}
      
      if (data.username !== undefined) {
        // Check if username is already taken
        const existingUser = await prisma.user.findFirst({
          where: {
            username: data.username,
            NOT: { id: payload.userId }
          }
        })
        if (existingUser) {
          return NextResponse.json(
            { error: 'Username already taken' },
            { status: 400 }
          )
        }
        updateData.username = data.username
      }

      if (data.email !== undefined) {
        // Check if email is already taken
        const existingUser = await prisma.user.findFirst({
          where: {
            email: data.email,
            NOT: { id: payload.userId }
          }
        })
        if (existingUser) {
          return NextResponse.json(
            { error: 'Email already taken' },
            { status: 400 }
          )
        }
        updateData.email = data.email
      }

      if (data.description !== undefined) {
        updateData.description = data.description
      }

      await prisma.user.update({
        where: { id: payload.userId },
        data: updateData
      })
    }

    // Handle timer settings updates
    const {
      workDuration,
      shortBreak,
      longBreak,
      longBreakAfter,
      soundEnabled,
      soundVolume,
      notificationsEnabled
    } = data

    if (workDuration !== undefined || shortBreak !== undefined || longBreak !== undefined || longBreakAfter !== undefined) {
      // Validate input
      if (
        (workDuration !== undefined && (workDuration < 1 || workDuration > 60)) ||
        (shortBreak !== undefined && (shortBreak < 1 || shortBreak > 30)) ||
        (longBreak !== undefined && (longBreak < 1 || longBreak > 60)) ||
        (longBreakAfter !== undefined && (longBreakAfter < 2 || longBreakAfter > 10)) ||
        (soundVolume !== undefined && (soundVolume < 0 || soundVolume > 1))
      ) {
        return NextResponse.json(
          { error: 'Invalid settings values' },
          { status: 400 }
        )
      }

      const updateData: any = {}
      if (workDuration !== undefined) updateData.workDuration = workDuration
      if (shortBreak !== undefined) updateData.shortBreak = shortBreak
      if (longBreak !== undefined) updateData.longBreak = longBreak
      if (longBreakAfter !== undefined) updateData.longBreakAfter = longBreakAfter
      if (soundEnabled !== undefined) updateData.soundEnabled = soundEnabled
      if (soundVolume !== undefined) updateData.soundVolume = soundVolume
      if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled

      await prisma.userSettings.upsert({
        where: { userId: payload.userId },
        update: updateData,
        create: {
          userId: payload.userId,
          workDuration: workDuration ?? 25,
          shortBreak: shortBreak ?? 5,
          longBreak: longBreak ?? 15,
          longBreakAfter: longBreakAfter ?? 4,
          soundEnabled: soundEnabled ?? true,
          soundVolume: soundVolume ?? 0.5,
          notificationsEnabled: notificationsEnabled ?? true,
        }
      })
    }

    // Return updated user with settings
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { settings: true }
    })

    return NextResponse.json(user)

  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
