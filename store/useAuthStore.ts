import { create } from 'zustand'
import { User, UserSettings } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, username: string, password: string) => Promise<boolean>
  googleLogin: (token: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => Promise<void>
  updateUserSettings: (settings: Partial<UserSettings>) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
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
        localStorage.setItem('token', token)
        
        // Clear anonymous ID after successful login
        const anonymousId = localStorage.getItem('anonymous_user_id')
        if (anonymousId) {
          localStorage.removeItem('anonymous_user_id')
        }
        
        set({ user, token, isAuthenticated: true })
        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  },

  googleLogin: async (token: string) => {
    try {
      const anonymousId = localStorage.getItem('anonymous_user_id')

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, anonymousId }),
      })

      if (response.ok) {
        const { user, token: jwt } = await response.json()
        localStorage.setItem('token', jwt)

        if (anonymousId) {
          localStorage.removeItem('anonymous_user_id')
        }

        set({ user, token: jwt, isAuthenticated: true })
        return true
      }
      return false
    } catch (error) {
      console.error('Google login error:', error)
      return false
    }
  },

  register: async (email: string, username: string, password: string) => {
    try {
      // Get anonymous ID if it exists
      const anonymousId = localStorage.getItem('anonymous_user_id')
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username, password, anonymousId }),
      })

      if (response.ok) {
        const { user, token } = await response.json()
        localStorage.setItem('token', token)
        
        // Clear anonymous ID after successful registration
        if (anonymousId) {
          localStorage.removeItem('anonymous_user_id')
        }
        
        set({ user, token, isAuthenticated: true })
        return true
      }
      return false
    } catch (error) {
      console.error('Register error:', error)
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        set({ isLoading: false })
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const user = await response.json()
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
      // Сетевые ошибки, таймауты и т.д. - НЕ разлогиниваем
      console.error('Auth check network error:', error)
      set({ isLoading: false })
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
