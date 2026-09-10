import { create } from 'zustand'
import { User, UserSettings } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, username: string, password: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => Promise<void>
  updateUserSettings: (settings: Partial<UserSettings>) => void
}

let authRevision = 0
let pendingAuthCheck: { token: string; revision: number; promise: Promise<void> } | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const revision = ++authRevision
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const { user, token } = await response.json()
        if (revision !== authRevision) return false
        localStorage.setItem('token', token)
        
        // Clear anonymous ID after successful login
        const anonymousId = localStorage.getItem('anonymous_user_id')
        if (anonymousId) {
          localStorage.removeItem('anonymous_user_id')
        }
        
        set({ user, token, isAuthenticated: true, isLoading: false })
        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    } finally {
      if (revision === authRevision && get().isLoading) set({ isLoading: false })
    }
  },

  register: async (email: string, username: string, password: string) => {
    const revision = ++authRevision
    try {
      // Get anonymous ID if it exists
      const anonymousId = localStorage.getItem('anonymous_user_id')
      const referralCode = localStorage.getItem('referral_code')
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username, password, anonymousId, referralCode }),
      })

      if (response.ok) {
        const { user, token } = await response.json()
        if (revision !== authRevision) return false
        localStorage.setItem('token', token)
        
        // Clear anonymous ID after successful registration
        if (anonymousId) {
          localStorage.removeItem('anonymous_user_id')
        }
        if (referralCode) {
          localStorage.removeItem('referral_code')
        }
        
        set({ user, token, isAuthenticated: true, isLoading: false })
        return true
      }
      return false
    } catch (error) {
      console.error('Register error:', error)
      return false
    } finally {
      if (revision === authRevision && get().isLoading) set({ isLoading: false })
    }
  },

  logout: () => {
    authRevision += 1
    localStorage.removeItem('token')
    set({ user: null, token: null, isAuthenticated: false, isLoading: false })
  },

  checkAuth: async () => {
    let token: string | null
    try {
      token = localStorage.getItem('token')
    } catch (error) {
      console.error('Failed to read authentication token:', error)
      set({ isLoading: false })
      return
    }
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false })
      return
    }

    const revision = authRevision
    if (pendingAuthCheck?.token === token && pendingAuthCheck.revision === revision) {
      return pendingAuthCheck.promise
    }

    // Ignore responses from a previous login/logout or an externally replaced token.
    const isCurrent = () => authRevision === revision && localStorage.getItem('token') === token
    const promise = (async () => {
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!isCurrent()) return

        if (response.ok) {
          const user = await response.json()
          if (!isCurrent()) return
          set({ user, token, isAuthenticated: true, isLoading: false })
        } else if (response.status === 401) {
          // Только при 401 (невалидный токен) разлогиниваем
          localStorage.removeItem('token')
          set({ user: null, token: null, isAuthenticated: false, isLoading: false })
        } else {
          // При других ошибках (403, 500, etc) просто помечаем загрузку завершённой
          // но НЕ разлогиниваем - токен может быть валидным
          set({ isLoading: false })
          console.warn(`Auth check failed with status ${response.status}, but keeping user logged in`)
        }
      } catch (error) {
        if (!isCurrent()) return
        // Сетевые ошибки, таймауты и т.д. - НЕ разлогиниваем
        console.error('Auth check network error:', error)
        set({ isLoading: false })
      }
    })()

    pendingAuthCheck = { token, revision, promise }
    try {
      await promise
    } finally {
      if (pendingAuthCheck?.promise === promise) pendingAuthCheck = null
    }
  },

  updateUserSettings: (settings) => {
    set((state) => {
      if (!state.user) {
        return {}
      }

      const existingSettings = state.user.settings

      const nextSettings: UserSettings = existingSettings
        ? { ...existingSettings, ...settings }
        : {
            id: settings.id ?? state.user.id,
            userId: state.user.id,
            workDuration: settings.workDuration ?? 25,
            shortBreak: settings.shortBreak ?? 5,
            longBreak: settings.longBreak ?? 15,
            longBreakAfter: settings.longBreakAfter ?? 4,
            soundEnabled: settings.soundEnabled ?? true,
            soundVolume: settings.soundVolume ?? 0.5,
            notificationsEnabled: settings.notificationsEnabled ?? true,
          }

      return {
        user: {
          ...state.user,
          settings: nextSettings,
        },
      }
    })
  },
}))
