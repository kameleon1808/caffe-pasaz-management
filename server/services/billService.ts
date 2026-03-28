/**
 * @file server/services/billService.ts
 * @description Servis za upravljanje računima (porudžbinama).
 *              Service for managing bills (orders).
 *
 * Poslovna pravila / Business rules:
 * - Sto može imati samo jedan OPEN račun u isto vreme
 * - Račun se kreira sa tekućom smenom i korisnikom
 * - A table can have only one OPEN bill at a time
 * - A bill is created with the current shift and user
 */

import { prisma }   from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { getActiveShift } from './shiftService'

// ─── Pomoćne funkcije / Helpers ───────────────────────────────────────────────

/**
 * Standardizovana projekcija za učitavanje računa.
 * Standard projection for loading a bill.
 */
const BILL_INCLUDE = {
  tableUnit: { select: { id: true, label: true, zone: true } },
  user:      { select: { id: true, fullName: true, username: true } },
  items: {
    include: {
      product: { select: { id: true, nameSr: true, nameEn: true, price: true, unit: true, normQuantity: true } }
    },
    orderBy: { id: 'asc' as const }
  }
} as const

/**
 * Ponovo izračunava ukupne iznose računa na osnovu trenutnih stavki.
 * Recalculates bill totals from current items.
 *
 * @param {number} billId - ID računa / Bill ID
 */
async function recalcBillTotals(billId: number): Promise<void> {
  const [items, bill] = await Promise.all([
    prisma.billItem.findMany({ where: { billId } }),
    prisma.bill.findUnique({ where: { id: billId } })
  ])

  if (!bill) return

  let whiteRaw = 0
  let blackRaw = 0

  for (const item of items) {
    const lineTotal = item.quantity * item.unitPrice * (1 - item.discount / 100)
    if (item.color === 'WHITE') whiteRaw += lineTotal
    else blackRaw += lineTotal
  }

  const subtotal   = whiteRaw + blackRaw
  const discFactor = 1 - bill.discountPercent / 100

  await prisma.bill.update({
    where: { id: billId },
    data: {
      total:      Math.round((subtotal * discFactor) * 100) / 100,
      whiteTotal: Math.round((whiteRaw * discFactor) * 100) / 100,
      blackTotal: Math.round((blackRaw * discFactor) * 100) / 100,
    }
  })
}

// ─── Čitanje / Read ───────────────────────────────────────────────────────────

/**
 * Vraća račun prema ID-u sa svim stavkama.
 * Returns a bill by ID with all items.
 *
 * @param {number} id - ID računa / Bill ID
 * @throws {AppError} Ako račun nije pronađen / If bill not found
 */
export async function getBillById(id: number) {
  const bill = await prisma.bill.findUnique({
    where: { id },
    include: BILL_INCLUDE
  })

  if (!bill) {
    throw new AppError(
      `Račun sa ID ${id} nije pronađen / Bill with ID ${id} not found`,
      404, 'BILL_NOT_FOUND'
    )
  }

  return bill
}

/**
 * Vraća otvoren račun za dati sto, ili null ako ne postoji.
 * Returns the open bill for the given table, or null if none.
 *
 * @param {number} tableId - ID stola / Table ID
 */
export async function getOpenBillForTable(tableId: number) {
  return prisma.bill.findFirst({
    where: { tableId, status: 'OPEN' },
    include: BILL_INCLUDE
  })
}

// ─── Kreiranje / Creation ─────────────────────────────────────────────────────

/**
 * Kreira novi račun za dati sto, koristeći aktivnu smenu korisnika.
 * Creates a new bill for the given table, using the user's active shift.
 *
 * @param {number} tableId - ID stola / Table ID
 * @param {number} userId  - ID korisnika koji kreira račun / ID of user creating the bill
 * @throws {AppError} Ako sto već ima otvoren račun / If table already has an open bill
 * @throws {AppError} Ako korisnik nema aktivnu smenu / If user has no active shift
 */
export async function createBill(tableId: number, userId: number) {
  const existingBill = await prisma.bill.findFirst({
    where: { tableId, status: 'OPEN' }
  })

  if (existingBill) {
    throw new AppError(
      'Ovaj sto već ima otvoren račun / This table already has an open bill',
      409, 'TABLE_ALREADY_OCCUPIED',
      { billId: existingBill.id }
    )
  }

  const shift = await getActiveShift(userId)

  if (!shift) {
    throw new AppError(
      'Nemate aktivnu smenu. Pokrenite smenu pre otvaranja računa. / ' +
      'You have no active shift. Start a shift before opening a bill.',
      403, 'NO_ACTIVE_SHIFT'
    )
  }

  const table = await prisma.tableUnit.findUnique({ where: { id: tableId } })
  if (!table || !table.active) {
    throw new AppError(
      `Sto sa ID ${tableId} nije pronađen / Table with ID ${tableId} not found`,
      404, 'TABLE_NOT_FOUND'
    )
  }

  // Označi sto kao zauzet / Mark table as occupied
  await prisma.tableUnit.update({ where: { id: tableId }, data: { isOccupied: true } })

  return prisma.bill.create({
    data: {
      tableId,
      shiftId:         shift.id,
      userId,
      status:          'OPEN',
      discountPercent: 0,
      total:           0,
      whiteTotal:      0,
      blackTotal:      0,
    },
    include: BILL_INCLUDE
  })
}

// ─── Stavke / Items ───────────────────────────────────────────────────────────

/**
 * Dodaje stavku na račun. Ako proizvod već postoji, povećava količinu za 1.
 * Adds an item to the bill. If product already exists, increments quantity by 1.
 *
 * @param {number} billId    - ID računa / Bill ID
 * @param {number} productId - ID proizvoda / Product ID
 * @param {string} color     - Boja prometa: WHITE | BLACK (default: WHITE)
 */
export async function addItem(billId: number, productId: number, color: string = 'WHITE') {
  const bill = await getBillById(billId)
  if (bill.status !== 'OPEN') {
    throw new AppError('Račun nije otvoren / Bill is not open', 409, 'BILL_NOT_OPEN')
  }

  const product = await prisma.product.findFirst({ where: { id: productId, active: true } })
  if (!product) {
    throw new AppError('Proizvod nije pronađen / Product not found', 404, 'PRODUCT_NOT_FOUND')
  }

  if (!['WHITE', 'BLACK'].includes(color)) {
    throw new AppError('Nevažeća boja / Invalid color', 400, 'INVALID_COLOR')
  }

  const existing = await prisma.billItem.findFirst({ where: { billId, productId } })

  if (existing) {
    await prisma.billItem.update({
      where: { id: existing.id },
      data:  { quantity: existing.quantity + 1 }
    })
  } else {
    await prisma.billItem.create({
      data: {
        billId,
        productId,
        quantity:  1,
        unitPrice: product.price,
        color,
        discount:  0,
      }
    })
  }

  await recalcBillTotals(billId)
  return getBillById(billId)
}

/**
 * Menja stavku na računu (količinu, cenu, popust ili boju).
 * Updates a bill item (quantity, price, discount, or color).
 *
 * @param {number} billId  - ID računa / Bill ID
 * @param {number} itemId  - ID stavke / Item ID
 * @param data             - Polja za izmenu / Fields to update
 */
export async function updateItem(
  billId: number,
  itemId: number,
  data: { quantity?: number; unitPrice?: number; discount?: number; color?: string }
) {
  const bill = await getBillById(billId)
  if (bill.status !== 'OPEN') {
    throw new AppError('Račun nije otvoren / Bill is not open', 409, 'BILL_NOT_OPEN')
  }

  const item = await prisma.billItem.findUnique({ where: { id: itemId } })
  if (!item || item.billId !== billId) {
    throw new AppError('Stavka nije pronađena / Item not found', 404, 'ITEM_NOT_FOUND')
  }

  if (data.quantity !== undefined && data.quantity < 1) {
    throw new AppError('Količina mora biti >= 1 / Quantity must be >= 1', 400, 'INVALID_QUANTITY')
  }
  if (data.unitPrice !== undefined && data.unitPrice <= 0) {
    throw new AppError('Cena mora biti > 0 / Price must be > 0', 400, 'INVALID_PRICE')
  }
  if (data.discount !== undefined && (data.discount < 0 || data.discount > 100)) {
    throw new AppError('Popust mora biti 0-100 / Discount must be 0-100', 400, 'INVALID_DISCOUNT')
  }
  if (data.color !== undefined && !['WHITE', 'BLACK'].includes(data.color)) {
    throw new AppError('Nevažeća boja / Invalid color', 400, 'INVALID_COLOR')
  }

  await prisma.billItem.update({
    where: { id: itemId },
    data: {
      ...(data.quantity  !== undefined ? { quantity:  data.quantity }  : {}),
      ...(data.unitPrice !== undefined ? { unitPrice: data.unitPrice } : {}),
      ...(data.discount  !== undefined ? { discount:  data.discount }  : {}),
      ...(data.color     !== undefined ? { color:     data.color }     : {}),
    }
  })

  await recalcBillTotals(billId)
  return getBillById(billId)
}

/**
 * Briše stavku sa računa.
 * Removes an item from the bill.
 *
 * @param {number} billId  - ID računa / Bill ID
 * @param {number} itemId  - ID stavke / Item ID
 */
export async function removeItem(billId: number, itemId: number) {
  const bill = await getBillById(billId)
  if (bill.status !== 'OPEN') {
    throw new AppError('Račun nije otvoren / Bill is not open', 409, 'BILL_NOT_OPEN')
  }

  const item = await prisma.billItem.findUnique({ where: { id: itemId } })
  if (!item || item.billId !== billId) {
    throw new AppError('Stavka nije pronađena / Item not found', 404, 'ITEM_NOT_FOUND')
  }

  await prisma.billItem.delete({ where: { id: itemId } })
  await recalcBillTotals(billId)
  return getBillById(billId)
}

// ─── Popust / Discount ────────────────────────────────────────────────────────

/**
 * Postavlja popust na nivou računa (0–100%).
 * Sets the bill-level discount (0–100%).
 *
 * @param {number} billId          - ID računa / Bill ID
 * @param {number} discountPercent - Procenat popusta / Discount percent
 */
export async function setDiscount(billId: number, discountPercent: number) {
  const bill = await getBillById(billId)
  if (bill.status !== 'OPEN') {
    throw new AppError('Račun nije otvoren / Bill is not open', 409, 'BILL_NOT_OPEN')
  }

  if (discountPercent < 0 || discountPercent > 100) {
    throw new AppError('Popust mora biti 0-100 / Discount must be 0-100', 400, 'INVALID_DISCOUNT')
  }

  await prisma.bill.update({ where: { id: billId }, data: { discountPercent } })
  await recalcBillTotals(billId)
  return getBillById(billId)
}

// ─── Prebacivanje stola / Table Transfer ──────────────────────────────────────

/**
 * Prebacuje račun na drugi slobodan sto.
 * Transfers a bill to another free table.
 *
 * @param {number} billId      - ID računa / Bill ID
 * @param {number} newTableId  - ID novog stola / New table ID
 * @throws {AppError} Ako je novi sto zauzet / If new table is occupied
 */
export async function transferTable(billId: number, newTableId: number) {
  const bill = await getBillById(billId)
  if (bill.status !== 'OPEN') {
    throw new AppError('Račun nije otvoren / Bill is not open', 409, 'BILL_NOT_OPEN')
  }

  if (bill.tableUnit.id === newTableId) {
    throw new AppError('Sto je isti / Table is the same', 400, 'SAME_TABLE')
  }

  const newTable = await prisma.tableUnit.findFirst({ where: { id: newTableId, active: true } })
  if (!newTable) {
    throw new AppError('Sto nije pronađen / Table not found', 404, 'TABLE_NOT_FOUND')
  }
  if (newTable.isOccupied) {
    throw new AppError('Novi sto je zauzet / New table is occupied', 409, 'TABLE_OCCUPIED')
  }

  const oldTableId = bill.tableUnit.id

  await prisma.$transaction([
    prisma.tableUnit.update({ where: { id: oldTableId }, data: { isOccupied: false } }),
    prisma.tableUnit.update({ where: { id: newTableId }, data: { isOccupied: true } }),
    prisma.bill.update({ where: { id: billId }, data: { tableId: newTableId } })
  ])

  return getBillById(billId)
}

// ─── Naplata / Payment ────────────────────────────────────────────────────────

/**
 * Naplaćuje račun — finalizuje iznose, ažurira zalihe, kreira InventoryLog, oslobađa sto.
 * Pays a bill — finalizes amounts, updates stock, creates InventoryLog, releases table.
 *
 * @param {number} billId - ID računa / Bill ID
 * @throws {AppError} Ako račun nema stavki / If bill has no items
 */
export async function payBill(billId: number) {
  const bill = await getBillById(billId)
  if (bill.status !== 'OPEN') {
    throw new AppError('Račun nije otvoren / Bill is not open', 409, 'BILL_NOT_OPEN')
  }
  if (bill.items.length === 0) {
    throw new AppError('Račun je prazan — dodajte stavke pre naplate / Bill is empty — add items before payment', 400, 'EMPTY_BILL')
  }

  // Ponovo izračunaj pre finalizacije / Recalculate before finalizing
  await recalcBillTotals(billId)
  const finalBill = await prisma.bill.findUnique({ where: { id: billId } })
  if (!finalBill) throw new AppError('Greška / Error', 500, 'INTERNAL')

  await prisma.$transaction(async (tx) => {
    // Finalizuj račun / Finalize bill
    await tx.bill.update({
      where: { id: billId },
      data: {
        status:     'PAID',
        paidAt:     new Date(),
        total:      finalBill.total,
        whiteTotal: finalBill.whiteTotal,
        blackTotal: finalBill.blackTotal,
      }
    })

    // Oslobodi sto / Release table
    await tx.tableUnit.update({
      where: { id: bill.tableUnit.id },
      data:  { isOccupied: false }
    })

    // Ažuriraj zalihe i kreiraj logove / Update stock and create logs
    for (const item of bill.items) {
      await tx.product.update({
        where: { id: item.product.id },
        data:  { stockQuantity: { decrement: item.quantity * item.product.normQuantity } }
      })

      await tx.inventoryLog.create({
        data: {
          productId: item.product.id,
          changeQty: -item.quantity * item.product.normQuantity,
          type:      'SALE',
          shiftId:   finalBill.shiftId,
          note:      `Račun #${billId} / Bill #${billId}`,
        }
      })
    }

    // Ažuriraj ukupne iznose smene / Update shift totals
    await tx.shift.update({
      where: { id: finalBill.shiftId },
      data: {
        totalWhite:   { increment: finalBill.whiteTotal },
        totalBlack:   { increment: finalBill.blackTotal },
        totalRevenue: { increment: finalBill.total },
      }
    })
  })

  return getBillById(billId)
}

// ─── Otkazivanje / Cancellation ───────────────────────────────────────────────

/**
 * Otkazuje račun — oslobađa sto, ne menja zalihe.
 * Cancels a bill — releases the table, does not change stock.
 *
 * @param {number} billId  - ID računa / Bill ID
 * @param {string} reason  - Razlog otkazivanja (obavezno) / Cancellation reason (required)
 */
export async function cancelBill(billId: number, reason: string) {
  const bill = await getBillById(billId)
  if (bill.status !== 'OPEN') {
    throw new AppError('Račun nije otvoren / Bill is not open', 409, 'BILL_NOT_OPEN')
  }

  if (!reason?.trim()) {
    throw new AppError(
      'Napomena je obavezna za otkazivanje / Reason is required for cancellation',
      400, 'REASON_REQUIRED'
    )
  }

  await prisma.$transaction([
    prisma.bill.update({
      where: { id: billId },
      data:  { status: 'CANCELLED' }
    }),
    prisma.tableUnit.update({
      where: { id: bill.tableUnit.id },
      data:  { isOccupied: false }
    })
  ])

  return getBillById(billId)
}
