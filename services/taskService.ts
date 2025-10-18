const buildHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

export const taskService = {
  async incrementPomodoro(taskId: string) {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Authentication required to increment task pomodoro')
    }

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
