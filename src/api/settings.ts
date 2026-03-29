/**
 * @file src/api/settings.ts
 * @description API klijent za upravljanje sistemskim podešavanjima.
 *              API client for managing system settings.
 *
 * Endpoints:
 * - GET  /api/v1/settings          → Vraća sva podešavanja / Returns all settings
 * - PUT  /api/v1/settings          → Bulk update podešavanja / Bulk update settings
 * - GET  /api/v1/settings/printer  → Vraća podešavanja štampača / Returns printer settings
 * - PUT  /api/v1/settings/printer  → Čuva podešavanja štampača / Saves printer settings
 */

import { authRequest, API_BASE } from './apiClient'
import { getToken } from '../utils/token'
import type { PrinterSettings } from '../types'

// ─── Tipovi / Types ────────────────────────────────────────────────────────────

/**
 * Podešavanja kafića (informacije o kafeu i opšta podešavanja).
 * Cafe settings (cafe info and general settings).
 */
export interface CafeSettings {
  cafe_name?:           string
  cafe_address?:        string
  cafe_pib?:            string
  cafe_phone?:          string
  min_stock_threshold?: string
  currency?:            string
}

// ─── Generičke funkcije / Generic functions ────────────────────────────────────

/**
 * Dohvata sva podešavanja kafića.
 * Fetches all cafe settings.
 *
 * @returns {Promise<CafeSettings>} Podešavanja / Settings
 */
export async function getSettings(): Promise<CafeSettings> {
  const raw = await authRequest<Record<string, string>>('/settings')
  return {
    cafe_name:           raw['cafe_name'],
    cafe_address:        raw['cafe_address'],
    cafe_pib:            raw['cafe_pib'],
    cafe_phone:          raw['cafe_phone'],
    min_stock_threshold: raw['min_stock_threshold'],
    currency:            raw['currency'],
  }
}

/**
 * Ažurira podešavanja kafića.
 * Updates cafe settings.
 *
 * @param {CafeSettings} settings - Podešavanja za čuvanje / Settings to save
 */
export async function updateSettings(settings: CafeSettings): Promise<void> {
  const clean: Record<string, string> = {}
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined && value !== null) {
      clean[key] = String(value)
    }
  }
  await authRequest<void>('/settings', {
    method: 'PUT',
    body:   JSON.stringify({ settings: clean }),
  })
}

/**
 * Vraća sva podešavanja štampača i kafea.
 * Returns all printer and cafe settings.
 *
 * @returns {Promise<PrinterSettings>} Podešavanja štampača / Printer settings
 */
export async function fetchPrinterSettings(): Promise<PrinterSettings> {
  const res = await fetch(`${API_BASE}/settings/printer`, {
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
  const res = await fetch(`${API_BASE}/settings/printer`, {
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
