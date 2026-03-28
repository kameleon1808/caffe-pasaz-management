/**
 * @file src/api/shifts.ts
 * @description API klijent za upravljanje smenama.
 *              API client for shift management.
 */

import { getAuthHeader } from '../utils/token'
import type { Shift }    from '../types'

const BASE = 'http://localhost:3001/api/v1/shifts'

/** Pomoćna funkcija za autorizovane zahteve / Helper for authorized requests */
async function req<T>(url: string, options: RequestInit = {}): Promise<T> {
  const authHeader = getAuthHeader()
  if (!authHeader) throw new Error('Nije autentifikovan / Not authenticated')

  const res  = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization:  authHeader,
      ...options.headers,
    },
  })
  const json = await res.json() as {
    success: boolean
    data?: T
    message?: string
    error?: { code: string; message: string; details?: unknown }
  }

  if (!res.ok || !json.success) {
    const err = new Error(json.error?.message ?? `HTTP ${res.status}`) as Error & {
      code?: string
      details?: unknown
    }
    err.code    = json.error?.code
    err.details = json.error?.details
    throw err
  }
  return json.data as T
}

/**
 * Započinje novu smenu za trenutnog korisnika.
 * Starts a new shift for the current user.
 *
 * @returns {Promise<Shift>} Nova smena / New shift
 * @throws Ako već postoji aktivna smena / If an active shift already exists
 */
export function startShift(): Promise<Shift> {
  return req<Shift>(`${BASE}/start`, { method: 'POST' })
}

/**
 * Završava aktivnu smenu za trenutnog korisnika.
 * Ends the active shift for the current user.
 *
 * @returns {Promise<Shift>} Završena smena / Ended shift
 * @throws Ako nema aktivne smene ili ima otvorenih računa / If no active shift or open bills exist
 */
export function endShift(): Promise<Shift> {
  return req<Shift>(`${BASE}/end`, { method: 'POST' })
}

/**
 * Vraća aktivnu smenu za trenutnog korisnika, ili null ako nema.
 * Returns the active shift for the current user, or null if none.
 *
 * @returns {Promise<Shift | null>} Aktivna smena ili null / Active shift or null
 */
export async function getActiveShift(): Promise<Shift | null> {
  return req<Shift | null>(`${BASE}/active`)
}

/**
 * Vraća istoriju smena za trenutnog korisnika.
 * Returns shift history for the current user.
 *
 * @param {number} [limit=20] - Maksimalan broj zapisa / Maximum number of records
 * @returns {Promise<Shift[]>} Lista smena / List of shifts
 */
export function getShiftHistory(limit = 20): Promise<Shift[]> {
  return req<Shift[]>(`${BASE}/history?limit=${limit}`)
}
