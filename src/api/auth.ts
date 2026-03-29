/**
 * @file src/api/auth.ts
 * @description API klijent za autentifikacione endpointe.
 *              API client for authentication endpoints.
 *
 * Sve funkcije komuniciraju sa Express serverom koji radi na localhost:3001.
 * All functions communicate with the Express server running on localhost:3001.
 */

import type { LoginCredentials, LoginResponse, UserProfile, ApiSuccess } from '../types'
import { getAuthHeader } from '../utils/token'
import { authRequest, API_BASE } from './apiClient'

/**
 * Prijavljuje korisnika i vraća token i podatke.
 * Logs in a user and returns token and data.
 *
 * @param {LoginCredentials} credentials - Username i password / Username and password
 * @returns {Promise<LoginResponse>} JWT token i podaci o korisniku / JWT token and user data
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  // Login koristi publicRequest (bez Bearer tokena) / Login uses publicRequest (no Bearer token)
  const response = await fetch(`${API_BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(credentials),
  })

  const json = await response.json() as { success: boolean; data?: LoginResponse; error?: { code: string; message: string } }

  if (!response.ok || !json.success) {
    const message = json.error?.message ?? `HTTP ${response.status}`
    const err     = new Error(message) as Error & { code?: string; statusCode?: number }
    err.code       = json.error?.code ?? 'UNKNOWN_ERROR'
    err.statusCode = response.status
    throw err
  }

  return (json as ApiSuccess<LoginResponse>).data
}

/**
 * Vraća profil trenutno ulogovanog korisnika.
 * Returns the profile of the currently logged-in user.
 *
 * @returns {Promise<UserProfile>} Profil korisnika / User profile
 */
export async function getMyProfile(): Promise<UserProfile> {
  return authRequest<UserProfile>('/auth/me')
}

/**
 * Odjavljuje korisnika (obaveštava server, ali frontend briše token).
 * Logs out the user (notifies server, but frontend deletes the token).
 *
 * @returns {Promise<void>}
 */
export async function logout(): Promise<void> {
  const authHeader = getAuthHeader()
  if (!authHeader) return

  try {
    await authRequest<void>('/auth/logout', { method: 'POST' })
  } catch {
    // Ignoriši greške pri odjavi — frontend ionako briše token
    // Ignore logout errors — frontend deletes the token anyway
  }
}
