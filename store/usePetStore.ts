'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

let storageAvailable = true
export const canSavePet = () => storageAvailable
const petStorage = createJSONStorage<PetState>(() => ({
  getItem: (name: string) => {
    try { return localStorage.getItem(name) } catch { storageAvailable = false; return null }
  },
  setItem: (name: string, value: string) => {
    try { localStorage.setItem(name, value); storageAvailable = true } catch { storageAvailable = false }
  },
  removeItem: (name: string) => {
    try { localStorage.removeItem(name) } catch { storageAvailable = false }
  },
}))

const HOUR = 60 * 60 * 1000
export const PET_CARE_COOLDOWN = 30 * 60 * 1000
interface PetState {
  food: number
  focusMinutes: number
  fullness: number
  joy: number
  water: number
  updatedAt: number
  lastPetAt: number
  lastWaterAt: number
  rewardedSessions: string[]
  refresh: () => void
  reward: (id: string, minutes: number) => void
  care: (action: 'feed' | 'pet' | 'water') => boolean
}

function currentNeeds(state: PetState, now: number) {
  const hours = Math.max(0, (now - state.updatedAt) / HOUR)
  return {
    fullness: Math.max(0, state.fullness - hours * 2),
    joy: Math.max(0, state.joy - hours),
    water: Math.max(0, state.water - hours * 1.5),
    updatedAt: now,
  }
}

export const usePetStore = create<PetState>()(persist((set, get) => ({
  food: 0, focusMinutes: 0, fullness: 65, joy: 75, water: 70,
  updatedAt: Date.now(), lastPetAt: 0, lastWaterAt: 0, rewardedSessions: [],
  refresh: () => set(currentNeeds(get(), Date.now())),
  reward: (id, minutes) => {
    if (id.startsWith('temp_') || !Number.isFinite(minutes) || minutes < 1 || get().rewardedSessions.includes(id)) return
    set((state) => ({
      ...currentNeeds(state, Date.now()),
      food: state.food + Math.max(1, Math.floor(minutes / 25)),
      focusMinutes: state.focusMinutes + Math.floor(minutes),
      rewardedSessions: [...state.rewardedSessions, id],
    }))
  },
  care: (action) => {
    const state = get()
    const now = Date.now()
    const needs = currentNeeds(state, now)
    if (action === 'feed') {
      if (state.food < 1 || Math.round(needs.fullness) >= 100) return false
      set({ ...needs, food: state.food - 1, fullness: Math.min(100, needs.fullness + 30) })
    } else if (action === 'pet') {
      if (now - state.lastPetAt < PET_CARE_COOLDOWN || Math.round(needs.joy) >= 100) return false
      set({ ...needs, joy: Math.min(100, needs.joy + 25), lastPetAt: now })
    } else {
      if (now - state.lastWaterAt < PET_CARE_COOLDOWN || Math.round(needs.water) >= 100) return false
      set({ ...needs, water: Math.min(100, needs.water + 30), lastWaterAt: now })
    }
    return true
  },
}), { name: 'pomo:sprout:v1', version: 1, storage: petStorage }))
