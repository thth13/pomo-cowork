import 'server-only'
import { cache } from 'react'
import { prisma } from '@/lib/db'
import { publicAuthor, publicPost, pageNumber } from './server'
import { focusStats, profileFocusStatistics, projectFocusStats } from './stats'
export const postInclude = ({
  author: {
    select: publicAuthor
  },
  project: {
    select: {
      id: true,
      name: true,
      slug: true,
      visibility: true
    }
  },
  milestone: true,
  _count: {
    select: {
      reactions: true,
      comments: true
    }
  }
} as const)
export const profileByUsername = cache(async (username: string) => {
  return prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: 'insensitive'
      },
      isAnonymous: false
    },
    select: {
      ...publicAuthor,
      description: true,
      location: true,
      websiteUrl: true,
      githubUrl: true,
      twitterUrl: true,
      createdAt: true,
      currentStreak: true,
      lastStreakDate: true,
      _count: {
        select: {
          followers: true,
          following: true
        }
      }
    }
  })
})
export async function profileData(username: string, tab: string, page: number) {
  const user = await profileByUsername(username)
  if (!user) return null
  const [focus, projects, projectCount, pinned, posts, activity] = await Promise.all([profileFocusStatistics(user.id), prisma.project.findMany({
    where: {
      userId: user.id,
      visibility: 'PUBLIC'
    },
    orderBy: [{
      createdAt: 'desc'
    }, {
      id: 'desc'
    }],
    skip: (page - 1) * 12,
    take: 13
  }), prisma.project.count({
    where: {
      userId: user.id,
      visibility: 'PUBLIC'
    }
  }), prisma.project.findFirst({
    where: {
      userId: user.id,
      visibility: 'PUBLIC',
      pinned: true
    },
    include: {
      milestones: {
        where: {
          post: publicPost
        },
        orderBy: {
          achievedAt: 'desc'
        },
        take: 1
      }
    }
  }), tab === 'updates' ? prisma.journalPost.findMany({
    where: {
      authorId: user.id,
      ...publicPost
    },
    include: postInclude,
    orderBy: [{
      publishedAt: 'desc'
    }, {
      id: 'desc'
    }],
    skip: (page - 1) * 12,
    take: 13
  }) : [], tab === 'activity' ? prisma.activityEvent.findMany({
    where: {
      userId: user.id,
      AND: [{
        OR: [{
          projectId: null
        }, {
          project: {
            visibility: 'PUBLIC'
          }
        }]
      }, {
        OR: [{
          postId: null
        }, {
          post: publicPost
        }]
      }]
    },
    include: {
      project: {
        select: {
          name: true,
          slug: true
        }
      },
      post: {
        select: {
          title: true,
          slug: true
        }
      }
    },
    orderBy: [{
      createdAt: 'desc'
    }, {
      id: 'desc'
    }],
    skip: (page - 1) * 20,
    take: 21
  }) : []])
  const visibleProjects = projects.slice(0, 12)
  const projectStats = await projectFocusStats(user.id, [
    ...visibleProjects.map(project => project.id),
    ...(pinned ? [pinned.id] : []),
  ])
  const enriched = visibleProjects.map(project => ({
    ...project,
    stats: projectStats.get(project.id) ?? { seconds: 0, sessions: 0 }
  }))
  return {
    user,
    stats: focus.stats,
    days: focus.days,
    projects: enriched,
    projectCount,
    pinned: pinned ? {
      ...pinned,
      stats: projectStats.get(pinned.id) ?? { seconds: 0, sessions: 0 }
    } : null,
    posts: posts.slice(0, 12),
    activity: activity.slice(0, 20),
    streak: focus.streak,
    hasMore: tab === 'updates' ? posts.length > 12 : tab === 'activity' ? activity.length > 20 : projects.length > 12
  }
}
export async function publicProjectData(username: string, slug: string, page = 1) {
  const user = await profileByUsername(username)
  if (!user) return null
  const project = await prisma.project.findFirst({
    where: {
      userId: user.id,
      slug,
      visibility: 'PUBLIC'
    }
  })
  if (!project) return null
  const [stats, posts, timeline] = await Promise.all([focusStats(user.id, project.id), prisma.journalPost.findMany({
    where: {
      projectId: project.id,
      ...publicPost
    },
    include: postInclude,
    orderBy: [{
      publishedAt: 'desc'
    }, {
      id: 'desc'
    }],
    take: 13,
    skip: (page - 1) * 12
  }), projectTimeline(project.id, page)])
  return {
    user,
    project,
    stats,
    posts: posts.slice(0, 12),
    timeline: timeline.slice(0, 20),
    hasMore: posts.length > 12 || timeline.length > 20
  }
}
export { pageNumber }

async function projectTimeline(projectId: string, page: number) {
  const ids = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p."id" FROM "journal_posts" p
    JOIN "projects" project ON project."id" = p."projectId"
    LEFT JOIN "project_milestones" milestone ON milestone."postId" = p."id"
    WHERE p."projectId" = ${projectId} AND project."visibility" = 'PUBLIC'
      AND p."visibility" = 'PUBLIC' AND p."publishedAt" IS NOT NULL
      AND (p."type" = 'MILESTONE' OR p."important" = true)
    ORDER BY COALESCE(milestone."achievedAt", p."publishedAt") DESC, p."id" DESC
    LIMIT 21 OFFSET ${(page - 1) * 20}
  `
  const posts = await prisma.journalPost.findMany({ where: { id: { in: ids.map(row => row.id) }, ...publicPost }, include: { milestone: true } })
  const order = new Map(ids.map((row, index) => [row.id, index]))
  return posts.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
}
