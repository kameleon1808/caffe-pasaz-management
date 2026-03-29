/**
 * @file src/api/reports.ts
 * @description API klijent za finansijske izveštaje.
 *              API client for financial reports.
 *
 * Sve funkcije vraćaju typed podatke ili bacaju grešku za non-2xx odgovore.
 * All functions return typed data or throw on non-2xx responses.
 */

import { authRequest } from './apiClient'

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

// ─── API funkcije / API functions ─────────────────────────────────────────────

/**
 * Dohvata dnevni izveštaj.
 * Fetches the daily report.
 *
 * @param {string} date - Datum YYYY-MM-DD / Date YYYY-MM-DD
 */
export function getDailyReport(date: string): Promise<ReportData> {
  return authRequest<ReportData>(`/reports/daily?date=${encodeURIComponent(date)}`)
}

/**
 * Dohvata nedeljni izveštaj.
 * Fetches the weekly report.
 *
 * @param {string} weekStart - Datum ponedeljka YYYY-MM-DD / Monday date YYYY-MM-DD
 */
export function getWeeklyReport(weekStart: string): Promise<ReportData> {
  return authRequest<ReportData>(`/reports/weekly?weekStart=${encodeURIComponent(weekStart)}`)
}

/**
 * Dohvata mesečni izveštaj.
 * Fetches the monthly report.
 *
 * @param {string} month - Mesec YYYY-MM / Month YYYY-MM
 */
export function getMonthlyReport(month: string): Promise<ReportData> {
  return authRequest<ReportData>(`/reports/monthly?month=${encodeURIComponent(month)}`)
}

/**
 * Dohvata izveštaj za prilagođeni period.
 * Fetches the report for a custom date range.
 *
 * @param {string} dateFrom - Početni datum YYYY-MM-DD / Start date YYYY-MM-DD
 * @param {string} dateTo   - Krajnji datum YYYY-MM-DD / End date YYYY-MM-DD
 */
export function getCustomReport(dateFrom: string, dateTo: string): Promise<ReportData> {
  return authRequest<ReportData>(`/reports/custom?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`)
}
