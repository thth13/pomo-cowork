'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleProcessing, setIsGoogleProcessing] = useState(false)

  const { login, register } = useAuthStore()
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!isOpen) {
      setShowEmailForm(false)
      setError('')
      setIsLoading(false)
      setIsGoogleProcessing(false)
      setFormData({ email: '', username: '', password: '' })
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      let success = false
      
      if (isLogin) {
        success = await login(formData.email, formData.password)
        if (!success) {
          setError('Invalid email or password')
        }
      } else {
        if (!formData.username.trim()) {
          setError('Username is required')
          setIsLoading(false)
          return
        }
        success = await register(formData.email, formData.username, formData.password)
        if (!success) {
          setError('Registration error. Please try again.')
        }
      }

      if (success) {
        onClose()
        setFormData({ email: '', username: '', password: '' })
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError('')
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError('')
    setFormData({ email: '', username: '', password: '' })
  }

  const handleGoogleLogin = () => {
    setError('')

    if (!googleClientId) {
      setError('Google login is not configured.')
      return
    }

    setIsGoogleProcessing(true)

    // Сохраняем anonymous ID перед редиректом
    const anonymousId = localStorage.getItem('anonymous_user_id')
    if (anonymousId) {
      sessionStorage.setItem('google_auth_anonymous_id', anonymousId)
    }

    // OAuth 2.0 redirect flow
    const redirectUri = `${window.location.origin}/api/auth/google/callback`
    const scope = 'openid email profile'
    const state = crypto.randomUUID()
    sessionStorage.setItem('google_oauth_state', state)

    console.log('Google OAuth redirect URI:', redirectUri)

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', googleClientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scope)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('access_type', 'online')
    authUrl.searchParams.set('prompt', 'select_account')

    window.location.href = authUrl.toString()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full p-8 border border-slate-100/60 dark:border-slate-800"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">
                Pomo Cowork
              </p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {isLogin ? 'Sign in' : 'Create account'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sign in faster with Google or continue with email
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          {/* Google Auth */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleProcessing || !googleClientId}
              className="w-full flex items-center justify-center gap-3 border border-slate-200 dark:border-slate-800 rounded-xl py-3 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <svg
                aria-hidden="true"
                focusable="false"
                className="w-5 h-5"
                viewBox="0 0 18 18"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M17.64 9.2045C17.64 8.56682 17.5827 7.95227 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.561V15.8195H14.9564C16.6582 14.2523 17.64 11.9455 17.64 9.2045Z"
                  fill="#4285F4"
                />
                <path
                  d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.561C11.2418 14.1018 10.2109 14.4205 9 14.4205C6.65636 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z"
                  fill="#34A853"
                />
                <path
                  d="M3.96414 10.71C3.78414 10.1691 3.68187 9.59364 3.68187 9C3.68187 8.40636 3.78414 7.8309 3.96414 7.29V4.95818H0.957322C0.347732 6.17318 0 7.54773 0 9C0 10.4523 0.347732 11.8268 0.957322 13.0418L3.96414 10.71Z"
                  fill="#FBBC05"
                />
                <path
                  d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4445 4.94182L15.0218 2.36455C13.4632 0.910909 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65636 3.57955 9 3.57955Z"
                  fill="#EA4335"
                />
              </svg>
              <span>{isGoogleProcessing ? 'Connecting...' : 'Continue with Google'}</span>
            </button>

            {!showEmailForm && (
              <div className="flex items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                <span className="h-px w-12 bg-slate-200 dark:bg-slate-700" />
                <button
                  type="button"
                  onClick={() => setShowEmailForm(true)}
                  className="font-medium text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  or use email
                </button>
                <span className="h-px w-12 bg-slate-200 dark:bg-slate-700" />
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          {showEmailForm && (
            <form onSubmit={handleSubmit} className="space-y-4 mt-8">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input pl-10"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              {/* Username (for registration) */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="input pl-10"
                      placeholder="Your name"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="input pl-10 pr-10"
                    placeholder="Your password"
                    required
                    minLength={4}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {!isLogin && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Minimum 4 characters
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  isLogin ? 'Login' : 'Register'
                )}
              </motion.button>
            </form>
          )}

          {/* Toggle Mode */}
          {showEmailForm && (
            <div className="mt-6 text-center space-y-2">
              <p className="text-slate-600 dark:text-slate-300">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
                <button
                  onClick={toggleMode}
                  className="ml-1 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                >
                  {isLogin ? 'Register' : 'Login'}
                </button>
              </p>
              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400"
              >
                Prefer Google? Continue with Google
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
