/**
 * @file server/routes/categories.ts
 * @description Rute za CRUD upravljanje kategorijama proizvoda (admin only).
 *              Routes for product category CRUD management (admin only).
 *
 * Svi endpointi zahtevaju autentifikaciju i admin rolu.
 * All endpoints require authentication and admin role.
 *
 * Endpointi / Endpoints:
 * GET    /api/v1/categories            → lista kategorija / list categories
 * POST   /api/v1/categories            → nova kategorija / new category
 * PUT    /api/v1/categories/:id        → izmena kategorije / update category
 * DELETE /api/v1/categories/:id        → deaktivacija (soft delete)
 * PATCH  /api/v1/categories/reorder    → novi redosled / new order
 */

import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth, requireAdmin }                from '../middleware/auth'
import { AppError }                                 from '../middleware/errorHandler'
import {
  getCategories, createCategory, updateCategory,
  deleteCategory, reorderCategories
} from '../services/categoryService'

export const categoriesRouter = Router()

// Svi endpointi zahtevaju auth + admin / All endpoints require auth + admin
categoriesRouter.use(requireAuth, requireAdmin)

/**
 * GET /api/v1/categories
 * Lista kategorija (sve ili samo aktivne).
 * List categories (all or only active).
 *
 * @query {string} [showInactive] - "true" da prikaže i neaktivne / "true" to show inactive too
 */
categoriesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const showInactive = req.query['showInactive'] === 'true'
    const categories   = await getCategories(!showInactive)
    res.json({ success: true, data: categories })
  } catch (e) { next(e) }
})

/**
 * POST /api/v1/categories
 * Kreira novu kategoriju.
 * Creates a new category.
 *
 * @body {string} nameSr     - Naziv na srpskom (obavezan) / Serbian name (required)
 * @body {string} nameEn     - Naziv na engleskom (obavezan) / English name (required)
 * @body {number} [sortOrder] - Redosled prikaza / Display order
 */
categoriesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nameSr, nameEn, sortOrder } = req.body as {
      nameSr?: string; nameEn?: string; sortOrder?: number
    }

    if (!nameSr?.trim()) throw new AppError('Naziv na srpskom je obavezan / Serbian name is required', 400, 'VALIDATION_ERROR')
    if (!nameEn?.trim()) throw new AppError('Naziv na engleskom je obavezan / English name is required', 400, 'VALIDATION_ERROR')

    const category = await createCategory({
      nameSr: nameSr.trim(),
      nameEn: nameEn.trim(),
      sortOrder
    })
    res.status(201).json({ success: true, data: category })
  } catch (e) { next(e) }
})

/**
 * PATCH /api/v1/categories/reorder
 * Sačuva novi redosled kategorija.
 * Save new category order.
 * MORA biti pre /:id rute da ne bi bio protumačen kao ID "reorder"!
 * MUST be before the /:id route to avoid being interpreted as ID "reorder"!
 *
 * @body {{ id: number, sortOrder: number }[]} items - Niz {id, sortOrder} / Array of {id, sortOrder}
 */
categoriesRouter.patch('/reorder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items } = req.body as { items?: { id: number; sortOrder: number }[] }

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('items mora biti neprazan niz / items must be a non-empty array', 400, 'VALIDATION_ERROR')
    }

    await reorderCategories(items)
    res.json({ success: true, message: 'Redosled sačuvan / Order saved' })
  } catch (e) { next(e) }
})

/**
 * PUT /api/v1/categories/:id
 * Menja kategoriju.
 * Updates a category.
 */
categoriesRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10)
    if (isNaN(id)) throw new AppError('Nevažeći ID / Invalid ID', 400, 'VALIDATION_ERROR')

    const { nameSr, nameEn, sortOrder, active } = req.body as {
      nameSr?: string; nameEn?: string; sortOrder?: number; active?: boolean
    }

    const category = await updateCategory(id, {
      ...(nameSr    !== undefined ? { nameSr: nameSr.trim() }       : {}),
      ...(nameEn    !== undefined ? { nameEn: nameEn.trim() }       : {}),
      ...(sortOrder !== undefined ? { sortOrder }                    : {}),
      ...(active    !== undefined ? { active }                       : {})
    })
    res.json({ success: true, data: category })
  } catch (e) { next(e) }
})

/**
 * DELETE /api/v1/categories/:id
 * Deaktivira kategoriju (soft delete).
 * Deactivates a category (soft delete).
 */
categoriesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10)
    if (isNaN(id)) throw new AppError('Nevažeći ID / Invalid ID', 400, 'VALIDATION_ERROR')

    await deleteCategory(id)
    res.json({ success: true, message: 'Kategorija deaktivirana / Category deactivated' })
  } catch (e) { next(e) }
})
