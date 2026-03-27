/**
 * @file server/routes/inventory.ts
 * @description Rute za upravljanje magacinom — pregled, prijem i korekcije stanja.
 *              Routes for warehouse management — overview, purchase receipt, and adjustments.
 *
 * Svi endpointi zahtevaju admin rolu.
 * All endpoints require admin role.
 *
 * Endpointi / Endpoints:
 * GET  /api/v1/inventory             → trenutno stanje / current stock
 * POST /api/v1/inventory/purchase    → prijem robe / goods receipt
 * POST /api/v1/inventory/adjust      → korekcija stanja / stock adjustment
 * GET  /api/v1/inventory/:productId/history → istorija promjena / change history
 */

import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth, requireAdmin }                from '../middleware/auth'
import { AppError }                                 from '../middleware/errorHandler'
import {
  getInventory, processPurchase, adjustStock, getProductHistory
} from '../services/inventoryService'

export const inventoryRouter = Router()

// Svi endpointi zahtevaju auth + admin / All endpoints require auth + admin
inventoryRouter.use(requireAuth, requireAdmin)

/**
 * GET /api/v1/inventory
 * Vraća pregled trenutnog stanja magacina.
 * Returns an overview of the current warehouse stock.
 *
 * @query {string} [categoryId] - Filter po kategoriji / Filter by category
 */
inventoryRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = req.query['categoryId']
      ? parseInt(req.query['categoryId'] as string, 10)
      : undefined
    const inventory = await getInventory(categoryId)
    res.json({ success: true, data: inventory })
  } catch (e) { next(e) }
})

/**
 * POST /api/v1/inventory/purchase
 * Prijem robe — batch unos više stavki odjednom.
 * Goods receipt — batch entry of multiple items at once.
 *
 * @body {{ items: { productId: number, quantity: number, note?: string }[] }} body
 * @body {number} [shiftId] - ID aktivne smene / Active shift ID
 */
inventoryRouter.post('/purchase', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, shiftId } = req.body as {
      items?: { productId: number; quantity: number; note?: string }[]
      shiftId?: number
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError(
        'Lista stavki je obavezna i ne sme biti prazna / Item list is required and must not be empty',
        400, 'VALIDATION_ERROR'
      )
    }

    // Validacija svakog reda / Validate each row
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!
      if (!item.productId || typeof item.productId !== 'number') {
        throw new AppError(`Stavka ${i + 1}: produktId je obavezan / Item ${i + 1}: productId is required`, 400, 'VALIDATION_ERROR')
      }
      if (!item.quantity || item.quantity <= 0) {
        throw new AppError(`Stavka ${i + 1}: količina mora biti > 0 / Item ${i + 1}: quantity must be > 0`, 400, 'VALIDATION_ERROR')
      }
    }

    await processPurchase(items, shiftId)
    res.status(201).json({
      success: true,
      message: `Prijem završen — ažurirano ${items.length} ${items.length === 1 ? 'proizvod' : 'proizvoda'} / Receipt complete — updated ${items.length} product(s)`
    })
  } catch (e) { next(e) }
})

/**
 * POST /api/v1/inventory/adjust
 * Ručna korekcija stanja magacina.
 * Manual stock adjustment.
 *
 * @body {number} productId - ID proizvoda / Product ID
 * @body {number} changeQty - Promena (+ ili -) / Change (+ or -)
 * @body {string} note      - Obavezna napomena / Required note
 */
inventoryRouter.post('/adjust', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, changeQty, note } = req.body as {
      productId?: number; changeQty?: number; note?: string
    }

    if (!productId) throw new AppError('productId je obavezan / productId is required', 400, 'VALIDATION_ERROR')
    if (changeQty === undefined || changeQty === null) {
      throw new AppError('changeQty je obavezan / changeQty is required', 400, 'VALIDATION_ERROR')
    }
    if (changeQty === 0) {
      throw new AppError('changeQty ne sme biti 0 / changeQty must not be 0', 400, 'VALIDATION_ERROR')
    }
    if (!note?.trim()) {
      throw new AppError('Napomena je obavezna za korekciju / Note is required for adjustment', 400, 'VALIDATION_ERROR')
    }

    await adjustStock({ productId, changeQty, note: note.trim() })
    res.json({ success: true, message: 'Stanje korigovano / Stock adjusted' })
  } catch (e) { next(e) }
})

/**
 * GET /api/v1/inventory/:productId/history
 * Vraća istoriju promena stanja za jedan proizvod.
 * Returns the stock change history for a single product.
 */
inventoryRouter.get('/:productId/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = parseInt(req.params['productId']!, 10)
    if (isNaN(productId)) throw new AppError('Nevažeći productId / Invalid productId', 400, 'VALIDATION_ERROR')
    const history = await getProductHistory(productId)
    res.json({ success: true, data: history })
  } catch (e) { next(e) }
})
