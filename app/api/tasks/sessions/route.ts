import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getEffectiveMinutes } from '@/lib/sessionStats'
import { listFocusProjects } from '@/lib/focusProjects'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/tasks/sessions?taskName=xxx
// Returns sessions for a given task name, plus all tasks summary list
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const taskName = searchParams.get('taskName')
    const projectId = searchParams.get('projectId')

    if (!taskName && !projectId) {
      const tasks = (await listFocusProjects(decoded.userId)).filter(task => !task.parentId).sort((a, b) => b.focusMinutes - a.focusMinutes)
      return NextResponse.json({ tasks })
    }

    const project = await prisma.task.findFirst({
      where: { userId: decoded.userId, parentId: null, ...(projectId ? { id: projectId } : { title: taskName! }) },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    })
    if (projectId && !project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // Resolve by ID so renaming a project retains its session history.
    const sessions = await prisma.pomodoroSession.findMany({
      where: {
        userId: decoded.userId,
        ...(project ? { workProjectId: project.id } : { OR: [{ projectName: taskName }, { projectName: null, task: taskName! }] }),
        type: { in: ['WORK', 'TIME_TRACKING'] },
        status: { in: ['COMPLETED', 'CANCELLED'] },
      },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        task: true,
        projectName: true,
        taskRecordId: true,
        type: true,
        status: true,
        duration: true,
        startedAt: true,
        endedAt: true,
        completedAt: true,
        pausedAt: true,
        remainingSeconds: true,
        createdAt: true,
      },
    })

    const sessionsWithMinutes = sessions.map((session) => ({
      ...session,
      effectiveMinutes: getEffectiveMinutes(session),
    }))

    const totalMinutes = sessionsWithMinutes.reduce((sum, s) => sum + s.effectiveMinutes, 0)

    return NextResponse.json({ sessions: sessionsWithMinutes, totalMinutes })
  } catch (error) {
    console.error('Get task sessions error:', error)
    return NextResponse.json({ error: 'Failed to fetch task sessions' }, { status: 500 })
  }
}
