import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { prisma } from '@/lib/db'
import { getEffectiveMinutes } from '@/lib/sessionStats'

export const dynamic = 'force-dynamic'

type UserRow = {
  id: string
  username: string
  avatarUrl: string | null
  createdAt: Date
  lastSeenAt: Date | null
  totalMinutes: number
  totalPomodoros: number
  sessionsCount: number
}

type UsersTab = 'registered' | 'anonymous'

const tabs: Array<{ value: UsersTab; label: string; description: string }> = [
  {
    value: 'registered',
    label: 'Registered',
    description: 'Complete registered user list with focus activity totals.',
  },
  {
    value: 'anonymous',
    label: 'Unregistered',
    description: 'Anonymous users who have not created a full account yet.',
  },
]

const formatDate = (date: Date | null) => {
  if (!date) return 'Never'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const formatKyivDateTime = (date: Date) => {
  return new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Kiev',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const formatFocusTime = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

const getInitial = (username: string) => username.trim().charAt(0).toUpperCase() || 'U'

async function getUsers(isAnonymous: boolean): Promise<UserRow[]> {
  const users = await prisma.user.findMany({
    where: {
      isAnonymous,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      createdAt: true,
      lastSeenAt: true,
      sessions: {
        where: {
          status: { in: ['COMPLETED', 'CANCELLED'] },
          type: { in: ['WORK', 'TIME_TRACKING'] },
        },
        select: {
          startedAt: true,
          endedAt: true,
          completedAt: true,
          duration: true,
          remainingSeconds: true,
          pausedAt: true,
          type: true,
        },
      },
    },
  })

  return users.map((user) => {
    const totalMinutes = user.sessions.reduce(
      (sum, session) => sum + getEffectiveMinutes(session),
      0,
    )

    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      lastSeenAt: user.lastSeenAt,
      totalMinutes,
      totalPomodoros: user.sessions.filter((session) => session.type === 'WORK').length,
      sessionsCount: user.sessions.length,
    }
  })
}

export default async function UzerzPage({
  searchParams,
}: {
  searchParams?: { tab?: string }
}) {
  const activeTab: UsersTab = searchParams?.tab === 'anonymous' ? 'anonymous' : 'registered'
  const activeTabMeta = tabs.find((tab) => tab.value === activeTab) ?? tabs[0]
  const [users, registeredCount, anonymousCount] = await Promise.all([
    getUsers(activeTab === 'anonymous'),
    prisma.user.count({ where: { isAnonymous: false } }),
    prisma.user.count({ where: { isAnonymous: true } }),
  ])
  const totalFocusMinutes = users.reduce((sum, user) => sum + user.totalMinutes, 0)
  const totalPomodoros = users.reduce((sum, user) => sum + user.totalPomodoros, 0)
  const tabCounts: Record<UsersTab, number> = {
    registered: registeredCount,
    anonymous: anonymousCount,
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600 dark:text-sky-400">
                Users
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                All users
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {activeTabMeta.description}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Users</p>
                <p className="mt-1 text-xl font-black">{users.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Focus</p>
                <p className="mt-1 text-xl font-black">{formatFocusTime(totalFocusMinutes)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pomodoros</p>
                <p className="mt-1 text-xl font-black">{totalPomodoros}</p>
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {tabs.map((tab) => {
              const isActive = tab.value === activeTab

              return (
                <Link
                  key={tab.value}
                  href={`/uzerz?tab=${tab.value}`}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? 'bg-white/15 text-current dark:bg-slate-900/10'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {tabCounts[tab.value]}
                  </span>
                </Link>
              )
            })}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
                <thead className="bg-slate-100/80 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-4 font-bold">User</th>
                    <th className="px-5 py-4 font-bold">Registered</th>
                    <th className="px-5 py-4 font-bold">Last seen</th>
                    <th className="px-5 py-4 text-right font-bold">Focus time</th>
                    <th className="px-5 py-4 text-right font-bold">Pomodoros</th>
                    <th className="px-5 py-4 text-right font-bold">Sessions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.length === 0 ? (
                    <tr>
                      <td
                        className="px-5 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400"
                        colSpan={6}
                      >
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr
                        key={user.id}
                        className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/user/${user.id}`}
                            className="flex min-w-[220px] items-center gap-3"
                          >
                            {user.avatarUrl ? (
                              <Image
                                src={user.avatarUrl}
                                alt={user.username}
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white dark:bg-white dark:text-slate-900">
                                {getInitial(user.username)}
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="block truncate font-bold text-slate-900 dark:text-white">
                                {user.username}
                              </span>
                              <span className="block truncate text-xs text-slate-400">{user.id}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-300">
                          {formatKyivDateTime(user.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-300">
                          {formatDate(user.lastSeenAt)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-semibold">
                          {formatFocusTime(user.totalMinutes)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-semibold">
                          {user.totalPomodoros}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-semibold">
                          {user.sessionsCount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
