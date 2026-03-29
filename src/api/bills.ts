/**
 * @file src/api/bills.ts
 * @description API klijent za upravljanje računima.
 *              API client for bill management.
 */

import { authRequest, NotFoundError } from './apiClient'
import type { Bill } from '../types'

/**
 * Kreira novi račun za dati sto.
 * Creates a new bill for the given table.
 */
export async function createBill(tableId: number): Promise<Bill> {
  return authRequest<Bill>('/bills', { method: 'POST', body: JSON.stringify({ tableId }) })
}

/**
 * Vraća jedan račun prema ID-u.
 * Returns a single bill by ID.
 */
export async function fetchBill(id: number): Promise<Bill> {
  return authRequest<Bill>(`/bills/${id}`)
}

/**
 * Vraća otvoren račun za dati sto, ili null ako ne postoji.
 * Returns the open bill for the given table, or null if not found.
 */
export async function fetchOpenBillForTable(tableId: number): Promise<Bill | null> {
  try {
    return await authRequest<Bill>(`/bills/table/${tableId}`)
  } catch (err) {
    if (err instanceof NotFoundError) return null
    // Sve ostale greške propagiraju
    // All other errors propagate
    return null
  }
}

/**
 * Dodaje stavku na račun.
 * Adds an item to the bill.
 */
export async function addBillItem(
  billId: number,
  productId: number,
  color: 'WHITE' | 'BLACK' = 'WHITE'
): Promise<Bill> {
  return authRequest<Bill>(`/bills/${billId}/items`, {
    method: 'POST',
    body:   JSON.stringify({ productId, color }),
  })
}

/**
 * Menja stavku na računu.
 * Updates a bill item.
 */
export async function updateBillItem(
  billId:  number,
  itemId:  number,
  data: { quantity?: number; unitPrice?: number; discount?: number; color?: string }
): Promise<Bill> {
  return authRequest<Bill>(`/bills/${billId}/items/${itemId}`, {
    method: 'PUT',
    body:   JSON.stringify(data),
  })
}

/**
 * Briše stavku sa računa.
 * Removes an item from the bill.
 */
export async function removeBillItem(billId: number, itemId: number): Promise<Bill> {
  return authRequest<Bill>(`/bills/${billId}/items/${itemId}`, { method: 'DELETE' })
}

/**
 * Postavlja popust na račun.
 * Sets the bill-level discount.
 */
export async function setBillDiscount(billId: number, discountPercent: number): Promise<Bill> {
  return authRequest<Bill>(`/bills/${billId}/discount`, {
    method: 'PUT',
    body:   JSON.stringify({ discountPercent }),
  })
}

/**
 * Prebacuje račun na drugi sto.
 * Transfers the bill to another table.
 */
export async function transferBill(billId: number, tableId: number): Promise<Bill> {
  return authRequest<Bill>(`/bills/${billId}/transfer`, {
    method: 'PUT',
    body:   JSON.stringify({ tableId }),
  })
}

/**
 * Naplaćuje račun.
 * Pays the bill.
 */
export async function payBill(billId: number): Promise<Bill> {
  return authRequest<Bill>(`/bills/${billId}/pay`, { method: 'POST' })
}

/**
 * Otkazuje račun.
 * Cancels the bill.
 */
export async function cancelBill(billId: number, reason: string): Promise<Bill> {
  return authRequest<Bill>(`/bills/${billId}/cancel`, {
    method: 'POST',
    body:   JSON.stringify({ reason }),
  })
}
