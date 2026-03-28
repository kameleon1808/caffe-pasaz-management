/**
 * @file server/services/shiftService.ts
 * @description Servis za upravljanje smenama konobara.
 *              Service for managing waiter shifts.
 *
 * Poslovna pravila / Business rules:
 * - Korisnik može imati samo jednu aktivnu smenu u isto vreme
 * - Smena se ne može završiti ako ima otvorenih računa
 * - A user can only have one active shift at a time
 * - A shift cannot be ended if there are open bills
 */

import { prisma }   from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

/**
 * Vraća aktivnu smenu za datog korisnika, ili null ako nema.
 * Returns the active shift for the given user, or null if none.
 *
 * @param {number} userId - ID korisnika / User ID
 * @returns {Promise<Shift | null>} Aktivna smena ili null / Active shift or null
 */
export async function getActiveShift(userId: number) {
  return prisma.shift.findFirst({
    where:   { userId, endedAt: null },
    include: {
      user: {
        select: { id: true, fullName: true, username: true }
      }
    },
    orderBy: { startedAt: 'desc' }
  })
}

/**
 * Počinje novu smenu za korisnika.
 * Starts a new shift for the user.
 *
 * @param {number} userId - ID korisnika / User ID
 * @returns {Promise<Shift>} Nova smena / New shift
 * @throws {AppError} Ako korisnik već ima aktivnu smenu / If user already has an active shift
 */
export async function startShift(userId: number) {
  const existing = await getActiveShift(userId)

  if (existing) {
    throw new AppError(
      'Već imate aktivnu smenu / You already have an active shift',
      409, 'SHIFT_ALREADY_ACTIVE',
      { shiftId: existing.id, startedAt: existing.startedAt }
    )
  }

  return prisma.shift.create({
    data: {
      userId,
      startedAt:    new Date(),
      totalWhite:   0,
      totalBlack:   0,
      totalRevenue: 0
    },
    include: {
      user: {
        select: { id: true, fullName: true, username: true }
      }
    }
  })
}

/**
 * Završava aktivnu smenu za korisnika.
 * Ends the active shift for the user.
 *
 * @param {number} userId - ID korisnika / User ID
 * @returns {Promise<Shift>} Završena smena / Ended shift
 * @throws {AppError} Ako nema aktivne smene / If no active shift
 * @throws {AppError} Ako ima otvorenih računa / If there are open bills
 */
export async function endShift(userId: number) {
  const active = await getActiveShift(userId)

  if (!active) {
    throw new AppError(
      'Nemate aktivnu smenu / You do not have an active shift',
      404, 'SHIFT_NOT_ACTIVE'
    )
  }

  // Proveri otvorene račune u ovoj smeni / Check for open bills in this shift
  const openBills = await prisma.bill.count({
    where: { shiftId: active.id, status: 'OPEN' }
  })

  if (openBills > 0) {
    throw new AppError(
      `Ne možete završiti smenu dok imate ${openBills} otvorenih računa / ` +
      `You cannot end your shift while there are ${openBills} open bills`,
      409, 'SHIFT_HAS_OPEN_BILLS',
      { openBills }
    )
  }

  // Izračunaj ukupne prihode iz plaćenih računa ove smene
  // Calculate total revenue from paid bills of this shift
  const revenueAgg = await prisma.bill.aggregate({
    where:  { shiftId: active.id, status: 'PAID' },
    _sum:   { total: true, whiteTotal: true, blackTotal: true }
  })

  return prisma.shift.update({
    where: { id: active.id },
    data: {
      endedAt:      new Date(),
      totalRevenue: revenueAgg._sum.total      ?? 0,
      totalWhite:   revenueAgg._sum.whiteTotal ?? 0,
      totalBlack:   revenueAgg._sum.blackTotal ?? 0,
    },
    include: {
      user: {
        select: { id: true, fullName: true, username: true }
      }
    }
  })
}

// ==============================================================================
// SUMARNI IZVEŠTAJ SMENE / SHIFT SUMMARY REPORT
// ==============================================================================

/**
 * Tip za agregirane podatke prodaje po proizvodu.
 * Type for aggregated sales data per product.
 */
export interface ShiftSalesItem {
  productId:   number
  nameSr:      string
  nameEn:      string
  categorySr:  string
  categoryEn:  string
  soldTotal:   number
  soldWhite:   number
  soldBlack:   number
  totalAmount: number
}

/**
 * Tip za sumarni izveštaj smene.
 * Type for shift summary report.
 */
export interface ShiftSummaryResult {
  openBillsCount: number
  revenue: {
    total:          number
    white:          number
    black:          number
    paidCount:      number
    cancelledCount: number
    averageBill:    number
  }
  salesByProduct: ShiftSalesItem[]
}

/**
 * Vraća sumarni izveštaj smene — promet i prodaja po artiklima.
 * Returns the shift summary report — revenue and sales by product.
 *
 * Ne zatvara smenu. / Does NOT close the shift.
 *
 * @param {number} shiftId - ID smene / Shift ID
 * @returns {Promise<ShiftSummaryResult>} Izveštaj smene / Shift summary report
 * @throws {AppError} Ako smena ne postoji / If shift does not exist
 */
export async function getShiftSummary(shiftId: number): Promise<ShiftSummaryResult> {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  if (!shift) {
    throw new AppError(
      'Smena nije pronađena / Shift not found',
      404, 'SHIFT_NOT_FOUND'
    )
  }

  // Broj otvorenih računa / Open bills count
  const openBillsCount = await prisma.bill.count({
    where: { shiftId, status: 'OPEN' }
  })

  // Promet iz PAID računa / Revenue from PAID bills
  const revenueAgg = await prisma.bill.aggregate({
    where:  { shiftId, status: 'PAID' },
    _sum:   { total: true, whiteTotal: true, blackTotal: true },
    _count: { id: true }
  })

  const cancelledCount = await prisma.bill.count({
    where: { shiftId, status: 'CANCELLED' }
  })

  const paidCount   = revenueAgg._count.id
  const total       = revenueAgg._sum.total       ?? 0
  const white       = revenueAgg._sum.whiteTotal  ?? 0
  const black       = revenueAgg._sum.blackTotal  ?? 0
  const averageBill = paidCount > 0 ? total / paidCount : 0

  // Stavke svih PAID računa u smeni / All BillItems from PAID bills in shift
  const items = await prisma.billItem.findMany({
    where: { bill: { shiftId, status: 'PAID' } },
    include: {
      product: {
        include: { category: true }
      }
    }
  })

  // Agregacija po proizvodu / Aggregate by product
  const productMap = new Map<number, ShiftSalesItem>()

  for (const item of items) {
    const lineTotal = item.quantity * item.unitPrice * (1 - item.discount / 100)
    const existing  = productMap.get(item.productId)

    if (existing) {
      existing.soldTotal   += item.quantity
      existing.soldWhite   += item.color === 'WHITE' ? item.quantity : 0
      existing.soldBlack   += item.color === 'BLACK' ? item.quantity : 0
      existing.totalAmount += lineTotal
    } else {
      productMap.set(item.productId, {
        productId:   item.productId,
        nameSr:      item.product.nameSr,
        nameEn:      item.product.nameEn,
        categorySr:  item.product.category?.nameSr ?? '',
        categoryEn:  item.product.category?.nameEn ?? '',
        soldTotal:   item.quantity,
        soldWhite:   item.color === 'WHITE' ? item.quantity : 0,
        soldBlack:   item.color === 'BLACK' ? item.quantity : 0,
        totalAmount: lineTotal,
      })
    }
  }

  // Sortiraj po ukupno prodatoj količini (od najviše) / Sort by total sold (descending)
  const salesByProduct = Array.from(productMap.values())
    .sort((a, b) => b.soldTotal - a.soldTotal)

  return {
    openBillsCount,
    revenue: { total, white, black, paidCount, cancelledCount, averageBill },
    salesByProduct,
  }
}

/**
 * Vraća istoriju smena za korisnika.
 * Returns shift history for the user.
 *
 * @param {number} userId - ID korisnika / User ID
 * @param {number} [limit=20] - Maksimalan broj zapisa / Maximum number of records
 * @returns {Promise<Shift[]>} Lista smena / List of shifts
 */
export async function getShiftHistory(userId: number, limit = 20) {
  return prisma.shift.findMany({
    where:   { userId },
    include: {
      user: {
        select: { id: true, fullName: true, username: true }
      }
    },
    orderBy: { startedAt: 'desc' },
    take:    limit
  })
}
