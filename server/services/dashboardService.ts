/**
 * @file server/services/dashboardService.ts
 * @description Servis za admin dashboard statistiku kafića.
 *              Service for admin dashboard statistics for the cafe.
 *
 * Dohvata i izračunava sve metrike potrebne za admin dashboard:
 * današnji prihod, mesečni prihod, promet poslednjih 7 dana,
 * top 5 artikala, odnos belo/crno, raspodela po kategorijama.
 *
 * Fetches and computes all metrics needed for the admin dashboard:
 * today's revenue, monthly revenue, last 7 days revenue,
 * top 5 products, white/black ratio, category breakdown.
 */

import { prisma } from '../lib/prisma'

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
  date:  string  // YYYY-MM-DD
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

// ─── Helperi za datume / Date helpers ─────────────────────────────────────────

/**
 * Vraća početak datog dana (00:00:00.000).
 * Returns the start of a given day (00:00:00.000).
 *
 * @param {Date} d - Datum / Date
 * @returns {Date} Početak dana / Start of day
 */
function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

/**
 * Vraća početak sledećeg dana (tj. isključivi kraj tekućeg dana).
 * Returns the start of the next day (i.e., exclusive end of current day).
 *
 * @param {Date} d - Datum / Date
 * @returns {Date} Početak sutrašnjeg dana / Start of tomorrow
 */
function startOfNextDay(d: Date): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + 1)
  r.setHours(0, 0, 0, 0)
  return r
}

/**
 * Formatira datum u YYYY-MM-DD string.
 * Formats a date as a YYYY-MM-DD string.
 *
 * @param {Date} d - Datum / Date
 * @returns {string} Formatiran datum / Formatted date
 */
function toDateKey(d: Date): string {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// ─── Tip za upit iz baze / DB query type ──────────────────────────────────────

type BillWithItems = Awaited<ReturnType<typeof fetchBillsWithItems>>[number]

/**
 * Dohvata naplaćene račune sa stavkama u datom opsegu.
 * Fetches paid bills with items in a given date range.
 *
 * @param {Date} start - Početak opsega / Range start
 * @param {Date} end   - Kraj opsega / Range end
 */
async function fetchBillsWithItems(start: Date, end: Date) {
  return prisma.bill.findMany({
    where: {
      status: 'PAID',
      paidAt: { gte: start, lt: end },
    },
    include: {
      items: {
        include: {
          product: {
            include: { category: true },
          },
        },
      },
    },
  })
}

/**
 * Dohvata naplaćene račune (samo ukupan iznos) u datom opsegu.
 * Fetches paid bills (totals only) in a given date range.
 *
 * @param {Date} start - Početak opsega / Range start
 * @param {Date} end   - Kraj opsega / Range end
 */
async function fetchBillsSimple(start: Date, end: Date) {
  return prisma.bill.findMany({
    where: {
      status: 'PAID',
      paidAt: { gte: start, lt: end },
    },
    select: {
      total:      true,
      whiteTotal: true,
      blackTotal: true,
    },
  })
}

// ─── Računanje metrika / Computing metrics ────────────────────────────────────

/**
 * Računa promet za niz računa sa stavkama, grupisano po danu.
 * Computes revenue for an array of bills with items, grouped by day.
 *
 * @param {BillWithItems[]} bills   - Niz računa / Array of bills
 * @param {string[]}        dates   - Svi datumi u opsegu (YYYY-MM-DD) / All dates in range
 */
function computeRevenueByDay(bills: BillWithItems[], dates: string[]): DayRevenue[] {
  const map = new Map<string, DayRevenue>()

  // Inicijalizuj sve datume sa nulama / Initialize all dates with zeros
  for (const d of dates) {
    map.set(d, { date: d, total: 0, white: 0, black: 0 })
  }

  for (const bill of bills) {
    if (!bill.paidAt) continue
    const key = toDateKey(bill.paidAt)
    const entry = map.get(key)
    if (entry) {
      entry.total += bill.total
      entry.white += bill.whiteTotal
      entry.black += bill.blackTotal
    }
  }

  return dates.map(d => map.get(d)!)
}

/**
 * Računa top 5 artikala po prodanoj količini iz niza računa sa stavkama.
 * Computes top 5 products by sold quantity from an array of bills with items.
 *
 * @param {BillWithItems[]} bills - Niz računa / Array of bills
 * @returns {TopProductItem[]} Sortirani top 5 artikala / Sorted top 5 products
 */
function computeTopProducts(bills: BillWithItems[]): TopProductItem[] {
  const map = new Map<number, TopProductItem & { id: number }>()

  for (const bill of bills) {
    for (const item of bill.items) {
      const id = item.productId
      const existing = map.get(id)
      if (existing) {
        existing.quantity += item.quantity
      } else {
        map.set(id, {
          id,
          nameSr:   item.product.nameSr,
          nameEn:   item.product.nameEn,
          quantity: item.quantity,
        })
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
    .map(({ nameSr, nameEn, quantity }) => ({ nameSr, nameEn, quantity }))
}

/**
 * Računa raspodelu prihoda po kategorijama iz niza računa sa stavkama.
 * Computes revenue breakdown by category from an array of bills with items.
 *
 * @param {BillWithItems[]} bills - Niz računa / Array of bills
 * @returns {CategoryBreakdownItem[]} Raspodela po kategorijama / Category breakdown
 */
function computeCategoryBreakdown(bills: BillWithItems[]): CategoryBreakdownItem[] {
  const map = new Map<number, CategoryBreakdownItem & { id: number }>()

  for (const bill of bills) {
    for (const item of bill.items) {
      const cat = item.product.category
      const id = cat.id
      const itemTotal = item.quantity * item.unitPrice * (1 - item.discount / 100)
      const existing = map.get(id)
      if (existing) {
        existing.total += itemTotal
      } else {
        map.set(id, {
          id,
          nameSr: cat.nameSr,
          nameEn: cat.nameEn,
          total:  itemTotal,
        })
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .map(({ nameSr, nameEn, total }) => ({ nameSr, nameEn, total }))
}

// ─── Glavna funkcija / Main function ──────────────────────────────────────────

/**
 * Dohvata i izračunava sve dashboard statistike.
 * Fetches and computes all dashboard statistics.
 *
 * Koristi minimalan broj Prisma upita:
 * - todayBills: računi sa stavkama (za karticе i grafikon)
 * - yesterdayBills: samo ukupni iznosi (za poređenje)
 * - monthBills: računi sa stavkama (za mesečni prihod, belo/crno, kategorije)
 * - last7DaysBills: računi sa stavkama (za grafikon i top artikle)
 *
 * Uses a minimal number of Prisma queries:
 * - todayBills: bills with items (for cards and chart)
 * - yesterdayBills: totals only (for comparison)
 * - monthBills: bills with items (monthly revenue, white/black, categories)
 * - last7DaysBills: bills with items (chart and top products)
 *
 * @returns {Promise<DashboardData>} Dashboard podaci / Dashboard data
 */
export async function getDashboardData(): Promise<DashboardData> {
  const now       = new Date()
  const todayStart     = startOfDay(now)
  const tomorrowStart  = startOfNextDay(now)
  const yesterdayStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)

  // 7 dana unazad (od početka tog dana) / 7 days back (from start of that day)
  const sevenDaysAgo   = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6))

  // ── Paralelni upiti / Parallel queries ────────────────────────────────────
  const [todayBills, yesterdayBills, monthBills, last7DaysBills] = await Promise.all([
    fetchBillsWithItems(todayStart, tomorrowStart),
    fetchBillsSimple(yesterdayStart, todayStart),
    fetchBillsWithItems(monthStart, tomorrowStart),
    fetchBillsWithItems(sevenDaysAgo, tomorrowStart),
  ])

  // ── Danas / Today ──────────────────────────────────────────────────────────
  const todayRevenue      = todayBills.reduce((s, b) => s + b.total, 0)
  const yesterdayRevenue  = yesterdayBills.reduce((s, b) => s + b.total, 0)
  const changePercent: number | null = yesterdayRevenue > 0
    ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
    : null

  const todayStats: TodayStats = {
    revenue:          todayRevenue,
    revenueYesterday: yesterdayRevenue,
    changePercent,
    billCount:        todayBills.length,
    avgBill:          todayBills.length > 0 ? todayRevenue / todayBills.length : 0,
  }

  // ── Mesec do danas / Month to date ────────────────────────────────────────
  const monthRevenue = monthBills.reduce((s, b) => s + b.total, 0)

  // ── Poslednjih 7 dana / Last 7 days ───────────────────────────────────────
  const dates7: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    dates7.push(toDateKey(d))
  }
  const last7Days = computeRevenueByDay(last7DaysBills, dates7)

  // ── Top 5 artikala (poslednjih 7 dana) / Top 5 products (last 7 days) ─────
  const topProducts = computeTopProducts(last7DaysBills)

  // ── Belo / Crno (mesec) — koristi whiteTotal / blackTotal sa računa
  // White / Black (month) — uses whiteTotal / blackTotal from bills
  const whiteBlackRatio = {
    white: monthBills.reduce((s, b) => s + b.whiteTotal, 0),
    black: monthBills.reduce((s, b) => s + b.blackTotal, 0),
  }

  // ── Kategorije (mesec) / Categories (month) ───────────────────────────────
  const categoryBreakdown = computeCategoryBreakdown(monthBills)

  return {
    today:             todayStats,
    monthToDate:       { revenue: monthRevenue },
    last7Days,
    topProducts,
    whiteBlackRatio,
    categoryBreakdown,
  }
}
