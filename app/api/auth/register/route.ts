import { registerAnonymousUser } from '@/lib/registerAnonymousUser'
import { validateRegistration, type RegistrationFieldErrors } from '@/lib/registrationValidation'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, generateToken } from '@/lib/auth'
import { recordReferralSignup } from '@/lib/referrals'
import { isUsernameTaken, normalizeUsername } from '@/lib/username'
import { isValidAnonymousId } from '@/lib/anonymousProfile'

export async function POST(request: NextRequest) {
  try {
    const {
      email: rawEmail,
      username,
      password,
      confirmPassword,
      anonymousId: rawAnonymousId,
      referralCode
    } = await request.json()
    const anonymousId = isValidAnonymousId(rawAnonymousId) ? rawAnonymousId : null
    const email = typeof rawEmail === 'string' ? rawEmail.trim() : ''
    const normalizedUsername = typeof username === 'string' ? normalizeUsername(username) : ''

    const fieldErrors = validateRegistration({ email, username, password, confirmPassword })
    if (Object.keys(fieldErrors).length) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fieldErrors },
        { status: 400 }
      )
    }

    // Check if user already exists (excluding the current anonymous user)
    const usernameTaken = await isUsernameTaken(normalizedUsername, anonymousId || undefined)

    const existingUser = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        ...(anonymousId ? { id: { not: anonymousId } } : {})
      }
    })

    if (existingUser || usernameTaken) {
      const fieldErrors: RegistrationFieldErrors = {}
      if (existingUser) fieldErrors.email = 'emailTaken'
      if (usernameTaken) fieldErrors.username = 'usernameTaken'
      return NextResponse.json(
        { error: 'Email or username is already in use.', fieldErrors },
        { status: 409 }
      )
    }

    const hashedPassword = await hashPassword(password)
    let user
    let convertedAnonymousId: string | null = null

    // If there's an anonymous user, update it
    if (anonymousId) {
      const anonymousUser = await prisma.user.findUnique({
        where: { id: anonymousId },
        include: { settings: true }
      })

      if (anonymousUser && anonymousUser.isAnonymous) {
        console.log(`Converting anonymous user ${anonymousId} to registered user`)
        
        user = await registerAnonymousUser(anonymousId, {
          email,
          username: normalizedUsername,
          password: hashedPassword,
        })
        convertedAnonymousId = anonymousId

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

        console.log(`Successfully converted anonymous user to ${normalizedUsername}`)
      } else {
        // Anonymous user not found, create new user
        user = await prisma.user.create({
          data: {
            email,
            username: normalizedUsername,
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
          username: normalizedUsername,
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

    await recordReferralSignup(referralCode, user.id)

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
      token,
      convertedAnonymousId,
    })

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target
      const fields = Array.isArray(target) ? target.join(' ') : String(target ?? '')
      const fieldErrors: RegistrationFieldErrors = {}
      if (fields.includes('email')) fieldErrors.email = 'emailTaken'
      if (fields.includes('username')) fieldErrors.username = 'usernameTaken'
      if (Object.keys(fieldErrors).length) {
        return NextResponse.json({ error: 'Email or username is already in use.', fieldErrors }, { status: 409 })
      }
    }
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
