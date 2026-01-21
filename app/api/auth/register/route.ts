import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, username, password, anonymousId } = await request.json()

    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: 'Password must be at least 4 characters long' },
        { status: 400 }
      )
    }

    // Check if user already exists (excluding the current anonymous user)
    const existingUser = await prisma.user.findFirst({
      where: {
        AND: [
          {
            OR: [
              { email },
              { username }
            ]
          },
          anonymousId ? { id: { not: anonymousId } } : {}
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email or username already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await hashPassword(password)
    let user

    // If there's an anonymous user, update it
    if (anonymousId) {
      const anonymousUser = await prisma.user.findUnique({
        where: { id: anonymousId },
        include: { settings: true }
      })

      if (anonymousUser && anonymousUser.isAnonymous) {
        console.log(`Converting anonymous user ${anonymousId} to registered user`)
        
        user = await prisma.user.update({
          where: { id: anonymousId },
          data: {
            email,
            username,
            password: hashedPassword,
            isAnonymous: false,
          },
          include: { settings: true }
        })

        // Create settings if they don't exist
        if (!user.settings) {
          await prisma.userSettings.create({
            data: {
              userId: user.id,
              workDuration: 25,
              shortBreak: 5,
              longBreak: 15,
              longBreakAfter: 4,
              soundEnabled: true,
              soundVolume: 0.5,
              notificationsEnabled: true,
            }
          })
        }

        // Update chat messages with new username
        await prisma.chatMessage.updateMany({
          where: { userId: user.id },
          data: { username: user.username }
        })

        console.log(`Successfully converted anonymous user to ${username}`)
      } else {
        // Anonymous user not found, create new user
        user = await prisma.user.create({
          data: {
            email,
            username,
            password: hashedPassword,
            settings: {
              create: {
                workDuration: 25,
                shortBreak: 5,
                longBreak: 15,
                longBreakAfter: 4,
                soundEnabled: true,
                soundVolume: 0.5,
                notificationsEnabled: true,
              }
            },
            tasks: {
              create: [
                {
                  title: 'Welcome to Pomo Cowork!',
                  description: 'This is your first task. You can edit or delete it, and add new tasks.',
                  pomodoros: 1,
                  priority: 'Средний',
                  completed: false
                }
              ]
            }
          },
          include: { settings: true }
        })
      }
    } else {
      // No anonymous user, create new user
      user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          settings: {
            create: {
              workDuration: 25,
              shortBreak: 5,
              longBreak: 15,
              longBreakAfter: 4,
              soundEnabled: true,
              soundVolume: 0.5,
              notificationsEnabled: true,
            }
          },
          tasks: {
            create: [
              {
                title: 'Welcome to Pomo Cowork!',
                description: 'This is your first task. You can edit or delete it, and add new tasks.',
                pomodoros: 1,
                priority: 'Средний',
                completed: false
              }
            ]
          }
        },
        include: { settings: true }
      })
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      user: userWithoutPassword,
      token
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
