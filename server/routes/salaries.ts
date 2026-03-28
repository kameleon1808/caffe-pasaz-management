/**
 * @file server/routes/salaries.ts
 * @description Rute za upravljanje isplatama plata (samo admin).
 *              Routes for managing salary payments (admin only).
 *
 * Svi endpointi zahtevaju autentifikaciju i admin rolu.
 * All endpoints require authentication and admin role.
 *
 * Endpointi / Endpoints:
 * GET  /api/v1/salaries  → lista isplata sa filterima / list payments with filters
 * POST /api/v1/salaries  → nova isplata / new payment
 */

import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth, requireAdmin }               from '../middleware/auth'
import { AppError }                                from '../middleware/errorHandler'
import { getAll, create }                          from '../services/salaryService'

export const salariesRouter = Router()

// Svi endpointi zahtevaju auth + admin / All endpoints require auth + admin
salariesRouter.use(requireAuth, requireAdmin)

/**
 * GET /api/v1/salaries
 * Lista isplata plate sa opcionalnim filterima.
 * List of salary payments with optional filters.
 *
 * @query {number}  [userId]   - Filter po korisniku / Filter by user
 * @query {string}  [dateFrom] - Filter od datuma (YYYY-MM-DD) / Filter from date
 * @query {string}  [dateTo]   - Filter do datuma (YYYY-MM-DD) / Filter to date
 */
salariesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId   = req.query['userId']   ? parseInt(req.query['userId'] as string, 10)   : undefined
    const dateFrom = req.query['dateFrom'] as string | undefined
    const dateTo   = req.query['dateTo']   as string | undefined

    const salaries = await getAll({ userId, dateFrom, dateTo })
    res.json({ success: true, data: salaries })
  } catch (e) { next(e) }
})

/**
 * POST /api/v1/salaries
 * Kreira novu isplatu plate.
 * Creates a new salary payment.
 *
 * @body {number}  userId  - ID korisnika koji prima platu (obavezan) / ID of user receiving payment (required)
 * @body {number}  amount  - Iznos u RSD (obavezan, > 0) / Amount in RSD (required, > 0)
 * @body {string}  [note]  - Napomena (opciona) / Note (optional)
 * @body {string}  [paidAt] - Datum isplate ISO string (opciono, default today) / Payment date ISO string (optional, default today)
 */
salariesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, amount, note, paidAt } = req.body as {
      userId?: number; amount?: number; note?: string; paidAt?: string
    }

    if (!userId)            throw new AppError('Korisnik je obavezan / User is required', 400, 'VALIDATION_ERROR')
    if (amount === undefined || amount === null) {
      throw new AppError('Iznos je obavezan / Amount is required', 400, 'VALIDATION_ERROR')
    }
    if (typeof amount !== 'number' || amount <= 0) {
      throw new AppError('Iznos mora biti veći od 0 / Amount must be greater than 0', 400, 'VALIDATION_ERROR')
    }

    const paidById = req.user!.userId

    const salary = await create({ userId, amount, note, paidAt, paidById })
    res.status(201).json({ success: true, data: salary })
  } catch (e) { next(e) }
})
