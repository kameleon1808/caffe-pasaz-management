/**
 * @file src/api/reports.ts
 * @description API klijent za finansijske izveštaje.
 *              API client for financial reports.
 *
 * Sve funkcije vraćaju typed podatke ili bacaju grešku za non-2xx odgovore.
 * All functions return typed data or throw on non-2xx responses.
 */

import { getAuthHeader } from '../utils/token'

const BASE = 'http://localhost:3001/api/v1/reports'

// ─── Interfejsi / Interfaces ──────────────────────────────────────────────────

/** Sažetak prihoda / Revenue summary */
export interface ReportSummary {
  total:     number
  white:     number
  black:     number
  billCount: number
  avgBill:   number
}

/** Top artikal / Top product */
export interface TopProduct {
  productId: number
  nameSr:    string
  nameEn:    string
  quantity:  number
  amount:    number
}

/** Prihod po danu / Revenue by day */
export interface RevenueByDay {
  date:  string
  total: number
  white: number
  black: number
}

/** Prihod po konobaru (smeni) / Revenue by waiter (shift) */
export interface RevenueByWaiter {
  userId:     number
  fullName:   string
  shiftStart: string
  shiftEnd:   string | null
  total:      number
  white:      number
  black:      number
  billCount:  number
}

/** Raspodela po kategoriji / Category breakdown */
export interface CategoryBreakdown {
  categoryId: number
  nameSr:     string
  nameEn:     string
  total:      number
}

/** Poređenje sa prethodnim periodom / Comparison with previous period */
export interface Comparison {
  previousTotal: number
  changePercent: number | null
}

/** Kompletan izveštaj / Complete report */
export interface ReportData {
  summary:           ReportSummary
  topProducts:       TopProduct[]
  revenueByDay:      RevenueByDay[]
  revenueByWaiter:   RevenueByWaiter[]
  categoryBreakdown: CategoryBreakdown[]
  comparison:        Comparison
}

// ─── Helper / Helper ──────────────────────────────────────────────────────────

/**
 * Šalje autorizovan GET zahtev i parsira JSON odgovor.
 * Sends an authorized GET request and parses the JSON response.
 *
 * @param {string} url - URL za zahtev / Request URL
 */
async function getJson<T>(url: string): Promise<T> {
  const authHeader = getAuthHeader()
  if (!authHeader) throw new Error('Nije autentifikovan / Not authenticated')

  const res  = await fetch(url, {
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
  })
  const json = await res.json() as {
    success: boolean
    data?:   T
    error?:  { code: string; message: string; details?: unknown }
  }

  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? `HTTP ${res.status}`)
  }
  return json.data as T
}

// ─── API funkcije / API functions ─────────────────────────────────────────────

/**
 * Dohvata dnevni izveštaj.
 * Fetches the daily report.
 *
 * @param {string} date - Datum YYYY-MM-DD / Date YYYY-MM-DD
 */
export function getDailyReport(date: string): Promise<ReportData> {
  return getJson<ReportData>(`${BASE}/daily?date=${encodeURIComponent(date)}`)
}

/**
 * Dohvata nedeljni izveštaj.
 * Fetches the weekly report.
 *
 * @param {string} weekStart - Datum ponedeljka YYYY-MM-DD / Monday date YYYY-MM-DD
 */
export function getWeeklyReport(weekStart: string): Promise<ReportData> {
  return getJson<ReportData>(`${BASE}/weekly?weekStart=${encodeURIComponent(weekStart)}`)
}

/**
 * Dohvata mesečni izveštaj.
 * Fetches the monthly report.
 *
 * @param {string} month - Mesec YYYY-MM / Month YYYY-MM
 */
export function getMonthlyReport(month: string): Promise<ReportData> {
  return getJson<ReportData>(`${BASE}/monthly?month=${encodeURIComponent(month)}`)
}

/**
 * Dohvata izveštaj za prilagođeni period.
 * Fetches the report for a custom date range.
 *
 * @param {string} dateFrom - Početni datum YYYY-MM-DD / Start date YYYY-MM-DD
 * @param {string} dateTo   - Krajnji datum YYYY-MM-DD / End date YYYY-MM-DD
 */
export function getCustomReport(dateFrom: string, dateTo: string): Promise<ReportData> {
  return getJson<ReportData>(`${BASE}/custom?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`)
}
