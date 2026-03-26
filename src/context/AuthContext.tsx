/**
 * @file src/context/AuthContext.tsx
 * @description React Context za upravljanje globalnim stanjem autentifikacije.
 *              React Context for managing global authentication state.
 *
 * Ovaj kontekst je dostupan svim komponentama unutar aplikacije i pruža:
 * - Trenutnog ulogovanog korisnika
 * - Funkcije za login i logout
 * - Indikator učitavanja
 *
 * This context is available to all components within the application and provides:
 * - Currently logged-in user
 * - Login and logout functions
 * - Loading indicator
 */

import { createContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { AuthUser, LoginCredentials } from '../types'
import { login as apiLogin, logout as apiLogout } from '../api/auth'
import {
  saveToken, saveUser, removeToken,
  getSavedUser, getToken, isTokenExpired
} from '../utils/token'

/**
 * Oblik AuthContext-a koji je izložen komponentama.
 * Shape of the AuthContext exposed to components.
 */
export interface AuthContextType {
  /** Trenutni korisnik ili null ako nije ulogovan / Current user or null if not logged in */
  user:            AuthUser | null
  /** Da li se provera autentifikacije još uvek učitava / Whether auth check is still loading */
  isLoading:       boolean
  /** Da li je korisnik ulogovan / Whether the user is logged in */
  isAuthenticated: boolean
  /**
   * Prijavljuje korisnika sa datim kredencijalima.
   * Logs in the user with the given credentials.
   * @throws {Error} Ako login ne uspe / If login fails
   */
  login:  (credentials: LoginCredentials) => Promise<void>
  /** Odjavljuje trenutnog korisnika / Logs out the current user */
  logout: () => Promise<void>
}

/**
 * Kreira AuthContext sa default vrednostima.
 * Creates the AuthContext with default values.
 */
export const AuthContext = createContext<AuthContextType | null>(null)

/**
 * Props za AuthProvider komponentu.
 * Props for the AuthProvider component.
 */
interface AuthProviderProps {
  children: ReactNode
}

/**
 * Provider komponenta koja omotava aplikaciju i pruža auth stanje.
 * Provider component that wraps the application and provides auth state.
 *
 * @param {AuthProviderProps} props - Children komponente / Children components
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user,      setUser]      = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  /**
   * Pri pokretanju, proveri da li postoji sačuvan token i da li je validan.
   * On startup, check if there is a saved token and if it is valid.
   */
  useEffect(() => {
    const token       = getToken()
    const savedUser   = getSavedUser()

    if (token && savedUser && !isTokenExpired(token)) {
      // Token postoji i nije istekao — obnovi sesiju
      // Token exists and hasn't expired — restore session
      setUser(savedUser)
    } else if (token) {
      // Token je istekao — obriši sesiju
      // Token has expired — clear session
      removeToken()
      setUser(null)
    }

    setIsLoading(false)
  }, [])

  /**
   * Prijavljuje korisnika.
   * Logs in the user.
   *
   * @param {LoginCredentials} credentials - Username i password / Username and password
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    const response = await apiLogin(credentials)

    saveToken(response.token)
    saveUser(response.user)
    setUser(response.user)
  }, [])

  /**
   * Odjavljuje korisnika i briše lokalne podatke.
   * Logs out the user and clears local data.
   */
  const logout = useCallback(async (): Promise<void> => {
    await apiLogout()
    removeToken()
    setUser(null)
  }, [])

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    logout
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}
