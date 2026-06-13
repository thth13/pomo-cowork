import { getAnonymousId, getOrCreateAnonymousId } from '@/lib/anonymousUser'
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

export const taskService = {
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
