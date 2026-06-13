import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { resolveExistingOrAnonymousUserId } from '@/lib/anonymousServer'
import { SessionStatus, SessionType } from '@/types'
import {
  calculateExperienceReward,
  getRank,
  getNextStreak,
  getUtcDayStart,
} from '@/lib/ranks'

export const dynamic = 'force-dynamic'

const SESSION_TYPES = new Set(Object.values(SessionType))
const SESSION_STATUSES = new Set(Object.values(SessionStatus))

const getSocketServerUrl = () =>
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  'http://localhost:4000'

const notifyChatRemoval = async (messageIds: string[]) => {
  if (!messageIds.length) return

  try {
    const endpoint = new URL('/chat/remove', getSocketServerUrl())
    await fetch(endpoint.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: messageIds })
    })
  } catch (error) {
    console.error('Failed to notify chat removal', error)
  }
}

// PUT /api/sessions/[id] - Update session (supports anonymous users)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)
    const {
      status,
      endedAt,
      completedAt,
      anonymousId,
      pausedAt,
      timeRemaining,
      startedAt,
      task,
      duration,
      type,
    } = await request.json()

    const effectiveUserId = await resolveExistingOrAnonymousUserId(
      prisma,
      token,
      anonymousId
    )

    if (!effectiveUserId) {
      return NextResponse.json(
        { error: 'Authentication or anonymous ID required' },
        { status: 401 }
      )
    }

    const updateData: Record<string, any> = {}

    if (status !== undefined && !SESSION_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (status !== undefined) {
      updateData.status = status
    }

    if (endedAt !== undefined) {
      const date = endedAt ? new Date(endedAt) : null
      if (date && Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid endedAt' }, { status: 400 })
      }
      updateData.endedAt = date
    }

    if (completedAt !== undefined) {
      const date = completedAt ? new Date(completedAt) : null
      if (date && Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid completedAt' }, { status: 400 })
      }
      updateData.completedAt = date
    }

    if (pausedAt !== undefined) {
      const date = pausedAt ? new Date(pausedAt) : null
      if (date && Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid pausedAt' }, { status: 400 })
      }
      updateData.pausedAt = date
    }

    if (timeRemaining !== undefined) {
      if (!Number.isInteger(timeRemaining) || timeRemaining < 0) {
        return NextResponse.json({ error: 'Invalid timeRemaining' }, { status: 400 })
      }
      updateData.remainingSeconds = timeRemaining
    }

    if (startedAt !== undefined) {
      const date = new Date(startedAt)
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid startedAt' }, { status: 400 })
      }
      updateData.startedAt = date
    }

    if (task !== undefined) {
      if (typeof task !== 'string' || !task.trim()) {
        return NextResponse.json({ error: 'Invalid task' }, { status: 400 })
      }
      updateData.task = task.trim()
    }

    if (duration !== undefined) {
      if (!Number.isInteger(duration) || duration < 0) {
        return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })
      }
      updateData.duration = duration
    }

    if (type !== undefined) {
      if (!SESSION_TYPES.has(type)) {
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
      }
      updateData.type = type
    }

    if (status === SessionStatus.COMPLETED) {
      const completionResult = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT 1::int AS lock_acquired
          FROM pg_advisory_xact_lock(hashtext(${params.id}))
        `

        const session = await tx.pomodoroSession.findFirst({
          where: {
            id: params.id,
            userId: effectiveUserId,
          },
        })

        if (!session) {
          return null
        }

        const user = await tx.user.findUnique({
          where: { id: effectiveUserId },
          select: {
            experience: true,
            currentStreak: true,
            longestStreak: true,
            lastStreakDate: true,
            isAnonymous: true,
          },
        })

        if (!user) {
          return null
        }

        if (session.status === SessionStatus.COMPLETED) {
          return {
            session,
            progression: {
              experience: user.experience,
              currentStreak: user.currentStreak,
              longestStreak: user.longestStreak,
              experienceAwarded: session.experienceAwarded,
              awardedNow: false,
              rankUp: null,
            },
          }
        }

        if (
          session.status !== SessionStatus.ACTIVE &&
          session.status !== SessionStatus.PAUSED
        ) {
          return {
            session,
            progression: {
              experience: user.experience,
              currentStreak: user.currentStreak,
              longestStreak: user.longestStreak,
              experienceAwarded: 0,
              awardedNow: false,
              rankUp: null,
            },
          }
        }

        const progressionDate = new Date()
        const completionUpdateData = {
          ...updateData,
          completedAt: updateData.completedAt ?? progressionDate,
          endedAt: updateData.endedAt ?? progressionDate,
          pausedAt: null,
          remainingSeconds: 0,
        }
        const earnsExperience =
          session.type === SessionType.WORK ||
          session.type === SessionType.TIME_TRACKING
        const extendsStreak = session.type === SessionType.WORK
        const nextStreak = extendsStreak
          ? getNextStreak(
              user.currentStreak,
              user.lastStreakDate,
              progressionDate
            )
          : user.currentStreak
        const experienceAwarded = earnsExperience
          ? calculateExperienceReward(
              session.duration,
              extendsStreak ? nextStreak : 1
            )
          : 0
        const longestStreak = Math.max(user.longestStreak, nextStreak)
        const previousRank = getRank(user.experience)
        const updatedExperience = user.experience + experienceAwarded
        const updatedRank = getRank(updatedExperience)
        const rankChanged = updatedRank.id !== previousRank.id

        const [updatedSession, updatedUser] = await Promise.all([
          tx.pomodoroSession.update({
            where: { id: session.id },
            data: {
              ...completionUpdateData,
              experienceAwarded,
            },
          }),
          tx.user.update({
            where: { id: effectiveUserId },
            data: {
              experience: { increment: experienceAwarded },
              ...(extendsStreak
                ? {
                    currentStreak: nextStreak,
                    longestStreak,
                    lastStreakDate: getUtcDayStart(progressionDate),
                  }
                : {}),
            },
            select: {
              experience: true,
              currentStreak: true,
              longestStreak: true,
            },
          }),
        ])

        return {
          session: updatedSession,
          progression: {
            ...updatedUser,
            experienceAwarded,
            awardedNow: experienceAwarded > 0,
            rankUp: rankChanged
              ? {
                  previousRank: previousRank.id,
                  rank: updatedRank.id,
                  rankName: updatedRank.name,
                  experience: updatedExperience,
                  shouldNotify: !user.isAnonymous,
                }
              : null,
          },
        }
      })

      if (!completionResult) {
        return NextResponse.json({
          id: params.id,
          status,
          alreadyRemoved: true,
        })
      }

      const rankUp = completionResult.progression.rankUp
      if (rankUp?.shouldNotify) {
        try {
          const title = `New rank: ${rankUp.rankName}`
          const message = `Congratulations! You reached ${rankUp.rankName} with ${rankUp.experience.toLocaleString('en-US')} XP.`

          // Raw SQL avoids stale generated-client enum validation in long-running dev processes.
          await prisma.$executeRaw`
            INSERT INTO "notifications" ("id", "userId", "type", "title", "message", "createdAt")
            VALUES (
              ${randomUUID()},
              ${effectiveUserId},
              CAST('RANK_UP' AS "NotificationType"),
              ${title},
              ${message},
              CURRENT_TIMESTAMP
            )
          `
        } catch (error) {
          console.error('Failed to create rank-up notification:', error)
        }
      }

      return NextResponse.json({
        ...completionResult.session,
        progression: completionResult.progression,
      })
    }

    const result = await prisma.pomodoroSession.updateMany({
      where: {
        id: params.id,
        userId: effectiveUserId,
      },
      data: updateData,
    })

    if (result.count === 0) {
      const isTerminalUpdate =
        status === SessionStatus.CANCELLED ||
        status === SessionStatus.COMPLETED

      if (isTerminalUpdate) {
        return NextResponse.json({
          id: params.id,
          status,
          alreadyRemoved: true,
        })
      }

      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const updatedSession = await prisma.pomodoroSession.findUnique({
      where: { id: params.id },
    })

    if (!updatedSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(updatedSession)

  } catch (error) {
    console.error('Update session error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/sessions/[id] - Delete session and related chat message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const session = await prisma.pomodoroSession.findFirst({
      where: {
        id: params.id,
        userId: payload.userId
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Delete related chat messages (work_start and session_complete messages for this session)
    // We'll delete messages that match the session's task and were created around the same time
    const sessionStart = new Date(session.startedAt)
    const timeBuffer = 10000 // 10 seconds buffer
    const startTimeMin = new Date(sessionStart.getTime() - timeBuffer)
    const startTimeMax = new Date(sessionStart.getTime() + timeBuffer)

    const chatWhere = {
      where: {
        userId: payload.userId,
        roomId: session.roomId ?? null,
        actionTask: session.task,
        actionType: { in: ['work_start', 'session_complete', 'time_tracking_start'] },
        createdAt: {
          gte: startTimeMin,
          lte: session.completedAt 
            ? new Date(new Date(session.completedAt).getTime() + timeBuffer)
            : startTimeMax
        }
      }
    }

    const messagesToDelete = await prisma.chatMessage.findMany({
      ...chatWhere,
      select: { id: true }
    })

    await prisma.chatMessage.deleteMany(chatWhere)

    // Delete the session
    await prisma.pomodoroSession.delete({
      where: { id: params.id }
    })

    const removedMessageIds = messagesToDelete.map((m) => m.id)
    await notifyChatRemoval(removedMessageIds)

    return NextResponse.json({ success: true, removedMessageIds })

  } catch (error) {
    console.error('Delete session error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
