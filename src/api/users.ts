/**
 * @file src/api/users.ts
 * @description API klijent za upravljanje korisnicima.
 *              API client for user management.
 */

import { authRequest } from './apiClient'

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

/**
 * Vraća sve korisnike.
 * Returns all users.
 */
export const getUsers = (): Promise<User[]> =>
  authRequest<User[]>('/users')

/**
 * Kreira novog korisnika.
 * Creates a new user.
 *
 * @param {CreateUserData} data - Podaci za novog korisnika / New user data
 */
export const createUser = (data: CreateUserData): Promise<User> =>
  authRequest<User>('/users', { method: 'POST', body: JSON.stringify(data) })

/**
 * Menja podatke korisnika.
 * Updates user data.
 *
 * @param {number}         id   - ID korisnika / User ID
 * @param {UpdateUserData} data - Polja za ažuriranje / Fields to update
 */
export const updateUser = (id: number, data: UpdateUserData): Promise<User> =>
  authRequest<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) })

/**
 * Deaktivira korisnika (soft delete).
 * Deactivates a user (soft delete).
 *
 * @param {number} id - ID korisnika / User ID
 */
export const deactivateUser = (id: number): Promise<void> =>
  authRequest<void>(`/users/${id}`, { method: 'DELETE' })

/**
 * Reaktivira prethodno deaktiviranog korisnika.
 * Reactivates a previously deactivated user.
 *
 * @param {number} id - ID korisnika / User ID
 */
export const reactivateUser = (id: number): Promise<User> =>
  authRequest<User>(`/users/${id}/reactivate`, { method: 'PUT' })
