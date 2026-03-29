/**
 * @file src/api/dashboard.ts
 * @description API klijent za admin dashboard statistiku.
 *              API client for admin dashboard statistics.
 *
 * Sve funkcije vraćaju typed podatke ili bacaju grešku za non-2xx odgovore.
 * All functions return typed data or throw on non-2xx responses.
 */

import { authRequest } from './apiClient'

// ─── Interfejsi / Interfaces ──────────────────────────────────────────────────

/** Statistike za danas / Today's statistics */
export interface TodayStats {
  revenue:          number
  revenueYesterday: number
  changePercent:    number | null
  billCount:        number
  avgBill:          number
}

/** Promet po danu (za grafikon) / Revenue by day (for chart) */
export interface DayRevenue {
  date:  string
  total: number
  white: number
  black: number
}

/** Top artikal / Top product */
export interface TopProductItem {
  nameSr:   string
  nameEn:   string
  quantity: number
}

/** Kategorija raspodela / Category breakdown */
export interface CategoryBreakdownItem {
  nameSr: string
  nameEn: string
  total:  number
}

/** Kompletan dashboard odgovor / Complete dashboard response */
export interface DashboardData {
  today:             TodayStats
  monthToDate:       { revenue: number }
  last7Days:         DayRevenue[]
  topProducts:       TopProductItem[]
  whiteBlackRatio:   { white: number; black: number }
  categoryBreakdown: CategoryBreakdownItem[]
}

// ─── API funkcije / API functions ─────────────────────────────────────────────

/**
 * Dohvata sve dashboard statistike sa servera.
 * Fetches all dashboard statistics from the server.
 *
 * @returns {Promise<DashboardData>} Dashboard podaci / Dashboard data
 * @throws {Error} Ako zahtev ne uspe / If the request fails
 */
export async function getDashboardStats(): Promise<DashboardData> {
  return authRequest<DashboardData>('/dashboard')
}
