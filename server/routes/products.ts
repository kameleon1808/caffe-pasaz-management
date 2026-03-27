/**
 * @file server/routes/products.ts
 * @description Rute za CRUD upravljanje proizvodima.
 *              Routes for product CRUD management.
 *
 * Endpointi / Endpoints:
 * GET    /api/v1/products          → lista sa filterima / list with filters
 * POST   /api/v1/products          → novi proizvod (admin) / new product (admin)
 * PUT    /api/v1/products/:id      → izmena (admin) / update (admin)
 * DELETE /api/v1/products/:id      → deaktivacija (admin) / deactivate (admin)
 */

import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth, requireAdmin }                from '../middleware/auth'
import { AppError }                                 from '../middleware/errorHandler'
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, ALLOWED_UNITS, type Unit } from '../services/productService'

export const productsRouter = Router()

/**
 * GET /api/v1/products
 * Vraća listu proizvoda sa opcionim filterima.
 * Returns a list of products with optional filters.
 *
 * @query {string} [categoryId]   - Filter po kategoriji / Filter by category
 * @query {string} [search]       - Pretraga po imenu / Search by name
 * @query {string} [showInactive] - "true" da prikaže i neaktivne / Show inactive too
 */
productsRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId   = req.query['categoryId'] ? parseInt(req.query['categoryId'] as string, 10) : undefined
    const search       = req.query['search'] as string | undefined
    const showInactive = req.query['showInactive'] === 'true'

    const products = await getProducts({ categoryId, search, showInactive })
    res.json({ success: true, data: products })
  } catch (e) { next(e) }
})

/**
 * GET /api/v1/products/:id
 * Vraća jedan proizvod.
 * Returns a single product.
 */
productsRouter.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10)
    if (isNaN(id)) throw new AppError('Nevažeći ID / Invalid ID', 400, 'VALIDATION_ERROR')
    const product = await getProductById(id)
    res.json({ success: true, data: product })
  } catch (e) { next(e) }
})

/**
 * POST /api/v1/products
 * Kreira novi proizvod (admin only).
 * Creates a new product (admin only).
 */
productsRouter.post('/', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoryId, nameSr, nameEn, price, stockQuantity, unit } = req.body as {
      categoryId?: number; nameSr?: string; nameEn?: string
      price?: number; stockQuantity?: number; unit?: string
    }

    if (!categoryId)       throw new AppError('Kategorija je obavezna / Category is required',                 400, 'VALIDATION_ERROR')
    if (!nameSr?.trim())   throw new AppError('Naziv na srpskom je obavezan / Serbian name is required',       400, 'VALIDATION_ERROR')
    if (price === undefined || price === null) throw new AppError('Cena je obavezna / Price is required',      400, 'VALIDATION_ERROR')
    if (stockQuantity === undefined) throw new AppError('Količina je obavezna / Quantity is required',         400, 'VALIDATION_ERROR')
    if (!unit || !ALLOWED_UNITS.includes(unit as Unit)) {
      throw new AppError(`Jedinica mora biti: ${ALLOWED_UNITS.join(', ')} / Unit must be one of: ${ALLOWED_UNITS.join(', ')}`, 400, 'VALIDATION_ERROR')
    }

    const product = await createProduct({
      categoryId, nameSr: nameSr.trim(), nameEn: nameEn?.trim() ?? '',
      price, stockQuantity, unit: unit as Unit
    })
    res.status(201).json({ success: true, data: product })
  } catch (e) { next(e) }
})

/**
 * PUT /api/v1/products/:id
 * Menja proizvod (admin only).
 * Updates a product (admin only).
 */
productsRouter.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10)
    if (isNaN(id)) throw new AppError('Nevažeći ID / Invalid ID', 400, 'VALIDATION_ERROR')

    const { categoryId, nameSr, nameEn, price, stockQuantity, unit, active } = req.body as {
      categoryId?: number; nameSr?: string; nameEn?: string
      price?: number; stockQuantity?: number; unit?: string; active?: boolean
    }

    if (unit !== undefined && !ALLOWED_UNITS.includes(unit as Unit)) {
      throw new AppError(`Jedinica mora biti: ${ALLOWED_UNITS.join(', ')}`, 400, 'VALIDATION_ERROR')
    }

    const product = await updateProduct(id, {
      ...(categoryId    !== undefined ? { categoryId }                     : {}),
      ...(nameSr        !== undefined ? { nameSr: nameSr.trim() }         : {}),
      ...(nameEn        !== undefined ? { nameEn: nameEn.trim() }         : {}),
      ...(price         !== undefined ? { price }                          : {}),
      ...(stockQuantity !== undefined ? { stockQuantity }                  : {}),
      ...(unit          !== undefined ? { unit: unit as Unit }             : {}),
      ...(active        !== undefined ? { active }                         : {})
    })
    res.json({ success: true, data: product })
  } catch (e) { next(e) }
})

/**
 * DELETE /api/v1/products/:id
 * Deaktivira proizvod — soft delete (admin only).
 * Deactivates a product — soft delete (admin only).
 */
productsRouter.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10)
    if (isNaN(id)) throw new AppError('Nevažeći ID / Invalid ID', 400, 'VALIDATION_ERROR')

    await deleteProduct(id)
    res.json({ success: true, message: 'Proizvod deaktiviran / Product deactivated' })
  } catch (e) { next(e) }
})
