/**
 * @file src/api/tables.ts
 * @description API klijent za upravljanje stolovima.
 *              API client for table management.
 */

import { authRequest } from './apiClient'
import type { TableWithStatus, Zone, CreateTableData } from '../types'

/**
 * Vraća sve aktivne stolove, opciono filtrirane po zoni.
 * Returns all active tables, optionally filtered by zone.
 *
 * @param {Zone} [zone] - Opcioni filter po zoni / Optional zone filter
 */
export function fetchTables(zone?: Zone): Promise<TableWithStatus[]> {
  const qs = zone ? `?zone=${zone}` : ''
  return authRequest<TableWithStatus[]>(`/tables${qs}`)
}

/**
 * Vraća jedan sto prema ID-u.
 * Returns a single table by ID.
 *
 * @param {number} id - ID stola / Table ID
 */
export function fetchTable(id: number): Promise<TableWithStatus> {
  return authRequest<TableWithStatus>(`/tables/${id}`)
}

/**
 * Kreira novi sto.
 * Creates a new table.
 *
 * @param {CreateTableData} data - Podaci za novi sto / Data for the new table
 */
export function createTable(data: CreateTableData): Promise<TableWithStatus> {
  return authRequest<TableWithStatus>('/tables', {
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
  return authRequest<TableWithStatus>(`/tables/${id}`, {
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
  return authRequest<TableWithStatus>(`/tables/${id}/position`, {
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
  return authRequest<void>(`/tables/${id}`, { method: 'DELETE' })
}
