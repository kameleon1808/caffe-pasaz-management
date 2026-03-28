/**
 * @file src/api/print.ts
 * @description API klijent za štampanje računa na POS termalnom štampaču.
 *              API client for printing receipts on a POS thermal printer.
 *
 * Endpoints:
 * - POST /api/v1/print/receipt/:billId  → Štampa račun / Prints a receipt
 * - POST /api/v1/print/test             → Štampa testnu stranicu / Prints test page
 */

import { getToken } from '../utils/token'

const BASE = 'http://localhost:3001/api/v1/print'

/**
 * Rezultat operacije štampanja.
 * Print operation result.
 */
export interface PrintResult {
  success: boolean
  message: string
  error?:  string
  code?:   string
}

/**
 * Štampa račun po ID-u.
 * Prints a receipt by bill ID.
 *
 * Ne baca grešku ako štampač nije dostupan — vraća {success: false} umesto toga.
 * Does not throw if printer is unavailable — returns {success: false} instead.
 *
 * @param {number} billId - ID računa za štampanje / Bill ID to print
 * @returns {Promise<PrintResult>} Rezultat štampanja / Print result
 */
export async function printReceipt(billId: number): Promise<PrintResult> {
  try {
    const res = await fetch(`${BASE}/receipt/${billId}`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        success: false,
        message: body.error ?? 'Greška štampača / Printer error',
        error:   body.error,
        code:    body.code,
      }
    }
    return { success: true, message: body.message ?? 'Odštampano / Printed' }
  } catch {
    return {
      success: false,
      message: 'Greška mreže — štampač nije dostupan / Network error — printer unavailable',
      code:    'NETWORK_ERROR'
    }
  }
}

/**
 * Štampa testnu stranicu.
 * Prints a test page.
 *
 * @returns {Promise<PrintResult>} Rezultat štampanja / Print result
 */
export async function printTestPage(): Promise<PrintResult> {
  try {
    const res = await fetch(`${BASE}/test`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        success: false,
        message: body.error ?? 'Greška štampača / Printer error',
        error:   body.error,
        code:    body.code,
      }
    }
    return { success: true, message: body.message ?? 'Test stranica odštampana / Test page printed' }
  } catch {
    return {
      success: false,
      message: 'Greška mreže — štampač nije dostupan / Network error — printer unavailable',
      code:    'NETWORK_ERROR'
    }
  }
}
