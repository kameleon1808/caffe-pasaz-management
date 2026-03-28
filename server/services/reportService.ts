/**
 * @file server/services/reportService.ts
 * @description Servis za generisanje finansijskih izveštaja kafića.
 *              Service for generating financial reports for the cafe.
 *
 * Podržava dnevne, nedeljne, mesečne i prilagođene periode.
 * Supports daily, weekly, monthly and custom periods.
 *
 * Sve kalkulacije se vrše in-memory na osnovu jednog Prisma upita.
 * All calculations are performed in-memory from a single Prisma query.
 */

import { prisma } from '../lib/prisma'

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
  date:  string  // YYYY-MM-DD
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

// ─── Helperi za datume / Date helpers ─────────────────────────────────────────

/**
 * Gradi opseg datuma za jedan dan (00:00:00 – 23:59:59.999).
 * Builds date range for a single day (00:00:00 – 23:59:59.999).
 *
 * @param {string} dateStr - Datum u formatu YYYY-MM-DD / Date in YYYY-MM-DD format
 */
function dayRange(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00.000Z`)
  const end   = new Date(`${dateStr}T23:59:59.999Z`)
  // Adjust for local midnight (use local date interpretation)
  const localStart = new Date(dateStr)
  localStart.setHours(0, 0, 0, 0)
  const localEnd = new Date(dateStr)
  localEnd.setHours(23, 59, 59, 999)
  return { start: localStart, end: localEnd }
}

/**
 * Gradi opseg datuma za sedmicu (pon–ned).
 * Builds date range for a week (Mon–Sun).
 *
 * @param {string} weekStart - Datum ponedeljka u formatu YYYY-MM-DD / Monday date in YYYY-MM-DD
 */
function weekRange(weekStart: string): { start: Date; end: Date } {
  const start = new Date(weekStart)
  start.setHours(0, 0, 0, 0)
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/**
 * Gradi opseg datuma za mesec.
 * Builds date range for a month.
 *
 * @param {string} monthStr - Mesec u formatu YYYY-MM / Month in YYYY-MM format
 */
function monthRange(monthStr: string): { start: Date; end: Date } {
  const [yearStr, monthNumStr] = monthStr.split('-')
  const year  = parseInt(yearStr ?? '2024', 10)
  const month = parseInt(monthNumStr ?? '1', 10) - 1  // 0-indexed

  const start = new Date(year, month, 1, 0, 0, 0, 0)
  // Last day of month
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

// ─── Tip za upit iz baze / DB query type ──────────────────────────────────────

type BillWithRelations = Awaited<ReturnType<typeof fetchBills>>[number]

/**
 * Dohvata naplaćene račune sa svim relacijama.
 * Fetches paid bills with all relations.
 */
async function fetchBills(start: Date, end: Date) {
  return prisma.bill.findMany({
    where: {
      status: 'PAID',
      paidAt: { gte: start, lte: end },
    },
    include: {
      items: {
        include: {
          product: {
            include: { category: true },
          },
        },
      },
      shift: {
        include: { user: true },
      },
    },
  })
}

/**
 * Izračunava sve metrike iz niza računa.
 * Computes all metrics from an array of bills.
 *
 * @param {BillWithRelations[]} bills - Niz naplaćenih računa / Array of paid bills
 */
function computeMetrics(bills: BillWithRelations[]): Omit<ReportData, 'comparison'> {
  // ── Sažetak / Summary ──────────────────────────────────────────────────────
  const summary: ReportSummary = {
    total:     0,
    white:     0,
    black:     0,
    billCount: bills.length,
    avgBill:   0,
  }

  for (const bill of bills) {
    summary.total += bill.total
    summary.white += bill.whiteTotal
    summary.black += bill.blackTotal
  }
  summary.avgBill = bills.length > 0 ? summary.total / bills.length : 0

  // ── Prihod po danu / Revenue by day ────────────────────────────────────────
  const dayMap = new Map<string, RevenueByDay>()
  for (const bill of bills) {
    if (!bill.paidAt) continue
    const dateKey = bill.paidAt.toISOString().slice(0, 10)
    const existing = dayMap.get(dateKey)
    if (existing) {
      existing.total += bill.total
      existing.white += bill.whiteTotal
      existing.black += bill.blackTotal
    } else {
      dayMap.set(dateKey, {
        date:  dateKey,
        total: bill.total,
        white: bill.whiteTotal,
        black: bill.blackTotal,
      })
    }
  }
  const revenueByDay = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  // ── Prihod po konobaru (smeni) / Revenue by waiter (shift) ────────────────
  const waiterMap = new Map<string, RevenueByWaiter>()
  for (const bill of bills) {
    const shiftId = bill.shiftId
    const key     = `shift-${shiftId}`
    const existing = waiterMap.get(key)
    if (existing) {
      existing.total     += bill.total
      existing.white     += bill.whiteTotal
      existing.black     += bill.blackTotal
      existing.billCount += 1
    } else {
      waiterMap.set(key, {
        userId:     bill.shift.userId,
        fullName:   bill.shift.user.fullName,
        shiftStart: bill.shift.startedAt.toISOString(),
        shiftEnd:   bill.shift.endedAt ? bill.shift.endedAt.toISOString() : null,
        total:      bill.total,
        white:      bill.whiteTotal,
        black:      bill.blackTotal,
        billCount:  1,
      })
    }
  }
  const revenueByWaiter = Array.from(waiterMap.values())

  // ── Top proizvodi / Top products ───────────────────────────────────────────
  const productMap = new Map<number, TopProduct>()
  for (const bill of bills) {
    for (const item of bill.items) {
      const existing = productMap.get(item.productId)
      const itemTotal = item.quantity * item.unitPrice * (1 - item.discount / 100)
      if (existing) {
        existing.quantity += item.quantity
        existing.amount   += itemTotal
      } else {
        productMap.set(item.productId, {
          productId: item.productId,
          nameSr:    item.product.nameSr,
          nameEn:    item.product.nameEn,
          quantity:  item.quantity,
          amount:    itemTotal,
        })
      }
    }
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  // ── Raspodela po kategoriji / Category breakdown ───────────────────────────
  const catMap = new Map<number, CategoryBreakdown>()
  for (const bill of bills) {
    for (const item of bill.items) {
      const cat = item.product.category
      const itemTotal = item.quantity * item.unitPrice * (1 - item.discount / 100)
      const existing = catMap.get(cat.id)
      if (existing) {
        existing.total += itemTotal
      } else {
        catMap.set(cat.id, {
          categoryId: cat.id,
          nameSr:     cat.nameSr,
          nameEn:     cat.nameEn,
          total:      itemTotal,
        })
      }
    }
  }
  const categoryBreakdown = Array.from(catMap.values()).sort((a, b) => b.total - a.total)

  return { summary, topProducts, revenueByDay, revenueByWaiter, categoryBreakdown }
}

/**
 * Gradi poređenje sa prethodnim periodom.
 * Builds comparison with the previous period.
 *
 * @param {number} currentTotal  - Ukupan prihod za tekući period / Current period total
 * @param {number} previousTotal - Ukupan prihod za prethodni period / Previous period total
 */
function buildComparison(currentTotal: number, previousTotal: number): Comparison {
  let changePercent: number | null = null
  if (previousTotal > 0) {
    changePercent = ((currentTotal - previousTotal) / previousTotal) * 100
  } else if (currentTotal > 0) {
    changePercent = 100
  }
  return { previousTotal, changePercent }
}

// ─── Javne funkcije servisa / Public service functions ────────────────────────

/**
 * Generiše dnevni izveštaj.
 * Generates a daily report.
 *
 * @param {string} date - Datum u formatu YYYY-MM-DD / Date in YYYY-MM-DD format
 */
export async function getDailyReport(date: string): Promise<ReportData> {
  const { start, end } = dayRange(date)

  // Prethodni dan / Previous day
  const prevDate  = new Date(date)
  prevDate.setDate(prevDate.getDate() - 1)
  const prevDateStr   = prevDate.toISOString().slice(0, 10)
  const prevRange     = dayRange(prevDateStr)

  const [bills, prevBills] = await Promise.all([
    fetchBills(start, end),
    fetchBills(prevRange.start, prevRange.end),
  ])

  const metrics      = computeMetrics(bills)
  const prevMetrics  = computeMetrics(prevBills)
  const comparison   = buildComparison(metrics.summary.total, prevMetrics.summary.total)

  return { ...metrics, comparison }
}

/**
 * Generiše nedeljni izveštaj.
 * Generates a weekly report.
 *
 * @param {string} weekStart - Datum ponedeljka (YYYY-MM-DD) / Monday date (YYYY-MM-DD)
 */
export async function getWeeklyReport(weekStart: string): Promise<ReportData> {
  const { start, end } = weekRange(weekStart)

  // Prethodna sedmica / Previous week
  const prevMonday = new Date(weekStart)
  prevMonday.setDate(prevMonday.getDate() - 7)
  const prevMondayStr = prevMonday.toISOString().slice(0, 10)
  const prevRange     = weekRange(prevMondayStr)

  const [bills, prevBills] = await Promise.all([
    fetchBills(start, end),
    fetchBills(prevRange.start, prevRange.end),
  ])

  const metrics    = computeMetrics(bills)
  const prevMetrics = computeMetrics(prevBills)
  const comparison = buildComparison(metrics.summary.total, prevMetrics.summary.total)

  return { ...metrics, comparison }
}

/**
 * Generiše mesečni izveštaj.
 * Generates a monthly report.
 *
 * @param {string} month - Mesec u formatu YYYY-MM / Month in YYYY-MM format
 */
export async function getMonthlyReport(month: string): Promise<ReportData> {
  const { start, end } = monthRange(month)

  // Prethodni mesec / Previous month
  const [yearStr, monthNumStr] = month.split('-')
  const year  = parseInt(yearStr ?? '2024', 10)
  const mNum  = parseInt(monthNumStr ?? '1', 10)
  const prevYear  = mNum === 1 ? year - 1 : year
  const prevMonth = mNum === 1 ? 12 : mNum - 1
  const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`
  const prevRange    = monthRange(prevMonthStr)

  const [bills, prevBills] = await Promise.all([
    fetchBills(start, end),
    fetchBills(prevRange.start, prevRange.end),
  ])

  const metrics     = computeMetrics(bills)
  const prevMetrics = computeMetrics(prevBills)
  const comparison  = buildComparison(metrics.summary.total, prevMetrics.summary.total)

  return { ...metrics, comparison }
}

/**
 * Generiše izveštaj za prilagođeni period.
 * Generates a report for a custom date range.
 *
 * @param {string} dateFrom - Početni datum (YYYY-MM-DD) / Start date (YYYY-MM-DD)
 * @param {string} dateTo   - Krajnji datum (YYYY-MM-DD) / End date (YYYY-MM-DD)
 */
export async function getCustomReport(dateFrom: string, dateTo: string): Promise<ReportData> {
  const start = new Date(dateFrom)
  start.setHours(0, 0, 0, 0)
  const end = new Date(dateTo)
  end.setHours(23, 59, 59, 999)

  // Prethodni period iste dužine / Previous period of the same length
  const periodMs   = end.getTime() - start.getTime()
  const prevEnd    = new Date(start.getTime() - 1)
  const prevStart  = new Date(prevEnd.getTime() - periodMs)

  const [bills, prevBills] = await Promise.all([
    fetchBills(start, end),
    fetchBills(prevStart, prevEnd),
  ])

  const metrics     = computeMetrics(bills)
  const prevMetrics = computeMetrics(prevBills)
  const comparison  = buildComparison(metrics.summary.total, prevMetrics.summary.total)

  return { ...metrics, comparison }
}
