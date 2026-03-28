/**
 * @file src/api/tables.ts
 * @description API klijent za upravljanje stolovima.
 *              API client for table management.
 */

import { getAuthHeader }                             from '../utils/token'
import type { TableWithStatus, Zone, CreateTableData } from '../types'

const BASE = 'http://localhost:3001/api/v1/tables'

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
 * Vraća sve aktivne stolove, opciono filtrirane po zoni.
 * Returns all active tables, optionally filtered by zone.
 *
 * @param {Zone} [zone] - Opcioni filter po zoni / Optional zone filter
 */
export function fetchTables(zone?: Zone): Promise<TableWithStatus[]> {
  const url = zone ? `${BASE}?zone=${zone}` : BASE
  return req<TableWithStatus[]>(url)
}

/**
 * Vraća jedan sto prema ID-u.
 * Returns a single table by ID.
 *
 * @param {number} id - ID stola / Table ID
 */
export function fetchTable(id: number): Promise<TableWithStatus> {
  return req<TableWithStatus>(`${BASE}/${id}`)
}

/**
 * Kreira novi sto.
 * Creates a new table.
 *
 * @param {CreateTableData} data - Podaci za novi sto / Data for the new table
 */
export function createTable(data: CreateTableData): Promise<TableWithStatus> {
  return req<TableWithStatus>(BASE, {
    method: 'POST',
    body:   JSON.stringify(data),
  })
}

/**
 * Menja podatke stola.
 * Updates table data.
 *
 * @param {number} id   - ID stola / Table ID
 * @param {object} data - Polja za ažuriranje / Fields to update
 */
export function updateTable(
  id:   number,
  data: Partial<{ label: string; zone: Zone; positionX: number; positionY: number; active: boolean }>
): Promise<TableWithStatus> {
  return req<TableWithStatus>(`${BASE}/${id}`, {
    method: 'PUT',
    body:   JSON.stringify(data),
  })
}

/**
 * Ažurira poziciju stola.
 * Updates the table's position.
 *
 * @param {number} id        - ID stola / Table ID
 * @param {number} positionX - Nova X pozicija / New X position
 * @param {number} positionY - Nova Y pozicija / New Y position
 */
export function updateTablePosition(
  id:        number,
  positionX: number,
  positionY: number
): Promise<TableWithStatus> {
  return req<TableWithStatus>(`${BASE}/${id}/position`, {
    method: 'PUT',
    body:   JSON.stringify({ positionX, positionY }),
  })
}

/**
 * Deaktivira sto (soft delete).
 * Deactivates a table (soft delete).
 *
 * @param {number} id - ID stola / Table ID
 */
export function deleteTable(id: number): Promise<void> {
  return req<void>(`${BASE}/${id}`, { method: 'DELETE' })
}
