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
 * GET  /api/v1/shifts/:id/summary           → sumarni izveštaj smene / shift summary report
 * GET  /api/v1/shifts/:id/inventory-summary → stanje magacina za smenu / inventory state for shift
 * POST /api/v1/shifts/:id/inventory-adjust  → ručna korekcija inventara / manual inventory adjustment
 * GET  /api/v1/shifts                       → lista smena (admin) / shift list (admin)
 * POST /api/v1/shifts/:id/end               → potvrdi završetak smene / confirm end shift
 * POST /api/v1/shifts/:id/print-summary     → štampaj sumarni izveštaj / print shift summary
 */

import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { AppError }                  from '../middleware/errorHandler'
import { prisma }                    from '../lib/prisma'
import {
  startShift,
  endShift,
  getActiveShift,
  getShiftHistory,
  getShiftSummary,
  getShiftInventorySummary,
  adjustShiftInventory,
  endShiftById,
  getShiftList,
} from '../services/shiftService'
import {
  loadPrinterConfig,
  loadCafeInfo,
  printShiftSummaryReport,
} from '../lib/printerService'

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

/**
 * GET /api/v1/shifts/:id/inventory-summary
 * Vraća stanje magacina za datu smenu.
 * Returns the warehouse state for the given shift.
 *
 * @param {string} id - ID smene / Shift ID
 */
shiftsRouter.get('/:id/inventory-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shiftId = parseInt(req.params['id'], 10)
    if (isNaN(shiftId)) {
      throw new AppError('Nevažeći ID smene / Invalid shift ID', 400, 'INVALID_SHIFT_ID')
    }
    const result = await getShiftInventorySummary(shiftId)
    res.json({ success: true, data: result })
  } catch (e) { next(e) }
})

/**
 * POST /api/v1/shifts/:id/inventory-adjust
 * Ručna korekcija inventara u kontekstu smene.
 * Manual inventory adjustment in the context of a shift.
 *
 * @param  {string} id         - ID smene / Shift ID
 * @body   {number} productId  - ID proizvoda / Product ID
 * @body   {number} changeQty  - Promena količine (+/-) / Quantity change (+/-)
 * @body   {string} type       - "WASTE" | "ADJUSTMENT"
 * @body   {string} note       - Obavezna napomena / Required note
 */
shiftsRouter.post('/:id/inventory-adjust', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shiftId = parseInt(req.params['id'], 10)
    if (isNaN(shiftId)) {
      throw new AppError('Nevažeći ID smene / Invalid shift ID', 400, 'INVALID_SHIFT_ID')
    }
    const { productId, changeQty, type, note } = req.body as {
      productId: number
      changeQty: number
      type:      string
      note:      string
    }
    if (!productId || changeQty === undefined || !type || !note) {
      throw new AppError(
        'Nedostaju obavezna polja: productId, changeQty, type, note / Missing required fields',
        400, 'MISSING_FIELDS'
      )
    }
    await adjustShiftInventory(shiftId, {
      productId,
      changeQty,
      type: type as 'WASTE' | 'ADJUSTMENT',
      note,
    })
    res.json({ success: true })
  } catch (e) { next(e) }
})

/**
 * GET /api/v1/shifts
 * Lista svih smena sa filterima — samo admin.
 * List of all shifts with filters — admin only.
 *
 * @query {number} [userId]   - Filter po korisniku / Filter by user
 * @query {string} [dateFrom] - Filter od datuma (YYYY-MM-DD) / Filter from date
 * @query {string} [dateTo]   - Filter do datuma (YYYY-MM-DD) / Filter to date
 * @query {number} [page=1]   - Stranica / Page
 * @query {number} [limit=20] - Broj po strani / Items per page
 */
shiftsRouter.get('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId   = req.query['userId']   ? parseInt(req.query['userId']   as string, 10) : undefined
    const dateFrom = req.query['dateFrom'] as string | undefined
    const dateTo   = req.query['dateTo']   as string | undefined
    const page     = req.query['page']     ? parseInt(req.query['page']     as string, 10) : 1
    const limit    = req.query['limit']    ? parseInt(req.query['limit']    as string, 10) : 20
    const result = await getShiftList({
      userId:   userId && !isNaN(userId) ? userId : undefined,
      dateFrom: dateFrom || undefined,
      dateTo:   dateTo   || undefined,
      page:     isNaN(page)  ? 1  : page,
      limit:    isNaN(limit) ? 20 : limit,
    })
    res.json({ success: true, data: result })
  } catch (e) { next(e) }
})

/**
 * POST /api/v1/shifts/:id/end
 * Potvrđuje i završava smenu po ID-u.
 * Confirms and ends a shift by ID.
 *
 * @param  {string}  id       - ID smene / Shift ID
 * @body   {boolean} confirm  - Mora biti true / Must be true
 */
shiftsRouter.post('/:id/end', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shiftId = parseInt(req.params['id'], 10)
    if (isNaN(shiftId)) {
      throw new AppError('Nevažeći ID smene / Invalid shift ID', 400, 'INVALID_SHIFT_ID')
    }
    if (!req.body?.confirm) {
      throw new AppError(
        'Polje confirm mora biti true / Field confirm must be true',
        400, 'CONFIRM_REQUIRED'
      )
    }
    const userId  = req.user!.userId
    const isAdmin = req.user!.role === 'ADMIN'
    const shift   = await endShiftById(shiftId, userId, isAdmin)
    res.json({ success: true, data: shift })
  } catch (e) { next(e) }
})

/**
 * POST /api/v1/shifts/:id/print-summary
 * Štampa sumarni izveštaj smene na POS štampaču.
 * Prints the shift summary report on the POS printer.
 *
 * @param {string} id - ID smene / Shift ID
 */
shiftsRouter.post('/:id/print-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shiftId = parseInt(req.params['id'], 10)
    if (isNaN(shiftId)) {
      throw new AppError('Nevažeći ID smene / Invalid shift ID', 400, 'INVALID_SHIFT_ID')
    }
    const [summary, config, cafe] = await Promise.all([
      getShiftSummary(shiftId),
      loadPrinterConfig(),
      loadCafeInfo(),
    ])
    // Fetch waiter name from shift
    const shift = await prisma.shift.findUnique({
      where:   { id: shiftId },
      include: { user: { select: { fullName: true } } }
    })
    await printShiftSummaryReport({
      shiftId,
      waiterName:     shift?.user?.fullName ?? 'N/A',
      startedAt:      shift?.startedAt      ?? new Date(),
      endedAt:        shift?.endedAt        ?? null,
      revenue: {
        total:     summary.revenue.total,
        white:     summary.revenue.white,
        black:     summary.revenue.black,
        paidCount: summary.revenue.paidCount,
      },
      salesByProduct: summary.salesByProduct.map(p => ({
        nameSr:      p.nameSr,
        soldTotal:   p.soldTotal,
        totalAmount: p.totalAmount,
      })),
    }, config, cafe)
    res.json({ success: true })
  } catch (e) { next(e) }
})
