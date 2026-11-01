import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type WorkspaceMode = 'timer' | 'daily-flow'

interface WorkspaceModeState {
  mode: WorkspaceMode
  setMode: (mode: WorkspaceMode) => void
}

export const useWorkspaceModeStore = create<WorkspaceModeState>()(persist(set => ({
  mode: 'timer',
  setMode: mode => set({ mode }),
}), {
  name: 'pomo:workspace-mode:v1',
  partialize: state => ({ mode: state.mode }),
}))
