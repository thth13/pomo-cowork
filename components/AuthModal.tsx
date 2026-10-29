'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import CommunityDialog from '@/components/CommunityDialog'
import { useAuthStore } from '@/store/useAuthStore'
import { reportConversion } from '@/lib/gtm'
import { useI18n } from '@/components/I18nProvider'
import { registrationFields, validateRegistration, type RegistrationField, type RegistrationFieldErrors } from '@/lib/registrationValidation'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'login' | 'register'
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  })
  const [fieldErrors, setFieldErrors] = useState<RegistrationFieldErrors>({})
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const submittingRef = useRef(false)
  const pendingFocusRef = useRef<RegistrationField | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleProcessing, setIsGoogleProcessing] = useState(false)
  const isBusy = isLoading || isGoogleProcessing

  const { login, register } = useAuthStore()
  const { t } = useI18n()
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!isOpen) {
      pendingFocusRef.current = null
      setFieldErrors({})
      setShowPassword(false)
      setShowConfirmPassword(false)
      setError('')
      setIsLoading(false)
      setIsGoogleProcessing(false)
      setFormData({ email: '', username: '', password: '', confirmPassword: '' })
      return
    }

    setIsLogin(initialMode === 'login')
  }, [initialMode, isOpen])

  useEffect(() => {
    if (isLoading || !pendingFocusRef.current) return
    const input = formRef.current?.elements.namedItem(pendingFocusRef.current)
    pendingFocusRef.current = null
    if (input instanceof HTMLInputElement) input.focus()
  }, [fieldErrors, isLoading])

  const showFieldErrors = (errors: RegistrationFieldErrors) => {
    pendingFocusRef.current = registrationFields.find(field => errors[field]) ?? null
    setFieldErrors(errors)
  }

  const fieldError = (field: RegistrationField) => {
    const code = fieldErrors[field]
    return code ? (
      <p id={`auth-${field}-error`} role="alert" className="auth-field-error">
        {t.auth[code]}
      </p>
    ) : null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current || isGoogleProcessing) return
    setError('')
    setFieldErrors({})

    if (!isLogin) {
      const errors = validateRegistration(formData)
      if (Object.keys(errors).length) {
        showFieldErrors(errors)
        return
      }
    } else if (!formData.email.trim() || !formData.password) {
      showFieldErrors({
        ...(!formData.email.trim() ? { email: 'emailRequired' as const } : {}),
        ...(!formData.password ? { password: 'passwordRequired' as const } : {}),
      })
      return
    }

    submittingRef.current = true
    setIsLoading(true)
    try {
      let success = false
      if (isLogin) {
        success = await login(formData.email.trim(), formData.password)
        if (!success) setError(t.auth.invalidCredentials)
      } else {
        const result = await register(formData.email.trim(), formData.username, formData.password, formData.confirmPassword)
        success = result.success
        if (result.success === false) {
          if (result.fieldErrors && Object.keys(result.fieldErrors).length) {
            showFieldErrors(result.fieldErrors)
          } else {
            setError(result.error === 'networkError' ? t.auth.networkError : result.error === 'Server error' ? t.auth.serverError : result.error)
          }
        }
      }

      if (success) {
        if (!isLogin) reportConversion()
        onClose()
        setFormData({ email: '', username: '', password: '', confirmPassword: '' })
      }
    } catch {
      setError(t.auth.unexpectedError)
    } finally {
      submittingRef.current = false
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setFieldErrors(prev => {
      const next = { ...prev }
      delete next[e.target.name as RegistrationField]
      if (e.target.name === 'password') delete next.confirmPassword
      return next
    })
    setError('')
  }

  const toggleMode = () => {
    if (submittingRef.current || isGoogleProcessing) return
    pendingFocusRef.current = null
    setIsLogin(!isLogin)
    setFieldErrors({})
    setShowPassword(false)
    setShowConfirmPassword(false)
    setError('')
    setFormData({ email: '', username: '', password: '', confirmPassword: '' })
  }

  const handleGoogleLogin = () => {
    if (submittingRef.current || isGoogleProcessing) return
    setError('')
    if (window.location.pathname === '/extension/authorize') {
      sessionStorage.setItem('pomo:extensionAuthReturn', JSON.stringify({ path: window.location.pathname + window.location.search, createdAt: Date.now() }))
    }

    if (!googleClientId) {
      setError(t.auth.googleNotConfigured)
      return
    }

    reportConversion()

    setIsGoogleProcessing(true)

    // Сохраняем anonymous ID перед редиректом
    const anonymousId = localStorage.getItem('anonymous_user_id')
    if (anonymousId) {
      sessionStorage.setItem('google_auth_anonymous_id', anonymousId)
    }

    // OAuth 2.0 redirect flow
    const redirectUri = `${window.location.origin}/api/auth/google/callback`
    const scope = 'openid email profile'
    const baseState = crypto.randomUUID()
    const referralCode = localStorage.getItem('referral_code')
    const state = referralCode ? `${baseState}|ref:${referralCode}` : baseState
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
    <CommunityDialog
      open={isOpen}
      variant="auth"
      title={isLogin ? t.auth.signIn : t.auth.createAccount}
      description={t.auth.subtitle}
      busy={isBusy}
      dismissOnBackdrop
      onClose={onClose}
    >
      {/* Google Auth */}
      <div className="auth-methods">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isBusy || !googleClientId}
          aria-busy={isGoogleProcessing}
          className="community-button auth-google"
        >
          {isGoogleProcessing ? <Loader2 size={18} className="auth-spinner" aria-hidden="true" /> : <svg
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
          </svg>}
          <span>{isGoogleProcessing ? t.auth.connecting : t.auth.connectWithGoogle}</span>
        </button>

        <div className="auth-divider"><span>{t.auth.orUseEmail}</span></div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="auth-error"
        >
          {error}
        </div>
      )}

      {/* Form */}
      <form ref={formRef} noValidate onSubmit={handleSubmit} aria-busy={isLoading} className="auth-form">
        {/* Email */}
        <div>
          <label htmlFor="auth-email" className="auth-label">
            {t.auth.email}
          </label>
          <div className="auth-input-wrap">
            <Mail className="auth-field-icon" aria-hidden="true" />
            <input
              type="email"
              id="auth-email"
              name="email"
              disabled={isBusy}
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
              value={formData.email}
              onChange={handleInputChange}
              className="auth-input"
              placeholder="your@email.com"
              required
            />
          </div>
          {fieldError('email')}
        </div>

        {/* Username (for registration) */}
        {!isLogin && (
          <div>
            <label htmlFor="auth-username" className="auth-label">
              {t.auth.username}
            </label>
            <div className="auth-input-wrap">
              <User className="auth-field-icon" aria-hidden="true" />
              <input
                type="text"
                id="auth-username"
                name="username"
                disabled={isBusy}
                autoComplete="username"
                aria-invalid={Boolean(fieldErrors.username)}
                aria-describedby={fieldErrors.username ? 'auth-username-error' : undefined}
                value={formData.username}
                onChange={handleInputChange}
                className="auth-input"
                placeholder={t.auth.usernamePlaceholder}
                required={!isLogin}
              />
            </div>
            {fieldError('username')}
          </div>
        )}

        {/* Password */}
        <div>
          <label htmlFor="auth-password" className="auth-label">
            {t.auth.password}
          </label>
          <div className="auth-input-wrap">
            <Lock className="auth-field-icon" aria-hidden="true" />
            <input
              type={showPassword ? 'text' : 'password'}
              id="auth-password"
              name="password"
              disabled={isBusy}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'auth-password-error' : !isLogin ? 'auth-password-help' : undefined}
              value={formData.password}
              onChange={handleInputChange}
              className="auth-input auth-input-password"
              placeholder={t.auth.passwordPlaceholder}
              required
              minLength={4}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
              aria-pressed={showPassword}
              disabled={isBusy}
              className="auth-password-toggle"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {!isLogin && (
            <p id="auth-password-help" className="auth-help">
              {t.auth.minimumPassword}
            </p>
          )}
          {fieldError('password')}
        </div>

        {!isLogin && (
          <div>
            <label htmlFor="auth-confirmPassword" className="auth-label">
              {t.auth.confirmPassword}
            </label>
            <div className="auth-input-wrap">
              <Lock className="auth-field-icon" aria-hidden="true" />
              <input
                id="auth-confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                disabled={isBusy}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={fieldErrors.confirmPassword ? 'auth-confirmPassword-error' : undefined}
                className="auth-input auth-input-password"
                placeholder={t.auth.confirmPasswordPlaceholder}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? t.auth.hidePassword : t.auth.showPassword}
                aria-pressed={showConfirmPassword}
                disabled={isBusy}
                className="auth-password-toggle"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {fieldError('confirmPassword')}
          </div>
        )}

        {/* Submit Button */}
        <button
          aria-busy={isLoading}
          type="submit"
          disabled={isBusy}
          className="community-button community-button-primary auth-submit"
        >
          {isLoading ? <Loader2 size={18} className="auth-spinner" aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
          <span>{isLoading ? t.common.loading : isLogin ? t.auth.signIn : t.auth.createAccount}</span>
        </button>
      </form>

      {/* Toggle Mode */}
      <div className="auth-footer">
        {!isLogin && (
          <p className="auth-terms">
            {t.auth.termsCopy}{' '}
            <Link
              href="/terms"
              className="auth-link"
            >
              {t.auth.terms}
            </Link>{' '}
            {t.auth.and}{' '}
            <Link
              href="/privacy"
              className="auth-link"
            >
              {t.auth.privacyPolicy}
            </Link>.
          </p>
        )}
        <p>
          {isLogin ? t.auth.noAccount : t.auth.alreadyHaveAccount}
          {' '}
          <button
            type="button"
            onClick={toggleMode}
            disabled={isBusy}
            className="auth-link auth-mode-switch"
          >
            {isLogin ? t.auth.register : t.auth.login}
          </button>
        </p>
      </div>
    </CommunityDialog>
  )
}
