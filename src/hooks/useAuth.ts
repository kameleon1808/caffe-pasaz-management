/**
 * @file src/hooks/useAuth.ts
 * @description Custom React hook za upravljanje autentifikacijom.
 *              Custom React hook for authentication management.
 *
 * Pruža:
 * - Stanje autentifikacije (user, isLoading, isAuthenticated)
 * - login() funkciju
 * - logout() funkciju
 *
 * Provides:
 * - Authentication state (user, isLoading, isAuthenticated)
 * - login() function
 * - logout() function
 *
 * Koristi AuthContext koji je definisan u App.tsx.
 * Uses the AuthContext defined in App.tsx.
 */

import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

/**
 * Hook koji vraća kontekst autentifikacije.
 * Hook that returns the authentication context.
 *
 * Mora se koristiti unutar <AuthProvider> komponente.
 * Must be used inside the <AuthProvider> component.
 *
 * @returns {AuthContextType} Kontekst autentifikacije / Authentication context
 * @throws {Error} Ako se koristi van AuthProvider-a / If used outside AuthProvider
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, login, logout } = useAuth()
 *
 * if (!isAuthenticated) return <Redirect to="/login" />
 * return <p>Zdravo, {user.fullName}!</p>
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      '[useAuth] Hook mora biti korišćen unutar AuthProvider-a / ' +
      '[useAuth] Hook must be used inside AuthProvider'
    )
  }

  return context
}
