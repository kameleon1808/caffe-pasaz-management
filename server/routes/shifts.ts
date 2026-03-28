/**
 * @file server/routes/shifts.ts
 * @description Rute za upravljanje smenama konobara.
 *              Routes for managing waiter shifts.
 *
 * Endpointi / Endpoints:
 * POST /api/v1/shifts/start        → započni smenu / start shift
 * POST /api/v1/shifts/end          → završi smenu / end shift
 * GET  /api/v1/shifts/active       → aktivna smena trenutnog korisnika / active shift for current user
 * GET  /api/v1/shifts/history      → istorija smena / shift history
 * GET  /api/v1/shifts/:id/summary  → sumarni izveštaj smene / shift summary report
 */

import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth }  from '../middleware/auth'
import { AppError }     from '../middleware/errorHandler'
import {
  startShift,
  endShift,
  getActiveShift,
  getShiftHistory,
  getShiftSummary,
} from '../services/shiftService'

export const shiftsRouter = Router()

// Svi endpointi zahtevaju autentifikaciju / All endpoints require authentication
shiftsRouter.use(requireAuth)

/**
 * POST /api/v1/shifts/start
 * Započinje novu smenu za trenutnog korisnika.
 * Starts a new shift for the current user.
 */
shiftsRouter.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId
    const shift  = await startShift(userId)
    res.status(201).json({ success: true, data: shift })
  } catch (e) { next(e) }
})

/**
 * POST /api/v1/shifts/end
 * Završava aktivnu smenu za trenutnog korisnika.
 * Ends the active shift for the current user.
 */
shiftsRouter.post('/end', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId
    const shift  = await endShift(userId)
    res.json({ success: true, data: shift })
  } catch (e) { next(e) }
})

/**
 * GET /api/v1/shifts/active
 * Vraća aktivnu smenu trenutnog korisnika, ili null ako nema.
 * Returns the active shift for the current user, or null if none.
 */
shiftsRouter.get('/active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId
    const shift  = await getActiveShift(userId)
    // Vraća null ako nema aktivne smene — ne bacamo grešku
    // Returns null if no active shift — we don't throw an error
    res.json({ success: true, data: shift })
  } catch (e) { next(e) }
})

/**
 * GET /api/v1/shifts/history
 * Vraća istoriju smena za trenutnog korisnika.
 * Returns shift history for the current user.
 *
 * @query {number} [limit=20] - Maksimalan broj zapisa / Maximum number of records
 */
shiftsRouter.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId
    const limit  = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20
    const shifts = await getShiftHistory(userId, isNaN(limit) ? 20 : limit)
    res.json({ success: true, data: shifts })
  } catch (e) { next(e) }
})

/**
 * GET /api/v1/shifts/:id/summary
 * Vraća sumarni izveštaj smene — promet i prodaja po artiklima.
 * Returns shift summary — revenue and sales by product.
 *
 * Ne zatvara smenu. / Does NOT close the shift.
 *
 * @param {string} id - ID smene / Shift ID
 */
shiftsRouter.get('/:id/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shiftId = parseInt(req.params['id'], 10)
    if (isNaN(shiftId)) {
      throw new AppError(
        'Nevažeći ID smene / Invalid shift ID',
        400, 'INVALID_SHIFT_ID'
      )
    }
    const summary = await getShiftSummary(shiftId)
    res.json({ success: true, data: summary })
  } catch (e) { next(e) }
})
