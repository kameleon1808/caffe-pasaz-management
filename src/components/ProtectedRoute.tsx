/**
 * @file src/components/ProtectedRoute.tsx
 * @description Komponenta za zaštićene rute — samo ulogovani korisnici mogu pristupiti.
 *              Component for protected routes — only logged-in users can access.
 *
 * Podržava i role-based zaštitu: određene rute su dostupne samo adminu.
 * Also supports role-based protection: certain routes are only available to admin.
 *
 * Korišćenje / Usage:
 * ```tsx
 * <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
 * <Route path="/users"     element={<ProtectedRoute roles={['ADMIN']}><Users /></ProtectedRoute>} />
 * ```
 */

import { ReactNode }    from 'react'
import { Navigate }     from 'react-router-dom'
import { useAuth }      from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'
import type { Role }    from '../types'

/**
 * Props za ProtectedRoute komponentu.
 * Props for the ProtectedRoute component.
 */
interface ProtectedRouteProps {
  /** Sadržaj koji se prikazuje ako je korisnik autorizovan / Content to show if user is authorized */
  children: ReactNode
  /**
   * Uloge koje imaju pristup (default: sve uloge / all roles).
   * Roles that have access (default: all roles).
   */
  roles?: Role[]
  /** Putanja na koju se preusmerava ako nije ulogovan (default: '/login') / Redirect if not logged in */
  redirectTo?: string
}

/**
 * Omotač koji proverava autentifikaciju i autorizaciju pre renderovanja sadržaja.
 * Wrapper that checks authentication and authorization before rendering content.
 *
 * @param {ProtectedRouteProps} props - Props komponente / Component props
 */
export function ProtectedRoute({
  children,
  roles,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const { t } = useTranslation()

  // Dok se proverava auth status, prikaži loader
  // While auth status is being checked, show loader
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // Nije ulogovan — preusmeri na login
  // Not logged in — redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace />
  }

  // Provera role ako je zahtevana / Check role if required
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {t('errors.forbidden')}
          </h1>
          <p className="text-gray-400 mb-6">
            {t('errors.forbidden_desc')}
          </p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
