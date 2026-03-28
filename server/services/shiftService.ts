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

import { prisma }       from '../lib/prisma'
import { AppError }     from '../middleware/errorHandler'
import { Prisma }       from '@prisma/client'

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

// ==============================================================================
// INVENTAR SMENE / SHIFT INVENTORY
// ==============================================================================

/**
 * Tip za stavku inventara u izveštaju smene.
 * Type for an inventory item in the shift report.
 */
export interface ShiftInventoryItem {
  productId:    number
  nameSr:       string
  nameEn:       string
  unit:         string
  categorySr:   string
  categoryEn:   string
  /** Stanje na početku smene (retroaktivno) / Start-of-shift stock (retroactive) */
  startStock:   number
  /** Prodato u smeni (u jed. zaliha, s normQuantity) / Sold in shift (stock units, with normQuantity) */
  sold:         number
  /** Nabavljeno u smeni / Purchased in shift */
  purchased:    number
  /** Korekcije u smeni (ADJUSTMENT + WASTE) / Adjustments in shift */
  adjusted:     number
  /** Trenutno stanje / Current stock */
  currentStock: number
}

/**
 * Rezultat upita stanja inventara za smenu.
 * Result of the inventory summary query for a shift.
 */
export interface ShiftInventoryResult {
  items:             ShiftInventoryItem[]
  minStockThreshold: number
}

/**
 * Podaci za ručnu korekciju inventara u smeni.
 * Data for manual inventory adjustment in a shift.
 */
export interface ShiftInventoryAdjustData {
  productId: number
  changeQty: number
  type:      'WASTE' | 'ADJUSTMENT'
  note:      string
}

/**
 * Vraća stanje magacina za datu smenu.
 * Returns the warehouse state for the given shift.
 *
 * Za svaki aktivni proizvod izračunava:
 * - sold      = suma (billItem.quantity × normQuantity) iz PAID računa u smeni
 * - purchased = suma changeQty iz InventoryLog gde type=PURCHASE i shiftId
 * - adjusted  = suma changeQty iz InventoryLog gde type∈{ADJUSTMENT,WASTE} i shiftId
 * - startStock = currentStock + sold - purchased - adjusted (retroaktivno)
 *
 * For each active product calculates:
 * - sold      = sum of (billItem.quantity × normQuantity) from PAID bills in shift
 * - purchased = sum of changeQty from InventoryLog where type=PURCHASE and shiftId
 * - adjusted  = sum of changeQty from InventoryLog where type∈{ADJUSTMENT,WASTE} and shiftId
 * - startStock = currentStock + sold - purchased - adjusted (retroactive)
 *
 * @param {number} shiftId - ID smene / Shift ID
 * @returns {Promise<ShiftInventoryResult>}
 * @throws {AppError} Ako smena ne postoji / If shift does not exist
 */
export async function getShiftInventorySummary(shiftId: number): Promise<ShiftInventoryResult> {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  if (!shift) {
    throw new AppError(
      'Smena nije pronađena / Shift not found',
      404, 'SHIFT_NOT_FOUND'
    )
  }

  // min_stock_threshold iz podešavanja (podrazumevano 5) / from settings (default 5)
  const thresholdSetting = await prisma.setting.findUnique({
    where: { key: 'min_stock_threshold' }
  })
  const minStockThreshold = thresholdSetting
    ? (parseInt(thresholdSetting.value, 10) || 5)
    : 5

  // Svi aktivni proizvodi sa kategorijama / All active products with categories
  const products = await prisma.product.findMany({
    where:   { active: true },
    include: { category: true },
    orderBy: [
      { category: { sortOrder: 'asc' } },
      { nameSr: 'asc' }
    ]
  })

  // Stavke PAID računa ove smene / BillItems from PAID bills in this shift
  const billItems = await prisma.billItem.findMany({
    where:  { bill: { shiftId, status: 'PAID' } },
    select: {
      productId: true,
      quantity:  true,
      product:   { select: { normQuantity: true } }
    }
  })

  // Svi InventoryLog zapisi za ovu smenu / All InventoryLog records for this shift
  const inventoryLogs = await prisma.inventoryLog.findMany({
    where: { shiftId }
  })

  // Agregacija prodatih jedinica zaliha po productId
  // Aggregate sold stock units by productId
  const soldMap = new Map<number, number>()
  for (const item of billItems) {
    const prev = soldMap.get(item.productId) ?? 0
    soldMap.set(item.productId, prev + item.quantity * item.product.normQuantity)
  }

  // Agregacija InventoryLogs po tipu / Aggregate InventoryLogs by type
  const purchasedMap = new Map<number, number>()
  const adjustedMap  = new Map<number, number>()
  for (const log of inventoryLogs) {
    if (log.type === 'PURCHASE') {
      purchasedMap.set(log.productId, (purchasedMap.get(log.productId) ?? 0) + log.changeQty)
    } else if (log.type === 'ADJUSTMENT' || log.type === 'WASTE') {
      adjustedMap.set(log.productId, (adjustedMap.get(log.productId) ?? 0) + log.changeQty)
    }
  }

  const items: ShiftInventoryItem[] = products.map(p => {
    const sold      = soldMap.get(p.id)      ?? 0
    const purchased = purchasedMap.get(p.id) ?? 0
    const adjusted  = adjustedMap.get(p.id)  ?? 0
    const startStock = p.stockQuantity + sold - purchased - adjusted

    return {
      productId:    p.id,
      nameSr:       p.nameSr,
      nameEn:       p.nameEn,
      unit:         p.unit,
      categorySr:   p.category?.nameSr ?? '',
      categoryEn:   p.category?.nameEn ?? '',
      startStock:   Math.max(0, startStock),
      sold,
      purchased,
      adjusted,
      currentStock: p.stockQuantity,
    }
  })

  return { items, minStockThreshold }
}

/**
 * Ručna korekcija inventara u kontekstu smene.
 * Manual inventory adjustment in the context of a shift.
 *
 * Podržava tipove WASTE (rastur/lom) i ADJUSTMENT (korekcija evidencije).
 * Supports WASTE (spillage/breakage) and ADJUSTMENT (recording correction) types.
 *
 * @param {number}                   shiftId - ID smene / Shift ID
 * @param {ShiftInventoryAdjustData} data    - Podaci za korekciju / Adjustment data
 * @throws {AppError} Ako smena/proizvod ne postoji, napomena prazna, ili negativno stanje
 *                    If shift/product not found, note empty, or negative stock would result
 */
export async function adjustShiftInventory(
  shiftId: number,
  data:    ShiftInventoryAdjustData
): Promise<void> {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  if (!shift) {
    throw new AppError(
      'Smena nije pronađena / Shift not found',
      404, 'SHIFT_NOT_FOUND'
    )
  }

  const product = await prisma.product.findUnique({ where: { id: data.productId } })
  if (!product || !product.active) {
    throw new AppError(
      `Proizvod ID ${data.productId} nije pronađen / Product ID ${data.productId} not found`,
      404, 'PRODUCT_NOT_FOUND'
    )
  }

  if (!data.note.trim()) {
    throw new AppError(
      'Napomena je obavezna za korekciju / Note is required for adjustment',
      400, 'NOTE_REQUIRED'
    )
  }

  if (data.type !== 'WASTE' && data.type !== 'ADJUSTMENT') {
    throw new AppError(
      'Nevažeći tip korekcije. Dozvoljeno: WASTE, ADJUSTMENT / Invalid type. Allowed: WASTE, ADJUSTMENT',
      400, 'INVALID_TYPE'
    )
  }

  const newQty = product.stockQuantity + data.changeQty
  if (newQty < 0) {
    throw new AppError(
      `Korekcija bi dovela do negativnog stanja (${product.stockQuantity} + ${data.changeQty} = ${newQty}). / ` +
      `Adjustment would result in negative stock.`,
      400, 'NEGATIVE_STOCK'
    )
  }

  await prisma.$transaction([
    prisma.product.update({
      where: { id: data.productId },
      data:  { stockQuantity: newQty }
    }),
    prisma.inventoryLog.create({
      data: {
        productId: data.productId,
        changeQty: data.changeQty,
        type:      data.type,
        note:      data.note,
        shiftId,
      }
    })
  ])
}

// ==============================================================================
// POTVRDA ZAVRŠETKA I ISTORIJA / CONFIRM END AND HISTORY
// ==============================================================================

/**
 * Završava smenu po ID-u. Validira vlasništvo (konobar = svoja smena, admin = svaka).
 * Ends a shift by ID. Validates ownership (waiter = own shift, admin = any).
 *
 * @param {number}  shiftId - ID smene / Shift ID
 * @param {number}  userId  - ID korisnika koji završava / ID of user ending the shift
 * @param {boolean} isAdmin - Da li je korisnik admin / Whether user is admin
 * @throws {AppError} Ako smena ne postoji, nije vlasnik, već završena, ili ima otvorenih računa
 */
export async function endShiftById(shiftId: number, userId: number, isAdmin: boolean) {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  if (!shift) {
    throw new AppError('Smena nije pronađena / Shift not found', 404, 'SHIFT_NOT_FOUND')
  }
  if (!isAdmin && shift.userId !== userId) {
    throw new AppError(
      'Nemate pristup ovoj smeni / You do not have access to this shift',
      403, 'FORBIDDEN'
    )
  }
  if (shift.endedAt !== null) {
    throw new AppError(
      'Smena je već završena / Shift is already ended',
      409, 'SHIFT_ALREADY_ENDED'
    )
  }

  const openBills = await prisma.bill.count({ where: { shiftId, status: 'OPEN' } })
  if (openBills > 0) {
    throw new AppError(
      `Ne možete završiti smenu dok imate ${openBills} otvorenih računa / ` +
      `You cannot end the shift while there are ${openBills} open bills`,
      409, 'SHIFT_HAS_OPEN_BILLS',
      { openBills }
    )
  }

  const revenueAgg = await prisma.bill.aggregate({
    where:  { shiftId, status: 'PAID' },
    _sum:   { total: true, whiteTotal: true, blackTotal: true }
  })

  return prisma.shift.update({
    where: { id: shiftId },
    data: {
      endedAt:      new Date(),
      totalRevenue: revenueAgg._sum.total      ?? 0,
      totalWhite:   revenueAgg._sum.whiteTotal ?? 0,
      totalBlack:   revenueAgg._sum.blackTotal ?? 0,
    },
    include: {
      user: { select: { id: true, fullName: true, username: true } }
    }
  })
}

/**
 * Parametri za listu smena (admin).
 * Parameters for shift list (admin).
 */
export interface ShiftListParams {
  userId?:   number
  dateFrom?: string  // ISO date string "YYYY-MM-DD"
  dateTo?:   string  // ISO date string "YYYY-MM-DD"
  page?:     number
  limit?:    number
}

/**
 * Stavka u listi smena.
 * Shift list item.
 */
export interface ShiftListItem {
  id:             number
  userId:         number
  startedAt:      Date
  endedAt:        Date | null
  totalRevenue:   number
  totalWhite:     number
  totalBlack:     number
  user:           { id: number; fullName: string; username: string }
  paidBillsCount: number
}

/**
 * Rezultat upita liste smena sa paginacijom.
 * Shift list query result with pagination.
 */
export interface ShiftListResult {
  shifts: ShiftListItem[]
  total:  number
  page:   number
  limit:  number
}

/**
 * Vraća paginiranu listu smena sa opcionim filterima (admin).
 * Returns paginated shift list with optional filters (admin).
 *
 * @param {ShiftListParams} params - Parametri filtera i paginacije / Filter and pagination params
 * @returns {Promise<ShiftListResult>}
 */
export async function getShiftList(params: ShiftListParams): Promise<ShiftListResult> {
  const { userId, dateFrom, dateTo, page = 1, limit = 20 } = params

  const where: Prisma.ShiftWhereInput = {}
  if (userId)   where.userId    = userId
  if (dateFrom) where.startedAt = { ...(where.startedAt as object ?? {}), gte: new Date(dateFrom) }
  if (dateTo)   where.startedAt = { ...(where.startedAt as object ?? {}), lte: new Date(`${dateTo}T23:59:59`) }

  const [raw, total] = await Promise.all([
    prisma.shift.findMany({
      where,
      include: {
        user:   { select: { id: true, fullName: true, username: true } },
        _count: { select: { bills: { where: { status: 'PAID' } } } },
      },
      orderBy: { startedAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.shift.count({ where }),
  ])

  const shifts: ShiftListItem[] = raw.map(s => ({
    id:             s.id,
    userId:         s.userId,
    startedAt:      s.startedAt,
    endedAt:        s.endedAt,
    totalRevenue:   s.totalRevenue,
    totalWhite:     s.totalWhite,
    totalBlack:     s.totalBlack,
    user:           s.user,
    paidBillsCount: s._count.bills,
  }))

  return { shifts, total, page, limit }
}
