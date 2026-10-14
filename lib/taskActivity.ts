import type { TaskOption } from '@/types/task'

const timestamp = (value?: string | null) => {
  const time = value ? Date.parse(value) : 0
  return Number.isFinite(time) ? time : 0
}

export function compareTaskActivity(a: TaskOption, b: TaskOption) {
  return Number(Boolean(a.completed)) - Number(Boolean(b.completed))
    || timestamp(b.lastWorkedAt) - timestamp(a.lastWorkedAt)
    || timestamp(b.createdAt) - timestamp(a.createdAt)
}
