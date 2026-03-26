/**
 * @file src/utils/token.ts
 * @description Pomoćne funkcije za upravljanje JWT tokenom u localStorage.
 *              Helper functions for managing JWT token in localStorage.
 *
 * Token se čuva u localStorage pod ključem 'kafic_token'.
 * The token is stored in localStorage under the key 'kafic_token'.
 */

import type { AuthUser } from '../types'

const TOKEN_KEY = 'kafic_token'
const USER_KEY  = 'kafic_user'

/**
 * Čuva JWT token u localStorage.
 * Saves JWT token to localStorage.
 *
 * @param {string} token - JWT token za čuvanje / JWT token to save
 */
export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch (error) {
    console.error('[token] Greška pri čuvanju tokena / Error saving token:', error)
  }
}

/**
 * Čita JWT token iz localStorage.
 * Reads JWT token from localStorage.
 *
 * @returns {string | null} Token ili null ako ne postoji / Token or null if not found
 */
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * Briše JWT token iz localStorage.
 * Deletes JWT token from localStorage.
 */
export function removeToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch (error) {
    console.error('[token] Greška pri brisanju tokena / Error removing token:', error)
  }
}

/**
 * Čuva podatke o korisniku u localStorage.
 * Saves user data to localStorage.
 *
 * @param {AuthUser} user - Podaci o korisniku / User data
 */
export function saveUser(user: AuthUser): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch (error) {
    console.error('[token] Greška pri čuvanju korisnika / Error saving user:', error)
  }
}

/**
 * Čita podatke o korisniku iz localStorage.
 * Reads user data from localStorage.
 *
 * @returns {AuthUser | null} Korisnik ili null / User or null
 */
export function getSavedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

/**
 * Proverava da li je token verovatno istekao (bez poziva serveru).
 * Checks if the token is likely expired (without calling the server).
 *
 * NAPOMENA: Ovo je samo lokalna provera. Server uvek proverava JWT validnost.
 * NOTE: This is only a local check. The server always validates the JWT.
 *
 * @param {string} token - JWT token za proveru / JWT token to check
 * @returns {boolean} true ako je istekao / true if expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const parts   = token.split('.')
    if (parts.length !== 3) return true

    const payload = JSON.parse(atob(parts[1]!)) as { exp?: number }
    if (!payload.exp) return false

    // Dodaj 30 sekundi tolerancije / Add 30 seconds tolerance
    return Date.now() / 1000 > payload.exp - 30
  } catch {
    return true
  }
}

/**
 * Vraća Authorization header vrednost za API zahteve.
 * Returns the Authorization header value for API requests.
 *
 * @returns {string | null} 'Bearer <token>' ili null / 'Bearer <token>' or null
 */
export function getAuthHeader(): string | null {
  const token = getToken()
  if (!token) return null
  return `Bearer ${token}`
}
