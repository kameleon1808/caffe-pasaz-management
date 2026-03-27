/**
 * @file server/services/inventoryService.ts
 * @description Servis za upravljanje magacinom i zalihama.
 *              Service for warehouse and stock management.
 *
 * Poslovna pravila / Business rules:
 * - PURCHASE: prima robu, povećava stockQuantity, kreira InventoryLog
 * - ADJUSTMENT: ručna korekcija (+ ili -), kreira InventoryLog sa obaveznom napomenom
 * - stockQuantity nikada ne sme biti negativan posle korekcije
 * - PURCHASE: receives goods, increases stockQuantity, creates InventoryLog
 * - ADJUSTMENT: manual correction (+ or -), creates InventoryLog with required note
 * - stockQuantity must never go negative after adjustment
 */

import { prisma }   from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

/** Stavka za prijem robe / Item for goods receipt */
export interface PurchaseItem {
  productId: number
  quantity:  number
  note?:     string
}

/** Podaci za korekciju stanja / Data for stock adjustment */
export interface AdjustmentData {
  productId: number
  changeQty: number   // pozitivno = dodaj, negativno = oduzmi / positive = add, negative = subtract
  note:      string   // obavezna napomena za korekcije / mandatory note for adjustments
}

/** Prag za nisko stanje (komada/litara) / Low stock threshold */
export const LOW_STOCK_THRESHOLD = 5

/**
 * Vraća trenutno stanje svih aktivnih proizvoda.
 * Returns the current stock of all active products.
 *
 * @param {number} [categoryId] - Opcioni filter po kategoriji / Optional category filter
 */
export async function getInventory(categoryId?: number) {
  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(categoryId ? { categoryId } : {})
    },
    include: { category: true },
    orderBy: [
      { category: { sortOrder: 'asc' } },
      { nameSr: 'asc' }
    ]
  })

  return products.map(p => ({
    ...p,
    isLowStock: p.stockQuantity <= LOW_STOCK_THRESHOLD
  }))
}

/**
 * Prima robu — kreira InventoryLog zapise i ažurira zalihe.
 * Receives goods — creates InventoryLog records and updates stock.
 *
 * Sve stavke se obrađuju u jednoj Prisma transakciji.
 * All items are processed in a single Prisma transaction.
 *
 * @param {PurchaseItem[]} items    - Lista stavki prijema / List of receipt items
 * @param {number}         shiftId  - ID aktivne smene / Active shift ID (optional)
 * @throws {AppError} Ako je lista prazna ili je količina <= 0 / If list is empty or quantity <= 0
 */
export async function processPurchase(items: PurchaseItem[], shiftId?: number): Promise<void> {
  if (!items.length) {
    throw new AppError(
      'Lista stavki je prazna / Item list is empty',
      400, 'EMPTY_PURCHASE'
    )
  }

  // Validacija svake stavke / Validate each item
  for (const item of items) {
    if (item.quantity <= 0) {
      throw new AppError(
        `Količina mora biti > 0 za svaki proizvod / Quantity must be > 0 for each product`,
        400, 'INVALID_QUANTITY'
      )
    }
    const product = await prisma.product.findUnique({ where: { id: item.productId } })
    if (!product || !product.active) {
      throw new AppError(
        `Proizvod ID ${item.productId} nije pronađen ili nije aktivan / Product ID ${item.productId} not found or inactive`,
        404, 'PRODUCT_NOT_FOUND'
      )
    }
  }

  // Obrada u transakciji / Process in a transaction
  await prisma.$transaction(
    items.map(item =>
      prisma.product.update({
        where: { id: item.productId },
        data:  {
          stockQuantity: { increment: item.quantity },
          inventoryLogs: {
            create: {
              changeQty: item.quantity,
              type:      'PURCHASE',
              note:      item.note,
              ...(shiftId ? { shiftId } : {})
            }
          }
        }
      })
    )
  )
}

/**
 * Korekcija stanja magacina (ručna ispravka grešaka u evidenciji).
 * Stock adjustment (manual correction of recording errors).
 *
 * @param {AdjustmentData} data - Podaci za korekciju / Adjustment data
 * @throws {AppError} Ako bi rezultovalo negativnim stanjem / If it would result in negative stock
 */
export async function adjustStock(data: AdjustmentData): Promise<void> {
  const product = await prisma.product.findUnique({ where: { id: data.productId } })
  if (!product || !product.active) {
    throw new AppError(
      `Proizvod ID ${data.productId} nije pronađen / Product ID ${data.productId} not found`,
      404, 'PRODUCT_NOT_FOUND'
    )
  }

  if (!data.note.trim()) {
    throw new AppError(
      'Napomena je obavezna za korekciju stanja / Note is required for stock adjustment',
      400, 'NOTE_REQUIRED'
    )
  }

  const newQty = product.stockQuantity + data.changeQty
  if (newQty < 0) {
    throw new AppError(
      `Korekcija bi dovela do negativnog stanja (${product.stockQuantity} + ${data.changeQty} = ${newQty}). / Adjustment would result in negative stock.`,
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
        type:      'ADJUSTMENT',
        note:      data.note
      }
    })
  ])
}

/**
 * Vraća istoriju promena inventara za jedan proizvod.
 * Returns the inventory change history for a single product.
 *
 * @param {number} productId - ID proizvoda / Product ID
 * @param {number} limit     - Broj zapisa (default 50) / Number of records (default 50)
 */
export async function getProductHistory(productId: number, limit = 50) {
  return prisma.inventoryLog.findMany({
    where:   { productId },
    orderBy: { createdAt: 'desc' },
    take:    limit
  })
}
