'use client'

import { forwardRef, useImperativeHandle } from 'react'
import ProjectList from '@/components/ProjectList'
import { taskService } from '@/services/taskService'
import { useTimerStore } from '@/store/useTimerStore'

export interface TaskListRef {
  refreshTasks: () => Promise<void>
}

const TaskList = forwardRef<TaskListRef, { isVisible?: boolean }>(({ isVisible = true }, ref) => {
  useImperativeHandle(ref, () => ({
    refreshTasks: async () => {
      if (isVisible) useTimerStore.getState().setTaskOptions(await taskService.list())
    },
  }), [isVisible])
  return <ProjectList isVisible={isVisible} allowProjectCreation={false} />
})
TaskList.displayName = 'TaskList'
export default TaskList
