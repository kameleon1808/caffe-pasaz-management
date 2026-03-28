/**
 * @file src/api/users.ts
 * @description API klijent za upravljanje korisnicima.
 *              API client for user management.
 */

import { getAuthHeader } from '../utils/token'

const BASE = 'http://localhost:3001/api/v1/users'

/** Korisnik sistema / System user */
export interface User {
  id:        number
  fullName:  string
  username:  string
  role:      string
  active:    boolean
  createdAt: string
  updatedAt: string
}

/** Podaci za kreiranje korisnika / Data for creating a user */
export interface CreateUserData {
  fullName: string
  username: string
  password: string
  role:     string
}

/** Podaci za izmenu korisnika / Data for updating a user */
export interface UpdateUserData {
  fullName?: string
  username?: string
  password?: string
}

/** Pomoćna funkcija za autorizovane zahteve / Helper for authorized requests */
async function req<T>(url: string, options: RequestInit = {}): Promise<T> {
  const authHeader = getAuthHeader()
  if (!authHeader) throw new Error('Nije autentifikovan / Not authenticated')

  const res  = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: authHeader, ...options.headers },
  })
  const json = await res.json() as {
    success: boolean
    data?: T
    message?: string
    error?: { code: string; message: string; details?: unknown }
  }

  if (!res.ok || !json.success) {
    const err = new Error(json.error?.message ?? `HTTP ${res.status}`) as Error & { code?: string; details?: unknown }
    err.code    = json.error?.code
    err.details = json.error?.details
    throw err
  }
  return json.data as T
}

/**
 * Vraća sve korisnike.
 * Returns all users.
 */
export const getUsers = (): Promise<User[]> =>
  req<User[]>(BASE)

/**
 * Kreira novog korisnika.
 * Creates a new user.
 *
 * @param {CreateUserData} data - Podaci za novog korisnika / New user data
 */
export const createUser = (data: CreateUserData): Promise<User> =>
  req<User>(BASE, { method: 'POST', body: JSON.stringify(data) })

/**
 * Menja podatke korisnika.
 * Updates user data.
 *
 * @param {number}         id   - ID korisnika / User ID
 * @param {UpdateUserData} data - Polja za ažuriranje / Fields to update
 */
export const updateUser = (id: number, data: UpdateUserData): Promise<User> =>
  req<User>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) })

/**
 * Deaktivira korisnika (soft delete).
 * Deactivates a user (soft delete).
 *
 * @param {number} id - ID korisnika / User ID
 */
export const deactivateUser = (id: number): Promise<void> =>
  req<void>(`${BASE}/${id}`, { method: 'DELETE' })

/**
 * Reaktivira prethodno deaktiviranog korisnika.
 * Reactivates a previously deactivated user.
 *
 * @param {number} id - ID korisnika / User ID
 */
export const reactivateUser = (id: number): Promise<User> =>
  req<User>(`${BASE}/${id}/reactivate`, { method: 'PUT' })
