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

/** Bazni URL za API zahteve / Base URL for API requests */
const API_BASE = 'http://localhost:3001/api/v1'

/**
 * Generička funkcija za API zahteve sa obradom grešaka.
 * Generic function for API requests with error handling.
 *
 * @template T - Tip podataka u odgovoru / Response data type
 * @param {string}       url     - Relativna putanja (bez API_BASE) / Relative path (without API_BASE)
 * @param {RequestInit}  options - Fetch opcije / Fetch options
 * @returns {Promise<T>} Podaci iz odgovora / Response data
 * @throws {Error} Ako zahtev nije uspešan / If request is unsuccessful
 */
async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const fullUrl = `${API_BASE}${url}`

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  const json = await response.json() as { success: boolean; data?: T; error?: { code: string; message: string } }

  if (!response.ok || !json.success) {
    const message = json.error?.message ?? `HTTP ${response.status}`
    const error   = new Error(message) as Error & { code?: string; statusCode?: number }
    error.code       = json.error?.code ?? 'UNKNOWN_ERROR'
    error.statusCode = response.status
    throw error
  }

  return (json as ApiSuccess<T>).data
}

/**
 * Prijavljuje korisnika i vraća token i podatke.
 * Logs in a user and returns token and data.
 *
 * @param {LoginCredentials} credentials - Username i password / Username and password
 * @returns {Promise<LoginResponse>} JWT token i podaci o korisniku / JWT token and user data
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body:   JSON.stringify(credentials)
  })
}

/**
 * Vraća profil trenutno ulogovanog korisnika.
 * Returns the profile of the currently logged-in user.
 *
 * @returns {Promise<UserProfile>} Profil korisnika / User profile
 */
export async function getMyProfile(): Promise<UserProfile> {
  const authHeader = getAuthHeader()
  if (!authHeader) {
    throw new Error('Nije autentifikovan / Not authenticated')
  }

  return apiRequest<UserProfile>('/auth/me', {
    method:  'GET',
    headers: { Authorization: authHeader }
  })
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
    await apiRequest<void>('/auth/logout', {
      method:  'POST',
      headers: { Authorization: authHeader }
    })
  } catch {
    // Ignoriši greške pri odjavi — frontend ionako briše token
    // Ignore logout errors — frontend deletes the token anyway
  }
}
