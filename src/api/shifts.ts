/**
 * @file src/api/shifts.ts
 * @description API klijent za upravljanje smenama.
 *              API client for shift management.
 */

import { authRequest } from './apiClient'
import type {
  Shift,
  ShiftSummary,
  ShiftInventorySummary,
  InventoryAdjustData,
  ShiftListResult,
} from '../types'

/**
 * Započinje novu smenu za trenutnog korisnika.
 * Starts a new shift for the current user.
 *
 * @returns {Promise<Shift>} Nova smena / New shift
 * @throws Ako već postoji aktivna smena / If an active shift already exists
 */
export function startShift(): Promise<Shift> {
  return authRequest<Shift>('/shifts/start', { method: 'POST' })
}

/**
 * Završava aktivnu smenu za trenutnog korisnika.
 * Ends the active shift for the current user.
 *
 * @returns {Promise<Shift>} Završena smena / Ended shift
 * @throws Ako nema aktivne smene ili ima otvorenih računa / If no active shift or open bills exist
 */
export function endShift(): Promise<Shift> {
  return authRequest<Shift>('/shifts/end', { method: 'POST' })
}

/**
 * Vraća aktivnu smenu za trenutnog korisnika, ili null ako nema.
 * Returns the active shift for the current user, or null if none.
 *
 * @returns {Promise<Shift | null>} Aktivna smena ili null / Active shift or null
 */
export async function getActiveShift(): Promise<Shift | null> {
  return authRequest<Shift | null>('/shifts/active')
}

/**
 * Vraća istoriju smena za trenutnog korisnika.
 * Returns shift history for the current user.
 *
 * @param {number} [limit=20] - Maksimalan broj zapisa / Maximum number of records
 * @returns {Promise<Shift[]>} Lista smena / List of shifts
 */
export function getShiftHistory(limit = 20): Promise<Shift[]> {
  return authRequest<Shift[]>(`/shifts/history?limit=${limit}`)
}

/**
 * Vraća sumarni izveštaj smene — promet i prodaja po artiklima.
 * Returns the shift summary report — revenue and sales by product.
 *
 * Ne zatvara smenu. / Does NOT close the shift.
 *
 * @param {number} shiftId - ID smene / Shift ID
 * @returns {Promise<ShiftSummary>} Sumarni izveštaj / Summary report
 */
export function getShiftSummary(shiftId: number): Promise<ShiftSummary> {
  return authRequest<ShiftSummary>(`/shifts/${shiftId}/summary`)
}

/**
 * Vraća stanje magacina za datu smenu.
 * Returns the warehouse state for the given shift.
 *
 * @param {number} shiftId - ID smene / Shift ID
 * @returns {Promise<ShiftInventorySummary>}
 */
export function getShiftInventorySummary(shiftId: number): Promise<ShiftInventorySummary> {
  return authRequest<ShiftInventorySummary>(`/shifts/${shiftId}/inventory-summary`)
}

/**
 * Ručna korekcija inventara u kontekstu smene.
 * Manual inventory adjustment in the context of a shift.
 *
 * @param {number}              shiftId - ID smene / Shift ID
 * @param {InventoryAdjustData} data    - Podaci za korekciju / Adjustment data
 * @returns {Promise<void>}
 */
export function adjustShiftInventory(
  shiftId: number,
  data:    InventoryAdjustData
): Promise<void> {
  return authRequest<void>(`/shifts/${shiftId}/inventory-adjust`, {
    method: 'POST',
    body:   JSON.stringify(data),
  })
}

/**
 * Potvrđuje i završava smenu po ID-u.
 * Confirms and ends a shift by ID.
 *
 * @param {number} shiftId - ID smene / Shift ID
 * @returns {Promise<Shift>} Završena smena / Ended shift
 */
export function endShiftById(shiftId: number): Promise<Shift> {
  return authRequest<Shift>(`/shifts/${shiftId}/end`, {
    method: 'POST',
    body:   JSON.stringify({ confirm: true }),
  })
}

/**
 * Šalje zahtev za štampanje sumarnog izveštaja smene.
 * Sends a request to print the shift summary report.
 *
 * @param {number} shiftId - ID smene / Shift ID
 * @returns {Promise<void>}
 */
export function printShiftSummary(shiftId: number): Promise<void> {
  return authRequest<void>(`/shifts/${shiftId}/print-summary`, { method: 'POST' })
}

/**
 * Vraća paginiranu listu smena (admin).
 * Returns paginated shift list (admin).
 *
 * @param params - Filteri i paginacija / Filters and pagination
 * @returns {Promise<ShiftListResult>}
 */
export function getShiftList(params: {
  userId?:   number
  dateFrom?: string
  dateTo?:   string
  page?:     number
  limit?:    number
} = {}): Promise<ShiftListResult> {
  const qs = new URLSearchParams()
  if (params.userId   !== undefined) qs.set('userId',   String(params.userId))
  if (params.dateFrom)               qs.set('dateFrom', params.dateFrom)
  if (params.dateTo)                 qs.set('dateTo',   params.dateTo)
  if (params.page     !== undefined) qs.set('page',     String(params.page))
  if (params.limit    !== undefined) qs.set('limit',    String(params.limit))
  const query = qs.toString()
  return authRequest<ShiftListResult>(`/shifts${query ? `?${query}` : ''}`)
}
