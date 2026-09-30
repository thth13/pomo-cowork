import { create } from 'zustand'
import { persist } from 'zustand/middleware'
interface Selection {
  userId: string | null;
  projectId: string | null;
  name: string;
  select: (userId: string, projectId: string | null, name?: string) => void;
}
export const useProjectSelection = create<Selection>()(persist(set => ({
  userId: null,
  projectId: null,
  name: '',
  select: (userId, projectId, name = '') => set({
    userId,
    projectId,
    name
  })
}), {
  name: 'pomo:focus-project:v1'
}))
