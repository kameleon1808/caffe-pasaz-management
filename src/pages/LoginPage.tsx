/**
 * @file src/pages/LoginPage.tsx
 * @description Stranica za prijavu korisnika.
 *              User login page.
 *
 * Prikazuje se svim neautentifikovanim korisnicima.
 * Displayed to all unauthenticated users.
 *
 * Validacija / Validation:
 * - Username: obavezan, neprazni string / required, non-empty string
 * - Password: obavezna / required
 *
 * Nakon uspešne prijave: preusmeri na /dashboard
 * After successful login: redirect to /dashboard
 */

import { useState, FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useTranslation }        from 'react-i18next'
import { useAuth }               from '../hooks/useAuth'
import { LanguageSwitcher }      from '../components/LanguageSwitcher'

/**
 * Tip za greške u formi.
 * Type for form errors.
 */
interface FormErrors {
  username?: string
  password?: string
  general?:  string
}

/**
 * Login stranica aplikacije.
 * Application login page.
 *
 * @returns {JSX.Element} Login forma / Login form
 */
export function LoginPage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()

  const [username,    setUsername]    = useState('')
  const [password,    setPassword]    = useState('')
  const [errors,      setErrors]      = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Ako je već ulogovan, idi na dashboard
  // If already logged in, go to dashboard
  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  /**
   * Validira formu i vraća da li je validna.
   * Validates the form and returns whether it is valid.
   */
  function validateForm(): boolean {
    const newErrors: FormErrors = {}

    if (!username.trim()) {
      newErrors.username = t('login.error_required_username')
    }

    if (!password) {
      newErrors.password = t('login.error_required_password')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * Obrađuje submit forme.
   * Handles form submission.
   */
  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setErrors({})

    try {
      await login({ username: username.trim(), password })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      const err = error as Error & { code?: string; statusCode?: number }

      if (err.code === 'INVALID_CREDENTIALS') {
        setErrors({ general: t('login.error_invalid') })
      } else if (err.code === 'ACCOUNT_INACTIVE') {
        setErrors({ general: t('login.error_inactive') })
      } else if (err.name === 'TypeError' || err.message.includes('fetch')) {
        setErrors({ general: t('login.error_network') })
      } else {
        setErrors({ general: t('login.error_server') })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
      {/* Language switcher u gornjem desnom uglu / Language switcher in top right corner */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      {/* Login kartica / Login card */}
      <div className="w-full max-w-sm">
        {/* Logo i naslov / Logo and title */}
        <div className="text-center mb-8">
          <div className="
            w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600
            rounded-2xl mx-auto mb-4 flex items-center justify-center
            text-4xl shadow-2xl shadow-primary-500/30
          ">
            ☕
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {t('login.title')}
          </h1>
          <p className="text-gray-400 text-sm">
            {t('login.subtitle')}
          </p>
        </div>

        {/* Forma / Form */}
        <form
          onSubmit={(e) => void handleSubmit(e)}
          noValidate
          className="space-y-4"
        >
          {/* Opšta greška / General error */}
          {errors.general && (
            <div
              role="alert"
              className="
                bg-red-500/10 border border-red-500/30
                text-red-400 text-sm
                px-4 py-3 rounded-xl
                flex items-center gap-2
              "
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.general}
            </div>
          )}

          {/* Username polje / Username field */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-300 mb-1.5"
            >
              {t('login.username')}
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => {
                setUsername(e.target.value)
                if (errors.username) setErrors(prev => ({ ...prev, username: undefined }))
              }}
              placeholder={t('login.username_placeholder')}
              autoComplete="username"
              autoFocus
              disabled={isSubmitting}
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? 'username-error' : undefined}
              className={`
                w-full px-4 py-3 rounded-xl
                bg-surface-input border
                text-white placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-primary-500/50
                transition-colors duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${errors.username
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/10 focus:border-primary-500/50'
                }
              `}
            />
            {errors.username && (
              <p id="username-error" role="alert" className="mt-1.5 text-xs text-red-400">
                {errors.username}
              </p>
            )}
          </div>

          {/* Password polje / Password field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 mb-1.5"
            >
              {t('login.password')}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors(prev => ({ ...prev, password: undefined }))
                }}
                placeholder={t('login.password_placeholder')}
                autoComplete="current-password"
                disabled={isSubmitting}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className={`
                  w-full px-4 py-3 pr-12 rounded-xl
                  bg-surface-input border
                  text-white placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-primary-500/50
                  transition-colors duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${errors.password
                    ? 'border-red-500/50 focus:border-red-500'
                    : 'border-white/10 focus:border-primary-500/50'
                  }
                `}
              />
              {/* Dugme za prikaz lozinke / Show password button */}
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 p-1"
                aria-label={showPassword ? 'Sakrij lozinku' : 'Prikaži lozinku'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" role="alert" className="mt-1.5 text-xs text-red-400">
                {errors.password}
              </p>
            )}
          </div>

          {/* Submit dugme / Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="
              w-full py-3 px-4 mt-2
              bg-primary-500 hover:bg-primary-600
              disabled:bg-primary-800 disabled:cursor-not-allowed
              text-white font-semibold rounded-xl
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-surface
              flex items-center justify-center gap-2
              shadow-lg shadow-primary-500/20
            "
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t('login.submitting')}
              </>
            ) : (
              t('login.submit')
            )}
          </button>
        </form>

        {/* Version info */}
        <p className="text-center text-gray-600 text-xs mt-8">
          Kafić Pasaz Management v1.0.0
        </p>
      </div>
    </div>
  )
}
