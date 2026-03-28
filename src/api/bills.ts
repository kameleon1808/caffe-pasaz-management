/**
 * @file src/api/bills.ts
 * @description API klijent za upravljanje računima.
 *              API client for bill management.
 */

import { getAuthHeader } from '../utils/token'
import type { Bill } from '../types'

const BASE = 'http://localhost:3001/api/v1/bills'

/** Pomoćna funkcija za autorizovane zahteve / Helper for authorized requests */
async function req<T>(url: string, options: RequestInit = {}): Promise<T> {
  const authHeader = getAuthHeader()
  if (!authHeader) throw new Error('Nije autentifikovan / Not authenticated')

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization:  authHeader,
      ...(options.headers as Record<string, string> | undefined),
    },
  })

  if (!res.ok) {
    const err  = await res.json() as { error?: string; code?: string }
    const error = new Error(err.error ?? 'Greška / Error')
    ;(error as Error & { code?: string }).code = err.code
    throw error
  }

  return res.json() as Promise<T>
}

/**
 * Kreira novi račun za dati sto.
 * Creates a new bill for the given table.
 */
export async function createBill(tableId: number): Promise<Bill> {
  return req<Bill>(BASE, { method: 'POST', body: JSON.stringify({ tableId }) })
}

/**
 * Vraća jedan račun prema ID-u.
 * Returns a single bill by ID.
 */
export async function fetchBill(id: number): Promise<Bill> {
  return req<Bill>(`${BASE}/${id}`)
}

/**
 * Vraća otvoren račun za dati sto, ili null ako ne postoji.
 * Returns the open bill for the given table, or null if not found.
 */
export async function fetchOpenBillForTable(tableId: number): Promise<Bill | null> {
  try {
    return await req<Bill>(`${BASE}/table/${tableId}`)
  } catch (err) {
    if ((err as Error & { code?: string }).code === undefined &&
        (err as Error).message.includes('404')) return null
    // 404 returns null, other errors propagate
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
  return req<Bill>(`${BASE}/${billId}/items`, {
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
  return req<Bill>(`${BASE}/${billId}/items/${itemId}`, {
    method: 'PUT',
    body:   JSON.stringify(data),
  })
}

/**
 * Briše stavku sa računa.
 * Removes an item from the bill.
 */
export async function removeBillItem(billId: number, itemId: number): Promise<Bill> {
  return req<Bill>(`${BASE}/${billId}/items/${itemId}`, { method: 'DELETE' })
}

/**
 * Postavlja popust na račun.
 * Sets the bill-level discount.
 */
export async function setBillDiscount(billId: number, discountPercent: number): Promise<Bill> {
  return req<Bill>(`${BASE}/${billId}/discount`, {
    method: 'PUT',
    body:   JSON.stringify({ discountPercent }),
  })
}

/**
 * Prebacuje račun na drugi sto.
 * Transfers the bill to another table.
 */
export async function transferBill(billId: number, tableId: number): Promise<Bill> {
  return req<Bill>(`${BASE}/${billId}/transfer`, {
    method: 'PUT',
    body:   JSON.stringify({ tableId }),
  })
}

/**
 * Naplaćuje račun.
 * Pays the bill.
 */
export async function payBill(billId: number): Promise<Bill> {
  return req<Bill>(`${BASE}/${billId}/pay`, { method: 'POST' })
}

/**
 * Otkazuje račun.
 * Cancels the bill.
 */
export async function cancelBill(billId: number, reason: string): Promise<Bill> {
  return req<Bill>(`${BASE}/${billId}/cancel`, {
    method: 'POST',
    body:   JSON.stringify({ reason }),
  })
}
