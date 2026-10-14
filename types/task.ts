export interface TaskOption {
  id: string
  parentId?: string | null
  color?: string | null
  projectTitle?: string
  title: string
  description?: string
  completed?: boolean
  focusMinutes?: number
  lastWorkedAt?: string | null
  createdAt?: string
}
