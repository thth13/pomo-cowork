import { getAnonymousId, getOrCreateAnonymousId } from '@/lib/anonymousUser'
import { TaskOption } from '@/types/task'
import { useAuthStore } from '@/store/useAuthStore'

const buildHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  } else {
    headers['X-Anonymous-Id'] = getAnonymousId() ?? getOrCreateAnonymousId()
  }

  return headers
}

export interface TaskRecord extends TaskOption {
  description: string
  pomodoros: number
  completedPomodoros: number
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  completed: boolean
}

async function requestTask<T>(path: string, method: string, body?: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/tasks${path}`, {
    method,
    headers: buildHeaders(useAuthStore.getState().token ?? undefined),
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal,
  })
  // A first-time guest has no server-side task owner until their first create.
  if (method === 'GET' && response.status === 401 && !useAuthStore.getState().token) return [] as T
  if (!response.ok) throw new Error(`Task request failed: ${response.status}`)
  return response.json()
}

export const taskService = {
  list: (signal?: AbortSignal) => requestTask<TaskRecord[]>('', 'GET', undefined, signal),
  create: (data: { title: string; description?: string; pomodoros?: number; priority?: string }) =>
    requestTask<TaskRecord>('', 'POST', data),
  update: (id: string, data: { title?: string; completed?: boolean }) =>
    requestTask<TaskRecord>(`/${encodeURIComponent(id)}`, 'PUT', data),
  remove: (id: string) => requestTask<{ success: boolean }>(`/${encodeURIComponent(id)}`, 'DELETE'),
  async incrementPomodoro(taskId: string) {
    const token = useAuthStore.getState().token ?? undefined

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: buildHeaders(token),
      body: JSON.stringify({ incrementPomodoro: true }),
    })

    if (!response.ok) {
      throw new Error(`Failed to increment pomodoro for task ${taskId}, status ${response.status}`)
    }
  },
}
