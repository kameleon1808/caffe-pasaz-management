/**
 * @file src/api/settings.ts
 * @description API klijent za upravljanje sistemskim podešavanjima.
 *              API client for managing system settings.
 *
 * Endpoints:
 * - GET  /api/v1/settings/printer  → Vraća podešavanja štampača / Returns printer settings
 * - PUT  /api/v1/settings/printer  → Čuva podešavanja štampača / Saves printer settings
 */

import { getToken } from '../utils/token'
import type { PrinterSettings } from '../types'

const BASE = 'http://localhost:3001/api/v1/settings'

/**
 * Vraća sva podešavanja štampača i kafea.
 * Returns all printer and cafe settings.
 *
 * @returns {Promise<PrinterSettings>} Podešavanja štampača / Printer settings
 */
export async function fetchPrinterSettings(): Promise<PrinterSettings> {
  const res = await fetch(`${BASE}/printer`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Greška pri učitavanju podešavanja / Error loading settings')
  }
  return res.json()
}

/**
 * Čuva podešavanja štampača.
 * Saves printer settings.
 *
 * @param {Partial<PrinterSettings>} data - Podešavanja za čuvanje / Settings to save
 * @returns {Promise<PrinterSettings>} Ažurirana podešavanja / Updated settings
 */
export async function savePrinterSettings(data: Partial<PrinterSettings>): Promise<PrinterSettings> {
  const res = await fetch(`${BASE}/printer`, {
    method:  'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${getToken()}`
    },
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Greška pri čuvanju podešavanja / Error saving settings')
  }
  return res.json()
}
